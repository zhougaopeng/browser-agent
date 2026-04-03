import { DefaultChatTransport } from "ai";
import { threadIdMap } from "../lib/thread-adapter";
import type { ApiAdapter } from "./adapter";

export function createElectronAdapter(): ApiAdapter {
  return {
    chatTransport: new DefaultChatTransport({
      api: "agent://chat",
      prepareSendMessagesRequest({ id, messages, body, trigger, messageId }) {
        return {
          body: { ...body, id: threadIdMap.get(id) ?? id, messages, trigger, messageId },
        };
      },
    }),
    settings: window.electronAPI.settings,
    threads: window.electronAPI.threads,
  };
}
