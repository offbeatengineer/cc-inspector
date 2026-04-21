import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Moon, Sun, Laptop, HelpCircle, Search } from "lucide-react";

import { api, qk } from "../../lib/api";
import { cn } from "../../lib/cn";
import { formatRelative, plural } from "../../lib/format";
import { useUI } from "../../stores/ui";

export function ProjectsSidebar() {
  const params = useParams({ strict: false });
  const selected = params.projectDir;
  const projectsQ = useQuery({
    queryKey: qk.projects(),
    queryFn: api.listProjects,
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-accent text-accent-fg text-[10px] font-bold flex items-center justify-center shrink-0">
            cc
          </div>
          <div className="font-semibold truncate">CC Inspector</div>
        </div>
        <ThemeToggle />
      </div>

      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
          onClick={() => useUI.getState().setPaletteOpen(true)}
          title="Command palette (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          Jump to…
          <kbd className="ml-1">⌘K</kbd>
        </button>
        <button
          className="text-fg-subtle hover:text-fg"
          onClick={() => useUI.getState().setHelpOpen(true)}
          title="Keyboard help (?)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {projectsQ.isLoading && (
          <div className="text-fg-subtle text-xs p-3">Loading…</div>
        )}
        {projectsQ.error && (
          <div className="text-error text-xs p-3">
            {(projectsQ.error as Error).message}
          </div>
        )}
        {projectsQ.data?.length === 0 && (
          <div className="text-fg-subtle text-xs p-3">No projects found.</div>
        )}
        {projectsQ.data?.map((p) => (
          <Link
            key={p.dir}
            to="/p/$projectDir"
            params={{ projectDir: p.dir }}
            className={cn(
              "block px-3 py-2 border-l-2 border-transparent hover:bg-surface-2",
              selected === p.dir && "border-accent bg-surface-2"
            )}
          >
            <div className="truncate text-[13px] font-medium">
              {tailOf(p.displayPath)}
            </div>
            <div className="text-[11px] text-fg-subtle flex gap-2 truncate mt-0.5">
              <span>
                {p.sessionCount} {plural(p.sessionCount, "session")}
              </span>
              {p.lastActivity && <span>· {formatRelative(p.lastActivity)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function tailOf(path: string): string {
  if (!path) return "(unknown)";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return path;
  if (parts.length === 1) return parts[0];
  return parts.slice(-2).join("/");
}

function ThemeToggle() {
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const next = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
  const label =
    theme === "auto" ? "Auto" : theme === "light" ? "Light" : "Dark";
  const Icon = theme === "auto" ? Laptop : theme === "light" ? Sun : Moon;
  return (
    <button
      className="text-fg-subtle hover:text-fg"
      onClick={() => setTheme(next)}
      title={`Theme: ${label}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
