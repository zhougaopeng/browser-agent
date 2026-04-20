import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListToolsets = vi.fn().mockResolvedValue({
  playwright: { browser_navigate: {} },
});
const mockDisconnect = vi.fn().mockResolvedValue(undefined);

class MockMCPClient {
  listToolsets = mockListToolsets;
  disconnect = mockDisconnect;
}

vi.mock("@mastra/mcp", () => ({
  // biome-ignore lint/suspicious/noExplicitAny: class constructor must masquerade as function for vi.fn()
  MCPClient: vi.fn().mockImplementation(MockMCPClient as any),
}));

const mockPaths = {
  db: "/mock-userData/mastra.db",
  traces: "/mock-userData/traces",
  playwrightProfile: "/mock-userData/playwright-profile",
  browserProfiles: "/mock-userData/browser-profiles",
  resourceId: "/mock-userData/resource-id",
} as const;

describe("initBrowserTools", () => {
  let MCPClientMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mastraMcp = await import("@mastra/mcp");
    MCPClientMock = mastraMcp.MCPClient as unknown as ReturnType<typeof vi.fn>;
  });

  async function getModule() {
    vi.resetModules();
    return import("../../src/agent/browser-tools");
  }

  it("creates MCPClient with correct default args", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    expect(MCPClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        servers: expect.objectContaining({
          playwright: expect.objectContaining({
            command: process.execPath,
            args: expect.arrayContaining([
              expect.stringMatching(/@playwright[/\\]mcp[/\\]cli\.js$/),
              "--browser",
              "chrome",
              "--caps",
              "vision",
            ]),
            env: expect.objectContaining({
              ELECTRON_RUN_AS_NODE: "1",
            }),
          }),
        }),
      }),
    );
  });

  it("includes --init-script with overlay-init.js path", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;
    const initScriptIdx = mcpArgs.indexOf("--init-script");

    expect(initScriptIdx).toBeGreaterThan(-1);
    expect(mcpArgs[initScriptIdx + 1]).toBe("/path/to/overlay-init.js");
  });

  it("adds --headless when headless is true", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: true },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--headless");
  });

  it("does NOT include --headless when headless is false", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).not.toContain("--headless");
  });

  it("uses custom --user-data-dir when provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false, userDataDir: "/tmp/chrome-profile" },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--user-data-dir");
    expect(mcpArgs).toContain("/tmp/chrome-profile");
  });

  it("uses per-thread --user-data-dir from browserProfiles when not provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--user-data-dir");
    const idx = mcpArgs.indexOf("--user-data-dir");
    expect(mcpArgs[idx + 1]).toMatch(/browser-profiles/);
  });

  it("includes --executable-path when provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "firefox", headless: false, executablePath: "/usr/bin/firefox" },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--executable-path");
    expect(mcpArgs).toContain("/usr/bin/firefox");
  });

  it("calls listToolsets and returns proxy tools for the playwright toolset", async () => {
    const { initBrowserTools } = await getModule();

    const tools = await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    expect(mockListToolsets).toHaveBeenCalled();
    expect(tools).toHaveProperty("browser_navigate");
  });

  it("destroys template session after schema discovery", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("getMCPClient returns null without threadId", async () => {
    const { initBrowserTools, getMCPClient } = await getModule();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    expect(getMCPClient()).toBeNull();
  });

  it("getSessionManager returns manager after init", async () => {
    const { initBrowserTools, getSessionManager } = await getModule();

    expect(getSessionManager()).toBeNull();

    await initBrowserTools(
      { browser: "chrome", headless: false },
      "/path/to/overlay-init.js",
      mockPaths,
    );

    expect(getSessionManager()).not.toBeNull();
  });
});
