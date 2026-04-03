export interface AppSettings {
  model: {
    provider: string;
    name: string;
    apiKey: string;
    titleModelName: string;
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
    create(params?: { title?: string }): Promise<import("./api/adapter").ThreadRecord>;
    get(threadId: string): Promise<import("./api/adapter").ThreadRecord>;
    list(params?: {
      page?: number;
      limit?: number;
    }): Promise<import("./api/adapter").ThreadListResult>;
    delete(threadId: string): Promise<void>;
    rename(threadId: string, title: string): Promise<void>;
    messages(
      threadId: string,
      params?: { cursor?: string; limit?: number },
    ): Promise<import("./api/adapter").MessageListResult>;
    generateTitle(
      messages: { role: string; content: string }[],
      threadId?: string,
    ): Promise<{ title: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
