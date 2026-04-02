import type { ChatTransport, UIMessage } from "ai";
import type { AppSettings } from "../env";
import { createElectronAdapter } from "./electron";
import { createHttpAdapter } from "./http";

export interface ThreadRecord {
  id: string;
  title?: string;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ThreadListResult {
  threads: ThreadRecord[];
  hasMore: boolean;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  role: string;
  content: unknown;
  createdAt: string;
  resourceId?: string;
  type?: string;
}

export interface MessageListResult {
  messages: MessageRecord[];
  hasMore: boolean;
}

export interface ApiAdapter {
  chatTransport: ChatTransport<UIMessage>;
  settings: {
    get(): Promise<AppSettings>;
    set(key: string, value: unknown): Promise<void>;
  };
  threads: {
    create(params?: { title?: string }): Promise<ThreadRecord>;
    get(threadId: string): Promise<ThreadRecord>;
    list(params?: { page?: number; limit?: number }): Promise<ThreadListResult>;
    delete(threadId: string): Promise<void>;
    rename(threadId: string, title: string): Promise<void>;
    messages(
      threadId: string,
      params?: { page?: number; limit?: number },
    ): Promise<MessageListResult>;
    generateTitle(
      messages: { role: string; content: string }[],
      threadId?: string,
    ): Promise<{ title: string }>;
  };
}

export const isElectron = typeof window !== "undefined" && "electronAPI" in window;

export const api: ApiAdapter = isElectron ? createElectronAdapter() : createHttpAdapter();
