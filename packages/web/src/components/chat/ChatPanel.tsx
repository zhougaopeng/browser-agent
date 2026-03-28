import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/adapter";
import { useThreadsStore } from "../../stores/threads";
import { InputBar } from "./InputBar";
import { MessageBubble } from "./MessageBubble";
import { QuickActions } from "./QuickActions";

const transport = api.chatTransport;

export function ChatPanel() {
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const pendingChatId = useThreadsStore((s) => s.pendingChatId);
  const chatId = activeThreadId ?? pendingChatId ?? undefined;

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingTitleRef = useRef<{ threadId: string; title: string } | null>(null);
  const autoSentRef = useRef<string | null>(null);

  const onFinish = useCallback(() => {
    const pt = pendingTitleRef.current;
    if (pt) {
      useThreadsStore.getState().renameThread(pt.threadId, pt.title);
      pendingTitleRef.current = null;
    }
    useThreadsStore.getState().fetchThreads();
  }, []);

  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    transport,
    onFinish,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!chatId || autoSentRef.current === chatId) return;
    const msg = useThreadsStore.getState().consumePendingMessage();
    if (!msg) return;

    autoSentRef.current = chatId;

    const pid = useThreadsStore.getState().pendingChatId;
    if (pid) {
      useThreadsStore.getState().commitPendingThread(pid);
      const title = msg.length > 30 ? `${msg.slice(0, 30)}...` : msg;
      pendingTitleRef.current = { threadId: pid, title };
    }

    sendMessage({ text: msg });
  }, [chatId, sendMessage]);

  const isSuspended = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return (
      lastAssistant?.parts?.some(
        (p) =>
          p.type === "dynamic-tool" &&
          p.toolName === "wait_for_user" &&
          p.state === "input-available",
      ) ?? false
    );
  }, [messages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    const { pendingChatId: pid, commitPendingThread } = useThreadsStore.getState();
    if (pid && !activeThreadId) {
      commitPendingThread(pid);
      const title = text.length > 30 ? `${text.slice(0, 30)}...` : text;
      pendingTitleRef.current = { threadId: pid, title };
    }

    sendMessage({ text });
  };

  const handleQuickResume = () => {
    sendMessage({ text: "我已完成操作，请继续执行" });
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              准备中...
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && !isSuspended && (
              <div className="flex items-center gap-1.5 px-1 text-xs text-gray-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Agent 思考中...
              </div>
            )}
          </div>
        )}
      </div>

      {isSuspended && <QuickActions onResume={handleQuickResume} />}

      <InputBar
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        isLoading={isLoading}
        disabled={!chatId}
      />
    </div>
  );
}
