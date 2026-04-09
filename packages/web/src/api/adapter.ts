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
  nextCursor: string | null;
}

export interface ApiAdapter {
  chatTransport: ChatTransport<UIMessage>;
  cancelChat(threadId: string): Promise<void>;
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
      params?: { cursor?: string; limit?: number },
    ): Promise<MessageListResult>;
    generateTitle(
      messages: { role: string; content: string }[],
      threadId?: string,
    ): Promise<{ title: string }>;
  };
}

export const isElectron = typeof window !== "undefined" && "electronAPI" in window;

// WEB_DEV 模式下页面从 http://localhost 加载（非 browser:// 自定义协议），
// 此时 agent:// 自定义协议存在跨域问题，降级为 HTTP adapter 走本地 server。
const useElectronAdapter =
  isElectron && typeof window !== "undefined" && window.location.protocol !== "http:";

export const api: ApiAdapter = useElectronAdapter ? createElectronAdapter() : createHttpAdapter();
