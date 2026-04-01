import { uuidv7 } from "uuidv7";
import type { AppInstance } from "../index";

export interface ListThreadsParams {
  limit?: number | false;
  page?: number;
}

export interface ListMessagesParams {
  threadId: string;
  limit?: number;
  page?: number;
}

export async function createThread(app: AppInstance) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  const threadId = uuidv7();
  const thread = {
    id: threadId,
    resourceId: app.getResourceId(),
    title: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  };

  if (memoryStore) {
    await memoryStore.saveThread({ thread });
  }

  return thread;
}

export async function getThread(app: AppInstance, threadId: string) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  if (!memoryStore) return null;
  return memoryStore.getThreadById({ threadId });
}

export async function listThreads(app: AppInstance, params?: ListThreadsParams) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  if (!memoryStore) return { threads: [], hasMore: false };

  const limit = params?.limit ?? 20;
  const page = Math.max((params?.page ?? 1) - 1, 0);

  const result = await memoryStore.listThreads({
    filter: { resourceId: app.getResourceId() },
    orderBy: { field: "updatedAt", direction: "DESC" },
    perPage: limit,
    page,
  });

  return {
    threads: result.threads,
    hasMore: typeof limit === "number" ? result.threads.length === limit : false,
  };
}

export async function listMessages(app: AppInstance, params: ListMessagesParams) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  if (!memoryStore) return { messages: [], hasMore: false };

  const limit = Math.min(Math.max(params.limit ?? 40, 1), 200);
  const page = params.page ?? 0;

  const result = await memoryStore.listMessages({
    threadId: params.threadId,
    perPage: limit,
    page,
    orderBy: { field: "createdAt", direction: "ASC" },
  });

  return { messages: result.messages, hasMore: result.hasMore };
}

export async function deleteThread(app: AppInstance, threadId: string) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  if (memoryStore) await memoryStore.deleteThread({ threadId });
}

export async function renameThread(app: AppInstance, threadId: string, title: string) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  if (memoryStore) {
    await memoryStore.updateThread({ id: threadId, title, metadata: {} });
  }
}
