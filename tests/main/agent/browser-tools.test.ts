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
  MCPClient: vi.fn().mockImplementation(MockMCPClient),
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
}));

vi.mock("../../../src/main/paths", () => ({
  paths: {
    db: "/mock-userData/mastra.db",
    traces: "/mock-userData/traces",
    playwrightProfile: "/mock-userData/playwright-profile",
  },
}));

/**
 * initBrowserTools 行为契约 (基于计划二 §五):
 *
 * - 使用 npx @playwright/mcp@latest 启动 MCP 服务器
 * - 默认参数: --browser chrome, --caps vision, --init-script overlay-init.js
 * - 可选参数: --headless, --executable-path
 * - --user-data-dir 始终存在 (有 config 值时用 config 值, 否则用默认 .playwright-profile)
 * - 使用 listToolsets() 获取无命名空间的工具 (playwright toolset)
 * - 重新初始化时先断开旧连接
 * - 返回 tools 列表
 */
describe("initBrowserTools", () => {
  let MCPClientMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mastraMcp = await import("@mastra/mcp");
    MCPClientMock = mastraMcp.MCPClient as unknown as ReturnType<typeof vi.fn>;
  });

  async function getModule() {
    vi.resetModules();
    return import("../../../src/main/agent/browser-tools");
  }

  it("creates MCPClient with correct default args", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });

    expect(MCPClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "playwright-browser",
        servers: expect.objectContaining({
          playwright: expect.objectContaining({
            command: "npx",
            args: expect.arrayContaining([
              "@playwright/mcp@latest",
              "--browser",
              "chrome",
              "--caps",
              "vision",
            ]),
          }),
        }),
      }),
    );
  });

  it("includes --init-script with overlay-init.js path", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;
    const initScriptIdx = mcpArgs.indexOf("--init-script");

    expect(initScriptIdx).toBeGreaterThan(-1);
    expect(mcpArgs[initScriptIdx + 1]).toContain("overlay-init.js");
  });

  it("adds --headless when headless is true", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: true });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--headless");
  });

  it("does NOT include --headless when headless is false", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).not.toContain("--headless");
  });

  it("uses custom --user-data-dir when provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({
      browser: "chrome",
      headless: false,
      userDataDir: "/tmp/chrome-profile",
    });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--user-data-dir");
    expect(mcpArgs).toContain("/tmp/chrome-profile");
  });

  it("uses default --user-data-dir from userData when not provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--user-data-dir");
    const idx = mcpArgs.indexOf("--user-data-dir");
    expect(mcpArgs[idx + 1]).toBe("/mock-userData/playwright-profile");
  });

  it("includes --executable-path when provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({
      browser: "firefox",
      headless: false,
      executablePath: "/usr/bin/firefox",
    });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).toContain("--executable-path");
    expect(mcpArgs).toContain("/usr/bin/firefox");
  });

  it("omits --executable-path when not provided", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });

    const callArgs = MCPClientMock.mock.calls[0][0];
    const mcpArgs: string[] = callArgs.servers.playwright.args;

    expect(mcpArgs).not.toContain("--executable-path");
  });

  it("calls listToolsets and returns the playwright toolset", async () => {
    const { initBrowserTools } = await getModule();

    const tools = await initBrowserTools({
      browser: "chrome",
      headless: false,
    });

    expect(mockListToolsets).toHaveBeenCalled();
    expect(tools).toEqual({ browser_navigate: {} });
  });

  it("disconnects existing client before creating new one", async () => {
    const { initBrowserTools } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });
    expect(mockDisconnect).not.toHaveBeenCalled();

    await initBrowserTools({ browser: "chrome", headless: true });
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("getMCPClient returns null before init", async () => {
    const { getMCPClient } = await getModule();
    expect(getMCPClient()).toBeNull();
  });

  it("getMCPClient returns client after init", async () => {
    const { initBrowserTools, getMCPClient } = await getModule();

    await initBrowserTools({ browser: "chrome", headless: false });

    expect(getMCPClient()).not.toBeNull();
    expect(getMCPClient()).toHaveProperty("listToolsets");
  });
});
