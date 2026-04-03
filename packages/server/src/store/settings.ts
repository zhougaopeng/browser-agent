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
