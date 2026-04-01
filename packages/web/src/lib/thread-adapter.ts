import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { api } from "../api/adapter";

export const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const data = await api.threads.list({ limit: 100 });
    return {
      threads: data.threads.map((t) => ({
        remoteId: t.id,
        title: t.title || undefined,
        status: "regular" as const,
      })),
    };
  },

  async initialize(_localId: string) {
    const thread = await api.threads.create();
    return { remoteId: thread.id, externalId: thread.id };
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

  generateTitle: (() => {}) as unknown as RemoteThreadListAdapter["generateTitle"],
};
