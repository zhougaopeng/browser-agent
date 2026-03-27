interface QuickActionsProps {
  onResume: () => void;
}

export function QuickActions({ onResume }: QuickActionsProps) {
  return (
    <div className="flex items-center justify-center gap-2 border-t border-waiting/20 bg-waiting/5 px-4 py-2">
      <span className="text-xs text-gray-500">在 Chrome 中完成操作后，点击</span>
      <button
        type="button"
        onClick={onResume}
        className="rounded-md bg-waiting px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        继续执行
      </button>
    </div>
  );
}
