import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { InputBar } from "./InputBar";
import { MessageBubble } from "./MessageBubble";
import { QuickActions } from "./QuickActions";

const transport = new DefaultChatTransport({ api: "agent://chat" });

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
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
            <div className="text-center text-gray-400">
              <p className="text-2xl">🌐</p>
              <p className="mt-2 text-sm">告诉我你想在浏览器中做什么</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
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
        disabled={false}
      />
    </div>
  );
}
