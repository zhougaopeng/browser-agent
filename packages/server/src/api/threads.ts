import { uuidv7 } from "uuidv7";
import type { AppInstance } from "../index";

export interface ListThreadsParams {
  limit?: number | false;
  page?: number;
}

export interface ListMessagesParams {
  threadId: string;
  limit?: number;
  /** Cursor: the id of the last message from the previous page */
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
  if (!memoryStore) return { messages: [], hasMore: false, nextCursor: null };

  const limit = Math.min(Math.max(params.limit ?? 40, 1), 200);

  let cursorDate: Date | undefined;
  if (params.cursor) {
    const cursorMsg = await memoryStore.listMessagesById({ messageIds: [params.cursor] });
    const msg = cursorMsg.messages[0];
    if (msg) {
      cursorDate =
        msg.createdAt instanceof Date
          ? msg.createdAt
          : new Date(msg.createdAt as unknown as string);
    }
  }

  const result = await memoryStore.listMessages({
    threadId: params.threadId,
    perPage: limit,
    orderBy: { field: "createdAt", direction: "ASC" },
    ...(cursorDate ? { filter: { dateRange: { start: cursorDate, startExclusive: true } } } : {}),
  });

  const messages = result.messages;
  const lastMsg = messages[messages.length - 1];
  const nextCursor = lastMsg ? lastMsg.id : null;

  return { messages, hasMore: result.hasMore, nextCursor };
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
