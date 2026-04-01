import {
  type AppInstance,
  createThread,
  deleteThread,
  getThread,
  listMessages,
  listThreads,
  renameThread,
} from "@browser-agent/server";
import { ipcMain } from "electron";

export function setupThreadsIPC(appPromise: Promise<AppInstance>): void {
  ipcMain.handle("threads:create", async () => {
    const app = await appPromise;
    return createThread(app);
  });

  ipcMain.handle("threads:get", async (_event, threadId: string) => {
    const app = await appPromise;
    return getThread(app, threadId);
  });

  ipcMain.handle("threads:list", async () => {
    const app = await appPromise;
    const result = await listThreads(app, { limit: false });
    return result.threads;
  });

  ipcMain.handle(
    "threads:messages",
    async (_event, threadId: string, page?: number, limit?: number) => {
      const app = await appPromise;
      return listMessages(app, { threadId, page, limit });
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
}
