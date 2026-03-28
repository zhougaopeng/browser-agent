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
    <div className="border-t border-border bg-home-bg px-5 py-3.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isLoading && input.trim()) onSubmit();
        }}
        className="mx-auto flex max-w-3xl items-end gap-2.5"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你想完成的操作..."
          rows={2}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-home-input-border bg-home-input-bg px-4 py-3 text-base leading-relaxed text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent/40 disabled:opacity-50"
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pill-bg text-gray-500 transition-colors hover:bg-pill-hover"
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
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
