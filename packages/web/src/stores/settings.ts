import { create } from "zustand";
import { api } from "../api/adapter";
import type { AppSettings } from "../env";

function setByPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop() ?? "";
  let cur = obj;
  for (const k of keys) {
    cur[k] = { ...(cur[k] as Record<string, unknown>) };
    cur = cur[k] as Record<string, unknown>;
  }
  cur[last] = value;
}

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,
  fetchSettings: async () => {
    const settings = await api.settings.get();
    set({ settings, loading: false });
  },
  updateSetting: async (key, value) => {
    const prev = get().settings;
    if (!prev) return;
    const next = { ...prev } as unknown as Record<string, unknown>;
    setByPath(next, key, value);
    set({ settings: next as unknown as AppSettings });
    await api.settings.set(key, value);
  },
}));
