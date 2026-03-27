import type { View } from "../../App";

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "chat", label: "对话", icon: "💬" },
  { id: "settings", label: "设置", icon: "⚙️" },
  { id: "skills", label: "Skills", icon: "📦" },
];

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ view, onNavigate }: SidebarProps) {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-sidebar pt-2">
      {NAV_ITEMS.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg text-xs transition-colors ${
            view === item.id
              ? "bg-white text-accent shadow-sm"
              : "text-gray-500 hover:bg-white/60 hover:text-gray-700"
          }`}
          title={item.label}
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span className="mt-0.5 text-[10px] leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
