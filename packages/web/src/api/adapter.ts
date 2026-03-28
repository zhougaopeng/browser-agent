import type { ChatTransport } from "@ai-sdk/react";
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

export interface ApiAdapter {
  chatTransport: ChatTransport;
  settings: {
    get(): Promise<AppSettings>;
    set(key: string, value: unknown): Promise<void>;
    onChanged(cb: (settings: AppSettings) => void): () => void;
  };
  threads: {
    list(): Promise<ThreadRecord[]>;
    delete(threadId: string): Promise<void>;
    rename(threadId: string, title: string): Promise<void>;
  };
}

export const isElectron = typeof window !== "undefined" && "electronAPI" in window;

export const api: ApiAdapter = isElectron ? createElectronAdapter() : createHttpAdapter();
