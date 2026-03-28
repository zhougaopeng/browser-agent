import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSettings = {
  model: { provider: "openai", name: "gpt-4.1", apiKey: "sk-xxx" },
  browser: { headless: false, browser: "chrome" as const },
  skills: { directory: "~/.browser-agent/skills" },
};

const mockApi = {
  chatTransport: {},
  settings: {
    get: vi.fn().mockResolvedValue(mockSettings),
    set: vi.fn().mockResolvedValue(undefined),
  },
  threads: {
    list: vi.fn().mockResolvedValue({ threads: [], hasMore: false }),
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
    const { fetchSettings } = useSettingsStore.getState();
    await fetchSettings();

    const { updateSetting } = useSettingsStore.getState();
    await updateSetting("model.name", "claude-4");

    expect(mockApi.settings.set).toHaveBeenCalledWith("model.name", "claude-4");
  });

  it("updateSetting optimistically updates local state", async () => {
    const { fetchSettings } = useSettingsStore.getState();
    await fetchSettings();

    const { updateSetting } = useSettingsStore.getState();
    await updateSetting("model.name", "claude-4");

    const state = useSettingsStore.getState();
    expect(state.settings?.model.name).toBe("claude-4");
  });
});
