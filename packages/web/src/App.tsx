import { useAuiState } from "@assistant-ui/react";
import { SettingsIcon } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ChatRoute } from "@/components/chat/ChatRoute";
import { WelcomePage } from "@/components/chat/WelcomePage";
import { RuntimeProvider } from "@/components/RuntimeProvider";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";

/** True when running inside the Electron shell (preload injects window.electronAPI). */
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

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
  useEffect(() => {
    return window.electronAPI?.updates?.onReady(() => {
      window.location.reload();
    });
  }, []);

  const goHome = useCallback(() => navigate("/chat"), [navigate]);
  const goSettings = useCallback(() => {
    navigate("/settings");
  }, [navigate]);

  const recentLabel = (
    <span className="mt-3 mb-1 px-3 text-xs font-medium text-muted-foreground">最近对话</span>
  );

  // ── Electron title bar: dynamic page title ──────────────────────────────
  // useAuiState is safe here — AppLayout is a child of RuntimeProvider.
  // s.threadListItem.title reflects the currently active thread.
  const threadTitle = useAuiState((s) => s.threadListItem.title as string | undefined);
  const barTitle = (() => {
    if (location.pathname === "/settings") return "设置";
    if (location.pathname.startsWith("/chat/")) return threadTitle || "对话";
    return "";
  })();

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Electron only: full-width drag region (replaces system title bar) */}
      {isElectron && (
        <div className="drag-region flex h-11 shrink-0">
          {/* Left cell: pl-20 ≈ 80px clears the macOS traffic-light buttons */}
          <div className="flex w-56 shrink-0 items-center border-r border-sidebar-border bg-sidebar pl-20 pr-4">
            <span className="text-sm font-medium text-sidebar-foreground tracking-tight">
              Browser Agent
            </span>
          </div>
          {/* Right cell: subtle warm tint — lighter than sidebar, warmer than background */}
          <div className="flex flex-1 items-center bg-[oklch(0.97_0.009_80)] px-4">
            {barTitle && (
              <span className="truncate text-sm text-sidebar-foreground/70">{barTitle}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar${isElectron ? " drag-region" : ""}`}
        >
          {/* Browser only: normal sidebar header */}
          {!isElectron && (
            <div className="flex h-12 shrink-0 items-center px-4">
              <span className="text-sm font-medium text-sidebar-foreground tracking-tight">
                Browser Agent
              </span>
            </div>
          )}

          <div
            className={`flex flex-1 flex-col overflow-y-auto px-2${isElectron ? " no-drag" : ""}`}
          >
            <ThreadList
              onNewThread={goHome}
              onDeleteThread={goHome}
              onSelectThread={(remoteId) => navigate(`/chat/${remoteId}`)}
              slotAfterNew={recentLabel}
            />
          </div>

          <div
            className={`shrink-0 border-t border-sidebar-border px-2 py-2${isElectron ? " no-drag" : ""}`}
          >
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
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<WelcomePage />} />
            <Route path="/chat/:threadId" element={<ChatRoute />} />
            <Route path="/settings" element={<SettingsPanel />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
