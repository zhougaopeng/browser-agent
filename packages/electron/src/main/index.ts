import path from "node:path";
import { type ChatStreamHandlerParams, createApp, createChatResponse } from "@browser-agent/server";
import { app, net, protocol } from "electron";
import {
  checkForUpdate,
  downloadUpdate,
  getActiveFrontendDir,
  loadFrontend,
  type ProgressStatus,
} from "./frontend-loader";
import { setupSettingsIPC } from "./ipc/settings";
import { setupThreadsIPC } from "./ipc/threads";
import { createMainWindow } from "./windows";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "agent",
    privileges: { standard: true, supportFetchAPI: true, stream: true },
  },
  {
    scheme: "hanker",
    privileges: { standard: true, supportFetchAPI: true },
  },
]);

app.whenReady().then(async () => {
  const mainWindow = createMainWindow();

  const appPromise = createApp({
    dataDir: app.getPath("userData"),
    overlayInitScript: app.isPackaged
      ? require("node:path").join(process.resourcesPath, "overlay-init.js")
      : require("node:path").join(__dirname, "../../../../packages/server/overlay-init.js"),
  });

  setupSettingsIPC(mainWindow, appPromise);
  setupThreadsIPC(appPromise);

  protocol.handle("hanker", (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || !path.extname(pathname)) {
      pathname = "/index.html";
    }

    const frontendDir = getActiveFrontendDir();
    if (!frontendDir) {
      return new Response("Frontend not found", { status: 404 });
    }

    return net.fetch(`file://${path.join(frontendDir, pathname)}`);
  });

  // Two independent paths run in parallel:
  // 1) Frontend: update check → optional download → loadFrontend
  // 2) Server:   createApp resolve → protocol handler registration
  const frontendReady = (async () => {
    const devUrl = process.env.FRONTEND_DEV_URL || process.env.ELECTRON_RENDERER_URL;
    if (!devUrl) {
      const sendStatus = (status: ProgressStatus) =>
        mainWindow.webContents.send("splash:status", status);

      sendStatus({ stage: "checking", message: "正在检查更新...", progress: -1 });
      const update = await checkForUpdate();

      if (update) {
        await downloadUpdate(update, sendStatus);
      }

      sendStatus({ stage: "loading", message: "正在加载...", progress: -1 });
    }

    loadFrontend(mainWindow);

    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  })();

  const serverReady = appPromise.then((serverApp) => {
    protocol.handle("agent", async (request) => {
      try {
        const url = new URL(request.url);

        if (url.pathname === "/chat" && request.method === "POST") {
          const params = (await request.json()) as ChatStreamHandlerParams & { id?: string };
          return await createChatResponse(serverApp, params);
        }

        return new Response("Not Found", { status: 404 });
      } catch (err) {
        console.error("[electron] Protocol handler error:", err);
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    });
  });

  await Promise.all([frontendReady, serverReady]);
});

app.on("before-quit", async () => {
  // cleanup handled by server
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
