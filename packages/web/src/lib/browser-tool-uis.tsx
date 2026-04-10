import type { ToolCallMessagePartStatus } from "@assistant-ui/react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  CodeIcon,
  ComputerIcon,
  EyeIcon,
  FileUpIcon,
  GlobeIcon,
  KeyboardIcon,
  ListIcon,
  MonitorIcon,
  MousePointerClickIcon,
  MousePointerIcon,
  MoveIcon,
  NetworkIcon,
  ScrollIcon,
  SquareIcon,
  TimerIcon,
  ToggleLeftIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Tool metadata ──────────────────────────────────────────────────────────

type ToolMeta = {
  label: string;
  icon: React.ElementType;
  color: string; // tailwind text-* class for the icon
  bg: string; // tailwind bg-* class for the icon badge (light mode)
};

const TOOL_META: Record<string, ToolMeta> = {
  browser_navigate: { label: "导航", icon: GlobeIcon, color: "text-sky-600", bg: "bg-sky-500/10" },
  browser_navigate_back: {
    label: "后退",
    icon: ArrowLeftIcon,
    color: "text-sky-600",
    bg: "bg-sky-500/10",
  },
  browser_click: {
    label: "点击",
    icon: MousePointerClickIcon,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  browser_hover: {
    label: "悬停",
    icon: MousePointerIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  browser_drag: { label: "拖拽", icon: MoveIcon, color: "text-violet-500", bg: "bg-violet-500/10" },
  browser_type: {
    label: "输入",
    icon: KeyboardIcon,
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
  },
  browser_fill_form: {
    label: "填写表单",
    icon: ClipboardIcon,
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
  },
  browser_press_key: {
    label: "按键",
    icon: KeyboardIcon,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  browser_select_option: {
    label: "选择",
    icon: ToggleLeftIcon,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  browser_file_upload: {
    label: "上传文件",
    icon: FileUpIcon,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  browser_snapshot: { label: "快照", icon: EyeIcon, color: "text-teal-600", bg: "bg-teal-500/10" },
  browser_take_screenshot: {
    label: "截图",
    icon: MonitorIcon,
    color: "text-teal-600",
    bg: "bg-teal-500/10",
  },
  browser_console_messages: {
    label: "控制台",
    icon: CodeIcon,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  browser_network_requests: {
    label: "网络请求",
    icon: NetworkIcon,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  browser_evaluate: {
    label: "执行脚本",
    icon: ZapIcon,
    color: "text-rose-600",
    bg: "bg-rose-500/10",
  },
  browser_run_code: {
    label: "运行代码",
    icon: CodeIcon,
    color: "text-rose-600",
    bg: "bg-rose-500/10",
  },
  browser_wait_for: {
    label: "等待",
    icon: TimerIcon,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
  browser_tabs: {
    label: "标签管理",
    icon: ListIcon,
    color: "text-slate-600",
    bg: "bg-slate-500/10",
  },
  browser_handle_dialog: {
    label: "处理弹窗",
    icon: SquareIcon,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  browser_close: {
    label: "关闭页面",
    icon: XCircleIcon,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
  browser_resize: {
    label: "调整窗口",
    icon: ComputerIcon,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
  browser_mouse_click_xy: {
    label: "坐标点击",
    icon: MousePointerClickIcon,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  browser_mouse_move_xy: {
    label: "移动鼠标",
    icon: MousePointerIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  browser_mouse_drag_xy: {
    label: "坐标拖拽",
    icon: MoveIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  browser_mouse_down: {
    label: "按下鼠标",
    icon: MousePointerClickIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  browser_mouse_up: {
    label: "释放鼠标",
    icon: MousePointerClickIcon,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  browser_mouse_wheel: {
    label: "滚轮滚动",
    icon: ScrollIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
};

function getMeta(toolName: string): ToolMeta {
  return (
    TOOL_META[toolName] ?? {
      label: toolName.replace("browser_", ""),
      icon: GlobeIcon,
      color: "text-muted-foreground",
      bg: "bg-muted",
    }
  );
}

// ─── Argument summary ────────────────────────────────────────────────────────

function getArgSummary(toolName: string, args: Record<string, unknown> | undefined): string {
  if (!args) return "";
  if (args.url) return String(args.url);
  if (args.text) return String(args.text).slice(0, 80);
  if (args.key) return String(args.key);
  if (args.ref) return String(args.ref);
  if (args.selector) return String(args.selector).slice(0, 60);
  if (args.x !== undefined && args.y !== undefined) return `(${args.x}, ${args.y})`;
  if (args.reason) return String(args.reason).slice(0, 60);
  if (args.code) return String(args.code).slice(0, 60);
  return "";
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function isDone(status: ToolCallMessagePartStatus | undefined): boolean {
  return status?.type === "complete" || status?.type === "incomplete";
}
function isRunning(status: ToolCallMessagePartStatus | undefined): boolean {
  return status?.type === "running";
}
function isError(status: ToolCallMessagePartStatus | undefined): boolean {
  return status?.type === "incomplete" && status.reason !== "cancelled";
}

// ─── BrowserActionUI ─────────────────────────────────────────────────────────

function BrowserActionUI({
  toolName,
  args,
  status,
}: {
  toolName: string;
  args: Record<string, unknown>;
  status: ToolCallMessagePartStatus | undefined;
}) {
  const meta = getMeta(toolName);
  const Icon = meta.icon;
  const summary = getArgSummary(toolName, args);
  const done = isDone(status);
  const running = isRunning(status);
  const error = isError(status);

  return (
    <div
      className={cn(
        "group/tool flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs",
        "transition-all duration-150",
        /* state-specific borders & backgrounds */
        running && "border-primary/20 bg-primary/[0.035]",
        done && !error && "border-emerald-500/20 bg-emerald-500/[0.03]",
        error && "border-destructive/25 bg-destructive/[0.04]",
      )}
    >
      {/* Icon badge */}
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md",
          done && !error ? "bg-emerald-500/12" : error ? "bg-destructive/10" : meta.bg,
        )}
      >
        {running ? (
          // Animated pulse dot while running
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary/80" />
          </span>
        ) : done && !error ? (
          <CheckIcon className="size-3 text-emerald-600" />
        ) : error ? (
          <XCircleIcon className="size-3 text-destructive" />
        ) : (
          <Icon className={cn("size-3 shrink-0", meta.color)} />
        )}
      </span>

      {/* Label */}
      <span
        className={cn(
          "shrink-0 font-semibold",
          running && "text-foreground/80",
          done && !error && "text-foreground/70",
          error && "text-destructive/80",
        )}
      >
        {meta.label}
      </span>

      {/* Summary */}
      {summary && (
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono leading-none",
            running && "text-muted-foreground/70",
            done && !error && "text-muted-foreground/55",
            error && "text-destructive/60",
          )}
          title={summary}
        >
          {summary}
        </span>
      )}

      {/* Running shimmer overlay */}
      {running && (
        <span
          aria-hidden
          className="shimmer pointer-events-none absolute inset-0 rounded-lg motion-reduce:animate-none"
        />
      )}
    </div>
  );
}

// ─── ScreenshotUI ─────────────────────────────────────────────────────────────

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
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-1.5 text-xs">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/12">
          <CheckIcon className="size-3 text-emerald-600" />
        </span>
        <span className="font-semibold text-foreground/70">截图</span>
        <span className="text-muted-foreground/55">已完成</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="group/screenshot relative w-full cursor-pointer overflow-hidden"
        aria-label={expanded ? "收起截图" : "展开截图"}
      >
        <img
          src={src}
          alt="Screenshot"
          className={cn(
            "w-full object-contain transition-all duration-300",
            expanded ? "max-h-[600px]" : "max-h-40",
          )}
        />
        {/* Overlay hint */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1",
            "bg-gradient-to-t from-black/40 to-transparent py-1.5",
            "opacity-0 transition-opacity duration-150 group-hover/screenshot:opacity-100",
          )}
        >
          {expanded ? (
            <ChevronUpIcon className="size-3.5 text-white/80" />
          ) : (
            <ChevronDownIcon className="size-3.5 text-white/80" />
          )}
          <span className="text-[10px] font-medium text-white/80">
            {expanded ? "收起" : "展开"}
          </span>
        </div>
      </button>

      <div className="flex items-center justify-between border-t border-border/40 bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground/60">
        <span className="font-medium">截图预览</span>
        <span>{expanded ? "点击收起" : "点击展开"}</span>
      </div>
    </div>
  );
}

// ─── WaitForUserUI ────────────────────────────────────────────────────────────

function WaitForUserUI({
  args,
  status,
}: {
  args: Record<string, unknown>;
  status: ToolCallMessagePartStatus | undefined;
}) {
  const reason = String(args?.reason ?? "等待用户操作");
  const waiting = status?.type === "running" || status?.type === "requires-action";

  return (
    <div className="overflow-hidden rounded-lg border border-amber-400/30 bg-amber-50/40 dark:border-amber-600/25 dark:bg-amber-900/10">
      <div className="flex items-center gap-2.5 px-3 py-2">
        {/* Ping dot */}
        <span className="relative flex size-2 shrink-0">
          {waiting && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              waiting ? "bg-amber-500" : "bg-amber-400",
            )}
          />
        </span>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          {waiting ? "等待用户操作" : "用户操作已继续"}
        </span>
      </div>
      <p className="border-t border-amber-400/20 px-3 py-1.5 text-[11px] leading-relaxed text-amber-800/70 dark:text-amber-300/60">
        {reason}
      </p>
    </div>
  );
}

// ─── Tool registrations ───────────────────────────────────────────────────────

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
