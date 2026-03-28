import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useSettingsStore 行为契约 (基于计划三 §四):
 *
 * - 初始状态: settings=null, loading=true
 * - fetchSettings: 调用 electronAPI.settings.get(), 更新 settings, loading=false
 * - updateSetting: 调用 electronAPI.settings.set(key, value)
 * - onChanged listener: 收到推送后更新 settings
 */

const mockSettings = {
  model: { provider: "openai", name: "gpt-4.1", apiKey: "sk-xxx" },
  browser: { headless: false, browser: "chrome" as const },
  skills: { directory: "~/.browser-agent/skills" },
};

type SettingsChangedCallback = (settings: typeof mockSettings) => void;
let onChangedCallback: SettingsChangedCallback | null = null;

const mockElectronAPI = {
  settings: {
    get: vi.fn().mockResolvedValue(mockSettings),
    set: vi.fn().mockResolvedValue(undefined),
    onChanged: vi.fn((cb: SettingsChangedCallback) => {
      onChangedCallback = cb;
    }),
  },
};

// Mock window.electronAPI
vi.stubGlobal("window", { electronAPI: mockElectronAPI });

describe("useSettingsStore", () => {
  type SettingsModule = typeof import("../../../src/renderer/stores/settings");
  let useSettingsStore: SettingsModule["useSettingsStore"];

  beforeEach(async () => {
    vi.clearAllMocks();
    onChangedCallback = null;
    vi.resetModules();

    const mod = await import("../../../src/renderer/stores/settings");
    useSettingsStore = mod.useSettingsStore;
  });

  it("has null settings and loading=true as initial state", () => {
    const state = useSettingsStore.getState();

    expect(state.settings).toBeNull();
    expect(state.loading).toBe(true);
  });

  it("fetchSettings calls electronAPI.settings.get and updates state", async () => {
    const { fetchSettings } = useSettingsStore.getState();

    await fetchSettings();

    expect(mockElectronAPI.settings.get).toHaveBeenCalled();

    const state = useSettingsStore.getState();
    expect(state.settings).toEqual(mockSettings);
    expect(state.loading).toBe(false);
  });

  it("updateSetting calls electronAPI.settings.set with key and value", async () => {
    const { updateSetting } = useSettingsStore.getState();

    await updateSetting("model.name", "claude-4");

    expect(mockElectronAPI.settings.set).toHaveBeenCalledWith("model.name", "claude-4");
  });

  it("onChanged listener updates settings in store", async () => {
    // 触发 onChanged 注册 (模块加载时自动注册)
    expect(onChangedCallback).not.toBeNull();

    const newSettings = {
      ...mockSettings,
      model: { ...mockSettings.model, name: "gpt-4.1-mini" },
    };

    onChangedCallback?.(newSettings);

    const state = useSettingsStore.getState();
    expect(state.settings).toEqual(newSettings);
  });
});
