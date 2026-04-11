import type { ToolsInput } from "@mastra/core/agent";
import type {
  ProcessInputStepArgs,
  ProcessInputStepResult,
  Processor,
} from "@mastra/core/processors";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getCurrentThreadId } from "./thread-context";

export const CORE_TOOL_NAMES = new Set([
  "browser_navigate",
  "browser_navigate_back",
  "browser_wait_for",
  "browser_tabs",
  "browser_click",
  "browser_type",
  "browser_fill_form",
  "browser_press_key",
  "browser_snapshot",
  "browser_take_screenshot",
  "browser_evaluate",
  "request_tools",
  "wait_for_user",
  "read_skill",
]);

export class ToolDisclosureState {
  private loaded = new Map<string, Set<string>>();

  load(threadId: string, toolNames: string[]): void {
    let set = this.loaded.get(threadId);
    if (!set) {
      set = new Set();
      this.loaded.set(threadId, set);
    }
    for (const name of toolNames) {
      set.add(name);
    }
  }

  getLoaded(threadId: string): Set<string> {
    return this.loaded.get(threadId) ?? new Set();
  }

  reset(threadId: string): void {
    this.loaded.delete(threadId);
  }
}

export class ToolDisclosureProcessor implements Processor {
  readonly id = "tool-disclosure";

  constructor(private state: ToolDisclosureState) {}

  async processInputStep(_args: ProcessInputStepArgs): Promise<ProcessInputStepResult> {
    const active = [...CORE_TOOL_NAMES];

    const threadId = getCurrentThreadId();
    if (threadId) {
      for (const name of this.state.getLoaded(threadId)) {
        active.push(name);
      }
    }

    return { activeTools: active };
  }
}

function extractDescription(tool: unknown): string {
  const t = tool as Record<string, unknown>;
  if (typeof t.description === "string") return t.description;
  return "(no description)";
}

interface RequestToolsResult {
  loaded: string[];
  descriptions: string[];
  invalid: string[];
}

export function createRequestToolsTool(state: ToolDisclosureState, allNonCoreTools: ToolsInput) {
  const availableNames = Object.keys(allNonCoreTools);

  return createTool({
    id: "request_tools",
    description:
      "Load additional browser tools that are not in the core set. " +
      "Pass the exact tool names you need. " +
      "The tools become available on your next action. " +
      `Available: ${availableNames.join(", ")}`,
    inputSchema: z.object({
      tool_names: z.array(z.string()).min(1).describe("Names of the tools to load"),
    }),
    outputSchema: z.object({
      loaded: z.array(z.string()),
      descriptions: z.array(z.string()),
      invalid: z.array(z.string()),
    }),
    execute: async ({ tool_names }): Promise<RequestToolsResult> => {
      const threadId = getCurrentThreadId();
      const loaded: string[] = [];
      const descriptions: string[] = [];
      const invalid: string[] = [];

      for (const name of tool_names) {
        if (CORE_TOOL_NAMES.has(name)) {
          loaded.push(name);
          descriptions.push(`${name}: already available (core tool)`);
          continue;
        }
        const tool = allNonCoreTools[name];
        if (!tool) {
          invalid.push(name);
          continue;
        }
        loaded.push(name);
        descriptions.push(`${name}: ${extractDescription(tool)}`);
      }

      if (threadId && loaded.length > 0) {
        state.load(threadId, loaded);
      }

      return { loaded, descriptions, invalid };
    },
  });
}

export function splitTools(allBrowserTools: ToolsInput): {
  coreTools: ToolsInput;
  nonCoreTools: ToolsInput;
} {
  const coreTools: ToolsInput = {};
  const nonCoreTools: ToolsInput = {};

  for (const [name, tool] of Object.entries(allBrowserTools)) {
    if (CORE_TOOL_NAMES.has(name)) {
      coreTools[name] = tool;
    } else {
      nonCoreTools[name] = tool;
    }
  }

  return { coreTools, nonCoreTools };
}
