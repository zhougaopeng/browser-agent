import { AsyncLocalStorage } from "node:async_hooks";

interface ThreadStore {
  threadId: string;
}

const als = new AsyncLocalStorage<ThreadStore>();

export function runWithThread<T>(threadId: string, fn: () => T): T {
  return als.run({ threadId }, fn);
}

export function getCurrentThreadId(): string | undefined {
  return als.getStore()?.threadId;
}
