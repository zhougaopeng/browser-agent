import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { WelcomePage } from "@/components/chat/WelcomePage";
import { RuntimeProvider } from "@/components/RuntimeProvider";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";

export type View = "home" | "chat" | "settings";

export function App() {
  const [view, setView] = useState<View>("home");

  const recentLabel = (
    <span className="mt-3 mb-1 px-3 text-xs font-medium text-muted-foreground">最近对话</span>
  );

  return (
    <TooltipProvider>
      <RuntimeProvider>
        <div className="flex h-full flex-col bg-background">
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
              <div className="flex h-12 shrink-0 items-center px-4">
                <span className="text-sm font-medium text-sidebar-foreground tracking-tight">
                  Browser Agent
                </span>
              </div>

              <div className="flex flex-1 flex-col overflow-y-auto px-2">
                <ThreadList
                  onNewThread={() => setView("home")}
                  onSelectThread={() => setView("chat")}
                  onDeleteThread={() => setView("home")}
                  slotAfterNew={recentLabel}
                />
              </div>

              <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
                <button
                  type="button"
                  onClick={() => setView(view === "settings" ? "home" : "settings")}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    view === "settings"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <SettingsIcon className="size-4" />
                  <span>设置</span>
                </button>
              </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
              {view === "settings" && <SettingsPanel />}
              {view === "home" && <WelcomePage onStartChat={() => setView("chat")} />}
              {view === "chat" && <Thread />}
            </main>
          </div>
        </div>
      </RuntimeProvider>
    </TooltipProvider>
  );
}
