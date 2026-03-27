import { useState } from "react";

interface ScreenshotCardProps {
  invocation: {
    toolCallId: string;
    toolName: string;
    state: string;
    result?: unknown;
  };
}

export function ScreenshotCard({ invocation }: ScreenshotCardProps) {
  const [expanded, setExpanded] = useState(false);

  const result = invocation.result as string | undefined;
  if (!result) return null;

  const isBase64 = result.startsWith("data:image") || result.startsWith("/9j");
  const src = isBase64
    ? result.startsWith("data:")
      ? result
      : `data:image/jpeg;base64,${result}`
    : undefined;

  if (!src) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-1.5 text-xs text-gray-500">
        <span className="text-green-500">✓</span> 截图完成
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full cursor-pointer"
      >
        <img
          src={src}
          alt="Screenshot"
          className={`w-full object-contain ${expanded ? "max-h-[600px]" : "max-h-40"}`}
        />
      </button>
      <div className="flex items-center justify-between bg-gray-50 px-2 py-1 text-[10px] text-gray-400">
        <span>🖼 截图</span>
        <span>{expanded ? "点击收起" : "点击展开"}</span>
      </div>
    </div>
  );
}
