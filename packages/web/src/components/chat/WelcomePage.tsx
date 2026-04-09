import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ArrowUpIcon, GlobeIcon, MousePointerClickIcon, SearchIcon } from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

const SUGGESTIONS = [
  { icon: GlobeIcon, text: "打开百度搜索并查询天气" },
  { icon: SearchIcon, text: "搜索最近的科技新闻" },
  { icon: MousePointerClickIcon, text: "打开 GitHub 并登录我的账号" },
];

export const WelcomePage: FC = () => {
  const aui = useAui();
  const threadStatus = useAuiState((s) => s.threadListItem.status) as string;
  const sendingRef = useRef(false);

  useEffect(() => {
    if (threadStatus !== "new" && !sendingRef.current) {
      aui.threads().switchToNewThread();
    }
  }, [aui, threadStatus]);

  const handleSuggestionClick = useCallback(
    (text: string) => {
      aui.composer().setText(text);
    },
    [aui],
  );

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-2xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <GlobeIcon className="size-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Browser Agent</h1>
          <p className="max-w-sm text-base text-muted-foreground">
            描述你想在浏览器中完成的操作，我来帮你执行
          </p>
        </div>

        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
          {SUGGESTIONS.map((s) => (
            <SuggestionCard
              key={s.text}
              icon={s.icon}
              text={s.text}
              onClick={handleSuggestionClick}
            />
          ))}
        </div>

        <WelcomeComposer sendingRef={sendingRef} />
      </div>
    </div>
  );
};

const SuggestionCard: FC<{
  icon: FC<{ className?: string }>;
  text: string;
  onClick: (text: string) => void;
}> = ({ icon: Icon, text, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      title={text}
      className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm leading-snug text-muted-foreground group-hover:text-foreground">
        {text}
      </p>
    </button>
  );
};

const WelcomeComposer: FC<{
  sendingRef: React.RefObject<boolean>;
}> = ({ sendingRef }) => {
  const aui = useAui();
  const navigate = useNavigate();
  const canSend = useAuiState((s) => !s.composer.isEmpty && !s.thread.isRunning);
  const threadStatus = useAuiState((s) => s.threadListItem.status) as string;
  const remoteId = useAuiState((s) => s.threadListItem.remoteId) as string | undefined;
  const [isSending, setIsSending] = useState(false);
  const lockRef = useRef(false);
  const prevRemoteIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isSending || !remoteId || remoteId.startsWith("__LOCALID_")) return;
    if (remoteId === prevRemoteIdRef.current) return;
    navigate(`/chat/${remoteId}`, { replace: true });
  }, [isSending, remoteId, navigate]);

  const handleSend = useCallback(() => {
    if (!canSend || lockRef.current || threadStatus !== "new") return;
    lockRef.current = true;
    sendingRef.current = true;
    prevRemoteIdRef.current = remoteId;
    setIsSending(true);
    aui.composer().send();
  }, [aui, canSend, threadStatus, remoteId, sendingRef]);

  const handleSubmit = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  return (
    <ComposerPrimitive.Root className="relative w-full" onSubmit={handleSubmit}>
      <div className="flex w-full flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20">
        <ComposerPrimitive.Input
          placeholder="描述你想完成的操作..."
          className="max-h-32 min-h-12 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <div className="flex items-center justify-end">
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Send message"
            disabled={!canSend || isSending}
            onClick={handleSend}
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};
