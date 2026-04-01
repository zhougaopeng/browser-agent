export function TitleBar() {
  return (
    <div
      className="flex h-9 shrink-0 items-center border-b border-border bg-sidebar"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="w-20 shrink-0" />
      <span className="text-xs font-medium text-muted-foreground select-none">Browser Agent</span>
    </div>
  );
}
