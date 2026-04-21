import type { ReactNode } from "react";
import { useEffect } from "react";

import { ProjectsSidebar } from "./sidebar/ProjectsSidebar";
import { useUI } from "../stores/ui";
import { Resizer } from "./Resizer";
import { CommandPalette } from "./palette/CommandPalette";
import { HelpOverlay } from "./HelpOverlay";
import { Lightbox } from "./Lightbox";

const MIN_SIDEBAR = 160;
const MAX_SIDEBAR = 480;

export function AppShell({ children }: { children: ReactNode }) {
  const sidebarWidth = useUI((s) => s.sidebarWidth);
  const setSidebarWidth = useUI((s) => s.setSidebarWidth);
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);
  const setHelpOpen = useUI((s) => s.setHelpOpen);
  const paletteOpen = useUI((s) => s.paletteOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (!inInput && e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setHelpOpen, setPaletteOpen]);

  return (
    <div className="h-full w-full flex bg-bg text-fg">
      <aside
        className="shrink-0 bg-surface border-r border-border flex flex-col min-w-0"
        style={{ width: sidebarWidth }}
      >
        <ProjectsSidebar />
      </aside>
      <Resizer
        onResize={(delta) => {
          const next = Math.max(
            MIN_SIDEBAR,
            Math.min(MAX_SIDEBAR, sidebarWidth + delta)
          );
          setSidebarWidth(next);
        }}
      />
      <main className="flex-1 min-w-0 flex">{children}</main>
      <CommandPalette />
      <HelpOverlay />
      <Lightbox />
    </div>
  );
}
