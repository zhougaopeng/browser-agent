import { ELECTRON_CHAT_URL } from "@browser-agent/shared";
import type { ApiAdapter } from "./adapter";
import { BrowserAgentTransport } from "./transport";

export function createElectronAdapter(): ApiAdapter {
  return {
    chatTransport: new BrowserAgentTransport({ api: ELECTRON_CHAT_URL }),
    cancelChat: (threadId) =>
      fetch(`${ELECTRON_CHAT_URL}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      }).then(() => {}),
    settings: window.electronAPI.settings,
    threads: window.electronAPI.threads,
  };
}
