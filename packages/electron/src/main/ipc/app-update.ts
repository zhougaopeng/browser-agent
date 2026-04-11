import { ipcMain } from "electron";
import { checkForAppUpdate } from "../app-updater";

export function setupAppUpdateIPC(): void {
  ipcMain.handle("app-update:check", () => {
    checkForAppUpdate(true);
  });
}
