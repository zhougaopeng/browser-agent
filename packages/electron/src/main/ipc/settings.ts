import type { AppInstance } from "@browser-agent/server";
import { type BrowserWindow, ipcMain } from "electron";

export function setupSettingsIPC(
  mainWindow: BrowserWindow,
  appPromise: Promise<AppInstance>,
): void {
  ipcMain.handle("settings:get", async () => {
    const app = await appPromise;
    return app.settingsStore.store;
  });

  ipcMain.handle("settings:set", async (_event, key: string, value: unknown) => {
    const app = await appPromise;
    (app.settingsStore as unknown as { set: (k: string, v: unknown) => void }).set(key, value);
    mainWindow.webContents.send("settings:changed", app.settingsStore.store);
  });
}
