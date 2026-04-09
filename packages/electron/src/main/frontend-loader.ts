import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Writable } from "node:stream";
import { app, type BrowserWindow } from "electron";
import extract from "extract-zip";
import { compareVersions, getFrontendDir, isSameHash, type VersionJson } from "./util";

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
// Load helpers
// ---------------------------------------------------------------------------

export function loadSplash(win: BrowserWindow): void {
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
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
export async function checkForUpdate(
  targetFrontendVersion: VersionJson | null,
): Promise<UpdateInfo | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  try {
    const versionUrl = `${baseUrl}/version.json`;
    console.log(`${TAG} Checking for updates: ${versionUrl}`);

    // Add a timestamp param to bust CDN/proxy caches, and set cache: 'no-store'
    // to prevent Chromium's own network cache from returning a stale response.
    const res = await fetch(`${versionUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
      console.log(`${TAG} Version check returned ${res.status}, skipping`);
      return null;
    }

    const remote: VersionInfo = await res.json();

    // Compare against the version that is actually loaded
    const activeVersion = targetFrontendVersion;
    if (activeVersion) {
      if (isSameHash(activeVersion.hash, remote.hash)) {
        return null;
      }

      if (compareVersions(remote.version, activeVersion.version) > 0) {
        console.log(
          `${TAG} Update available: ${activeVersion.version ?? "none"} → ${remote.version}`,
        );
        return {
          hash: remote.hash,
          zipFileName: remote.zipFileName,
          zipUrl: `${baseUrl}/${remote.zipFileName}`,
          version: remote.version,
        };
      }

      return null;
    }

    console.log(`${TAG} Update available: ${remote.version}`);

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
  await mkdir(tmpDir, { recursive: true });

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
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  try {
    await extract(tmpZip, { dir: targetDir });
  } finally {
    // Always clean up the temp zip, even if extraction failed
    await rm(tmpDir, { recursive: true, force: true });
  }

  console.log(`${TAG} Updated to ${info.version}`);
}
