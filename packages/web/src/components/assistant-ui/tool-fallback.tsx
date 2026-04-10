"use client";

import {
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartStatus,
  useScrollLock,
} from "@assistant-ui/react";
import { AlertCircleIcon, CheckIcon, ChevronDownIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

export type ToolFallbackRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  status?: ToolCallMessagePartStatus;
};

function ToolFallbackRoot({
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  status,
  children,
  ...props
}: ToolFallbackRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        lockScroll();
      }
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled = status?.type === "incomplete" && status.reason === "cancelled";
  const isError = status?.type === "incomplete" && status.reason !== "cancelled";

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="tool-fallback-root"
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "aui-tool-fallback-root group/tool-fallback-root my-2 w-full overflow-hidden rounded-xl border",
        "transition-all duration-200",
        /* status-specific border / bg */
        isRunning && "border-primary/20 bg-primary/[0.03]",
        !isRunning && !isCancelled && !isError && "border-emerald-500/20 bg-emerald-500/[0.03]",
        isCancelled && "border-muted-foreground/20 bg-muted/20",
        isError && "border-destructive/25 bg-destructive/[0.03]",
        className,
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* 左侧状态指示条 */}
      <div className="relative flex">
        <div
          className={cn(
            "aui-tool-fallback-accent-bar absolute left-0 top-0 bottom-0 w-[3px] rounded-full",
            isRunning && "bg-primary/50",
            !isRunning && !isCancelled && !isError && "bg-emerald-500/60",
            isCancelled && "bg-muted-foreground/30",
            isError && "bg-destructive/50",
          )}
        />
        <div className="min-w-0 flex-1 pl-[3px]">{children}</div>
      </div>
    </Collapsible>
  );
}

type ToolStatus = ToolCallMessagePartStatus["type"];

const statusIconMap: Record<ToolStatus, React.ElementType> = {
  running: LoaderIcon,
  complete: CheckIcon,
  incomplete: XCircleIcon,
  "requires-action": AlertCircleIcon,
};

function ToolFallbackTrigger({
  toolName,
  status,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  toolName: string;
  status?: ToolCallMessagePartStatus;
}) {
  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled = status?.type === "incomplete" && status.reason === "cancelled";
  const isError = status?.type === "incomplete" && status.reason !== "cancelled";

  const Icon = statusIconMap[statusType];

  /* 工具名做一点格式化：camelCase / snake_case → 空格分词 */
  const displayName = toolName.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");

  return (
    <CollapsibleTrigger
      data-slot="tool-fallback-trigger"
      className={cn(
        "aui-tool-fallback-trigger group/trigger flex w-full items-center gap-2.5 px-3.5 py-2.5",
        "text-sm transition-colors",
        "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
        className,
      )}
      {...props}
    >
      {/* 状态图标 */}
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          isRunning && "bg-primary/10",
          !isRunning && !isCancelled && !isError && "bg-emerald-500/12",
          isCancelled && "bg-muted-foreground/10",
          isError && "bg-destructive/10",
        )}
      >
        <Icon
          data-slot="tool-fallback-trigger-icon"
          className={cn(
            "aui-tool-fallback-trigger-icon size-3 shrink-0",
            isRunning && "animate-spin text-primary/70",
            !isRunning && !isCancelled && !isError && "text-emerald-600",
            isCancelled && "text-muted-foreground/50",
            isError && "text-destructive",
          )}
        />
      </span>

      {/* 文字区 */}
      <span
        data-slot="tool-fallback-trigger-label"
        className={cn(
          "aui-tool-fallback-trigger-label-wrapper relative inline-block grow text-left leading-none",
        )}
      >
        <span
          className={cn(
            "text-muted-foreground/70 transition-colors group-hover/trigger:text-muted-foreground",
            isCancelled && "line-through opacity-60",
          )}
        >
          {isRunning ? (
            <>
              <span>调用工具 </span>
              <span className="font-semibold text-foreground/80">{displayName}</span>
              <span> 中</span>
              {/* running shimmer */}
              <span
                aria-hidden
                data-slot="tool-fallback-trigger-shimmer"
                className="aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
              >
                调用工具 <span className="font-semibold text-foreground/80">{displayName}</span> 中
              </span>
            </>
          ) : isCancelled ? (
            <>
              <span>已取消 </span>
              <span className="font-semibold text-foreground/60">{displayName}</span>
            </>
          ) : isError ? (
            <>
              <span>工具调用失败 </span>
              <span className="font-semibold text-foreground/80">{displayName}</span>
            </>
          ) : (
            <>
              <span>已调用 </span>
              <span className="font-semibold text-foreground/85">{displayName}</span>
            </>
          )}
        </span>
      </span>

      {/* 工具名 badge */}
      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none",
          "border border-border/50 bg-muted/60 text-muted-foreground/60",
          "hidden sm:inline-block",
          isCancelled && "opacity-40",
        )}
      >
        {toolName}
      </span>

      <ChevronDownIcon
        data-slot="tool-fallback-trigger-chevron"
        className={cn(
          "aui-tool-fallback-trigger-chevron ml-0.5 size-3.5 shrink-0 text-muted-foreground/40",
          "transition-transform duration-(--animation-duration) ease-out",
          "group-data-[state=closed]/trigger:-rotate-90",
          "group-data-[state=open]/trigger:rotate-0",
        )}
      />
    </CollapsibleTrigger>
  );
}

function ToolFallbackContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-fallback-content"
      className={cn(
        "aui-tool-fallback-content relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-out",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div className="mt-0 flex flex-col divide-y divide-border/40 border-t border-border/40">
        {children}
      </div>
    </CollapsibleContent>
  );
}

function ToolFallbackArgs({
  argsText,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  argsText?: string;
}) {
  if (!argsText) return null;

  // 尝试格式化 JSON
  let formatted = argsText;
  try {
    formatted = JSON.stringify(JSON.parse(argsText), null, 2);
  } catch {
    // 不是 JSON，保持原样
  }

  return (
    <div
      data-slot="tool-fallback-args"
      className={cn("aui-tool-fallback-args group/args", className)}
      {...props}
    >
      <div className="flex items-center gap-1.5 px-3.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Input
        </span>
      </div>
      <pre className="aui-tool-fallback-args-value overflow-x-auto whitespace-pre-wrap break-all px-3.5 pb-3 pt-0 font-mono text-[0.78rem] leading-relaxed text-foreground/75">
        {formatted}
      </pre>
    </div>
  );
}

function ToolFallbackResult({
  result,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  result?: unknown;
}) {
  if (result === undefined) return null;

  const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);

  return (
    <div
      data-slot="tool-fallback-result"
      className={cn("aui-tool-fallback-result", className)}
      {...props}
    >
      <div className="flex items-center gap-1.5 px-3.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/60">
          Output
        </span>
      </div>
      <pre className="aui-tool-fallback-result-content overflow-x-auto whitespace-pre-wrap break-all px-3.5 pb-3 pt-0 font-mono text-[0.78rem] leading-relaxed text-foreground/75">
        {text}
      </pre>
    </div>
  );
}

function ToolFallbackError({
  status,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  status?: ToolCallMessagePartStatus;
}) {
  if (status?.type !== "incomplete") return null;

  const error = status.error;
  const errorText = error ? (typeof error === "string" ? error : JSON.stringify(error)) : null;

  if (!errorText) return null;

  const isCancelled = status.reason === "cancelled";

  return (
    <div
      data-slot="tool-fallback-error"
      className={cn(
        "aui-tool-fallback-error px-3.5 py-2.5",
        !isCancelled && "text-destructive/80",
        className,
      )}
      {...props}
    >
      <p className="aui-tool-fallback-error-header mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
        {isCancelled ? "Cancelled reason" : "Error"}
      </p>
      <p className="aui-tool-fallback-error-reason font-mono text-[0.78rem] leading-relaxed">
        {errorText}
      </p>
    </div>
  );
}

const ToolFallbackImpl: ToolCallMessagePartComponent = ({ toolName, argsText, result, status }) => {
  const isCancelled = status?.type === "incomplete" && status.reason === "cancelled";

  return (
    <ToolFallbackRoot status={status}>
      <ToolFallbackTrigger toolName={toolName} status={status} />
      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        <ToolFallbackArgs argsText={argsText} className={cn(isCancelled && "opacity-50")} />
        {!isCancelled && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

const ToolFallback = memo(ToolFallbackImpl) as unknown as ToolCallMessagePartComponent & {
  Root: typeof ToolFallbackRoot;
  Trigger: typeof ToolFallbackTrigger;
  Content: typeof ToolFallbackContent;
  Args: typeof ToolFallbackArgs;
  Result: typeof ToolFallbackResult;
  Error: typeof ToolFallbackError;
};

ToolFallback.displayName = "ToolFallback";
ToolFallback.Root = ToolFallbackRoot;
ToolFallback.Trigger = ToolFallbackTrigger;
ToolFallback.Content = ToolFallbackContent;
ToolFallback.Args = ToolFallbackArgs;
ToolFallback.Result = ToolFallbackResult;
ToolFallback.Error = ToolFallbackError;

export {
  ToolFallback,
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
};
