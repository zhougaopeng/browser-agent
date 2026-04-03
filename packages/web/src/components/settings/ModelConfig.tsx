import { BrainCircuitIcon, SparklesIcon } from "lucide-react";
import type { AppSettings } from "../../env";
import { detectThinkingSupport } from "../../lib/thinking-utils";
import { useSettingsStore } from "../../stores/settings";

const PROVIDERS = ["openai", "anthropic", "google", "deepseek", "poe"];

interface ModelConfigProps {
  settings: AppSettings;
}

export function ModelConfig({ settings }: ModelConfigProps) {
  const update = useSettingsStore((s) => s.updateSetting);
  const thinkingEnabled = settings.model.thinking?.enabled ?? false;
  const budgetTokens = settings.model.thinking?.budgetTokens ?? 8000;
  const providerHint = settings.model.thinking?.providerHint ?? "auto";

  // 根据当前 provider + model 名称自动判断思维链支持情况
  const thinkingSupport = detectThinkingSupport(settings.model.provider, settings.model.name);

  // 是否显示思维链配置：自动检测到 configurable/native，或用户手动选择了 hint
  const showConfigurable =
    thinkingSupport.mode === "configurable" ||
    (thinkingSupport.mode === "none" && providerHint !== "auto");
  const showNative = thinkingSupport.mode === "native" && providerHint === "auto";
  // 任何情况下都显示"手动模式"选项（让用户能覆盖检测结果）
  const showManualHint = true;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-gray-700">模型配置</h2>
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Provider</span>
          <select
            value={settings.model.provider}
            onChange={(e) => update("model.provider", e.target.value)}
            className="w-full rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40"
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
            className="w-full rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Title Model Name</span>
          <input
            type="text"
            value={settings.model.titleModelName ?? ""}
            onChange={(e) => update("model.titleModelName", e.target.value)}
            placeholder={settings.model.name || "留空则使用主模型"}
            className="w-full rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">API Key</span>
          <input
            type="password"
            value={settings.model.apiKey}
            onChange={(e) => update("model.apiKey", e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
        </label>

        {/* ── 思维链区域 ── */}

        {/* native 模式：模型内置推理，无需配置 */}
        {showNative && (
          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
            <SparklesIcon className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
            <div>
              <p className="text-xs font-medium text-foreground">思维链已内置</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {thinkingSupport.label}——该模型自动输出推理过程，无需额外配置
              </p>
            </div>
          </div>
        )}

        {/* configurable / 手动模式：可开关 + 预算 */}
        {showConfigurable && (
          <div className="mt-1 rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <BrainCircuitIcon className="size-3.5 text-primary/70" />
                  <span className="text-xs font-medium text-foreground">思维链</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {thinkingSupport.mode === "configurable"
                    ? thinkingSupport.label
                    : `手动模式（${providerHint} API 格式）`}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={thinkingEnabled}
                onClick={() => update("model.thinking.enabled", !thinkingEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  thinkingEnabled ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    thinkingEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {thinkingEnabled && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">思考 Token 预算</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">
                      {budgetTokens.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1024}
                    max={32000}
                    step={512}
                    value={budgetTokens}
                    onChange={(e) => update("model.thinking.budgetTokens", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>1K（快速）</span>
                    <span>32K（深思）</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 手动模式选择器——始终显示，供用户覆盖自动检测 */}
        {showManualHint && (
          <div className="rounded-xl border border-border/40 bg-muted/10 px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Thinking API 格式</p>
                <p className="text-[10px] text-muted-foreground/60">
                  无法自动识别时，手动指定 API 调用方式
                </p>
              </div>
              <select
                value={providerHint}
                onChange={(e) =>
                  update(
                    "model.thinking.providerHint",
                    e.target.value as "auto" | "anthropic" | "google",
                  )
                }
                className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent/40"
              >
                <option value="auto">自动检测</option>
                <option value="anthropic">Anthropic（claude thinking）</option>
                <option value="google">Google（Gemini thinkingConfig）</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
