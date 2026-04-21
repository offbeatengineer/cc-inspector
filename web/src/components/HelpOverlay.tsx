import { useUI } from "../stores/ui";

const KEYS: [string, string][] = [
  ["j", "next message"],
  ["k", "previous message"],
  ["g g", "top"],
  ["G", "bottom"],
  ["i", "toggle inspector"],
  ["/", "find in session"],
  ["⌘F", "find in session"],
  ["⌘K", "command palette"],
  ["[", "previous session"],
  ["]", "next session"],
  ["?", "show this help"],
];

export function HelpOverlay() {
  const open = useUI((s) => s.helpOpen);
  const setOpen = useUI((s) => s.setHelpOpen);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <div className="bg-bg border border-border rounded-lg p-5 w-full max-w-sm shadow-xl">
        <div className="text-sm font-semibold mb-3">Keyboard</div>
        <ul className="space-y-1.5">
          {KEYS.map(([k, label]) => (
            <li key={k} className="flex items-center gap-2 text-[13px]">
              <span className="w-24 shrink-0 flex items-center gap-1">
                {k.split(" ").map((p, i) => (
                  <kbd key={i}>{p}</kbd>
                ))}
              </span>
              <span className="text-fg-muted">{label}</span>
            </li>
          ))}
        </ul>
        <button
          className="mt-4 px-3 py-1.5 rounded bg-surface-2 hover:bg-surface text-xs"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
}
