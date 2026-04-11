import { join } from "node:path";
import type { ToolsInput } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import type { AppPaths } from "../paths";
import type { BrowserConfig } from "../store/settings";
import { LoopState } from "./loop-state";

const BROWSER_CLOSED_RE = /target page, context or browser has been closed/i;

function isBrowserClosedError(result: unknown): boolean {
  try {
    return BROWSER_CLOSED_RE.test(JSON.stringify(result));
  } catch {
    return false;
  }
}

const CODE_PARAM_KEY: Record<string, string> = {
  browser_evaluate: "function",
  browser_run_code: "code",
};

function fixDoubleEscapedCode(value: string): string {
  if (!value.includes("\n") && value.includes("\\n")) {
    return value.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
  }
  return value;
}

function sanitizeCodeInput(toolName: string, input: unknown): unknown {
  const key = CODE_PARAM_KEY[toolName];
  if (!key) return input;

  const obj = input as Record<string, unknown>;
  const raw = obj[key];
  if (typeof raw !== "string") return input;

  const fixed = fixDoubleEscapedCode(raw);
  if (fixed === raw) return input;

  console.log(`[code-fix] ${toolName}: fixed double-escaped newlines in "${key}" param`);
  return { ...obj, [key]: fixed };
}

function stripDraftSchemas(tools: ToolsInput): void {
  for (const tool of Object.values(tools)) {
    const wrapper = (tool as Record<string, unknown>).inputSchema;
    if (wrapper && typeof wrapper === "object" && "getSchema" in wrapper) {
      const raw = (wrapper as { getSchema: () => Record<string, unknown> }).getSchema();
      if (raw?.$schema) delete raw.$schema;
    }
  }
}

function buildMCPArgs(config: BrowserConfig, overlayScript: string, userDataDir: string): string[] {
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

export class BrowserSession {
  readonly threadId: string;
  readonly loopState = new LoopState();

  private mcpClient: MCPClient | null = null;
  private rawTools: ToolsInput = {};
  private restartPromise: Promise<void> | null = null;
  private config: BrowserConfig;
  private overlayScript: string;
  private userDataDir: string;

  constructor(threadId: string, config: BrowserConfig, overlayScript: string, userDataDir: string) {
    this.threadId = threadId;
    this.config = config;
    this.overlayScript = overlayScript;
    this.userDataDir = userDataDir;
  }

  async start(): Promise<void> {
    if (this.mcpClient) {
      try {
        await this.mcpClient.disconnect();
      } catch {
        /* ignore disconnect errors on stale client */
      }
    }

    this.mcpClient = new MCPClient({
      id: `playwright-${this.threadId}`,
      servers: {
        playwright: {
          command: "npx",
          args: buildMCPArgs(this.config, this.overlayScript, this.userDataDir),
        },
      },
    });

    const toolsets = await this.mcpClient.listToolsets();
    this.rawTools = toolsets.playwright ?? {};
    stripDraftSchemas(this.rawTools);
    console.log(`[browser-session] Started for thread ${this.threadId} (dir: ${this.userDataDir})`);
  }

  async destroy(): Promise<void> {
    if (this.mcpClient) {
      try {
        await this.mcpClient.disconnect();
      } catch {
        /* ignore */
      }
      this.mcpClient = null;
    }
    this.rawTools = {};
    this.loopState.reset();
    console.log(`[browser-session] Destroyed for thread ${this.threadId}`);
  }

  private async restart(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;

    this.restartPromise = (async () => {
      try {
        console.log(
          `[browser-session] Browser closed detected for ${this.threadId}, auto-restarting...`,
        );
        await this.start();
        console.log(`[browser-session] Browser restarted for ${this.threadId}`);
      } catch (err) {
        console.error(`[browser-session] Failed to restart browser for ${this.threadId}:`, err);
        throw err;
      } finally {
        this.restartPromise = null;
      }
    })();

    return this.restartPromise;
  }

  async executeTool(toolName: string, input: unknown, ctx: unknown): Promise<unknown> {
    const sanitizedInput = sanitizeCodeInput(toolName, input);
    const { overBudget } = this.loopState.trackToolBudget(toolName);

    const blocked = this.loopState.handleHardBlock(toolName, sanitizedInput, overBudget);
    if (blocked) return blocked;

    const current = this.rawTools[toolName] as Record<string, unknown> | undefined;
    const exec = current?.execute as ((i: unknown, c: unknown) => Promise<unknown>) | undefined;
    if (!exec) {
      return {
        content: [{ type: "text", text: `Tool ${toolName} not available in this session` }],
        isError: true,
      };
    }

    let result = await exec(sanitizedInput, ctx);

    if (isBrowserClosedError(result)) {
      await this.restart();
      const fresh = this.rawTools[toolName] as Record<string, unknown> | undefined;
      const freshExec = fresh?.execute as typeof exec | undefined;
      if (freshExec) result = await freshExec(sanitizedInput, ctx);
    }

    return this.loopState.trackAndAnnotate(toolName, sanitizedInput, result);
  }

  getRawTools(): ToolsInput {
    return this.rawTools;
  }

  getMCPClient(): MCPClient | null {
    return this.mcpClient;
  }

  updateConfig(config: BrowserConfig, overlayScript: string): void {
    this.config = config;
    this.overlayScript = overlayScript;
  }
}

export class BrowserSessionManager {
  private sessions = new Map<string, BrowserSession>();
  private config: BrowserConfig;
  private overlayScript: string;
  private profilesDir: string;

  constructor(config: BrowserConfig, overlayScript: string, paths: AppPaths) {
    this.config = config;
    this.overlayScript = overlayScript;
    this.profilesDir = paths.browserProfiles;
  }

  async getOrCreate(threadId: string): Promise<BrowserSession> {
    const existing = this.sessions.get(threadId);
    if (existing) return existing;

    const userDataDir = this.config.userDataDir || join(this.profilesDir, threadId);
    const session = new BrowserSession(threadId, this.config, this.overlayScript, userDataDir);
    await session.start();
    this.sessions.set(threadId, session);
    return session;
  }

  get(threadId: string): BrowserSession | undefined {
    return this.sessions.get(threadId);
  }

  resetLoopState(threadId: string): void {
    this.sessions.get(threadId)?.loopState.reset();
  }

  async destroy(threadId: string): Promise<void> {
    const session = this.sessions.get(threadId);
    if (session) {
      await session.destroy();
      this.sessions.delete(threadId);
    }
  }

  async destroyAll(): Promise<void> {
    const destroys = [...this.sessions.values()].map((s) => s.destroy());
    await Promise.allSettled(destroys);
    this.sessions.clear();
  }

  updateConfig(config: BrowserConfig, overlayScript: string, paths: AppPaths): void {
    this.config = config;
    this.overlayScript = overlayScript;
    this.profilesDir = paths.browserProfiles;
    for (const session of this.sessions.values()) {
      session.updateConfig(config, overlayScript);
    }
  }
}
