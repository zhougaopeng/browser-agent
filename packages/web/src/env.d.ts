export type { AppSettings } from "@browser-agent/shared";

interface ElectronAPI {
  settings: {
    get(): Promise<import("@browser-agent/shared").AppSettings>;
    set(key: string, value: unknown): Promise<void>;
    onChanged(cb: (settings: unknown) => void): () => void;
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
