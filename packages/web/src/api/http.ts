import { DefaultChatTransport } from "ai";
import type { AppSettings } from "../env";
import type { ApiAdapter } from "./adapter";

const BASE = "http://localhost:3100/api";

export function createHttpAdapter(): ApiAdapter {
  return {
    chatTransport: new DefaultChatTransport({ api: `${BASE}/chat` }),
    settings: {
      get: () => fetch(`${BASE}/settings`).then((r) => r.json()) as Promise<AppSettings>,
      set: (key, value) =>
        fetch(`${BASE}/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        }).then(() => {}),
      onChanged: (cb) => {
        const timer = setInterval(async () => {
          try {
            const s = (await fetch(`${BASE}/settings`).then((r) => r.json())) as AppSettings;
            cb(s);
          } catch {
            // server might not be running
          }
        }, 3000);
        return () => clearInterval(timer);
      },
    },
    threads: {
      list: () => fetch(`${BASE}/threads`).then((r) => r.json()),
      delete: (id) => fetch(`${BASE}/threads/${id}`, { method: "DELETE" }).then(() => {}),
      rename: (id, title) =>
        fetch(`${BASE}/threads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }).then(() => {}),
    },
  };
}
