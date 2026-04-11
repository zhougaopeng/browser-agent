import { contextBridge, ipcRenderer } from "electron";

const api = {
  splash: {
    onStatus: (cb: (status: { stage: string; message: string; progress: number }) => void) => {
      ipcRenderer.on("splash:status", (_e, s) => cb(s));
      return () => {
        ipcRenderer.removeAllListeners("splash:status");
      };
    },
  },
  updates: {
    onReady: (cb: (info: { version: string }) => void) => {
      ipcRenderer.on("frontend:update-ready", (_e, info) => cb(info));
      return () => {
        ipcRenderer.removeAllListeners("frontend:update-ready");
      };
    },
  },
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
    messages: (threadId: string, params?: { cursor?: string; limit?: number }) =>
      ipcRenderer.invoke("threads:messages", threadId, params),
    delete: (threadId: string) => ipcRenderer.invoke("threads:delete", threadId),
    rename: (threadId: string, title: string) =>
      ipcRenderer.invoke("threads:rename", threadId, title),
    generateTitle: (messages: { role: string; content: string }[], threadId?: string) =>
      ipcRenderer.invoke("threads:generateTitle", messages, threadId),
  },
  appUpdate: {
    /** Manually trigger an update check. */
    check: () => ipcRenderer.invoke("app-update:check"),
    /** Quit and install the downloaded update. */
    install: () => ipcRenderer.invoke("app-update:install"),
    /** Subscribe to all update status events. Returns an unsubscribe function. */
    onStatus: (cb: (event: { type: string; data?: Record<string, unknown> }) => void) => {
      const channels = [
        "app-update:checking",
        "app-update:available",
        "app-update:not-available",
        "app-update:download-progress",
        "app-update:downloaded",
        "app-update:error",
      ] as const;
      const handler = (channel: string) => (_e: unknown, data: unknown) =>
        cb({ type: channel, data: data as Record<string, unknown> });
      const offs = channels.map((ch) => {
        const h = handler(ch);
        ipcRenderer.on(ch, h);
        return () => ipcRenderer.removeListener(ch, h);
      });
      return () => {
        for (const off of offs) off();
      };
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
