import { useEffect, useRef, useState } from "react";
import type { View } from "../../App";
import { type Thread, useThreadsStore } from "../../stores/threads";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ view, onNavigate }: SidebarProps) {
  const threads = useThreadsStore((s) => s.threads);
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const pendingChatId = useThreadsStore((s) => s.pendingChatId);
  const goHome = useThreadsStore((s) => s.goHome);
  const setActiveThread = useThreadsStore((s) => s.setActiveThread);
  const deleteThread = useThreadsStore((s) => s.deleteThread);
  const renameThread = useThreadsStore((s) => s.renameThread);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editRef.current?.select();
  }, [editingId]);

  const isHome = !activeThreadId && !pendingChatId;

  const handleSelectThread = (id: string) => {
    setActiveThread(id);
    onNavigate("chat");
  };

  const handleGoHome = () => {
    goHome();
    onNavigate("chat");
  };

  const startRename = (thread: Thread) => {
    setEditingId(thread.id);
    setEditTitle(thread.title ?? "");
  };

  const finishRename = () => {
    if (editingId && editTitle.trim()) {
      renameThread(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-sidebar">
      {/* Top: New chat */}
      <div className="px-3 pt-2 pb-1">
        <button
          type="button"
          onClick={handleGoHome}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            view === "chat" && isHome
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-white/60"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M7 1v12M1 7h12" />
          </svg>
          <span>新对话</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-3 py-1 space-y-0.5">
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            view === "settings"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-white/60"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="2.5" />
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.76 2.76l1.06 1.06M10.18 10.18l1.06 1.06M11.24 2.76l-1.06 1.06M3.82 10.18l-1.06 1.06" />
          </svg>
          <span>设置</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("skills")}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            view === "skills"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:bg-white/60"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="5" height="5" rx="1" />
            <rect x="8" y="1" width="5" height="5" rx="1" />
            <rect x="1" y="8" width="5" height="5" rx="1" />
            <rect x="8" y="8" width="5" height="5" rx="1" />
          </svg>
          <span>Skills</span>
        </button>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1.5 border-t border-gray-200" />

      {/* Recent conversations */}
      <div className="px-3 py-1">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          最近对话
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <p className="px-2.5 py-2 text-xs text-gray-400">暂无对话记录</p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => handleSelectThread(thread.id)}
              className={`group relative flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                view === "chat" && activeThreadId === thread.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:bg-white/60"
              }`}
            >
              {editingId === thread.id ? (
                <input
                  ref={editRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded bg-white px-1 py-0.5 text-xs outline-none ring-1 ring-accent/40"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {thread.title || "新对话"}
                  </span>
                  <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(thread);
                      }}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                      title="重命名"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M7.5 1.5l3 3L3.75 11.25H.75v-3L7.5 1.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(thread.id);
                      }}
                      className="rounded p-0.5 text-gray-400 hover:text-red-500"
                      title="删除"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1.5 3h9M4.5 3V1.5h3V3M2.5 3v7.5h7V3" />
                        <path d="M4.5 5.5v3M7.5 5.5v3" />
                      </svg>
                    </button>
                  </span>
                </>
              )}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
