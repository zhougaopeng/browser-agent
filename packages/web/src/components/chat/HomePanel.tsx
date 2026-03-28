import { useEffect, useRef, useState } from "react";
import { useThreadsStore } from "../../stores/threads";

export function HomePanel() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-resize textarea on input change
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    useThreadsStore.getState().startChatWithMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-4xl">🌐</p>
          <h1 className="mt-4 text-xl font-medium text-gray-800">有什么可以帮你的？</h1>
          <p className="mt-1.5 text-sm text-gray-400">描述你想在浏览器中完成的操作</p>
        </div>
      </div>

      <div className="px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mx-auto flex max-w-xl items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：帮我打开百度搜索今天的新闻..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-surface px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-accent/40 focus:shadow-md"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
            title="发送"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="发送"
            >
              <path d="M8 12V4M4 7l4-4 4 4" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
