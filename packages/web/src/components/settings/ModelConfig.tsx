import { BrainCircuitIcon, SparklesIcon } from "lucide-react";
import { useMemo } from "react";
import type { AppSettings } from "../../env";
import { getProviderConfig, MODEL_CATALOG, type ModelEntry } from "../../lib/model-catalog";
import { POE_SUB_PROVIDER_KEYS, POE_SUB_PROVIDERS, parsePoeModelName } from "../../lib/poe-models";
import { detectThinkingSupport } from "../../lib/thinking-utils";
import { useSettingsStore } from "../../stores/settings";

const PROVIDER_LIST: { id: string; label: string }[] = [
  ...Object.entries(MODEL_CATALOG).map(([id, cfg]) => ({ id, label: cfg.label })),
  { id: "poe", label: "Poe" },
];

const TITLE_DEFAULTS: Record<string, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-3-haiku-20240307",
  google: "gemini-3.1-flash-lite-preview",
  deepseek: "deepseek-chat",
  alibaba: "qwen-turbo",
  moonshotai: "kimi-k2-0905-preview",
  zhipuai: "glm-4.5-flash",
  minimax: "MiniMax-M2",
  poe: "anthropic/claude-haiku-3",
};

const SELECT_CLS =
  "w-full rounded-lg border border-border bg-home-input-bg px-3 py-2 text-sm outline-none focus:border-accent/40";
const INPUT_CLS = SELECT_CLS;

interface ModelConfigProps {
  settings: AppSettings;
}

function ModelInfoBadges({ model }: { model: ModelEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      {model.reasoning && (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary">思维链</span>
      )}
      {model.context && (
        <span className="rounded-md bg-muted/40 px-1.5 py-0.5">上下文 {model.context}</span>
      )}
      {model.inputPrice && (
        <span className="rounded-md bg-muted/40 px-1.5 py-0.5">输入 {model.inputPrice}/1M</span>
      )}
      {model.outputPrice && (
        <span className="rounded-md bg-muted/40 px-1.5 py-0.5">输出 {model.outputPrice}/1M</span>
      )}
    </div>
  );
}

function optionLabel(m: ModelEntry) {
  let text = m.id;
  if (m.context) text += ` (${m.context})`;
  if (m.reasoning) text += " ✦";
  return text;
}

/* ── Poe 模型选择器（带子厂商分组） ── */

function findPoeModel(name: string) {
  const parsed = parsePoeModelName(name);
  if (!parsed) return null;
  const sp = POE_SUB_PROVIDERS[parsed.subProvider];
  if (!sp) return null;
  const model = sp.models.find((m) => m.id === parsed.model);
  return model ? { ...model, subProvider: parsed.subProvider, hint: sp.thinkingHint } : null;
}

interface PoeModelSelectorProps {
  modelName: string;
  onModelNameChange: (name: string) => void;
  onThinkingAutoConfig?: (reasoning: boolean, hint: "anthropic" | "google" | "auto") => void;
  label?: string;
  showInfo?: boolean;
}

function PoeModelSelector({
  modelName,
  onModelNameChange,
  onThinkingAutoConfig,
  label = "Model",
  showInfo,
}: PoeModelSelectorProps) {
  const handleChange = (value: string) => {
    onModelNameChange(value);
    if (onThinkingAutoConfig) {
      const found = findPoeModel(value);
      if (found) onThinkingAutoConfig(!!found.reasoning, found.hint);
    }
  };

  const selected = useMemo(() => findPoeModel(modelName), [modelName]);

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">{label}</span>
        <select
          value={modelName}
          onChange={(e) => handleChange(e.target.value)}
          className={SELECT_CLS}
        >
          {POE_SUB_PROVIDER_KEYS.map((sp) => (
            <optgroup key={sp} label={POE_SUB_PROVIDERS[sp].label}>
              {POE_SUB_PROVIDERS[sp].models.map((m) => (
                <option key={`${sp}/${m.id}`} value={`${sp}/${m.id}`}>
                  {optionLabel(m)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {showInfo && selected && <ModelInfoBadges model={selected} />}
    </>
  );
}

/* ── 通用 Catalog 模型选择器 ── */

interface CatalogModelSelectorProps {
  provider: string;
  modelName: string;
  onModelNameChange: (name: string) => void;
  onThinkingAutoConfig?: (reasoning: boolean, hint: "anthropic" | "google" | "auto") => void;
  label?: string;
  showInfo?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

function CatalogModelSelector({
  provider,
  modelName,
  onModelNameChange,
  onThinkingAutoConfig,
  label = "Model",
  showInfo,
  allowEmpty,
  emptyLabel = "使用主模型",
}: CatalogModelSelectorProps) {
  const config = getProviderConfig(provider);

  const selected = useMemo(
    () => config?.models.find((m) => m.id === modelName) ?? null,
    [config, modelName],
  );

  if (!config) return null;

  const handleChange = (value: string) => {
    onModelNameChange(value);
    if (onThinkingAutoConfig) {
      const model = config.models.find((m) => m.id === value);
      if (model) onThinkingAutoConfig(!!model.reasoning, config.thinkingHint);
    }
  };

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">{label}</span>
        <select
          value={modelName}
          onChange={(e) => handleChange(e.target.value)}
          className={SELECT_CLS}
        >
          {allowEmpty && <option value="">{emptyLabel}</option>}
          {config.models.map((m) => (
            <option key={m.id} value={m.id}>
              {optionLabel(m)}
            </option>
          ))}
        </select>
      </label>
      {showInfo && selected && <ModelInfoBadges model={selected} />}
    </>
  );
}

/* ── 主组件 ── */

export function ModelConfig({ settings }: ModelConfigProps) {
  const update = useSettingsStore((s) => s.updateSetting);
  const thinkingEnabled = settings.model.thinking?.enabled ?? false;
  const budgetTokens = settings.model.thinking?.budgetTokens ?? 8000;
  const providerHint = settings.model.thinking?.providerHint ?? "auto";

  const isPoe = settings.model.provider === "poe";
  const catalogConfig = getProviderConfig(settings.model.provider);
  const hasCatalog = !!catalogConfig;

  const thinkingSupport = detectThinkingSupport(settings.model.provider, settings.model.name);

  const showConfigurable =
    thinkingSupport.mode === "configurable" ||
    (thinkingSupport.mode === "none" && providerHint !== "auto");
  const showNative = thinkingSupport.mode === "native" && providerHint === "auto";
  const showManualHint = true;

  const applyThinkingConfig = (reasoning: boolean, hint: "anthropic" | "google" | "auto") => {
    update("model.thinking.enabled", reasoning);
    update("model.thinking.providerHint", hint);
  };

  const handleProviderChange = (provider: string) => {
    update("model.provider", provider);

    if (provider === "poe") {
      const firstSp = POE_SUB_PROVIDER_KEYS[0];
      const firstModel = POE_SUB_PROVIDERS[firstSp]?.models[0];
      update("model.name", `${firstSp}/${firstModel?.id ?? ""}`);
      update("model.titleModelName", TITLE_DEFAULTS.poe ?? "");
      applyThinkingConfig(!!firstModel?.reasoning, POE_SUB_PROVIDERS[firstSp].thinkingHint);
      return;
    }

    const config = getProviderConfig(provider);
    if (config) {
      const firstModel = config.models[0];
      update("model.name", firstModel?.id ?? "");
      update("model.titleModelName", TITLE_DEFAULTS[provider] ?? "");
      if (firstModel) applyThinkingConfig(!!firstModel.reasoning, config.thinkingHint);
    }
  };

  const apiKeyPlaceholder = isPoe ? "POE_API_KEY" : catalogConfig ? catalogConfig.envKey : "sk-...";

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-gray-700">模型配置</h2>
      <div className="flex flex-col gap-3">
        {/* ── Provider ── */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">Provider</span>
          <select
            value={settings.model.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className={SELECT_CLS}
          >
            {PROVIDER_LIST.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {/* ── 主模型 ── */}
        {isPoe ? (
          <PoeModelSelector
            modelName={settings.model.name}
            onModelNameChange={(name) => update("model.name", name)}
            onThinkingAutoConfig={applyThinkingConfig}
            showInfo
          />
        ) : hasCatalog ? (
          <CatalogModelSelector
            provider={settings.model.provider}
            modelName={settings.model.name}
            onModelNameChange={(name) => update("model.name", name)}
            onThinkingAutoConfig={applyThinkingConfig}
            showInfo
          />
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs text-gray-500">Model Name</span>
            <input
              type="text"
              value={settings.model.name}
              onChange={(e) => update("model.name", e.target.value)}
              placeholder="gpt-4.1"
              className={INPUT_CLS}
            />
          </label>
        )}

        {/* ── Title 模型 ── */}
        {isPoe ? (
          <PoeModelSelector
            modelName={settings.model.titleModelName || "anthropic/claude-haiku-3"}
            onModelNameChange={(name) => update("model.titleModelName", name)}
            label="Title Model"
          />
        ) : hasCatalog ? (
          <CatalogModelSelector
            provider={settings.model.provider}
            modelName={settings.model.titleModelName || ""}
            onModelNameChange={(name) => update("model.titleModelName", name)}
            label="Title Model"
            allowEmpty
            emptyLabel="使用主模型"
          />
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs text-gray-500">Title Model Name</span>
            <input
              type="text"
              value={settings.model.titleModelName ?? ""}
              onChange={(e) => update("model.titleModelName", e.target.value)}
              placeholder={settings.model.name || "留空则使用主模型"}
              className={INPUT_CLS}
            />
          </label>
        )}

        {/* ── API Key ── */}
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">API Key</span>
          <input
            type="password"
            value={settings.model.apiKey}
            onChange={(e) => update("model.apiKey", e.target.value)}
            placeholder={apiKeyPlaceholder}
            className={INPUT_CLS}
          />
        </label>

        {/* ── 思维链区域 ── */}

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
