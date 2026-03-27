import { create } from "zustand";
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
    const settings = await window.electronAPI.settings.get();
    set({ settings, loading: false });
  },
  updateSetting: async (key, value) => {
    await window.electronAPI.settings.set(key, value);
  },
}));

window.electronAPI.settings.onChanged((settings) => {
  useSettingsStore.setState({ settings });
});
