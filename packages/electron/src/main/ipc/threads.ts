import type { AppInstance } from "@browser-agent/server";
import { ipcMain } from "electron";

export function setupThreadsIPC(appPromise: Promise<AppInstance>): void {
  ipcMain.handle("threads:list", async () => {
    const app = await appPromise;
    const memoryStore = await app.mastra.getStorage()?.getStore("memory");
    if (!memoryStore) return [];
    const result = await memoryStore.listThreads({
      filter: { resourceId: app.getResourceId() },
      orderBy: { field: "updatedAt", direction: "DESC" },
      perPage: false,
    });
    return result.threads;
  });

  ipcMain.handle("threads:delete", async (_event, threadId: string) => {
    const app = await appPromise;
    const memoryStore = await app.mastra.getStorage()?.getStore("memory");
    if (memoryStore) await memoryStore.deleteThread({ threadId });
  });

  ipcMain.handle("threads:rename", async (_event, threadId: string, title: string) => {
    const app = await appPromise;
    const memoryStore = await app.mastra.getStorage()?.getStore("memory");
    if (memoryStore) {
      await memoryStore.updateThread({ id: threadId, title, metadata: {} });
    }
  });
}
