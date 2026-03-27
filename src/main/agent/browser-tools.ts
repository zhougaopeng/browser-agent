import { join } from "node:path";
import type { ToolsInput } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { app } from "electron";
import { paths } from "../paths";
import type { BrowserConfig } from "../store/settings";

let mcpClient: MCPClient | null = null;
let tools: ToolsInput = {};

function getOverlayInitScript(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "overlay-init.js");
  }
  return join(__dirname, "../../overlay-init.js");
}

export async function initBrowserTools(config: BrowserConfig): Promise<ToolsInput> {
  if (mcpClient) await mcpClient.disconnect();

  const userDataDir = config.userDataDir || paths.playwrightProfile;

  const args = [
    "-y",
    "@playwright/mcp@latest",
    "--browser",
    config.browser || "chrome",
    "--caps",
    "vision",
    "--init-script",
    getOverlayInitScript(),
    "--user-data-dir",
    userDataDir,
  ];
  if (config.headless) args.push("--headless");
  if (config.executablePath) args.push("--executable-path", config.executablePath);

  mcpClient = new MCPClient({
    id: "playwright-browser",
    servers: { playwright: { command: "npx", args } },
  });

  const toolsets = await mcpClient.listToolsets();
  tools = toolsets.playwright ?? {};
  return tools;
}

export function getMCPClient() {
  return mcpClient;
}

export function getBrowserTools(): ToolsInput {
  return tools;
}
