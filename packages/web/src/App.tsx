import { useAuiState } from "@assistant-ui/react";
import { SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { WelcomePage } from "@/components/chat/WelcomePage";
import { RuntimeProvider } from "@/components/RuntimeProvider";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { threadSwitchers } from "@/lib/thread-adapter";

function threadIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/chat\/(.+)$/);
  return match?.[1];
}

/**
 * Runtime → URL: when the runtime's active thread changes,
 * navigate to the matching URL. Uses replace for within-chat
 * transitions to avoid polluting the history stack.
 */
function useRuntimeUrlSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const remoteId = useAuiState((s) => s.threadListItem.remoteId) as string | undefined;
  const prevRemoteId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (remoteId === prevRemoteId.current) return;
    prevRemoteId.current = remoteId;
    if (!remoteId) return;

    const target = `/chat/${remoteId}`;
    if (location.pathname === target) return;

    navigate(target, { replace: location.pathname.startsWith("/chat/") });
  }, [remoteId, navigate, location.pathname]);
}

/**
 * URL → Runtime: on page refresh or browser back/forward,
 * if the URL has a threadId that doesn't match the runtime's
 * active thread, switch the runtime via the stored switchTo function.
 *
 * On initial load the threadSwitchers map may not yet be populated
 * (ThreadListItems render after the list finishes loading), so we
 * poll briefly before giving up and redirecting home.
 */
function useRestoreThreadFromUrl() {
  const navigate = useNavigate();
  const location = useLocation();
  const remoteId = useAuiState((s) => s.threadListItem.remoteId) as string | undefined;
  const isLoading = useAuiState((s) => s.threads.isLoading);
  const restoreAttemptId = useRef<string | null>(null);

  useEffect(() => {
    const urlThreadId = threadIdFromPath(location.pathname);
    if (!urlThreadId || urlThreadId === remoteId) return;
    if (isLoading) return;

    const switcher = threadSwitchers.get(urlThreadId);
    if (switcher) {
      switcher();
      return;
    }

    if (restoreAttemptId.current === urlThreadId) return;
    restoreAttemptId.current = urlThreadId;

    const timer = setInterval(() => {
      const fn = threadSwitchers.get(urlThreadId);
      if (fn) {
        fn();
        clearInterval(timer);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(timer);
      navigate("/", { replace: true });
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [location.pathname, remoteId, isLoading, navigate]);
}

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

  useRuntimeUrlSync();
  useRestoreThreadFromUrl();

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
            <ThreadList onNewThread={goHome} onDeleteThread={goHome} slotAfterNew={recentLabel} />
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
            <Route path="/chat/:threadId?" element={<Thread />} />
            <Route path="/settings" element={<SettingsPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
