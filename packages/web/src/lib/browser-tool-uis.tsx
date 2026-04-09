import type { ToolCallMessagePartStatus } from "@assistant-ui/react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useState } from "react";

const TOOL_LABELS: Record<string, string> = {
  browser_navigate: "导航",
  browser_navigate_back: "后退",
  browser_click: "点击",
  browser_hover: "悬停",
  browser_drag: "拖拽",
  browser_type: "输入",
  browser_fill_form: "填写表单",
  browser_press_key: "按键",
  browser_select_option: "选择",
  browser_file_upload: "上传文件",
  browser_snapshot: "快照",
  browser_take_screenshot: "截图",
  browser_console_messages: "控制台",
  browser_network_requests: "网络请求",
  browser_evaluate: "执行脚本",
  browser_run_code: "运行代码",
  browser_wait_for: "等待",
  browser_tabs: "标签管理",
  browser_handle_dialog: "处理弹窗",
  browser_close: "关闭页面",
  browser_resize: "调整窗口",
  browser_mouse_click_xy: "坐标点击",
  browser_mouse_move_xy: "移动鼠标",
  browser_mouse_drag_xy: "坐标拖拽",
  browser_mouse_down: "按下鼠标",
  browser_mouse_up: "释放鼠标",
  browser_mouse_wheel: "滚轮滚动",
};

function getArgSummary(args: Record<string, unknown> | undefined): string {
  if (!args) return "";
  if (args.url) return String(args.url);
  if (args.text) return String(args.text).slice(0, 60);
  if (args.ref) return `ref="${args.ref}"`;
  if (args.selector) return String(args.selector).slice(0, 40);
  return "";
}

function isDone(status: ToolCallMessagePartStatus | undefined): boolean {
  return status?.type === "complete" || status?.type === "incomplete";
}

function BrowserActionUI({
  toolName,
  args,
  status,
}: {
  toolName: string;
  args: Record<string, unknown>;
  status: ToolCallMessagePartStatus | undefined;
}) {
  const label = TOOL_LABELS[toolName] ?? toolName.replace("browser_", "");
  const summary = getArgSummary(args);
  const done = isDone(status);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
        done ? "border-border bg-muted/50" : "border-primary/20 bg-primary/5"
      }`}
    >
      <span className="shrink-0">
        {done ? (
          <span className="text-green-500">✓</span>
        ) : (
          <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
        )}
      </span>
      <span className="font-medium text-foreground">{label}</span>
      {summary && <span className="min-w-0 truncate text-muted-foreground">{summary}</span>}
    </div>
  );
}

function ScreenshotUI({
  result,
  status,
}: {
  result: unknown;
  status: ToolCallMessagePartStatus | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = isDone(status);

  if (!done || !result) return null;

  const raw = typeof result === "string" ? result : "";
  const isBase64 = raw.startsWith("data:image") || raw.startsWith("/9j");
  const src = isBase64
    ? raw.startsWith("data:")
      ? raw
      : `data:image/jpeg;base64,${raw}`
    : undefined;

  if (!src) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="text-green-500">✓</span> 截图完成
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
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
      <div className="flex items-center justify-between bg-muted px-2 py-1 text-[10px] text-muted-foreground">
        <span>截图</span>
        <span>{expanded ? "点击收起" : "点击展开"}</span>
      </div>
    </div>
  );
}

function WaitForUserUI({
  args,
  status,
}: {
  args: Record<string, unknown>;
  status: ToolCallMessagePartStatus | undefined;
}) {
  const reason = String(args?.reason ?? "等待用户操作");
  const isWaiting = status?.type === "running" || status?.type === "requires-action";

  return (
    <div className="rounded-lg border border-amber-300/30 bg-amber-50/30 px-3 py-2.5 dark:border-amber-700/30 dark:bg-amber-900/10">
      <div className="flex items-center gap-2">
        {isWaiting ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
          </span>
        ) : (
          <span className="inline-flex size-2 rounded-full bg-amber-500" />
        )}
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">等待用户操作</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reason}</p>
    </div>
  );
}

const BROWSER_TOOL_NAMES = [
  "browser_navigate",
  "browser_navigate_back",
  "browser_click",
  "browser_hover",
  "browser_drag",
  "browser_type",
  "browser_fill_form",
  "browser_press_key",
  "browser_select_option",
  "browser_file_upload",
  "browser_snapshot",
  "browser_console_messages",
  "browser_network_requests",
  "browser_evaluate",
  "browser_run_code",
  "browser_wait_for",
  "browser_tabs",
  "browser_handle_dialog",
  "browser_close",
  "browser_resize",
  "browser_mouse_click_xy",
  "browser_mouse_move_xy",
  "browser_mouse_drag_xy",
  "browser_mouse_down",
  "browser_mouse_up",
  "browser_mouse_wheel",
];

export const BrowserScreenshotToolUI = makeAssistantToolUI<Record<string, unknown>, unknown>({
  toolName: "browser_take_screenshot",
  render: ({ args, result, status }) => (
    <>
      <BrowserActionUI toolName="browser_take_screenshot" args={args} status={status} />
      <ScreenshotUI result={result} status={status} />
    </>
  ),
});

export const WaitForUserToolUI = makeAssistantToolUI<Record<string, unknown>, unknown>({
  toolName: "wait_for_user",
  render: ({ args, status }) => <WaitForUserUI args={args} status={status} />,
});

export const BrowserActionToolUIs = BROWSER_TOOL_NAMES.map((toolName) =>
  makeAssistantToolUI<Record<string, unknown>, unknown>({
    toolName,
    render: ({ args, status }) => (
      <BrowserActionUI toolName={toolName} args={args} status={status} />
    ),
  }),
);

export const AllBrowserToolUIs = [
  BrowserScreenshotToolUI,
  WaitForUserToolUI,
  ...BrowserActionToolUIs,
];
