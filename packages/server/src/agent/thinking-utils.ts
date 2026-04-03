/**
 * 思维链（Chain-of-Thought / Extended Thinking）多模型支持工具
 *
 * 各厂商差异：
 *  - anthropic: 需要显式传 providerOptions.anthropic.thinking + budgetTokens
 *  - google: 需要显式传 providerOptions.google.thinkingConfig + thinkingBudget
 *  - openai o系列 / deepseek-r1 / 其它 *-thinking 模型: 内置推理，无需额外参数
 *
 * 注意：provider 可能是中间层（如 poe），真实厂商信息可能在 modelName 里，例如：
 *   provider="poe", modelName="anthropic/claude-sonnet-4-5"
 * 需从 modelName 中提取有效厂商前缀。
 * 当自动检测失败时，用户可通过 providerHint 手动指定。
 */
import type { AgentExecutionOptions } from "@mastra/core/agent";

/** 从 AgentExecutionOptions 中提取 providerOptions 的实际类型 */
type ProviderOptions = NonNullable<AgentExecutionOptions["providerOptions"]>;

export type ThinkingMode =
  /** 需要显式 API 参数才能启用思维链 (Anthropic / Google) */
  | "configurable"
  /** 模型内置推理能力，无需 API 参数 (OpenAI o系列 / DeepSeek R1 等) */
  | "native"
  /** 不支持思维链 */
  | "none";

export interface ThinkingSupport {
  mode: ThinkingMode;
  /** 人类可读的能力描述，供 UI 展示 */
  label: string;
  /**
   * 用于构建 providerOptions 的有效厂商名称
   * （可能来自 modelName 内嵌前缀，而非 provider 字段）
   */
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
 *
 *   provider="anthropic", modelName="claude-3-7-sonnet-20250219"
 *   → effectiveProvider="anthropic", effectiveModel="claude-3-7-sonnet-20250219"
 */
function resolveProviderAndModel(
  provider: string,
  modelName: string,
): { effectiveProvider: string; effectiveModel: string } {
  const m = modelName.toLowerCase();

  // 如果 modelName 里含 "provider/..." 格式，提取内嵌厂商
  if (m.includes("/")) {
    const parts = m.split("/");
    const embedded = parts[0];
    if (KNOWN_PROVIDERS.includes(embedded)) {
      return {
        effectiveProvider: embedded,
        effectiveModel: parts.slice(1).join("/"),
      };
    }
    // 非已知厂商前缀，保留完整 modelName
    return {
      effectiveProvider: provider.toLowerCase(),
      effectiveModel: m,
    };
  }

  return {
    effectiveProvider: provider.toLowerCase(),
    effectiveModel: m,
  };
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
    // claude-3-7-sonnet 及 Claude 4 系列（sonnet-4, opus-4, haiku-4）支持 Extended Thinking
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
    // gemini-2.5 系列及明确含 thinking 字样的模型
    if (em.includes("gemini-2.5") || em.includes("thinking")) {
      return {
        mode: "configurable",
        label: "Thinking（Google Gemini）",
        effectiveProvider: ep,
      };
    }
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────────
  if (ep === "openai") {
    // o1 / o3 / o4 推理模型，内置思考过程
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

  // ── 任意厂商中含 thinking / reasoner 字样的模型（兜底） ──────────────────────
  if (em.includes("thinking") || em.includes("reasoner")) {
    return { mode: "native", label: "内置推理", effectiveProvider: ep };
  }

  return { mode: "none", label: "", effectiveProvider: ep };
}

/**
 * 为支持配置式思维链的模型构建 providerOptions
 *
 * @param providerHint "auto" 时使用自动检测结果；否则强制使用指定厂商的 thinking API 格式
 */
export function buildThinkingProviderOptions(
  provider: string,
  modelName: string,
  budgetTokens: number,
  providerHint: "auto" | "anthropic" | "google" = "auto",
): ProviderOptions | undefined {
  // 确定最终使用的厂商
  let resolvedProvider: string;
  let mode: ThinkingMode;

  if (providerHint !== "auto") {
    // 用户手动指定，直接使用
    resolvedProvider = providerHint;
    mode = "configurable";
  } else {
    const result = detectThinkingSupport(provider, modelName);
    resolvedProvider = result.effectiveProvider;
    mode = result.mode;
  }

  if (mode !== "configurable") return undefined;

  if (resolvedProvider === "anthropic") {
    return {
      anthropic: {
        thinking: { type: "enabled", budgetTokens },
      },
    };
  }

  if (resolvedProvider === "google") {
    return {
      google: {
        thinkingConfig: {
          thinkingBudget: budgetTokens,
          includeThoughts: true,
        },
      },
    };
  }

  return undefined;
}

/**
 * 判断当前配置是否应该开启 sendReasoning（将思考内容流回前端）
 *
 * - configurable 模式（含手动指定）：仅当用户开启时才发送
 * - native 模式：模型本身会输出 reasoning，直接开启
 */
export function shouldSendReasoning(
  provider: string,
  modelName: string,
  thinkingEnabled: boolean,
  providerHint: "auto" | "anthropic" | "google" = "auto",
): boolean {
  if (providerHint !== "auto") {
    // 手动指定厂商：如果用户开启了则发送
    return thinkingEnabled;
  }
  const { mode } = detectThinkingSupport(provider, modelName);
  if (mode === "native") return true;
  if (mode === "configurable") return thinkingEnabled;
  return false;
}
