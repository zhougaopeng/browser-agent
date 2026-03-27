import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * setupSettingsIPC 行为契约 (基于计划四 §四):
 *
 * - 注册 settings:get handler → 返回全部设置
 * - 注册 settings:set handler → 更新指定 key
 * - settings:set 当 key 以 "browser." 开头 → 触发 initBrowserTools 重建 MCP
 * - settings:set 之后 → 通过 webContents.send 推送 settings:changed
 */

interface MockStoreModel {
  provider: string;
  name: string;
  apiKey: string;
}

interface MockStoreData {
  model: MockStoreModel;
  browser: { headless: boolean; browser: string };
  skills: { directory: string };
  [key: string]: unknown;
}

const mockStore: MockStoreData = {
  model: { provider: "openai", name: "gpt-4.1", apiKey: "" },
  browser: { headless: false, browser: "chrome" },
  skills: { directory: "~/.browser-agent/skills" },
};

vi.mock("../../../src/main/store/settings", () => ({
  settingsStore: {
    store: mockStore,
    get: vi.fn((key: string) => mockStore[key]),
    set: vi.fn((key: string, value: unknown) => {
      const parts = key.split(".");
      if (parts.length === 2) {
        const section = mockStore[parts[0]];
        if (section && typeof section === "object") {
          (section as Record<string, unknown>)[parts[1]] = value;
        }
      } else {
        mockStore[key] = value;
      }
    }),
  },
}));

const mockInitBrowserTools = vi.fn().mockResolvedValue({});
vi.mock("../../../src/main/agent/browser-tools", () => ({
  initBrowserTools: mockInitBrowserTools,
}));

type IpcHandler = (...args: unknown[]) => Promise<unknown> | unknown;
const handlers: Record<string, IpcHandler> = {};
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers[channel] = handler;
    }),
  },
}));

describe("setupSettingsIPC", () => {
  let setupSettingsIPC: (mainWindow: unknown) => void;
  let mockMainWindow: { webContents: { send: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) {
      delete handlers[k];
    }

    mockMainWindow = {
      webContents: {
        send: vi.fn(),
      },
    };

    const mod = await import("../../../src/main/ipc/settings");
    setupSettingsIPC = mod.setupSettingsIPC;
    setupSettingsIPC(mockMainWindow);
  });

  it("registers settings:get handler", () => {
    expect(handlers["settings:get"]).toBeDefined();
  });

  it("registers settings:set handler", () => {
    expect(handlers["settings:set"]).toBeDefined();
  });

  it("settings:get returns all settings", async () => {
    const result = await handlers["settings:get"]();
    expect(result).toEqual(mockStore);
  });

  it("settings:set updates the value in store", async () => {
    const { settingsStore } = await import("../../../src/main/store/settings");

    await handlers["settings:set"]({}, "model.name", "claude-4");

    expect(settingsStore.set).toHaveBeenCalledWith("model.name", "claude-4");
  });

  it("settings:set triggers initBrowserTools when key starts with browser.", async () => {
    await handlers["settings:set"]({}, "browser.headless", true);

    expect(mockInitBrowserTools).toHaveBeenCalledWith(
      expect.objectContaining({ browser: "chrome" }),
    );
  });

  it("settings:set does NOT trigger initBrowserTools for non-browser keys", async () => {
    await handlers["settings:set"]({}, "model.name", "gpt-4.1-mini");

    expect(mockInitBrowserTools).not.toHaveBeenCalled();
  });

  it("settings:set sends settings:changed to renderer", async () => {
    await handlers["settings:set"]({}, "model.name", "gpt-4.1-mini");

    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith("settings:changed", mockStore);
  });
});
