import type { AppSettings } from "../../env";
import { useSettingsStore } from "../../stores/settings";

const PROVIDERS = ["openai", "anthropic", "google", "deepseek"];

interface ModelConfigProps {
  settings: AppSettings;
}

export function ModelConfig({ settings }: ModelConfigProps) {
  const update = useSettingsStore((s) => s.updateSetting);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-gray-700">模型配置</h2>
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Provider</span>
          <select
            value={settings.model.provider}
            onChange={(e) => update("model.provider", e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Model Name</span>
          <input
            type="text"
            value={settings.model.name}
            onChange={(e) => update("model.name", e.target.value)}
            placeholder="gpt-4.1"
            className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">API Key</span>
          <input
            type="password"
            value={settings.model.apiKey}
            onChange={(e) => update("model.apiKey", e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>
      </div>
    </section>
  );
}
