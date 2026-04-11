import type { ToolsInput } from "@mastra/core/agent";
import type { AppPaths } from "../paths";
import type { BrowserConfig } from "../store/settings";
import { BrowserSessionManager } from "./browser-session";
import { getCurrentThreadId } from "./thread-context";

let sessionManager: BrowserSessionManager | null = null;
let proxyTools: ToolsInput = {};

// We need a "template" session to derive tool schemas from, since Playwright
// MCP tools have dynamic schemas that we can only discover after connecting.
// The first session created becomes the template; subsequent sessions reuse
// the same proxy tools (the proxy execute delegates to the right session at
// call time via AsyncLocalStorage).
let templateReady = false;

async function ensureTemplate(): Promise<void> {
  if (templateReady || !sessionManager) return;

  // Create a transient session just to discover schemas.  We use a synthetic
  // thread id; once a real thread creates its session, this one stays around
  // until replaced (or cleaned up).
  const sentinel = await sessionManager.getOrCreate("__schema_template__");
  const rawTools = sentinel.getRawTools();
  proxyTools = buildProxyTools(rawTools);
  templateReady = true;

  // Tear down the template session — it's no longer needed.
  await sessionManager.destroy("__schema_template__");
}

function buildProxyTools(templateTools: ToolsInput): ToolsInput {
  const proxied: ToolsInput = {};

  for (const [name, tool] of Object.entries(templateTools)) {
    const t = tool as Record<string, unknown>;
    const hasExec = t.execute && typeof t.execute === "function";

    if (!hasExec) {
      proxied[name] = tool;
      continue;
    }

    proxied[name] = {
      ...tool,
      execute: async (input: unknown, ctx: unknown) => {
        const threadId = getCurrentThreadId();
        if (!threadId) {
          return {
            content: [
              {
                type: "text",
                text: `⛔ No thread context — ${name} cannot determine which browser session to use.`,
              },
            ],
            isError: true,
          };
        }
        if (!sessionManager) {
          return {
            content: [{ type: "text", text: "⛔ BrowserSessionManager not initialized." }],
            isError: true,
          };
        }
        const session = await sessionManager.getOrCreate(threadId);
        return session.executeTool(name, input, ctx);
      },
    } as ToolsInput[string];
  }

  return proxied;
}

export async function initBrowserTools(
  config: BrowserConfig,
  overlayInitScript: string,
  paths: AppPaths,
): Promise<ToolsInput> {
  if (sessionManager) {
    sessionManager.updateConfig(config, overlayInitScript, paths);
  } else {
    sessionManager = new BrowserSessionManager(config, overlayInitScript, paths);
  }

  templateReady = false;
  await ensureTemplate();

  return proxyTools;
}

export function getSessionManager(): BrowserSessionManager | null {
  return sessionManager;
}

export function resetLoopState(threadId?: string): void {
  if (!sessionManager) return;
  if (threadId) {
    sessionManager.resetLoopState(threadId);
  }
}

export function getMCPClient(threadId?: string) {
  if (!sessionManager || !threadId) return null;
  return sessionManager.get(threadId)?.getMCPClient() ?? null;
}

export function getBrowserTools(): ToolsInput {
  return proxyTools;
}
