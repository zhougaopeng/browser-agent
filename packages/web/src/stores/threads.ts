import { create } from "zustand";
import { api } from "../api/adapter";

export interface Thread {
  id: string;
  title?: string;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface ThreadsState {
  threads: Thread[];
  activeThreadId: string | null;
  pendingChatId: string | null;
  pendingMessage: string | null;
  loading: boolean;

  fetchThreads: () => Promise<void>;
  goHome: () => void;
  startChatWithMessage: (message: string) => void;
  setActiveThread: (id: string) => void;
  commitPendingThread: (threadId: string) => void;
  consumePendingMessage: () => string | null;
  deleteThread: (id: string) => Promise<void>;
  renameThread: (id: string, title: string) => Promise<void>;
}

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  pendingChatId: null,
  pendingMessage: null,
  loading: false,

  fetchThreads: async () => {
    set({ loading: true });
    try {
      const threads = (await api.threads.list()) as Thread[];
      set({ threads, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  goHome: () => {
    set({ activeThreadId: null, pendingChatId: null, pendingMessage: null });
  },

  startChatWithMessage: (message) => {
    const id = crypto.randomUUID();
    set({ activeThreadId: null, pendingChatId: id, pendingMessage: message });
  },

  setActiveThread: (id) => {
    set({ activeThreadId: id, pendingChatId: null, pendingMessage: null });
  },

  commitPendingThread: (threadId) => {
    set({ activeThreadId: threadId, pendingChatId: null });
  },

  consumePendingMessage: () => {
    const msg = get().pendingMessage;
    if (msg) set({ pendingMessage: null });
    return msg;
  },

  deleteThread: async (id) => {
    await api.threads.delete(id);
    const { threads, activeThreadId } = get();
    const remaining = threads.filter((t) => t.id !== id);
    set({
      threads: remaining,
      activeThreadId: activeThreadId === id ? null : activeThreadId,
    });
  },

  renameThread: async (id, title) => {
    await api.threads.rename(id, title);
    set((state) => ({
      threads: state.threads.map((t) => (t.id === id ? { ...t, title } : t)),
    }));
  },
}));
