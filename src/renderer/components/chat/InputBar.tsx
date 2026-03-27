import { type FormEvent, useEffect, useRef } from "react";

interface InputBarProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export function InputBar({
  input,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
}: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) onSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isLoading && input.trim()) onSubmit();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你想完成的操作..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-surface px-3.5 py-2 text-sm leading-relaxed text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent/40 disabled:opacity-50"
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            title="停止"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-label="停止">
              <rect x="2" y="2" width="10" height="10" rx="1.5" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
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
        )}
      </form>
    </div>
  );
}
