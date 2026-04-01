import type { ToolsInput } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import type { AppPaths } from "../paths";
import type { BrowserConfig } from "../store/settings";

let mcpClient: MCPClient | null = null;
let rawTools: ToolsInput = {};
let wrappedTools: ToolsInput = {};

let savedConfig: BrowserConfig | null = null;
let savedOverlayScript = "";
let savedPaths: AppPaths | null = null;
let restartPromise: Promise<void> | null = null;

const BROWSER_CLOSED_RE = /target page, context or browser has been closed/i;

function isBrowserClosedError(result: unknown): boolean {
  try {
    return BROWSER_CLOSED_RE.test(JSON.stringify(result));
  } catch {
    return false;
  }
}

function buildMCPArgs(config: BrowserConfig, paths: AppPaths, overlayScript: string): string[] {
  const userDataDir = config.userDataDir || paths.playwrightProfile;
  const args = [
    "-y",
    "@playwright/mcp@latest",
    "--browser",
    config.browser || "chrome",
    "--caps",
    "vision",
    "--init-script",
    overlayScript,
    "--user-data-dir",
    userDataDir,
  ];
  if (config.headless) args.push("--headless");
  if (config.executablePath) args.push("--executable-path", config.executablePath);
  return args;
}

function stripDraftSchemas(tools: ToolsInput): void {
  // Workaround: Playwright MCP now emits JSON Schema Draft 2020-12, but
  // @mastra/schema-compat's bundled Ajv only loads Draft 7 meta-schema.
  // Strip $schema before the first validation to avoid "no schema with key
  // or ref" errors. Safe to remove once mastra-ai/mastra#14530 lands.
  for (const tool of Object.values(tools)) {
    const wrapper = (tool as Record<string, unknown>).inputSchema;
    if (wrapper && typeof wrapper === "object" && "getSchema" in wrapper) {
      const raw = (wrapper as { getSchema: () => Record<string, unknown> }).getSchema();
      if (raw?.$schema) delete raw.$schema;
    }
  }
}

async function startMCP(): Promise<void> {
  if (!savedConfig || !savedPaths) return;

  if (mcpClient) {
    try {
      await mcpClient.disconnect();
    } catch {
      /* ignore disconnect errors on stale client */
    }
  }

  mcpClient = new MCPClient({
    id: "playwright-browser",
    servers: {
      playwright: {
        command: "npx",
        args: buildMCPArgs(savedConfig, savedPaths, savedOverlayScript),
      },
    },
  });

  const toolsets = await mcpClient.listToolsets();
  rawTools = toolsets.playwright ?? {};
  stripDraftSchemas(rawTools);
}

async function restartBrowser(): Promise<void> {
  if (restartPromise) return restartPromise;

  restartPromise = (async () => {
    try {
      console.log("[browser-tools] Browser closed detected, auto-restarting...");
      await startMCP();
      console.log("[browser-tools] Browser restarted successfully");
    } catch (err) {
      console.error("[browser-tools] Failed to restart browser:", err);
      throw err;
    } finally {
      restartPromise = null;
    }
  })();

  return restartPromise;
}

function createWrappedTools(sourceTools: ToolsInput): ToolsInput {
  const wrapped: ToolsInput = {};

  for (const [name, tool] of Object.entries(sourceTools)) {
    const t = tool as Record<string, unknown>;
    const origExec = t.execute as ((input: unknown, ctx: unknown) => Promise<unknown>) | undefined;

    if (!origExec) {
      wrapped[name] = tool;
      continue;
    }

    wrapped[name] = {
      ...tool,
      execute: async (input: unknown, ctx: unknown) => {
        const current = rawTools[name] as Record<string, unknown> | undefined;
        const exec = (current?.execute as typeof origExec) ?? origExec;

        const result = await exec(input, ctx);

        if (isBrowserClosedError(result)) {
          await restartBrowser();
          const fresh = rawTools[name] as Record<string, unknown> | undefined;
          const freshExec = fresh?.execute as typeof origExec | undefined;
          if (freshExec) return freshExec(input, ctx);
        }

        return result;
      },
    } as ToolsInput[string];
  }

  return wrapped;
}

export async function initBrowserTools(
  config: BrowserConfig,
  overlayInitScript: string,
  paths: AppPaths,
): Promise<ToolsInput> {
  savedConfig = config;
  savedOverlayScript = overlayInitScript;
  savedPaths = paths;

  await startMCP();
  wrappedTools = createWrappedTools(rawTools);

  return wrappedTools;
}

export function getMCPClient() {
  return mcpClient;
}

export function getBrowserTools(): ToolsInput {
  return wrappedTools;
}
