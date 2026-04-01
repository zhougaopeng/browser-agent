import { ComposerPrimitive } from "@assistant-ui/react";
import { ArrowUpIcon, GlobeIcon, MousePointerClickIcon, SearchIcon } from "lucide-react";
import type { FC } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

interface WelcomePageProps {
  onStartChat?: () => void;
}

const SUGGESTIONS = [
  { icon: GlobeIcon, text: "打开百度搜索并查询天气" },
  { icon: SearchIcon, text: "搜索最近的科技新闻" },
  { icon: MousePointerClickIcon, text: "打开 GitHub 并登录我的账号" },
];

export const WelcomePage: FC<WelcomePageProps> = ({ onStartChat }) => {
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

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          {SUGGESTIONS.map((s) => (
            <SuggestionCard key={s.text} icon={s.icon} text={s.text} />
          ))}
        </div>

        <WelcomeComposer onSend={onStartChat} />
      </div>
    </div>
  );
};

const SuggestionCard: FC<{
  icon: FC<{ className?: string }>;
  text: string;
}> = ({ icon: Icon, text }) => {
  return (
    <ComposerPrimitive.Root asChild>
      <div className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 transition-all hover:border-primary/30 hover:shadow-sm">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-sm leading-snug text-muted-foreground group-hover:text-foreground">
          {text}
        </p>
      </div>
    </ComposerPrimitive.Root>
  );
};

const WelcomeComposer: FC<{ onSend?: () => void }> = ({ onSend }) => {
  return (
    <ComposerPrimitive.Root className="relative w-full">
      <div className="flex w-full flex-col gap-2 rounded-2xl border bg-background p-3 shadow-sm transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20">
        <ComposerPrimitive.Input
          placeholder="描述你想完成的操作..."
          className="max-h-32 min-h-12 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <div className="flex items-center justify-end">
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="size-8 rounded-full"
              aria-label="Send message"
              onClick={onSend}
            >
              <ArrowUpIcon className="size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};
