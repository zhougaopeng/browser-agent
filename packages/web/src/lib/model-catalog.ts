export interface ModelEntry {
  id: string;
  context?: string;
  inputPrice?: string;
  outputPrice?: string;
  reasoning?: boolean;
}

export interface ProviderConfig {
  label: string;
  envKey: string;
  thinkingHint: "anthropic" | "google" | "auto";
  models: ModelEntry[];
}

/**
 * 所有 Provider 的模型目录。
 * key 即为 settings.model.provider 的值，也是 Mastra model ID 的前缀。
 */
export const MODEL_CATALOG: Record<string, ProviderConfig> = {
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    thinkingHint: "auto",
    models: [
      { id: "gpt-5.4", context: "1.1M", inputPrice: "$3", outputPrice: "$15", reasoning: true },
      {
        id: "gpt-5.4-mini",
        context: "400K",
        inputPrice: "$0.75",
        outputPrice: "$5",
        reasoning: true,
      },
    ],
  },
  anthropic: {
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    thinkingHint: "anthropic",
    models: [
      {
        id: "claude-sonnet-4-6",
        context: "1.0M",
        inputPrice: "$3",
        outputPrice: "$15",
        reasoning: true,
      },
      {
        id: "claude-opus-4-6",
        context: "1.0M",
        inputPrice: "$5",
        outputPrice: "$25",
        reasoning: true,
      },
      {
        id: "claude-haiku-4-5",
        context: "200K",
        inputPrice: "$1",
        outputPrice: "$5",
        reasoning: true,
      },
      { id: "claude-3-haiku-20240307", context: "200K", inputPrice: "$0.25", outputPrice: "$1" },
    ],
  },
  google: {
    label: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    thinkingHint: "google",
    models: [
      {
        id: "gemini-3.1-pro-preview",
        context: "1.0M",
        inputPrice: "$2",
        outputPrice: "$12",
        reasoning: true,
      },
      {
        id: "gemini-3.1-flash-lite-preview",
        context: "1.0M",
        inputPrice: "$0.25",
        outputPrice: "$2",
        reasoning: true,
      },
      {
        id: "gemini-3-flash-preview",
        context: "1.0M",
        inputPrice: "$0.50",
        outputPrice: "$3",
        reasoning: true,
      },
      {
        id: "gemini-2.5-pro",
        context: "1.0M",
        inputPrice: "$1",
        outputPrice: "$10",
        reasoning: true,
      },
    ],
  },
  deepseek: {
    label: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    thinkingHint: "auto",
    models: [
      { id: "deepseek-chat", context: "128K", inputPrice: "$0.28", outputPrice: "$0.42" },
      {
        id: "deepseek-reasoner",
        context: "128K",
        inputPrice: "$0.28",
        outputPrice: "$0.42",
        reasoning: true,
      },
    ],
  },
  alibaba: {
    label: "阿里千问",
    envKey: "DASHSCOPE_API_KEY",
    thinkingHint: "auto",
    models: [
      {
        id: "qwen3.6-plus",
        context: "1.0M",
        inputPrice: "$0.28",
        outputPrice: "$2",
        reasoning: true,
      },
      {
        id: "qwen3.5-plus",
        context: "1.0M",
        inputPrice: "$0.40",
        outputPrice: "$2",
        reasoning: true,
      },
      { id: "qwen3-max", context: "262K", inputPrice: "$1", outputPrice: "$6", reasoning: true },
      { id: "qwen-max", context: "33K", inputPrice: "$2", outputPrice: "$6" },
      { id: "qwen-plus", context: "1.0M", inputPrice: "$0.40", outputPrice: "$1" },
      { id: "qwen-turbo", context: "1.0M", inputPrice: "$0.05", outputPrice: "$0.20" },
      { id: "qwen-flash", context: "1.0M", inputPrice: "$0.05", outputPrice: "$0.40" },
      {
        id: "qwen3-235b-a22b",
        context: "131K",
        inputPrice: "$0.70",
        outputPrice: "$3",
        reasoning: true,
      },
      { id: "qwen3-32b", context: "131K", inputPrice: "$0.70", outputPrice: "$3", reasoning: true },
      { id: "qwen3-14b", context: "131K", inputPrice: "$0.35", outputPrice: "$1", reasoning: true },
      {
        id: "qwen3-8b",
        context: "131K",
        inputPrice: "$0.18",
        outputPrice: "$0.70",
        reasoning: true,
      },
      { id: "qwq-plus", context: "131K", inputPrice: "$0.80", outputPrice: "$2", reasoning: true },
      { id: "qwen3-coder-plus", context: "1.0M", inputPrice: "$1", outputPrice: "$5" },
      { id: "qwen3-coder-flash", context: "1.0M", inputPrice: "$0.30", outputPrice: "$2" },
    ],
  },
  moonshotai: {
    label: "Kimi",
    envKey: "MOONSHOT_API_KEY",
    thinkingHint: "auto",
    models: [
      { id: "kimi-k2.5", context: "262K", inputPrice: "$0.60", outputPrice: "$3" },
      {
        id: "kimi-k2-thinking",
        context: "262K",
        inputPrice: "$0.60",
        outputPrice: "$3",
        reasoning: true,
      },
      {
        id: "kimi-k2-thinking-turbo",
        context: "262K",
        inputPrice: "$1",
        outputPrice: "$8",
        reasoning: true,
      },
      { id: "kimi-k2-turbo-preview", context: "262K", inputPrice: "$2", outputPrice: "$10" },
      { id: "kimi-k2-0905-preview", context: "262K", inputPrice: "$0.60", outputPrice: "$3" },
    ],
  },
  zhipuai: {
    label: "智谱 GLM",
    envKey: "ZHIPU_API_KEY",
    thinkingHint: "auto",
    models: [
      { id: "glm-5", context: "205K", inputPrice: "$1", outputPrice: "$3", reasoning: true },
      { id: "glm-4.7", context: "205K", inputPrice: "$0.60", outputPrice: "$2", reasoning: true },
      { id: "glm-4.7-flash", context: "200K" },
      { id: "glm-4.7-flashx", context: "200K", inputPrice: "$0.07", outputPrice: "$0.40" },
      { id: "glm-4.6", context: "205K", inputPrice: "$0.60", outputPrice: "$2" },
      { id: "glm-4.5", context: "131K", inputPrice: "$0.60", outputPrice: "$2" },
      { id: "glm-4.5-air", context: "131K", inputPrice: "$0.20", outputPrice: "$1" },
      { id: "glm-4.5-flash", context: "131K" },
    ],
  },
  minimax: {
    label: "MiniMax",
    envKey: "MINIMAX_API_KEY",
    thinkingHint: "auto",
    models: [
      {
        id: "MiniMax-M2.7",
        context: "205K",
        inputPrice: "$0.30",
        outputPrice: "$1",
        reasoning: true,
      },
      {
        id: "MiniMax-M2.7-highspeed",
        context: "205K",
        inputPrice: "$0.60",
        outputPrice: "$2",
        reasoning: true,
      },
      { id: "MiniMax-M2.5", context: "205K", inputPrice: "$0.30", outputPrice: "$1" },
      { id: "MiniMax-M2.5-highspeed", context: "205K", inputPrice: "$0.60", outputPrice: "$2" },
      { id: "MiniMax-M2.1", context: "205K", inputPrice: "$0.30", outputPrice: "$1" },
      { id: "MiniMax-M2", context: "197K", inputPrice: "$0.30", outputPrice: "$1" },
    ],
  },
};

export const PROVIDER_KEYS = Object.keys(MODEL_CATALOG);

export function getProviderConfig(provider: string): ProviderConfig | undefined {
  return MODEL_CATALOG[provider];
}
