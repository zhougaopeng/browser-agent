import {
  AuiIf,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { remoteToLocalMap, threadSwitchers } from "@/lib/thread-adapter";

interface ThreadListProps {
  onNewThread?: () => void;
  onSelectThread?: (remoteId: string) => void;
  onDeleteThread?: () => void;
  slotAfterNew?: ReactNode;
}

export const ThreadList: FC<ThreadListProps> = ({
  onNewThread,
  onSelectThread,
  onDeleteThread,
  slotAfterNew,
}) => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col gap-1">
      <ThreadListNew onClick={onNewThread} />
      {slotAfterNew}
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <ThreadListPrimitive.Items>
          {() => <ThreadListItem onClick={onSelectThread} onDelete={onDeleteThread} />}
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

const ThreadListItem: FC<{ onClick?: (remoteId: string) => void; onDelete?: () => void }> = ({
  onClick,
  onDelete,
}) => {
  const aui = useAui();
  const [isEditing, setIsEditing] = useState(false);
  const title = useAuiState((s) => s.threadListItem.title ?? "");
  const localId = useAuiState((s) => s.threadListItem.id);
  const itemRemoteId = useAuiState((s) => s.threadListItem.remoteId) as string | undefined;

  if (itemRemoteId) {
    remoteToLocalMap.set(itemRemoteId, localId);
  }

  useEffect(() => {
    if (!itemRemoteId) return;
    threadSwitchers.set(itemRemoteId, () => aui.threadListItem().switchTo());
    return () => {
      threadSwitchers.delete(itemRemoteId);
    };
  }, [itemRemoteId, aui]);

  return (
    <ThreadListItemPrimitive.Root
      className="aui-thread-list-item group relative flex h-9 items-center rounded-lg transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none data-active:bg-sidebar-accent"
      onClick={() => {
        if (itemRemoteId) onClick?.(itemRemoteId);
      }}
    >
      {isEditing ? (
        <ThreadListItemTitleEditor onClose={() => setIsEditing(false)} />
      ) : (
        <>
          <ThreadListItemPrimitive.Trigger
            className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center px-3 text-start text-sm text-sidebar-foreground/80"
            title={title || "新对话"}
          >
            <span className="aui-thread-list-item-title min-w-0 flex-1 truncate">
              <ThreadListItemPrimitive.Title fallback="新对话" />
            </span>
          </ThreadListItemPrimitive.Trigger>
          <ThreadListItemActions onEdit={() => setIsEditing(true)} onDelete={onDelete} />
        </>
      )}
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitleEditor: FC<{ onClose: () => void }> = ({ onClose }) => {
  const aui = useAui();
  const title = useAuiState((s) => s.threadListItem.title ?? "");
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      await aui.threadListItem().rename(trimmed);
    }
    onClose();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className="flex h-full min-w-0 flex-1 items-center gap-1 px-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="h-7 min-w-0 flex-1 rounded border border-sidebar-border bg-sidebar px-1.5 text-sm text-sidebar-foreground outline-none focus:border-sidebar-ring"
      />
      <button
        type="submit"
        className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        title="保存"
      >
        <CheckIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        title="取消"
      >
        <XIcon className="size-3.5" />
      </button>
    </form>
  );
};

const ThreadListItemActions: FC<{ onEdit: () => void; onDelete?: () => void }> = ({
  onEdit,
  onDelete,
}) => {
  const aui = useAui();
  const isActive = useAuiState((s) => s.threads.mainThreadId === s.threadListItem.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    aui.threadListItem().delete();
    if (isActive) onDelete?.();
  };

  return (
    <div className="absolute right-0 mr-2 hidden items-center gap-0.5 rounded-md bg-sidebar-accent group-hover:flex group-data-active:flex">
      <button
        type="button"
        className="flex size-7 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title="重命名"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <PencilIcon className="size-3.5" />
        <span className="sr-only">重命名</span>
      </button>
      <button
        type="button"
        className="flex size-7 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="删除"
        onClick={handleDelete}
      >
        <TrashIcon className="size-4" />
        <span className="sr-only">删除</span>
      </button>
    </div>
  );
};
