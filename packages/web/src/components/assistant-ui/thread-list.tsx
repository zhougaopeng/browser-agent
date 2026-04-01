import { AuiIf, ThreadListItemPrimitive, ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon, TrashIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ThreadListProps {
  onNewThread?: () => void;
  onSelectThread?: () => void;
  slotAfterNew?: ReactNode;
}

export const ThreadList: FC<ThreadListProps> = ({ onNewThread, onSelectThread, slotAfterNew }) => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col gap-1">
      <ThreadListNew onClick={onNewThread} />
      {slotAfterNew}
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <ThreadListPrimitive.Items>
          {() => <ThreadListItem onClick={onSelectThread} />}
        </ThreadListPrimitive.Items>
      </AuiIf>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <ThreadListPrimitive.New asChild>
      <button
        type="button"
        className="aui-thread-list-new flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-sidebar-border px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent data-active:bg-sidebar-accent"
        onClick={onClick}
      >
        <PlusIcon className="size-4" />
        新对话
      </button>
    </ThreadListPrimitive.New>
  );
};

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"];

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-1">
      {SKELETON_KEYS.map((key) => (
        <div
          key={key}
          role="status"
          aria-label="Loading threads"
          className="aui-thread-list-skeleton-wrapper flex h-9 items-center px-3"
        >
          <Skeleton className="aui-thread-list-skeleton h-4 w-full" />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <ThreadListItemPrimitive.Root
      className="aui-thread-list-item group flex h-9 items-center gap-2 rounded-lg transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none data-active:bg-sidebar-accent"
      onClick={onClick}
    >
      <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center px-3 text-start text-sm text-sidebar-foreground/80">
        <span className="aui-thread-list-item-title min-w-0 flex-1 truncate">
          <ThreadListItemPrimitive.Title fallback="新对话" />
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemActions />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemActions: FC = () => {
  return (
    <div className="mr-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-data-active:opacity-100">
      <ThreadListItemPrimitive.Delete asChild>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <TrashIcon className="size-4" />
          <span className="sr-only">Delete</span>
        </button>
      </ThreadListItemPrimitive.Delete>
    </div>
  );
};
