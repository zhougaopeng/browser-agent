import { useEffect, useState } from "react";
import { ChatPanel } from "./components/chat/ChatPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TitleBar } from "./components/layout/TitleBar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { SkillsPanel } from "./components/skills/SkillsPanel";
import { useSettingsStore } from "./stores/settings";

export type View = "chat" | "settings" | "skills";

export function App() {
  const [view, setView] = useState<View>("chat");
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div className="flex h-full flex-col bg-white">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar view={view} onNavigate={setView} />
        <main className="flex min-w-0 flex-1 flex-col">
          {view === "chat" && <ChatPanel />}
          {view === "settings" && <SettingsPanel />}
          {view === "skills" && <SkillsPanel />}
        </main>
      </div>
    </div>
  );
}
