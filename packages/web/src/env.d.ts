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
  };
  threads: {
    create(params?: { title?: string }): Promise<{ id: string }>;
    get(threadId: string): Promise<import("./api/adapter").ThreadRecord>;
    list(params?: {
      page?: number;
      limit?: number;
    }): Promise<import("./api/adapter").ThreadListResult>;
    delete(threadId: string): Promise<void>;
    rename(threadId: string, title: string): Promise<void>;
    messages(
      threadId: string,
      params?: { page?: number; limit?: number },
    ): Promise<import("./api/adapter").MessageListResult>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
