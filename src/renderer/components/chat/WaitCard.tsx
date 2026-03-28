import type { DynamicToolUIPart } from "ai";

interface WaitCardProps {
  invocation: DynamicToolUIPart;
}

export function WaitCard({ invocation }: WaitCardProps) {
  const input = "input" in invocation ? (invocation.input as Record<string, unknown>) : undefined;
  const reason = String(input?.reason ?? "等待用户操作");
  const isWaiting = invocation.state === "input-available";

  if (!isWaiting) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 text-xs text-green-700">
        <span className="mr-1">✓</span>
        用户操作已完成
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-waiting/30 bg-waiting/5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-waiting opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-waiting" />
        </span>
        <span className="text-xs font-medium text-waiting">等待用户操作</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">{reason}</p>
    </div>
  );
}
