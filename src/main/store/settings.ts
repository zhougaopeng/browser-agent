import Store from "electron-store";

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
  },
  browser: {
    headless: false,
    browser: "chrome",
  },
  skills: {
    directory: "~/.browser-agent/skills",
  },
};

export const settingsStore = new Store<AppSettings>({ defaults });
