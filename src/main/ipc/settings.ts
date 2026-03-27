import { type BrowserWindow, ipcMain } from "electron";
import { initBrowserTools } from "../agent/browser-tools";
import { settingsStore } from "../store/settings";

export function setupSettingsIPC(mainWindow: BrowserWindow): void {
  ipcMain.handle("settings:get", () => {
    return settingsStore.store;
  });

  ipcMain.handle("settings:set", async (_event, key: string, value: unknown) => {
    (settingsStore as unknown as { set: (k: string, v: unknown) => void }).set(key, value);

    if (key.startsWith("browser.")) {
      await initBrowserTools(settingsStore.get("browser"));
    }

    mainWindow.webContents.send("settings:changed", settingsStore.store);
  });
}
