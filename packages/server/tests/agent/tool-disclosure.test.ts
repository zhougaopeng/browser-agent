import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CORE_TOOL_NAMES,
  createRequestToolsTool,
  splitTools,
  ToolDisclosureProcessor,
  ToolDisclosureState,
} from "../../src/agent/tool-disclosure";

let mockThreadId: string | undefined;

vi.mock("../../src/agent/thread-context", () => ({
  getCurrentThreadId: () => mockThreadId,
  runWithThread: <T>(id: string, fn: () => T): T => {
    mockThreadId = id;
    try {
      return fn();
    } finally {
      mockThreadId = undefined;
    }
  },
}));

function setThreadId(id: string | undefined) {
  mockThreadId = id;
}

const fakeBrowserTools = {
  browser_navigate: { description: "Navigate to URL" },
  browser_click: { description: "Click an element" },
  browser_snapshot: { description: "Get page snapshot" },
  browser_evaluate: { description: "Evaluate JS expression" },
  browser_hover: { description: "Hover over element", execute: vi.fn() },
  browser_drag: { description: "Drag and drop", execute: vi.fn() },
  browser_select_option: { description: "Select dropdown option", execute: vi.fn() },
  browser_mouse_click_xy: { description: "Click at coordinates", execute: vi.fn() },
  browser_run_code: { description: "Run Playwright code", execute: vi.fn() },
  browser_console_messages: { description: "Get console messages", execute: vi.fn() },
};

describe("ToolDisclosureState", () => {
  let state: ToolDisclosureState;

  beforeEach(() => {
    state = new ToolDisclosureState();
  });

  it("returns empty set for unknown thread", () => {
    const loaded = state.getLoaded("unknown-thread");
    expect(loaded.size).toBe(0);
  });

  it("loads tools for a thread", () => {
    state.load("t1", ["browser_hover", "browser_drag"]);
    const loaded = state.getLoaded("t1");
    expect(loaded).toContain("browser_hover");
    expect(loaded).toContain("browser_drag");
    expect(loaded.size).toBe(2);
  });

  it("accumulates tools across multiple load calls", () => {
    state.load("t1", ["browser_hover"]);
    state.load("t1", ["browser_drag"]);
    const loaded = state.getLoaded("t1");
    expect(loaded.size).toBe(2);
    expect(loaded).toContain("browser_hover");
    expect(loaded).toContain("browser_drag");
  });

  it("does not duplicate tools", () => {
    state.load("t1", ["browser_hover", "browser_hover"]);
    expect(state.getLoaded("t1").size).toBe(1);
  });

  it("isolates state between threads", () => {
    state.load("t1", ["browser_hover"]);
    state.load("t2", ["browser_drag"]);
    expect(state.getLoaded("t1")).toContain("browser_hover");
    expect(state.getLoaded("t1")).not.toContain("browser_drag");
    expect(state.getLoaded("t2")).toContain("browser_drag");
    expect(state.getLoaded("t2")).not.toContain("browser_hover");
  });

  it("reset clears tools for a thread", () => {
    state.load("t1", ["browser_hover"]);
    state.reset("t1");
    expect(state.getLoaded("t1").size).toBe(0);
  });

  it("reset does not affect other threads", () => {
    state.load("t1", ["browser_hover"]);
    state.load("t2", ["browser_drag"]);
    state.reset("t1");
    expect(state.getLoaded("t2")).toContain("browser_drag");
  });
});

describe("ToolDisclosureProcessor", () => {
  let state: ToolDisclosureState;
  let processor: ToolDisclosureProcessor;

  beforeEach(() => {
    state = new ToolDisclosureState();
    processor = new ToolDisclosureProcessor(state);
  });

  it("returns core tools when no thread context", async () => {
    setThreadId(undefined);
    const result = await processor.processInputStep(
      {} as Parameters<typeof processor.processInputStep>[0],
    );
    const active = (result as { activeTools: string[] }).activeTools;
    for (const name of CORE_TOOL_NAMES) {
      expect(active).toContain(name);
    }
    expect(active.length).toBe(CORE_TOOL_NAMES.size);
  });

  it("includes loaded tools in activeTools", async () => {
    setThreadId("t1");
    state.load("t1", ["browser_hover", "browser_mouse_click_xy"]);

    const result = await processor.processInputStep(
      {} as Parameters<typeof processor.processInputStep>[0],
    );
    const active = (result as { activeTools: string[] }).activeTools;
    expect(active).toContain("browser_hover");
    expect(active).toContain("browser_mouse_click_xy");
    for (const name of CORE_TOOL_NAMES) {
      expect(active).toContain(name);
    }
  });

  it("does not include non-loaded non-core tools", async () => {
    setThreadId("t1");
    const result = await processor.processInputStep(
      {} as Parameters<typeof processor.processInputStep>[0],
    );
    const active = (result as { activeTools: string[] }).activeTools;
    expect(active).not.toContain("browser_hover");
    expect(active).not.toContain("browser_mouse_click_xy");
  });
});

describe("createRequestToolsTool", () => {
  let state: ToolDisclosureState;

  beforeEach(() => {
    state = new ToolDisclosureState();
    setThreadId("t1");
  });

  function createToolWithExecute() {
    const { nonCoreTools } = splitTools(fakeBrowserTools);
    const tool = createRequestToolsTool(state, nonCoreTools);
    const exec = tool.execute as (
      input: { tool_names: string[] },
      ctx: never,
    ) => Promise<{ loaded: string[]; descriptions: string[]; invalid: string[] }>;
    return { tool, exec };
  }

  it("loads valid non-core tools and returns descriptions", async () => {
    const { exec } = createToolWithExecute();
    const result = await exec({ tool_names: ["browser_hover", "browser_drag"] }, {} as never);
    expect(result.loaded).toContain("browser_hover");
    expect(result.loaded).toContain("browser_drag");
    expect(result.invalid).toHaveLength(0);
    expect(result.descriptions.length).toBe(2);
    expect(result.descriptions[0]).toContain("browser_hover");
    expect(state.getLoaded("t1")).toContain("browser_hover");
    expect(state.getLoaded("t1")).toContain("browser_drag");
  });

  it("reports invalid tool names", async () => {
    const { exec } = createToolWithExecute();
    const result = await exec({ tool_names: ["browser_nonexistent"] }, {} as never);
    expect(result.loaded).toHaveLength(0);
    expect(result.invalid).toContain("browser_nonexistent");
  });

  it("handles core tools gracefully (already available)", async () => {
    const { exec } = createToolWithExecute();
    const result = await exec({ tool_names: ["browser_navigate"] }, {} as never);
    expect(result.loaded).toContain("browser_navigate");
    expect(result.descriptions[0]).toContain("already available");
  });

  it("handles mix of valid, invalid, and core tools", async () => {
    const { exec } = createToolWithExecute();
    const result = await exec(
      { tool_names: ["browser_hover", "browser_nonexistent", "browser_click"] },
      {} as never,
    );
    expect(result.loaded).toEqual(["browser_hover", "browser_click"]);
    expect(result.invalid).toEqual(["browser_nonexistent"]);
  });

  it("does not write to state when no thread context", async () => {
    setThreadId(undefined);
    const { exec } = createToolWithExecute();
    const result = await exec({ tool_names: ["browser_hover"] }, {} as never);
    expect(result.loaded).toContain("browser_hover");
    expect(state.getLoaded("t1").size).toBe(0);
  });

  it("lists available non-core tools in description", () => {
    const { tool } = createToolWithExecute();
    const desc = (tool as { description: string }).description;
    expect(desc).toContain("browser_hover");
    expect(desc).toContain("browser_mouse_click_xy");
    expect(desc).not.toContain("browser_navigate");
  });
});

describe("splitTools", () => {
  it("separates core and non-core tools", () => {
    const { coreTools, nonCoreTools } = splitTools(fakeBrowserTools);
    expect(Object.keys(coreTools)).toContain("browser_navigate");
    expect(Object.keys(coreTools)).toContain("browser_click");
    expect(Object.keys(coreTools)).toContain("browser_evaluate");
    expect(Object.keys(nonCoreTools)).toContain("browser_hover");
    expect(Object.keys(nonCoreTools)).toContain("browser_mouse_click_xy");
    expect(Object.keys(nonCoreTools)).not.toContain("browser_navigate");
  });

  it("preserves all tools (no tool lost)", () => {
    const { coreTools, nonCoreTools } = splitTools(fakeBrowserTools);
    const total = Object.keys(coreTools).length + Object.keys(nonCoreTools).length;
    expect(total).toBe(Object.keys(fakeBrowserTools).length);
  });
});
