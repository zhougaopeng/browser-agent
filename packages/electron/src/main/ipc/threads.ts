import {
  type AppInstance,
  createThread,
  deleteThread,
  generateTitle,
  getThread,
  listMessages,
  listThreads,
  renameThread,
} from "@browser-agent/server";
import { ipcMain } from "electron";

export function setupThreadsIPC(appPromise: Promise<AppInstance>): void {
  ipcMain.handle("threads:create", async (_event, params?: { title?: string }) => {
    const app = await appPromise;
    return createThread(app, params);
  });

  ipcMain.handle("threads:get", async (_event, threadId: string) => {
    const app = await appPromise;
    return getThread(app, threadId);
  });

  ipcMain.handle("threads:list", async (_event, params?: { limit?: number; page?: number }) => {
    const app = await appPromise;
    const limit = params?.limit ? Math.min(Math.max(Math.floor(params.limit), 1), 100) : false;
    const page = limit ? Math.max(Math.floor(params?.page ?? 1), 1) : 0;
    return listThreads(app, { limit, page });
  });

  ipcMain.handle(
    "threads:messages",
    async (_event, threadId: string, params?: { cursor?: string; limit?: number }) => {
      const app = await appPromise;
      return listMessages(app, { threadId, ...params });
    },
  );

  ipcMain.handle("threads:delete", async (_event, threadId: string) => {
    const app = await appPromise;
    await deleteThread(app, threadId);
  });

  ipcMain.handle("threads:rename", async (_event, threadId: string, title: string) => {
    const app = await appPromise;
    await renameThread(app, threadId, title);
  });

  ipcMain.handle(
    "threads:generateTitle",
    async (_event, messages: { role: string; content: string }[], threadId?: string) => {
      const app = await appPromise;
      const title = await generateTitle(app, messages, threadId);
      return { title };
    },
  );
}
