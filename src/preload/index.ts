import { contextBridge, ipcRenderer } from "electron";

const api = {
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (key: string, value: unknown) => ipcRenderer.invoke("settings:set", key, value),
    onChanged: (cb: (settings: unknown) => void) => {
      ipcRenderer.on("settings:changed", (_e, s) => cb(s));
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
