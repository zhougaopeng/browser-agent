import path from "node:path";
import { type ChatStreamHandlerParams, createApp, createChatResponse } from "@browser-agent/server";
import { app, net, protocol } from "electron";
import {
  checkForUpdate,
  downloadUpdate,
  getActiveFrontendDir,
  loadFrontend,
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
  // 1) Frontend: load best local version immediately → background update check
  // 2) Server:   createApp resolve → protocol handler registration
  const frontendReady = (async () => {
    // Step 1: Load the best available local version right away (no network wait)
    loadFrontend(mainWindow);

    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    // Step 2: Check for remote updates in the background
    const devUrl = process.env.FRONTEND_DEV_URL || process.env.ELECTRON_RENDERER_URL;
    if (!devUrl) {
      // Fire-and-forget: do not await so app startup is not blocked
      checkForUpdate()
        .then(async (update) => {
          if (!update) return;

          console.log(`[index] Downloading frontend update ${update.version}...`);
          await downloadUpdate(update);

          // Notify the frontend that a new version is ready — let the user
          // decide when to restart rather than force-reloading.
          mainWindow.webContents.send("frontend:update-ready", { version: update.version });
          console.log(`[index] Frontend update ready: ${update.version}`);
        })
        .catch((err) => {
          // Background update errors are non-fatal; log and move on.
          console.error("[index] Background update failed:", err);
        });
    }
  })();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "hanker://.",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const withCors = (response: Response): Response => {
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      headers.set(k, v);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  // 提前注册，handler 内部等待 server 就绪，避免 ERR_UNKNOWN_URL_SCHEME
  protocol.handle("agent", async (request) => {
    // Handle CORS preflight（不需要 serverApp，可以直接响应）
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 等待 server 初始化完成
    const serverApp = await appPromise;

    try {
      const url = new URL(request.url);

      if (url.hostname === "chat" && request.method === "POST") {
        const params = (await request.json()) as ChatStreamHandlerParams & { id?: string };
        const response = await createChatResponse(serverApp, params);
        return withCors(response);
      }

      return withCors(new Response("Not Found", { status: 404 }));
    } catch (err) {
      console.error("[electron] Protocol handler error:", err);
      return withCors(
        new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
  });

  const serverReady = appPromise;

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
