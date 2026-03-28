import type { ChatStreamHandlerParams } from "@mastra/ai-sdk";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { app, protocol } from "electron";
import { createBrowserAgent } from "./agent/browser-agent";
import { getMCPClient, initBrowserTools } from "./agent/browser-tools";
import { createMastra } from "./agent/mastra";
import { overlayController } from "./agent/overlay";
import { setupSettingsIPC } from "./ipc/settings";
import { skillManager } from "./skills/manager";
import { settingsStore } from "./store/settings";
import { createMainWindow } from "./windows";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "agent",
    privileges: { standard: true, supportFetchAPI: true, stream: true },
  },
]);

app.whenReady().then(async () => {
  const mainWindow = createMainWindow();
  setupSettingsIPC(mainWindow);

  const skillsDir = settingsStore.get("skills.directory") as string;
  if (skillsDir) skillManager.setDirectory(skillsDir);

  let browserTools = {};
  try {
    browserTools = await initBrowserTools(settingsStore.get("browser"));
  } catch (err) {
    console.error("[main] Failed to init browser tools:", err);
  }

  const agent = createBrowserAgent(browserTools);
  const mastra = createMastra(agent);

  protocol.handle("agent", async (request) => {
    const url = new URL(request.url);

    if (url.pathname === "/chat" && request.method === "POST") {
      const params = (await request.json()) as ChatStreamHandlerParams & { id?: string };
      const catalog = skillManager.buildCatalog(await skillManager.scanAll());
      const agentInstance = mastra.getAgent("browserAgent");
      const instructions = await agentInstance.getInstructions();

      const stream = await handleChatStream({
        mastra,
        agentId: "browserAgent",
        version: "v6",
        params,
        defaultOptions: {
          maxSteps: 50,
          memory: {
            thread: params.id ?? crypto.randomUUID(),
            resource: "desktop-user",
          },
          instructions: `${instructions}${catalog}`,
          onStepFinish: async (event: unknown) => {
            await overlayController.handleStep(event);
          },
          onFinish: async () => {
            await overlayController.hide();
          },
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    return new Response("Not Found", { status: 404 });
  });
});

app.on("before-quit", async () => {
  await getMCPClient()?.disconnect();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
