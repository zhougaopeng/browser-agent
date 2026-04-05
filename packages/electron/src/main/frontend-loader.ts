import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import { app, type BrowserWindow } from "electron";
import extract from "extract-zip";

interface VersionInfo {
  hash: string;
  zipFileName: string;
}

export interface UpdateInfo {
  hash: string;
  zipFileName: string;
  zipUrl: string;
}

export type ProgressStatus = {
  stage: "checking" | "downloading" | "extracting" | "loading";
  message: string;
  progress: number;
};

export type ProgressCallback = (status: ProgressStatus) => void;

const TAG = "[frontend-loader]";

function getFrontendDir(): string {
  return path.join(app.getPath("userData"), "frontend-dist");
}

function readVersionJson(dir: string): VersionInfo | null {
  const file = path.join(dir, "version.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function getFrontendPath(): string | null {
  const userDataIndex = path.join(getFrontendDir(), "index.html");
  if (existsSync(userDataIndex)) return userDataIndex;

  if (app.isPackaged) {
    const resourcePath = path.join(process.resourcesPath, "frontend-dist", "index.html");
    if (existsSync(resourcePath)) return resourcePath;
  }

  return null;
}

function getLocalHash(): string | null {
  const userDataVersion = readVersionJson(getFrontendDir());
  if (userDataVersion) return userDataVersion.hash;

  if (app.isPackaged) {
    const bundledVersion = readVersionJson(path.join(process.resourcesPath, "frontend-dist"));
    if (bundledVersion) return bundledVersion.hash;
  }

  return null;
}

function getBaseUrl(): string | null {
  const url = process.env.FRONTEND_BUNDLE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export function loadSplash(win: BrowserWindow): void {
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

export function loadFrontend(win: BrowserWindow): void {
  const devUrl = process.env.FRONTEND_DEV_URL || process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    return;
  }

  const filePath = getFrontendPath();
  if (filePath) {
    win.loadFile(filePath);
    return;
  }

  win.loadURL("data:text/html,<h2>Frontend not found. Run pnpm build:web first.</h2>");
}

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
    const localHash = getLocalHash();

    if (localHash === remote.hash) {
      console.log(`${TAG} Already up to date (${localHash})`);
      return null;
    }

    console.log(`${TAG} Update available: ${localHash ?? "none"} → ${remote.hash}`);

    return {
      hash: remote.hash,
      zipFileName: remote.zipFileName,
      zipUrl: `${baseUrl}/${remote.zipFileName}`,
    };
  } catch (err) {
    console.error(`${TAG} Update check failed:`, err);
    return null;
  }
}

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
  await extract(tmpZip, { dir: targetDir });
  rmSync(tmpDir, { recursive: true, force: true });

  console.log(`${TAG} Updated to ${info.hash}`);
}
