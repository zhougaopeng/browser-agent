export interface PoeModelEntry {
  id: string;
  context?: string;
  inputPrice?: string;
  outputPrice?: string;
  /** 是否支持思维链/推理模式 */
  reasoning?: boolean;
}

export interface PoeSubProvider {
  label: string;
  /** thinking API 格式映射，用于自动设置 providerHint */
  thinkingHint: "anthropic" | "google" | "auto";
  models: PoeModelEntry[];
}

export const POE_SUB_PROVIDERS: Record<string, PoeSubProvider> = {
  anthropic: {
    label: "Anthropic",
    thinkingHint: "anthropic",
    models: [
      {
        id: "claude-sonnet-4.6",
        context: "983K",
        inputPrice: "$3",
        outputPrice: "$13",
        reasoning: true,
      },
      {
        id: "claude-opus-4.6",
        context: "983K",
        inputPrice: "$4",
        outputPrice: "$21",
        reasoning: true,
      },
      {
        id: "claude-haiku-4.5",
        context: "192K",
        inputPrice: "$0.85",
        outputPrice: "$4",
        reasoning: true,
      },
      { id: "claude-haiku-3", context: "189K", inputPrice: "$0.21", outputPrice: "$1" },
    ],
  },
  openai: {
    label: "OpenAI",
    thinkingHint: "auto",
    models: [
      { id: "gpt-5.4", context: "1.1M", inputPrice: "$2", outputPrice: "$14", reasoning: true },
      {
        id: "gpt-5.4-mini",
        context: "400K",
        inputPrice: "$0.68",
        outputPrice: "$4",
        reasoning: true,
      },
    ],
  },
  google: {
    label: "Google",
    thinkingHint: "google",
    models: [
      {
        id: "gemini-3.1-pro",
        context: "1.0M",
        inputPrice: "$2",
        outputPrice: "$12",
        reasoning: true,
      },
      {
        id: "gemini-3.1-flash-lite",
        context: "1.0M",
        inputPrice: "$0.25",
        outputPrice: "$2",
        reasoning: true,
      },
      {
        id: "gemini-3-flash",
        context: "1.0M",
        inputPrice: "$0.40",
        outputPrice: "$2",
        reasoning: true,
      },
      {
        id: "gemini-2.5-pro",
        context: "1.1M",
        inputPrice: "$0.87",
        outputPrice: "$7",
        reasoning: true,
      },
    ],
  },
};

export const POE_SUB_PROVIDER_KEYS = Object.keys(POE_SUB_PROVIDERS);

export function parsePoeModelName(name: string): { subProvider: string; model: string } | null {
  const idx = name.indexOf("/");
  if (idx === -1) return null;
  return { subProvider: name.slice(0, idx), model: name.slice(idx + 1) };
}
