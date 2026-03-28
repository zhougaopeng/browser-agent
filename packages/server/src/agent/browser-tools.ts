import type { ToolsInput } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import type { AppPaths } from "../paths";
import type { BrowserConfig } from "../store/settings";

let mcpClient: MCPClient | null = null;
let tools: ToolsInput = {};

export async function initBrowserTools(
  config: BrowserConfig,
  overlayInitScript: string,
  paths: AppPaths,
): Promise<ToolsInput> {
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
    overlayInitScript,
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
