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
  // 1. Window + IPC first so the UI appears immediately
  const mainWindow = createMainWindow();
  setupSettingsIPC(mainWindow);

  // 2. Skills directory
  const skillsDir = settingsStore.get("skills.directory") as string;
  if (skillsDir) skillManager.setDirectory(skillsDir);

  // 3. MCP + browser tools (launches Chrome — may be slow)
  let browserTools = {};
  try {
    browserTools = await initBrowserTools(settingsStore.get("browser"));
  } catch (err) {
    console.error("[main] Failed to init browser tools:", err);
  }

  // 4. Agent + Mastra (depend on browser tools being ready)
  const agent = createBrowserAgent(browserTools);
  const mastra = createMastra(agent);

  // 5. protocol.handle — Chat endpoint
  protocol.handle("agent", async (request) => {
    const url = new URL(request.url);

    if (url.pathname === "/chat" && request.method === "POST") {
      const { messages, threadId } = await request.json();
      const agentInstance = mastra.getAgent("browserAgent");
      const catalog = skillManager.buildCatalog(await skillManager.scanAll());

      const result = agentInstance.stream(messages, {
        maxSteps: 50,
        threadId: threadId ?? crypto.randomUUID(),
        resourceId: "desktop-user",
        instructions: agentInstance.instructions + catalog,
        onStepFinish: async (event: unknown) => {
          await overlayController.handleStep(event);
        },
        onFinish: async () => {
          await overlayController.hide();
        },
      });

      return result.toDataStreamResponse();
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
