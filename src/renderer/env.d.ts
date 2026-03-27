export interface AppSettings {
  model: {
    provider: string;
    name: string;
    apiKey: string;
  };
  browser: {
    headless: boolean;
    browser: "chrome" | "firefox" | "webkit";
    executablePath?: string;
    userDataDir?: string;
  };
  skills: {
    directory: string;
  };
}

interface ElectronAPI {
  settings: {
    get(): Promise<AppSettings>;
    set(key: string, value: unknown): Promise<void>;
    onChanged(cb: (settings: AppSettings) => void): void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
