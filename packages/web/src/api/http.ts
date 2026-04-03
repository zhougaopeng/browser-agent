import { DefaultChatTransport } from "ai";
import type { AppSettings } from "../env";
import { threadIdMap } from "../lib/thread-adapter";
import type { ApiAdapter } from "./adapter";

const BASE = "http://localhost:3100/api";

export function createHttpAdapter(): ApiAdapter {
  return {
    chatTransport: new DefaultChatTransport({
      api: `${BASE}/chat`,
      prepareSendMessagesRequest({ id, messages, body, trigger, messageId }) {
        return {
          body: { ...body, id: threadIdMap.get(id) ?? id, messages, trigger, messageId },
        };
      },
    }),
    settings: {
      get: () => fetch(`${BASE}/settings`).then((r) => r.json()) as Promise<AppSettings>,
      set: (key, value) =>
        fetch(`${BASE}/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        }).then(() => {}),
    },
    threads: {
      create: (params) =>
        fetch(`${BASE}/threads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params ?? {}),
        }).then((r) => r.json()),
      get: (id) => fetch(`${BASE}/threads/${id}`).then((r) => r.json()),
      list: (params) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set("page", String(params.page));
        if (params?.limit) qs.set("limit", String(params.limit));
        const q = qs.toString();
        return fetch(`${BASE}/threads${q ? `?${q}` : ""}`).then((r) => r.json());
      },
      messages: (id, params) => {
        const qs = new URLSearchParams();
        if (params?.cursor) qs.set("cursor", params.cursor);
        if (params?.limit) qs.set("limit", String(params.limit));
        const q = qs.toString();
        return fetch(`${BASE}/threads/${id}/messages${q ? `?${q}` : ""}`).then((r) => r.json());
      },
      delete: (id) => fetch(`${BASE}/threads/${id}`, { method: "DELETE" }).then(() => {}),
      rename: (id, title) =>
        fetch(`${BASE}/threads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }).then(() => {}),
      generateTitle: (messages, threadId) =>
        fetch(`${BASE}/threads/generate-title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, threadId }),
        }).then((r) => r.json()),
    },
  };
}
