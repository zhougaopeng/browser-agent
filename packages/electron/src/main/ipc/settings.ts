import { type AppInstance, getSettings, updateSetting } from "@browser-agent/server";
import { type BrowserWindow, ipcMain } from "electron";

export function setupSettingsIPC(
  mainWindow: BrowserWindow,
  appPromise: Promise<AppInstance>,
): void {
  ipcMain.handle("settings:get", async () => {
    const app = await appPromise;
    return getSettings(app);
  });

  ipcMain.handle("settings:set", async (_event, key: string, value: unknown) => {
    const app = await appPromise;
    const store = await updateSetting(app, key, value);
    mainWindow.webContents.send("settings:changed", store);
  });
}
