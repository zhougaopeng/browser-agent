import { uuidv7 } from "uuidv7";
import type { AppInstance } from "../index";

export interface ListThreadsParams {
  limit?: number | false;
  page?: number;
}

export interface ListMessagesParams {
  threadId: string;
  limit?: number | false;
  /** Cursor: ISO timestamp of the last message's createdAt from the previous page */
  cursor?: string;
}

export async function createThread(app: AppInstance, params?: { title?: string }) {
  const memoryStore = await app.mastra.getStorage()?.getStore("memory");
  const threadId = uuidv7();
  const thread = {
    id: threadId,
    resourceId: app.getResourceId(),
    title: params?.title ?? "",
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

  const limit = params?.limit ?? false;
  const page = Math.max((params?.page ?? 1) - 1, 0);

  console.log("listThreads: ", app.getResourceId(), limit, page);

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

  const limit = params.limit === false ? false : Math.min(Math.max(params.limit ?? 40, 1), 200);

  // cursor 是时间戳 ISO 字符串，直接解析，无需额外查询
  // 始终用 end 边界 + DESC 取 cursor 之前最近的 N 条，再翻转为 ASC 展示顺序
  const cursorDate = params.cursor ? new Date(params.cursor) : new Date();
  const dateFilter = { dateRange: { end: cursorDate, endExclusive: !!params.cursor } };

  console.log("listMessages: ", params.threadId, limit, dateFilter);

  const result = await memoryStore.listMessages({
    threadId: params.threadId,
    perPage: limit,
    orderBy: { field: "createdAt", direction: "DESC" },
    filter: dateFilter,
  });

  result.messages.reverse();

  return { messages: result.messages, hasMore: limit === false ? false : result.hasMore };
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
