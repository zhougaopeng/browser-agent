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

export interface ApiAdapter {
  chatTransport: ChatTransport<UIMessage>;
  settings: {
    get(): Promise<AppSettings>;
    set(key: string, value: unknown): Promise<void>;
  };
  threads: {
    list(params?: { page?: number; limit?: number }): Promise<ThreadListResult>;
    delete(threadId: string): Promise<void>;
    rename(threadId: string, title: string): Promise<void>;
  };
}

export const isElectron = typeof window !== "undefined" && "electronAPI" in window;

export const api: ApiAdapter = isElectron ? createElectronAdapter() : createHttpAdapter();
