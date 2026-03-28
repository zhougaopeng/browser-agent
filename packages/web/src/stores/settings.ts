import { create } from "zustand";
import { api } from "../api/adapter";
import type { AppSettings } from "../env";

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: true,
  fetchSettings: async () => {
    const settings = await api.settings.get();
    set({ settings, loading: false });
  },
  updateSetting: async (key, value) => {
    await api.settings.set(key, value);
  },
}));

api.settings.onChanged((settings) => {
  useSettingsStore.setState({ settings });
});
