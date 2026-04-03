import Conf from "conf";

export interface BrowserConfig {
  headless: boolean;
  browser: "chrome" | "firefox" | "webkit";
  executablePath?: string;
  userDataDir?: string;
}

export interface AppSettings {
  model: {
    provider: string;
    name: string;
    apiKey: string;
    titleModelName: string;
    thinking: {
      enabled: boolean;
      budgetTokens: number;
      /** "auto": 根据模型名自动判断；否则强制使用指定厂商的 thinking API 格式 */
      providerHint: "auto" | "anthropic" | "google";
    };
  };
  browser: BrowserConfig;
  skills: {
    directory: string;
  };
}

const defaults: AppSettings = {
  model: {
    provider: "openai",
    name: "gpt-4.1",
    apiKey: "",
    titleModelName: "",
    thinking: {
      enabled: false,
      budgetTokens: 8000,
      providerHint: "auto",
    },
  },
  browser: {
    headless: false,
    browser: "chrome",
  },
  skills: {
    directory: "~/.browser-agent/skills",
  },
};

export function createSettingsStore(dataDir: string): Conf<AppSettings> {
  return new Conf<AppSettings>({
    projectName: "browser-agent",
    cwd: dataDir,
    defaults,
  });
}
