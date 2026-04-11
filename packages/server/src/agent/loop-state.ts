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
// 2. **Per-tool** same-error counter.  Injects escalating text
//    into the tool result so the LLM can self-correct earlier.
// ---------------------------------------------------------------------------

interface LoopRecord {
  errorSignature: string;
  consecutiveCount: number;
}

interface DuplicateRecord {
  fingerprint: string;
  count: number;
}

const HARD_BLOCK_THRESHOLD = 4;
const JS_EXEC_TOOLS = new Set(["browser_evaluate", "browser_run_code"]);
const DUPLICATE_WARN_THRESHOLD = 2;
const DUPLICATE_BLOCK_THRESHOLD = 3;
const JS_TOOL_BUDGET_WARN = 3;
const JS_TOOL_BUDGET_BLOCK = 5;

function argsFingerprint(toolName: string, input: unknown): string {
  try {
    return `${toolName}:${JSON.stringify(input)}`;
  } catch {
    return `${toolName}:?`;
  }
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

function appendTextToResult(result: unknown, extra: string): unknown {
  try {
    const obj = result as { content?: Array<{ type: string; text: string }> };
    if (Array.isArray(obj?.content)) {
      const idx = obj.content.findIndex((c) => c.type === "text");
      if (idx >= 0) {
        const updated = [...obj.content];
        updated[idx] = { ...updated[idx], text: updated[idx].text + extra };
        return { ...obj, content: updated };
      }
    }
    if (typeof result === "string") {
      return result + extra;
    }
  } catch {
    /* return as-is */
  }
  return result;
}

export class LoopState {
  private toolFailureTracker = new Map<string, LoopRecord>();
  private globalConsecutiveErrors = 0;
  private lastCallRecord: DuplicateRecord | null = null;
  private jsToolCallCount = new Map<string, number>();

  reset(): void {
    this.toolFailureTracker.clear();
    this.globalConsecutiveErrors = 0;
    this.lastCallRecord = null;
    this.jsToolCallCount.clear();
  }

  trackToolBudget(toolName: string): { count: number; overBudget: boolean } {
    if (!JS_EXEC_TOOLS.has(toolName)) return { count: 0, overBudget: false };
    const prev = this.jsToolCallCount.get(toolName) ?? 0;
    const count = prev + 1;
    this.jsToolCallCount.set(toolName, count);
    return { count, overBudget: count > JS_TOOL_BUDGET_BLOCK };
  }

  shouldHardBlock(toolName: string, input: unknown): boolean {
    if (this.globalConsecutiveErrors >= HARD_BLOCK_THRESHOLD && JS_EXEC_TOOLS.has(toolName)) {
      return true;
    }
    if (this.lastCallRecord && this.lastCallRecord.count >= DUPLICATE_BLOCK_THRESHOLD) {
      const fp = argsFingerprint(toolName, input);
      if (this.lastCallRecord.fingerprint === fp) return true;
    }
    const budget = this.jsToolCallCount.get(toolName) ?? 0;
    if (budget >= JS_TOOL_BUDGET_BLOCK + 2 && JS_EXEC_TOOLS.has(toolName)) return true;
    return false;
  }

  handleHardBlock(
    toolName: string,
    input: unknown,
    overBudget: boolean,
  ): Record<string, unknown> | null {
    if (!this.shouldHardBlock(toolName, input)) return null;

    if (
      this.lastCallRecord &&
      this.lastCallRecord.count >= DUPLICATE_BLOCK_THRESHOLD &&
      this.lastCallRecord.fingerprint === argsFingerprint(toolName, input)
    ) {
      this.lastCallRecord.count++;
      console.log(
        `[loop-detect] DUPLICATE HARD BLOCK: ${toolName} not executed (dup=${this.lastCallRecord.count})`,
      );
      return makeDuplicateBlockedResult(toolName, this.lastCallRecord.count);
    }
    if (overBudget) {
      const budgetCount = this.jsToolCallCount.get(toolName) ?? 0;
      console.log(
        `[loop-detect] BUDGET HARD BLOCK: ${toolName} not executed (budget=${budgetCount})`,
      );
      return makeBlockedResult(toolName, budgetCount);
    }
    console.log(
      `[loop-detect] HARD BLOCK: ${toolName} not executed (global=${this.globalConsecutiveErrors})`,
    );
    this.globalConsecutiveErrors++;
    return makeBlockedResult(toolName, this.globalConsecutiveErrors);
  }

  trackAndAnnotate(toolName: string, input: unknown, result: unknown): unknown {
    const errorDetected = isErrorResult(result);

    if (!errorDetected) {
      this.globalConsecutiveErrors = 0;
      this.toolFailureTracker.delete(toolName);

      const fp = argsFingerprint(toolName, input);
      if (this.lastCallRecord && this.lastCallRecord.fingerprint === fp) {
        this.lastCallRecord.count++;
      } else {
        this.lastCallRecord = { fingerprint: fp, count: 1 };
      }

      if (this.lastCallRecord.count >= DUPLICATE_BLOCK_THRESHOLD) {
        console.log(
          `[loop-detect] DUPLICATE BLOCK: ${toolName} called ${this.lastCallRecord.count}x with identical args`,
        );
        return appendTextToResult(
          result,
          `\n\n⛔ DUPLICATE CALL BLOCKED (call #${this.lastCallRecord.count}): ` +
            "You already have this data from the previous identical call. " +
            "STOP calling this tool and present the results to the user immediately.",
        );
      }

      if (this.lastCallRecord.count >= DUPLICATE_WARN_THRESHOLD) {
        console.log(
          `[loop-detect] DUPLICATE WARN: ${toolName} called ${this.lastCallRecord.count}x with identical args`,
        );
        return appendTextToResult(
          result,
          `\n\n⚠️ DUPLICATE CALL (call #${this.lastCallRecord.count}): ` +
            "You called the same tool with the same arguments and got the same result. " +
            "You already have this data. Present the results to the user now.",
        );
      }

      const budget = this.jsToolCallCount.get(toolName) ?? 0;
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

    // --- Error tracking ---
    this.lastCallRecord = null;

    this.globalConsecutiveErrors++;
    const errorSig = extractErrorSignature(result);
    console.log(
      `[loop-detect] ${toolName} error detected – sig="${errorSig}" global=${this.globalConsecutiveErrors}`,
    );

    if (errorSig) {
      const existing = this.toolFailureTracker.get(toolName);
      if (existing && existing.errorSignature === errorSig) {
        existing.consecutiveCount++;
      } else {
        this.toolFailureTracker.set(toolName, { errorSignature: errorSig, consecutiveCount: 1 });
      }
    }

    const perTool = this.toolFailureTracker.get(toolName)?.consecutiveCount ?? 0;
    const effectiveCount = Math.max(this.globalConsecutiveErrors, perTool);

    if (effectiveCount >= 3) {
      console.log(
        `[loop-detect] ${toolName} – effective #${effectiveCount} ` +
          `(global=${this.globalConsecutiveErrors}, per-tool=${perTool}) – injecting STOP`,
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
          `(global=${this.globalConsecutiveErrors}, per-tool=${perTool}) – warning`,
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
}
