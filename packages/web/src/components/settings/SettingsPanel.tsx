import { useEffect } from "react";
import { useSettingsStore } from "../../stores/settings";
import { BrowserConfig } from "./BrowserConfig";
import { ModelConfig } from "./ModelConfig";

export function SettingsPanel() {
  const { settings, loading, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading || !settings) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载设置...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-lg px-6 py-6">
        <h1 className="mb-6 text-lg font-semibold text-foreground">设置</h1>
        <div className="flex flex-col gap-8">
          <ModelConfig settings={settings} />
          <BrowserConfig settings={settings} />

          <section>
            <h2 className="mb-3 text-sm font-medium text-foreground/80">Skills 配置</h2>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Skills 根目录</span>
              <input
                type="text"
                value={settings.skills.directory}
                onChange={(e) =>
                  useSettingsStore.getState().updateSetting("skills.directory", e.target.value)
                }
                className="w-full rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40"
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
