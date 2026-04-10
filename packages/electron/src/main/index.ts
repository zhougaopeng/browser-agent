import path from "node:path";
import {
  type ChatStreamHandlerParams,
  cancelChat,
  createApp,
  createChatResponse,
} from "@browser-agent/server";
import { WEB_DEV_URL } from "@browser-agent/shared";
import { app, net, protocol } from "electron";
import { initAppUpdater } from "./app-updater";
import { checkForUpdate, downloadUpdate, loadSplash } from "./frontend-loader";
import { setupAppUpdateIPC } from "./ipc/app-update";
import { setupSettingsIPC } from "./ipc/settings";
import { setupThreadsIPC } from "./ipc/threads";
import { getTargetFrontendVersion } from "./util";
import { createMainWindow } from "./windows";

if (!process.env.WEB_DEV) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "agent",
      privileges: { standard: true, supportFetchAPI: true, stream: true },
    },
    {
      scheme: "browser",
      privileges: { standard: true, supportFetchAPI: true },
    },
  ]);
}

app.whenReady().then(async () => {
  const mainWindow = createMainWindow();

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  if (process.env.WEB_DEV) {
    mainWindow.loadURL(WEB_DEV_URL);
    return;
  }

  // 使用 let，方便在下载完成后更新引用，让 protocol handler 始终读到最新版本
  let targetFrontendVersion = getTargetFrontendVersion();

  // 只有在没有可用的本地前端版本时才显示 splash（说明需要等待下载，有 IO 等待）
  // 如果已有内置包或用户目录包，直接跳过 splash 避免闪屏
  if (!targetFrontendVersion) {
    loadSplash(mainWindow);
  }

  // 获取路径

  protocol.handle("browser", (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || !path.extname(pathname)) {
      pathname = "/index.html";
    }

    const frontendDir = targetFrontendVersion?.frontendDir;
    if (!frontendDir) {
      return new Response("Frontend not found", { status: 404 });
    }

    return net.fetch(`file://${path.join(frontendDir, pathname)}`);
  });

  const appPromise = createApp({
    dataDir: app.getPath("userData"),
    overlayInitScript: app.isPackaged
      ? require("node:path").join(process.resourcesPath, "overlay-init.js")
      : require("node:path").join(__dirname, "../../../../packages/server/overlay-init.js"),
  });

  const corsHeaders = {
    "Access-Control-Allow-Origin": "browser://.",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Thread-Id",
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
        if (url.pathname === "/cancel") {
          const { threadId } = (await request.json()) as { threadId: string };
          const cancelled = threadId ? cancelChat(threadId) : false;
          return withCors(
            new Response(JSON.stringify({ cancelled }), {
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

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

  setupSettingsIPC(mainWindow, appPromise);
  setupThreadsIPC(appPromise);
  setupAppUpdateIPC();
  initAppUpdater(mainWindow);

  // Two independent paths run in parallel:
  // 1) Frontend: load best local version immediately → background update check
  // 2) Server:   createApp resolve → protocol handler registration
  const frontendReady = (async () => {
    const isLocalPackage = !!process.env.ELECTRON_LOCAL_PACKAGE;
    let justDownloaded = false;

    // Step 1: 若无本地版本（首次安装），必须阻塞下载后才能加载，否则 browser:// 会 404
    if (!targetFrontendVersion) {
      if (isLocalPackage) {
        console.error("[index] ELECTRON_LOCAL_PACKAGE set but no bundled frontend found.");
        return;
      }

      console.log("[index] No local frontend found, downloading initial version...");

      // 通知 splash 页面当前正在检查更新
      mainWindow.webContents.send("splash:status", {
        stage: "checking",
        message: "正在检查更新...",
        progress: -1,
      });

      const update = await checkForUpdate(null).catch((err) => {
        console.error("[index] Initial download check failed:", err);
        return null;
      });

      if (update) {
        await downloadUpdate(update, (status) => {
          // 将下载/解压进度实时推送给 splash 页面
          mainWindow.webContents.send("splash:status", status);
        }).catch((err) => {
          console.error("[index] Initial download failed:", err);
        });
        // 下载完成后更新引用，让 protocol handler 能正确解析文件路径
        targetFrontendVersion = getTargetFrontendVersion();
        justDownloaded = true;
      }
    }

    // Step 2: 加载本地前端（此时应已有可用版本）
    mainWindow.loadURL("browser://frontend/");

    // Step 3: 后台检查更新（刚下载的本就是最新版，无需再查）
    if (!isLocalPackage && !justDownloaded) {
      checkForUpdate(targetFrontendVersion)
        .then(async (update) => {
          if (!update) return;

          console.log(`[index] Downloading frontend update ${update.version}...`);
          await downloadUpdate(update);

          mainWindow.webContents.send("frontend:update-ready", { version: update.version });
          console.log(`[index] Frontend update ready: ${update.version}`);
        })
        .catch((err) => {
          console.error("[index] Background update failed:", err);
        });
    }
  })();

  await Promise.all([frontendReady, appPromise]);
});

app.on("before-quit", async () => {
  // cleanup handled by server
});

app.on("window-all-closed", () => {
  app.quit();
});
