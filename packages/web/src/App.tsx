import { useState } from "react";
import { ChatPanel } from "./components/chat/ChatPanel";
import { HomePanel } from "./components/chat/HomePanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TitleBar } from "./components/layout/TitleBar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { SkillsPanel } from "./components/skills/SkillsPanel";
import { useThreadsStore } from "./stores/threads";

export type View = "chat" | "settings" | "skills";

export function App() {
  const [view, setView] = useState<View>("chat");
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const pendingChatId = useThreadsStore((s) => s.pendingChatId);

  const isHome = !activeThreadId && !pendingChatId;

  return (
    <div className="flex h-full flex-col bg-home-bg">
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
