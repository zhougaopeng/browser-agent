export function TitleBar() {
  return (
    <div
      className="flex h-9 shrink-0 items-center bg-sidebar"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* macOS traffic lights 占位 */}
      <div className="w-20 shrink-0" />
      <span className="text-xs font-medium text-gray-400 select-none">Browser Agent</span>
    </div>
  );
}
