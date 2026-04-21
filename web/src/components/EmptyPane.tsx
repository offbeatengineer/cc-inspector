export function EmptyPane() {
  return (
    <div className="flex-1 flex items-center justify-center text-fg-subtle text-sm">
      <div className="text-center space-y-2">
        <div className="text-base text-fg-muted">Pick a project from the sidebar</div>
        <div>
          or press <kbd>⌘</kbd> <kbd>K</kbd> to jump to any session
        </div>
      </div>
    </div>
  );
}
