import { DefaultChatTransport } from "ai";
import type { ApiAdapter } from "./adapter";

export function createElectronAdapter(): ApiAdapter {
  return {
    chatTransport: new DefaultChatTransport({ api: "agent://chat" }),
    settings: window.electronAPI.settings,
    threads: window.electronAPI.threads,
  };
}
