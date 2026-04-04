import { type ChatStreamHandlerParams, createApp, createChatResponse } from "@browser-agent/server";
import { app, protocol } from "electron";
import { setupSettingsIPC } from "./ipc/settings";
import { setupThreadsIPC } from "./ipc/threads";
import { createMainWindow } from "./windows";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "agent",
    privileges: { standard: true, supportFetchAPI: true, stream: true },
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

  const serverApp = await appPromise;

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

app.on("before-quit", async () => {
  // cleanup handled by server
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
