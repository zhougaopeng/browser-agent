import { SettingsIcon } from "lucide-react";
import { useCallback } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ChatRoute } from "@/components/chat/ChatRoute";
import { WelcomePage } from "@/components/chat/WelcomePage";
import { RuntimeProvider } from "@/components/RuntimeProvider";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";

export function App() {
  return (
    <TooltipProvider>
      <RuntimeProvider>
        <AppLayout />
      </RuntimeProvider>
    </TooltipProvider>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const goSettings = useCallback(() => {
    navigate("/settings");
  }, [navigate]);

  const recentLabel = (
    <span className="mt-3 mb-1 px-3 text-xs font-medium text-muted-foreground">最近对话</span>
  );

  return (
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
              onNewThread={goHome}
              onDeleteThread={goHome}
              onSelectThread={(remoteId) => navigate(`/chat/${remoteId}`)}
              slotAfterNew={recentLabel}
            />
          </div>

          <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
            <button
              type="button"
              onClick={goSettings}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                location.pathname === "/settings"
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
          <Routes>
            <Route
              path="/"
              element={<WelcomePage onStartChat={(remoteId) => navigate(`/chat/${remoteId}`)} />}
            />
            <Route path="/chat/:threadId?" element={<ChatRoute />} />
            <Route path="/settings" element={<SettingsPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
