import { useEffect, useState } from "react";
import { ChatPanel } from "./components/chat/ChatPanel";
import { HomePanel } from "./components/chat/HomePanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TitleBar } from "./components/layout/TitleBar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { SkillsPanel } from "./components/skills/SkillsPanel";
import { useSettingsStore } from "./stores/settings";
import { useThreadsStore } from "./stores/threads";

export type View = "chat" | "settings" | "skills";

export function App() {
  const [view, setView] = useState<View>("chat");
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const fetchThreads = useThreadsStore((s) => s.fetchThreads);
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const pendingChatId = useThreadsStore((s) => s.pendingChatId);

  const isHome = !activeThreadId && !pendingChatId;

  useEffect(() => {
    fetchSettings();
    fetchThreads();
  }, [fetchSettings, fetchThreads]);

  return (
    <div className="flex h-full flex-col bg-white">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar view={view} onNavigate={setView} />
        <main className="flex min-w-0 flex-1 flex-col">
          {view === "chat" && (isHome ? <HomePanel /> : <ChatPanel />)}
          {view === "settings" && <SettingsPanel />}
          {view === "skills" && <SkillsPanel />}
        </main>
      </div>
    </div>
  );
}
