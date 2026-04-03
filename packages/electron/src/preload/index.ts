import { contextBridge, ipcRenderer } from "electron";

const api = {
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (key: string, value: unknown) => ipcRenderer.invoke("settings:set", key, value),
    onChanged: (cb: (settings: unknown) => void) => {
      ipcRenderer.on("settings:changed", (_e, s) => cb(s));
      return () => {
        ipcRenderer.removeAllListeners("settings:changed");
      };
    },
  },
  threads: {
    create: (params?: { title?: string }) => ipcRenderer.invoke("threads:create", params),
    get: (threadId: string) => ipcRenderer.invoke("threads:get", threadId),
    list: (params?: { limit?: number; page?: number }) =>
      ipcRenderer.invoke("threads:list", params),
    messages: (threadId: string, params?: { page?: number; limit?: number }) =>
      ipcRenderer.invoke("threads:messages", threadId, params),
    delete: (threadId: string) => ipcRenderer.invoke("threads:delete", threadId),
    rename: (threadId: string, title: string) =>
      ipcRenderer.invoke("threads:rename", threadId, title),
    generateTitle: (messages: { role: string; content: string }[], threadId?: string) =>
      ipcRenderer.invoke("threads:generateTitle", messages, threadId),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
