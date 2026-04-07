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

// ---------------------------------------------------------------------------
// Loop detection — two layers:
//
// 1. **Global** consecutive-error counter across ALL tools.  Catches the
//    pattern where the agent alternates between browser_evaluate and
//    browser_run_code (each failing, but per-tool count stays low).
//    When the global count reaches HARD_BLOCK_THRESHOLD the wrapper
//    short-circuits: it does NOT execute the MCP tool at all and returns
//    a synthetic "blocked" result.  This is the only reliable way to stop
//    an LLM that ignores soft warnings.
//
// 2. **Per-tool** same-error counter.  Injects escalating ⚠️ / ⛔ text
//    into the tool result so the LLM can self-correct earlier.
// ---------------------------------------------------------------------------

interface LoopRecord {
  errorSignature: string;
  consecutiveCount: number;
}

const toolFailureTracker = new Map<string, LoopRecord>();
let globalConsecutiveErrors = 0;

const HARD_BLOCK_THRESHOLD = 4;
const JS_EXEC_TOOLS = new Set(["browser_evaluate", "browser_run_code"]);

// Duplicate-call detection: catches the case where a tool SUCCEEDS but the
// agent calls it again with identical args (returning identical data).
const DUPLICATE_WARN_THRESHOLD = 2;
const DUPLICATE_BLOCK_THRESHOLD = 3;

interface DuplicateRecord {
  fingerprint: string;
  count: number;
}

let lastCallRecord: DuplicateRecord | null = null;

function argsFingerprint(toolName: string, input: unknown): string {
  try {
    return `${toolName}:${JSON.stringify(input)}`;
  } catch {
    return `${toolName}:?`;
  }
}

// Per-tool call budget: caps how many times a JS execution tool can be called
// in a single agent run, regardless of whether args differ.  Catches the
// "selector guessing" pattern where the agent tries 10+ CSS selectors.
const JS_TOOL_BUDGET_WARN = 3;
const JS_TOOL_BUDGET_BLOCK = 5;
const jsToolCallCount = new Map<string, number>();

function trackToolBudget(toolName: string): { count: number; overBudget: boolean } {
  if (!JS_EXEC_TOOLS.has(toolName)) return { count: 0, overBudget: false };
  const prev = jsToolCallCount.get(toolName) ?? 0;
  const count = prev + 1;
  jsToolCallCount.set(toolName, count);
  return { count, overBudget: count > JS_TOOL_BUDGET_BLOCK };
}

function isErrorResult(result: unknown): boolean {
  try {
    const str = typeof result === "string" ? result : JSON.stringify(result);
    return /### Error|"isError"\s*:\s*true|Error:/.test(str);
  } catch {
    return false;
  }
}

function extractErrorSignature(result: unknown): string | null {
  try {
    const str = typeof result === "string" ? result : JSON.stringify(result);
    if (/### Error|"isError"\s*:\s*true|Error:/.test(str)) {
      const match = str.match(/(?:Error|SyntaxError|TypeError)[:\s]+([^"\\]{1,120})/);
      return match?.[1]?.trim() ?? "unknown_error";
    }
  } catch {
    /* non-serializable result – treat as success */
  }
  return null;
}

function makeBlockedResult(toolName: string, count: number): Record<string, unknown> {
  return {
    content: [
      {
        type: "text",
        text:
          `⛔ BLOCKED (global error #${count}): ${toolName} was NOT executed. ` +
          "Too many consecutive tool errors detected. " +
          "You MUST extract data from the last successful browser_snapshot. " +
          "Do NOT call browser_evaluate or browser_run_code again — parse the snapshot text directly.",
      },
    ],
    isError: true,
  };
}

function appendTextToResult(result: unknown, extra: string): unknown {
  try {
    // Handle MCP object format: {content: [{type: "text", text: "..."}]}
    const obj = result as { content?: Array<{ type: string; text: string }> };
    if (Array.isArray(obj?.content)) {
      const idx = obj.content.findIndex((c) => c.type === "text");
      if (idx >= 0) {
        const updated = [...obj.content];
        updated[idx] = { ...updated[idx], text: updated[idx].text + extra };
        return { ...obj, content: updated };
      }
    }
    // Handle plain string result
    if (typeof result === "string") {
      return result + extra;
    }
  } catch {
    /* return as-is */
  }
  return result;
}

function trackAndAnnotate(toolName: string, input: unknown, result: unknown): unknown {
  const errorDetected = isErrorResult(result);

  // --- Duplicate-success detection ---
  if (!errorDetected) {
    globalConsecutiveErrors = 0;
    toolFailureTracker.delete(toolName);

    const fp = argsFingerprint(toolName, input);
    if (lastCallRecord && lastCallRecord.fingerprint === fp) {
      lastCallRecord.count++;
    } else {
      lastCallRecord = { fingerprint: fp, count: 1 };
    }

    if (lastCallRecord.count >= DUPLICATE_BLOCK_THRESHOLD) {
      console.log(
        `[loop-detect] DUPLICATE BLOCK: ${toolName} called ${lastCallRecord.count}x with identical args`,
      );
      return appendTextToResult(
        result,
        `\n\n⛔ DUPLICATE CALL BLOCKED (call #${lastCallRecord.count}): ` +
          "You already have this data from the previous identical call. " +
          "STOP calling this tool and present the results to the user immediately.",
      );
    }

    if (lastCallRecord.count >= DUPLICATE_WARN_THRESHOLD) {
      console.log(
        `[loop-detect] DUPLICATE WARN: ${toolName} called ${lastCallRecord.count}x with identical args`,
      );
      return appendTextToResult(
        result,
        `\n\n⚠️ DUPLICATE CALL (call #${lastCallRecord.count}): ` +
          "You called the same tool with the same arguments and got the same result. " +
          "You already have this data. Present the results to the user now.",
      );
    }

    // --- Per-tool call budget (catches selector-guessing with varying args) ---
    const budget = jsToolCallCount.get(toolName) ?? 0;
    if (budget >= JS_TOOL_BUDGET_BLOCK) {
      console.log(`[loop-detect] BUDGET EXCEEDED: ${toolName} called ${budget}x this run`);
      return appendTextToResult(
        result,
        `\n\n⛔ TOOL BUDGET EXCEEDED (call #${budget}): ` +
          `${toolName} has been called too many times this run. ` +
          "You MUST stop calling this tool and present whatever data you have to the user NOW. " +
          "If you need more data, extract it from the snapshot.",
      );
    }
    if (budget >= JS_TOOL_BUDGET_WARN) {
      console.log(`[loop-detect] BUDGET WARN: ${toolName} called ${budget}x this run`);
      return appendTextToResult(
        result,
        `\n\n⚠️ TOOL BUDGET WARNING (call #${budget}): ` +
          `${toolName} has been called ${budget} times. ` +
          "You should have enough data by now. Present results to the user soon.",
      );
    }

    return result;
  }

  // --- Error tracking (existing logic) ---
  lastCallRecord = null;

  globalConsecutiveErrors++;
  const errorSig = extractErrorSignature(result);
  console.log(
    `[loop-detect] ${toolName} error detected – sig="${errorSig}" global=${globalConsecutiveErrors}`,
  );

  if (errorSig) {
    const existing = toolFailureTracker.get(toolName);
    if (existing && existing.errorSignature === errorSig) {
      existing.consecutiveCount++;
    } else {
      toolFailureTracker.set(toolName, { errorSignature: errorSig, consecutiveCount: 1 });
    }
  }

  const perTool = toolFailureTracker.get(toolName)?.consecutiveCount ?? 0;
  const effectiveCount = Math.max(globalConsecutiveErrors, perTool);

  if (effectiveCount >= 3) {
    console.log(
      `[loop-detect] ${toolName} – effective #${effectiveCount} ` +
        `(global=${globalConsecutiveErrors}, per-tool=${perTool}) – injecting STOP`,
    );
    return appendTextToResult(
      result,
      `\n\n⛔ LOOP DETECTED (error #${effectiveCount}): ` +
        "Too many consecutive tool errors. You MUST stop retrying and extract data from the snapshot directly. " +
        "Do NOT call browser_evaluate or browser_run_code again.",
    );
  }

  if (effectiveCount >= 2) {
    console.log(
      `[loop-detect] ${toolName} – effective #${effectiveCount} ` +
        `(global=${globalConsecutiveErrors}, per-tool=${perTool}) – warning`,
    );
    return appendTextToResult(
      result,
      `\n\n⚠️ REPEATED FAILURE (error #${effectiveCount}): ` +
        "If the next attempt also fails you must abandon this approach. " +
        "Consider reading data from the snapshot directly.",
    );
  }

  return result;
}

function shouldHardBlock(toolName: string, input: unknown): boolean {
  if (globalConsecutiveErrors >= HARD_BLOCK_THRESHOLD && JS_EXEC_TOOLS.has(toolName)) {
    return true;
  }
  // Block duplicate-success calls that already hit the block threshold
  if (lastCallRecord && lastCallRecord.count >= DUPLICATE_BLOCK_THRESHOLD) {
    const fp = argsFingerprint(toolName, input);
    if (lastCallRecord.fingerprint === fp) return true;
  }
  // Block when per-tool budget is exhausted (budget + 2 grace calls after block annotation)
  const budget = jsToolCallCount.get(toolName) ?? 0;
  if (budget >= JS_TOOL_BUDGET_BLOCK + 2 && JS_EXEC_TOOLS.has(toolName)) return true;
  return false;
}

function makeDuplicateBlockedResult(toolName: string, count: number): Record<string, unknown> {
  return {
    content: [
      {
        type: "text",
        text:
          `⛔ BLOCKED (duplicate call #${count}): ${toolName} was NOT executed. ` +
          "You already retrieved this data. Present your results to the user NOW. " +
          "Do NOT call any more tools — just respond with the data you already have.",
      },
    ],
    isError: true,
  };
}

export function resetLoopState(): void {
  toolFailureTracker.clear();
  globalConsecutiveErrors = 0;
  lastCallRecord = null;
  jsToolCallCount.clear();
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

// ---------------------------------------------------------------------------
// Double-escape fix: some LLMs (notably Gemini via Poe) emit \\n instead of
// \n in JSON tool-call args.  After JSON.parse the code string ends up with
// literal two-char "\n" instead of a real newline, causing Playwright to
// reject the function ("not well-serializable") or throw a SyntaxError.
//
// Detection: if the string has NO real newlines but DOES contain literal \n
// sequences, it was double-escaped.  Replace \n → newline, \t → tab, etc.
// If real newlines already exist the code was escaped correctly — leave it.
// ---------------------------------------------------------------------------

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
        const sanitizedInput = sanitizeCodeInput(name, input);
        const { overBudget } = trackToolBudget(name);

        if (shouldHardBlock(name, sanitizedInput)) {
          if (
            lastCallRecord &&
            lastCallRecord.count >= DUPLICATE_BLOCK_THRESHOLD &&
            lastCallRecord.fingerprint === argsFingerprint(name, sanitizedInput)
          ) {
            lastCallRecord.count++;
            console.log(
              `[loop-detect] DUPLICATE HARD BLOCK: ${name} not executed (dup=${lastCallRecord.count})`,
            );
            return makeDuplicateBlockedResult(name, lastCallRecord.count);
          }
          if (overBudget) {
            const budgetCount = jsToolCallCount.get(name) ?? 0;
            console.log(
              `[loop-detect] BUDGET HARD BLOCK: ${name} not executed (budget=${budgetCount})`,
            );
            return makeBlockedResult(name, budgetCount);
          }
          console.log(
            `[loop-detect] HARD BLOCK: ${name} not executed (global=${globalConsecutiveErrors})`,
          );
          globalConsecutiveErrors++;
          return makeBlockedResult(name, globalConsecutiveErrors);
        }

        const current = rawTools[name] as Record<string, unknown> | undefined;
        const exec = (current?.execute as typeof origExec) ?? origExec;

        let result = await exec(sanitizedInput, ctx);

        if (isBrowserClosedError(result)) {
          await restartBrowser();
          const fresh = rawTools[name] as Record<string, unknown> | undefined;
          const freshExec = fresh?.execute as typeof origExec | undefined;
          if (freshExec) result = await freshExec(sanitizedInput, ctx);
        }

        return trackAndAnnotate(name, sanitizedInput, result);
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
