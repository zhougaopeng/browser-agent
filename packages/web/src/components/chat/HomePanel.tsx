import { useEffect, useRef, useState } from "react";
import { useThreadsStore } from "../../stores/threads";

const quickActions = [
  { icon: "🌐", label: "网页操作" },
  { icon: "🔍", label: "搜索" },
  { icon: "📝", label: "表单填写" },
  { icon: "📊", label: "数据采集" },
  { icon: "🤖", label: "自动化" },
];

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

  const prefixMap: Record<string, string> = {
    网页操作: "帮我打开",
    搜索: "搜索",
    表单填写: "帮我填写",
    数据采集: "帮我从网页提取",
    自动化: "帮我自动化",
  };
  const allPrefixes = Object.values(prefixMap);

  const handleQuickAction = (label: string) => {
    const newPrefix = prefixMap[label] ?? label;
    setInput((prev) => {
      let rest = prev;
      for (const p of allPrefixes) {
        if (rest.startsWith(`${p} `)) {
          rest = rest.slice(p.length + 1);
          break;
        }
      }
      const trimmed = rest.trimStart();
      return trimmed ? `${newPrefix} ${trimmed}` : `${newPrefix} `;
    });
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col bg-home-bg">
      {/* Center hero area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="mb-3 text-5xl select-none" aria-hidden="true">
            🌐
          </div>
          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
            有什么可以帮你的？
          </h1>
        </div>

        {/* Input box */}
        <div className="mt-8 w-full max-w-[760px]">
          <div className="rounded-2xl border border-home-input-border bg-home-input-bg shadow-sm transition-shadow focus-within:shadow-md">
            {/* Textarea */}
            <div className="px-5 pt-4 pb-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你想在浏览器中完成的操作..."
                rows={3}
                className="w-full resize-none bg-transparent text-base leading-relaxed text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>
            {/* Bottom bar inside input */}
            <div className="flex items-center justify-end border-t border-home-input-border/60 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 select-none">Browser Agent</span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-30"
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
                    aria-hidden="true"
                  >
                    <path d="M8 12V4M4 7l4-4 4 4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.label)}
              className="flex items-center gap-1.5 rounded-full bg-pill-bg px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:bg-pill-hover"
            >
              <span className="text-xs">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
