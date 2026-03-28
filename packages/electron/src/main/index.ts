import { type AppInstance, createApp } from "@browser-agent/server";
import type { ChatStreamHandlerParams } from "@mastra/ai-sdk";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
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
    const url = new URL(request.url);

    if (url.pathname === "/chat" && request.method === "POST") {
      return handleChat(request, serverApp);
    }

    return new Response("Not Found", { status: 404 });
  });
});

async function handleChat(request: Request, serverApp: AppInstance): Promise<Response> {
  const params = (await request.json()) as ChatStreamHandlerParams & { id?: string };
  const threadId = params.id ?? crypto.randomUUID();

  const catalog = serverApp.skillManager.buildCatalog(await serverApp.skillManager.scanAll());
  const agentInstance = serverApp.mastra.getAgent("browserAgent");
  const instructions = await agentInstance.getInstructions();

  const stream = await handleChatStream({
    mastra: serverApp.mastra,
    agentId: "browserAgent",
    version: "v6",
    params,
    defaultOptions: {
      maxSteps: 50,
      memory: {
        thread: threadId,
        resource: serverApp.getResourceId(),
      },
      instructions: `${instructions}${catalog}`,
      onStepFinish: async (event: unknown) => {
        await serverApp.overlayController.handleStep(event);
      },
      onFinish: async () => {
        await serverApp.overlayController.hide();
      },
    },
  });

  const streamResponse = createUIMessageStreamResponse({ stream });
  const headers = new Headers(streamResponse.headers);
  headers.set("X-Thread-Id", threadId);
  return new Response(streamResponse.body, {
    status: streamResponse.status,
    headers,
  });
}

app.on("before-quit", async () => {
  // cleanup handled by server
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
