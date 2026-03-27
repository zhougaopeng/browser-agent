interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "partial-call" | "result";
  result?: unknown;
}

interface ActionCardProps {
  invocation: ToolInvocation;
}

const TOOL_LABELS: Record<string, string> = {
  browser_navigate: "导航",
  browser_click: "点击",
  browser_type: "输入",
  browser_fill: "填写",
  browser_snapshot: "快照",
  browser_screenshot: "截图",
  browser_scroll: "滚动",
  browser_hover: "悬停",
  browser_select: "选择",
  browser_evaluate: "执行脚本",
  browser_wait: "等待",
  browser_go_back: "后退",
  browser_go_forward: "前进",
  browser_tab_new: "新标签",
  browser_tab_close: "关闭标签",
  browser_tabs: "标签列表",
};

function getArgSummary(_toolName: string, args: Record<string, unknown>): string {
  if (args.url) return String(args.url);
  if (args.text) return String(args.text).slice(0, 60);
  if (args.ref) return `ref="${args.ref}"`;
  if (args.selector) return String(args.selector).slice(0, 40);
  return "";
}

export function ActionCard({ invocation }: ActionCardProps) {
  const { toolName, args, state } = invocation;
  const label = TOOL_LABELS[toolName] ?? toolName.replace("browser_", "");
  const summary = getArgSummary(toolName, args ?? {});

  const stateColors = {
    call: "border-blue-200 bg-blue-50/50",
    "partial-call": "border-blue-200 bg-blue-50/50",
    result: "border-gray-200 bg-gray-50/50",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${stateColors[state]}`}
    >
      <span className="shrink-0">
        {state === "result" ? (
          <span className="text-green-500">✓</span>
        ) : (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        )}
      </span>

      <span className="font-medium text-gray-700">{label}</span>

      {summary && <span className="min-w-0 truncate text-gray-400">{summary}</span>}
    </div>
  );
}
