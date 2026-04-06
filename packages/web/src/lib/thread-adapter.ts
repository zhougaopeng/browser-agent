import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { uuidv7 } from "uuidv7";
import { api } from "../api/adapter";

/**
 * Maps assistant-ui local thread IDs to server-side thread IDs.
 * Populated synchronously when adapter.initialize() resolves, so the
 * chat transport can look up the correct server ID before React re-renders.
 */
export const threadIdMap = new Map<string, string>();

/**
 * Reverse map: server-side remoteId → assistant-ui localId.
 * Used by the router to look up which local thread to activate for a given URL.
 * Populated from ThreadListItem rendering (existing threads) and initialize() (new threads).
 */
export const remoteToLocalMap = new Map<string, string>();

/**
 * Stores switchTo functions from each ThreadListItem's context.
 * Keyed by remoteId, each function calls the item's own aui.threadListItem().switchTo().
 * Used for URL-based thread restoration on page refresh.
 */
export const threadSwitchers = new Map<string, () => void>();

let pendingRemoteId: string | null = null;

/**
 * Pre-generate the remoteId for the next thread before calling send().
 * This allows the caller to navigate to /chat/:remoteId immediately
 * instead of waiting for the async initialize() to complete.
 */
export function preGenerateThreadId(): string {
  pendingRemoteId = uuidv7();
  return pendingRemoteId;
}

function createTitleStream(title: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ path: [0], type: "part-start", part: { type: "text" } });
      controller.enqueue({ path: [0], type: "text-delta", textDelta: title });
      controller.enqueue({ path: [0], type: "part-finish" });
      controller.close();
    },
  });
}

interface ContentPart {
  type: string;
  text?: string;
}

interface MessageLike {
  role: string;
  content: readonly ContentPart[];
}

function extractTextMessages(
  messages: readonly MessageLike[],
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];
  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const text = msg.content
      ?.filter((p) => p.type === "text" && p.text)
      .map((p) => p.text ?? "")
      .join("\n");
    if (text) result.push({ role: msg.role, content: text });
  }
  return result;
}

export function createThreadListAdapter(): RemoteThreadListAdapter {
  let listInflight: Promise<{
    threads: { remoteId: string; title?: string; status: "regular" }[];
  }> | null = null;

  const adapter: RemoteThreadListAdapter = {
    async list() {
      if (listInflight) return listInflight;
      listInflight = api.threads.list().then((data) => ({
        threads: data.threads.map((t) => ({
          remoteId: t.id,
          title: t.title || undefined,
          status: "regular" as const,
        })),
      }));
      try {
        return await listInflight;
      } finally {
        listInflight = null;
      }
    },

    async initialize(localId: string) {
      const id = pendingRemoteId ?? uuidv7();
      pendingRemoteId = null;
      threadIdMap.set(localId, id);
      remoteToLocalMap.set(id, localId);
      return { remoteId: id, externalId: id };
    },

    async rename(remoteId, title) {
      await api.threads.rename(remoteId, title);
    },

    async archive() {},

    async unarchive() {},

    async delete(remoteId) {
      await api.threads.delete(remoteId);
    },

    async fetch(remoteId) {
      const thread = await api.threads.get(remoteId);
      return {
        remoteId: thread.id,
        title: thread.title || undefined,
        status: "regular" as const,
      };
    },

    async generateTitle(remoteId, messages) {
      console.log("[generateTitle] called", { remoteId, messageCount: messages?.length });
      const typedMessages = messages as readonly MessageLike[];
      const extracted = extractTextMessages(typedMessages);
      console.log("[generateTitle] extracted", extracted.length, "messages");
      if (extracted.length === 0) return createTitleStream("New Thread");

      try {
        console.log("[generateTitle] calling API...");
        const { title } = await api.threads.generateTitle(extracted, remoteId);
        console.log("[generateTitle] got title:", title);
        return createTitleStream(title || "New Thread");
      } catch (err) {
        console.error("[generateTitle] error:", err);
        const fallback = extracted[0]?.content.slice(0, 100).trim();
        return createTitleStream(fallback || "New Thread");
      }
    },
  };

  return adapter;
}
