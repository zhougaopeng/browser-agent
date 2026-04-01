import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface TracerToolCallPayload {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
}

interface TracerToolResultPayload {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

interface StepFinishEvent {
  runId?: string;
  text?: string;
  finishReason?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  toolCalls?: ReadonlyArray<{ payload: TracerToolCallPayload }>;
  toolResults?: ReadonlyArray<{ payload: TracerToolResultPayload }>;
}

const MAX_CONSOLE_LEN = 300;

function truncate(str: string, max = MAX_CONSOLE_LEN): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}... (${str.length - max} more chars)`;
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

export class AgentTracer {
  private agentId: string;
  private tracesDir: string;
  private stepCounters = new Map<string, number>();
  private stepTimestamps = new Map<string, number>();
  private initPromise: Promise<void> | null = null;

  constructor(agentId: string, tracesDir: string) {
    this.agentId = agentId;
    this.tracesDir = tracesDir;
  }

  private ensureDir(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = mkdir(this.tracesDir, { recursive: true }).then(() => {});
    }
    return this.initPromise;
  }

  onStepFinish = async (event: StepFinishEvent) => {
    const runId: string = event.runId || "unknown";
    const now = Date.now();

    const step = (this.stepCounters.get(runId) || 0) + 1;
    this.stepCounters.set(runId, step);

    const lastTs = this.stepTimestamps.get(runId) || now;
    const durationMs = step === 1 ? 0 : now - lastTs;
    this.stepTimestamps.set(runId, now);

    const durationStr = step === 1 ? "-" : `${(durationMs / 1000).toFixed(1)}s`;

    const toolCalls = (event.toolCalls ?? []).map((tc) => tc.payload);
    const toolResults = (event.toolResults ?? []).map((tr) => tr.payload);

    if (toolCalls.length === 0 && event.text) {
      console.log(
        `\n[${this.agentId}] run=${runId.slice(0, 8)} step=${step} | TEXT | ${durationStr}`,
      );
      console.log(`  ${truncate(event.text)}`);
    }

    for (const tc of toolCalls) {
      const matchingResult = toolResults.find((tr) => tr.toolCallId === tc.toolCallId);
      const isError = matchingResult?.isError ?? false;
      const status = isError ? "ERROR" : "OK";

      console.log(
        `\n[${this.agentId}] run=${runId.slice(0, 8)} step=${step} | ${tc.toolName} | ${durationStr} | ${status}`,
      );
      console.log(`  -> args: ${truncate(safeStringify(tc.args || {}))}`);

      if (matchingResult) {
        const resultStr = safeStringify(matchingResult.result);
        if (isError) {
          console.log(`  <- error: ${truncate(resultStr)}`);
        } else {
          console.log(`  <- result: ${truncate(resultStr)}`);
        }
      }
    }

    if (event.usage?.totalTokens) {
      console.log(
        `  tokens: prompt=${event.usage.promptTokens || 0} completion=${event.usage.completionTokens || 0} total=${event.usage.totalTokens}`,
      );
    }

    await this.ensureDir();
    const traceFile = join(this.tracesDir, `${runId}.jsonl`);

    const lines: string[] = [];

    for (const tc of toolCalls) {
      const matchingResult = toolResults.find((tr) => tr.toolCallId === tc.toolCallId);
      const entry = {
        runId,
        step,
        timestamp: new Date(now).toISOString(),
        durationMs,
        toolName: tc.toolName,
        args: tc.args,
        result: matchingResult?.result ?? null,
        isError: matchingResult?.isError ?? false,
        finishReason: event.finishReason,
        usage: event.usage,
      };
      lines.push(safeStringify(entry));
    }

    if (toolCalls.length === 0 && event.text) {
      const entry = {
        runId,
        step,
        timestamp: new Date(now).toISOString(),
        durationMs,
        type: "text",
        text: event.text,
        finishReason: event.finishReason,
        usage: event.usage,
      };
      lines.push(safeStringify(entry));
    }

    if (lines.length > 0) {
      appendFile(traceFile, `${lines.join("\n")}\n`).catch((err) => {
        console.error(`[${this.agentId}] Failed to write trace:`, err);
      });
    }
  };
}
