import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import { app, type BrowserWindow } from "electron";
import extract from "extract-zip";

interface VersionInfo {
  hash: string;
  zipFileName: string;
  /**
   * UUIDv7 string, e.g. "0196b4a2-d1e0-7b3c-9f2a-1a2b3c4d5e6f".
   * Lexicographic order equals chronological order, so string comparison
   * is sufficient to determine which version is newer.
   */
  version: string;
}

export interface UpdateInfo {
  hash: string;
  zipFileName: string;
  zipUrl: string;
  version: string;
}

export type ProgressStatus = {
  stage: "checking" | "downloading" | "extracting" | "loading";
  message: string;
  progress: number;
};

export type ProgressCallback = (status: ProgressStatus) => void;

const TAG = "[frontend-loader]";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function getFrontendDir(): string {
  // Allow overriding in local dev (avoids copying to userData)
  if (process.env.FRONTEND_DIST_OVERRIDE) {
    return process.env.FRONTEND_DIST_OVERRIDE;
  }
  return path.join(app.getPath("userData"), "frontend-dist");
}

function getBundledFrontendDir(): string | null {
  if (!app.isPackaged) return null;
  return path.join(process.resourcesPath, "frontend-dist");
}

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

function readVersionJson(dir: string): VersionInfo | null {
  const file = path.join(dir, "version.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Compare two UUIDv7 version strings.
 * UUIDv7 encodes a millisecond timestamp in its most-significant bits, so
 * lexicographic string order is equivalent to chronological order.
 *
 * Returns  1 if a is newer than b
 * Returns -1 if a is older  than b
 * Returns  0 if they are equal
 */
function compareVersions(a: string, b: string): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

// ---------------------------------------------------------------------------
// Core: select best local frontend
// ---------------------------------------------------------------------------

interface LocalFrontend {
  dir: string;
  version: VersionInfo;
  source: "userData" | "bundled";
}

/**
 * Returns the best available local frontend directory by comparing version
 * numbers between the userData copy and the bundled copy.
 * Falls back to whichever copy is available if the other is missing.
 */
export function getActiveFrontend(): LocalFrontend | null {
  // Fast-path: explicit local dist override (e.g. FRONTEND_DIST_OVERRIDE=packages/web/dist)
  // index.html must exist; version.json is not required.
  const overrideDir = process.env.FRONTEND_DIST_OVERRIDE;
  if (overrideDir && existsSync(path.join(overrideDir, "index.html"))) {
    return {
      dir: overrideDir,
      version: { hash: "dev", zipFileName: "", version: "dev-override" },
      source: "userData",
    };
  }

  const userDataDir = getFrontendDir();
  const bundledDir = getBundledFrontendDir();

  const userDataVersion = existsSync(path.join(userDataDir, "index.html"))
    ? readVersionJson(userDataDir)
    : null;

  const bundledVersion =
    bundledDir && existsSync(path.join(bundledDir, "index.html"))
      ? readVersionJson(bundledDir)
      : null;

  // Both available: pick the one with higher version number
  if (userDataVersion && bundledVersion && bundledDir) {
    const cmp = compareVersions(userDataVersion.version, bundledVersion.version);
    if (cmp >= 0) {
      // userData is same or newer — prefer userData
      return { dir: userDataDir, version: userDataVersion, source: "userData" };
    } else {
      // Bundled is newer (e.g. app was upgraded): use bundled, and schedule
      // cleanup of the stale userData copy so it won't shadow newer versions.
      console.log(
        `${TAG} Bundled version (${bundledVersion.version}) > userData version (${userDataVersion.version}). Using bundled.`,
      );
      rmSync(userDataDir, { recursive: true, force: true });
      return { dir: bundledDir, version: bundledVersion, source: "bundled" };
    }
  }

  if (userDataVersion) return { dir: userDataDir, version: userDataVersion, source: "userData" };
  if (bundledVersion && bundledDir)
    return { dir: bundledDir, version: bundledVersion, source: "bundled" };

  return null;
}

/**
 * @deprecated Use getActiveFrontend() for version-aware selection.
 * Kept for backward compatibility with the protocol handler in index.ts.
 */
export function getActiveFrontendDir(): string | null {
  return getActiveFrontend()?.dir ?? null;
}

// ---------------------------------------------------------------------------
// Load helpers
// ---------------------------------------------------------------------------

export function loadSplash(win: BrowserWindow): void {
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

export function loadFrontend(win: BrowserWindow): void {
  // When an explicit local dist is provided, skip the dev-server URL so that
  // the hanker:// custom-protocol path is used instead.
  if (!process.env.FRONTEND_DIST_OVERRIDE) {
    const devUrl = process.env.FRONTEND_DEV_URL || process.env.ELECTRON_RENDERER_URL;
    if (devUrl) {
      win.loadURL(devUrl);
      return;
    }
  }

  if (getActiveFrontend()) {
    win.loadURL("hanker://frontend/");
    return;
  }

  win.loadURL("data:text/html,<h2>Frontend not found. Run pnpm build:web first.</h2>");
}

// ---------------------------------------------------------------------------
// Remote update check
// ---------------------------------------------------------------------------

function getBaseUrl(): string | null {
  const url = process.env.FRONTEND_BUNDLE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

/**
 * Checks the remote version.json against the currently active local version.
 * Returns UpdateInfo if an update is available, or null otherwise.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  try {
    const versionUrl = `${baseUrl}/version.json`;
    console.log(`${TAG} Checking for updates: ${versionUrl}`);

    const res = await fetch(versionUrl);
    if (!res.ok) {
      console.log(`${TAG} Version check returned ${res.status}, skipping`);
      return null;
    }

    const remote: VersionInfo = await res.json();

    // Compare against the version that is actually loaded
    const active = getActiveFrontend();
    const localVersion = active?.version.version ?? null;

    if (localVersion && compareVersions(localVersion, remote.version) >= 0) {
      console.log(`${TAG} Already up to date (${localVersion})`);
      return null;
    }

    console.log(`${TAG} Update available: ${localVersion ?? "none"} → ${remote.version}`);

    return {
      hash: remote.hash,
      zipFileName: remote.zipFileName,
      zipUrl: `${baseUrl}/${remote.zipFileName}`,
      version: remote.version,
    };
  } catch (err) {
    console.error(`${TAG} Update check failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Download & extract update
// ---------------------------------------------------------------------------

/**
 * Downloads the update zip, extracts it into userData/frontend-dist, then
 * removes the temporary zip file. Throws on fatal errors so callers can
 * handle gracefully; progress is reported via onProgress.
 */
export async function downloadUpdate(
  info: UpdateInfo,
  onProgress?: ProgressCallback,
): Promise<void> {
  const report = (stage: ProgressStatus["stage"], message: string, progress: number) =>
    onProgress?.({ stage, message, progress });

  report("downloading", `正在下载更新...`, 0);

  const zipRes = await fetch(info.zipUrl);
  if (!zipRes.ok || !zipRes.body) {
    throw new Error(`Download failed: ${zipRes.status}`);
  }

  const totalBytes = Number(zipRes.headers.get("content-length")) || 0;
  let downloadedBytes = 0;

  const tmpDir = path.join(app.getPath("temp"), "browser-agent-update");
  const tmpZip = path.join(tmpDir, info.zipFileName);
  mkdirSync(tmpDir, { recursive: true });

  const fileStream = createWriteStream(tmpZip);

  const writer = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      downloadedBytes += chunk.length;
      const progress = totalBytes > 0 ? downloadedBytes / totalBytes : -1;
      const pct = progress >= 0 ? ` (${Math.round(progress * 100)}%)` : "";
      report("downloading", `正在下载更新${pct}`, progress);
      fileStream.write(chunk, callback);
    },
    final(callback) {
      fileStream.end(callback);
    },
  });

  const body = zipRes.body as ReadableStream<Uint8Array>;
  await body.pipeTo(
    new WritableStream({
      write(chunk) {
        return new Promise((resolve, reject) => {
          writer.write(Buffer.from(chunk), (err) => (err ? reject(err) : resolve()));
        });
      },
      close() {
        return new Promise((resolve) => {
          writer.end(resolve);
        });
      },
    }),
  );

  console.log(`${TAG} Downloaded ${info.zipFileName}`);

  report("extracting", "正在安装更新...", -1);

  const targetDir = getFrontendDir();
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  try {
    await extract(tmpZip, { dir: targetDir });
  } finally {
    // Always clean up the temp zip, even if extraction failed
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`${TAG} Updated to ${info.version}`);
}
