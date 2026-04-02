import { DefaultChatTransport } from "ai";
import { threadIdMap } from "../lib/thread-adapter";
import type { ApiAdapter } from "./adapter";

export function createElectronAdapter(): ApiAdapter {
  const electronThreads = window.electronAPI.threads;
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
    threads: {
      ...electronThreads,
      generateTitle: () => Promise.resolve({ title: "New Thread" }),
    } as unknown as ApiAdapter["threads"],
  };
}
