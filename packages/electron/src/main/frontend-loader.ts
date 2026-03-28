import { existsSync } from "node:fs";
import path from "node:path";
import { app, type BrowserWindow } from "electron";

function getFrontendPath(): string | null {
  const userDataPath = path.join(app.getPath("userData"), "frontend-dist", "index.html");
  if (existsSync(userDataPath)) return userDataPath;

  if (app.isPackaged) {
    const resourcePath = path.join(process.resourcesPath, "frontend-dist", "index.html");
    if (existsSync(resourcePath)) return resourcePath;
  }

  return null;
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

export async function checkForUpdates(): Promise<void> {
  const bundleUrl = process.env.FRONTEND_BUNDLE_URL;
  if (!bundleUrl) return;

  try {
    const response = await fetch(bundleUrl);
    if (!response.ok) return;

    const targetDir = path.join(app.getPath("userData"), "frontend-dist");
    console.log(`[frontend-loader] Update available, would download to ${targetDir}`);
    // TODO: implement download + extraction
  } catch (err) {
    console.error("[frontend-loader] Update check failed:", err);
  }
}
