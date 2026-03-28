import { useState } from "react";
import type { AppSettings } from "../../env";
import { useSettingsStore } from "../../stores/settings";

const BROWSERS = ["chrome", "firefox", "webkit"] as const;

interface BrowserConfigProps {
  settings: AppSettings;
}

export function BrowserConfig({ settings }: BrowserConfigProps) {
  const update = useSettingsStore((s) => s.updateSetting);
  const [switching, setSwitching] = useState(false);

  const handleHeadlessToggle = async () => {
    setSwitching(true);
    await update("browser.headless", !settings.browser.headless);
    // settings:changed 回调会更新 store，届时 switching 状态自动结束
    setTimeout(() => setSwitching(false), 3000);
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-gray-700">浏览器配置</h2>
      <div className="flex flex-col gap-3">
        {/* Headless Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-700">无头模式</span>
            <p className="text-xs text-gray-400">
              {switching ? "正在切换，重建 MCP 客户端..." : "不显示浏览器窗口"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleHeadlessToggle}
            disabled={switching}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.browser.headless ? "bg-accent" : "bg-gray-300"
            } ${switching ? "opacity-50" : ""}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                settings.browser.headless ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Browser Type */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">浏览器类型</span>
          <select
            value={settings.browser.browser}
            onChange={(e) => update("browser.browser", e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
          >
            {BROWSERS.map((b) => (
              <option key={b} value={b}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {/* Executable Path */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">可执行文件路径（可选）</span>
          <input
            type="text"
            value={settings.browser.executablePath ?? ""}
            onChange={(e) => update("browser.executablePath", e.target.value || undefined)}
            placeholder="自动检测"
            className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>

        {/* User Data Dir */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">User Data 目录（可选）</span>
          <input
            type="text"
            value={settings.browser.userDataDir ?? ""}
            onChange={(e) => update("browser.userDataDir", e.target.value || undefined)}
            placeholder="默认 profile"
            className="w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>
      </div>
    </section>
  );
}
