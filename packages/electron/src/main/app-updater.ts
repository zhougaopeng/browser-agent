import { app, type BrowserWindow, Menu, type MenuItem } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
type UpdateInfo = electronUpdater.UpdateInfo;

const TAG = "[app-updater]";

let mainWindow: BrowserWindow | null = null;
let checkForUpdatesMenuItem: MenuItem | null = null;

function send(channel: string, data?: unknown): void {
  mainWindow?.webContents.send(channel, data);
}

/**
 * Build the macOS application menu with a "Check for Updates..." item.
 */
function buildAppMenu(packaged: boolean): void {
  const appName = app.name || "Browser Agent";
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: appName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Check for Updates…",
          id: "check-for-updates",
          enabled: packaged, // disabled in dev mode
          click: () => checkForAppUpdate(),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  checkForUpdatesMenuItem = menu.getMenuItemById("check-for-updates");
}

/**
 * Initialise the auto-updater.
 *
 * - In development (`!app.isPackaged`) the updater is skipped entirely to
 *   avoid `ERR_UPDATER_*` errors.
 * - After setup, an initial check is fired automatically.
 */
export function initAppUpdater(win: BrowserWindow): void {
  // Always build the menu (so Edit/View/Window menus work in dev too).
  buildAppMenu(app.isPackaged);

  if (!app.isPackaged) {
    console.log(`${TAG} Skipping auto-updater in dev mode`);
    return;
  }

  mainWindow = win;

  // Don't auto-download; let the user confirm first.
  autoUpdater.autoDownload = false;
  // Don't auto-install on quit; we use explicit quitAndInstall().
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    console.log(`${TAG} Checking for update...`);
    send("app-update:checking");
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = "Checking for Updates…";
      checkForUpdatesMenuItem.enabled = false;
    }
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    console.log(`${TAG} Update available: ${info.version}`);
    send("app-update:available", {
      version: info.version,
      releaseDate: info.releaseDate,
    });
    // Start downloading automatically once we know there's an update.
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    console.log(`${TAG} Already up-to-date: ${info.version}`);
    send("app-update:not-available", { version: info.version });
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = "Check for Updates…";
      checkForUpdatesMenuItem.enabled = true;
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    send("app-update:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    console.log(`${TAG} Update downloaded: ${info.version}`);
    send("app-update:downloaded", { version: info.version });
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = `Restart to Update (v${info.version})`;
      checkForUpdatesMenuItem.enabled = true;
      checkForUpdatesMenuItem.click = () => installAppUpdate();
    }
  });

  autoUpdater.on("error", (err: Error) => {
    console.error(`${TAG} Update error:`, err);
    send("app-update:error", { message: err.message });
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = "Check for Updates…";
      checkForUpdatesMenuItem.enabled = true;
    }
  });

  // Initial check, delayed slightly to let the window finish loading.
  setTimeout(() => checkForAppUpdate(), 3_000);
}

/**
 * Manually trigger an update check.
 * Can be called from IPC (e.g. a "Check for Updates" menu item).
 */
export function checkForAppUpdate(): void {
  if (!app.isPackaged) {
    console.log(`${TAG} Skipping update check in dev mode`);
    return;
  }
  autoUpdater.checkForUpdates();
}

/**
 * Quit and install the downloaded update.
 * Called when the user clicks "Restart to Update".
 */
export function installAppUpdate(): void {
  autoUpdater.quitAndInstall();
}
