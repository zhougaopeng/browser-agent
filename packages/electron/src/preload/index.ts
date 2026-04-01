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
    create: () => ipcRenderer.invoke("threads:create"),
    get: (threadId: string) => ipcRenderer.invoke("threads:get", threadId),
    list: () => ipcRenderer.invoke("threads:list"),
    messages: (threadId: string, params?: { page?: number; limit?: number }) =>
      ipcRenderer.invoke("threads:messages", threadId, params?.page, params?.limit),
    delete: (threadId: string) => ipcRenderer.invoke("threads:delete", threadId),
    rename: (threadId: string, title: string) =>
      ipcRenderer.invoke("threads:rename", threadId, title),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
