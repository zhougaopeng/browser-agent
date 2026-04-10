import { ipcMain } from "electron";
import { checkForAppUpdate, installAppUpdate } from "../app-updater";

export function setupAppUpdateIPC(): void {
  ipcMain.handle("app-update:check", () => {
    checkForAppUpdate();
  });

  ipcMain.handle("app-update:install", () => {
    installAppUpdate();
  });
}
