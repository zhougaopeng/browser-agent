import type { AppInstance } from "../index";

export function getSettings(app: AppInstance) {
  return app.settingsStore.store;
}

export async function updateSetting(app: AppInstance, key: string, value: unknown) {
  (app.settingsStore as unknown as { set: (k: string, v: unknown) => void }).set(key, value);
  await app.rebuild();
  return app.settingsStore.store;
}
