/**
 * 思维链（Chain-of-Thought / Extended Thinking）多模型支持工具（前端版）
 *
 * 注意：provider 可能是中间层（如 poe），真实厂商信息可能在 modelName 里，例如：
 *   provider="poe", modelName="anthropic/claude-sonnet-4-5"
 * 函数会自动从 modelName 中提取有效厂商前缀。
 */

export type ThinkingMode =
  /** 需要显式 API 参数才能启用思维链 */
  | "configurable"
  /** 模型内置推理能力，无需额外配置 */
  | "native"
  /** 不支持思维链 */
  | "none";

export interface ThinkingSupport {
  mode: ThinkingMode;
  /** 人类可读的能力描述，供 UI 展示 */
  label: string;
  effectiveProvider: string;
}

/** 已知的厂商 ID 集合 */
const KNOWN_PROVIDERS = ["anthropic", "google", "openai", "deepseek", "xai", "mistral"];

/**
 * 从 provider + modelName 中解析出有效厂商和模型名称。
 *
 * 例子：
 *   provider="poe", modelName="anthropic/claude-sonnet-4-5"
 *   → effectiveProvider="anthropic", effectiveModel="claude-sonnet-4-5"
 */
function resolveProviderAndModel(
  provider: string,
  modelName: string,
): { effectiveProvider: string; effectiveModel: string } {
  const m = modelName.toLowerCase();
  if (m.includes("/")) {
    const parts = m.split("/");
    const embedded = parts[0];
    if (KNOWN_PROVIDERS.includes(embedded)) {
      return { effectiveProvider: embedded, effectiveModel: parts.slice(1).join("/") };
    }
    return { effectiveProvider: provider.toLowerCase(), effectiveModel: m };
  }
  return { effectiveProvider: provider.toLowerCase(), effectiveModel: m };
}

/**
 * 根据 provider + model 名称判断思维链支持情况
 */
export function detectThinkingSupport(provider: string, modelName: string): ThinkingSupport {
  const { effectiveProvider: ep, effectiveModel: em } = resolveProviderAndModel(
    provider,
    modelName,
  );

  // ── Anthropic ────────────────────────────────────────────────────────────────
  if (ep === "anthropic") {
    if (em.includes("claude-3-7") || em.match(/claude-(sonnet|opus|haiku)-4/)) {
      return {
        mode: "configurable",
        label: "Extended Thinking（Anthropic）",
        effectiveProvider: ep,
      };
    }
  }

  // ── Google ───────────────────────────────────────────────────────────────────
  if (ep === "google") {
    if (em.includes("gemini-2.5") || em.includes("thinking")) {
      return { mode: "configurable", label: "Thinking（Google Gemini）", effectiveProvider: ep };
    }
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────────
  if (ep === "openai") {
    if (/^o[134]/.test(em)) {
      return { mode: "native", label: "内置推理（OpenAI o系列）", effectiveProvider: ep };
    }
  }

  // ── DeepSeek ─────────────────────────────────────────────────────────────────
  if (ep === "deepseek") {
    if (em.includes("r1") || em.includes("thinking")) {
      return { mode: "native", label: "内置推理（DeepSeek R1）", effectiveProvider: ep };
    }
  }

  // ── 任意厂商中含 thinking / reasoner 字样的模型（兜底）──────────────────────
  if (em.includes("thinking") || em.includes("reasoner")) {
    return { mode: "native", label: "内置推理", effectiveProvider: ep };
  }

  return { mode: "none", label: "", effectiveProvider: ep };
}
