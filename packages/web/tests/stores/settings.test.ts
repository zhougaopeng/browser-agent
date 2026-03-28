import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSettings = {
  model: { provider: "openai", name: "gpt-4.1", apiKey: "sk-xxx" },
  browser: { headless: false, browser: "chrome" as const },
  skills: { directory: "~/.browser-agent/skills" },
};

type SettingsChangedCallback = (settings: typeof mockSettings) => void;
let onChangedCallback: SettingsChangedCallback | null = null;

const mockApi = {
  chatTransport: {},
  settings: {
    get: vi.fn().mockResolvedValue(mockSettings),
    set: vi.fn().mockResolvedValue(undefined),
    onChanged: vi.fn((cb: SettingsChangedCallback) => {
      onChangedCallback = cb;
      return () => {};
    }),
  },
  threads: {
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
};

vi.mock("../../src/api/adapter", () => ({
  api: mockApi,
  isElectron: false,
}));

describe("useSettingsStore", () => {
  type SettingsModule = typeof import("../../src/stores/settings");
  let useSettingsStore: SettingsModule["useSettingsStore"];

  beforeEach(async () => {
    vi.clearAllMocks();
    onChangedCallback = null;
    vi.resetModules();

    const mod = await import("../../src/stores/settings");
    useSettingsStore = mod.useSettingsStore;
  });

  it("has null settings and loading=true as initial state", () => {
    const state = useSettingsStore.getState();

    expect(state.settings).toBeNull();
    expect(state.loading).toBe(true);
  });

  it("fetchSettings calls api.settings.get and updates state", async () => {
    const { fetchSettings } = useSettingsStore.getState();

    await fetchSettings();

    expect(mockApi.settings.get).toHaveBeenCalled();

    const state = useSettingsStore.getState();
    expect(state.settings).toEqual(mockSettings);
    expect(state.loading).toBe(false);
  });

  it("updateSetting calls api.settings.set with key and value", async () => {
    const { updateSetting } = useSettingsStore.getState();

    await updateSetting("model.name", "claude-4");

    expect(mockApi.settings.set).toHaveBeenCalledWith("model.name", "claude-4");
  });

  it("onChanged listener updates settings in store", async () => {
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
