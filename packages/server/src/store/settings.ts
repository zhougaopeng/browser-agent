import type { AppSettings, BrowserConfig } from "@browser-agent/shared";
import Conf from "conf";

export type { AppSettings, BrowserConfig };

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
