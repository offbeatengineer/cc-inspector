import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import Fuse from "fuse.js";
import { Search } from "lucide-react";

import { api, qk } from "../../lib/api";
import { useUI } from "../../stores/ui";
import { cn } from "../../lib/cn";
import { plural, truncate } from "../../lib/format";

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  kind: "project" | "session";
  projectDir: string;
  sessionId?: string;
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);

  if (!open) return null;
  return <PaletteBody onClose={() => setOpen(false)} />;
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const projectsQ = useProjects();
  const sessionQueries = useQueries({
    queries: projectsQ.map((p) => ({
      queryKey: qk.sessions(p.dir),
      queryFn: () => api.listSessions(p.dir),
      staleTime: 60_000,
      enabled: !!projectsQ.length,
    })),
  });

  const items: PaletteItem[] = useMemo(() => {
    const arr: PaletteItem[] = [];
    for (const p of projectsQ) {
      arr.push({
        id: `p/${p.dir}`,
        title: tailOf(p.displayPath),
        subtitle: `${p.sessionCount} ${plural(p.sessionCount, "session")}`,
        kind: "project",
        projectDir: p.dir,
      });
    }
    for (let i = 0; i < projectsQ.length; i++) {
      const p = projectsQ[i];
      const sessions = sessionQueries[i]?.data ?? [];
      for (const s of sessions) {
        arr.push({
          id: `s/${p.dir}/${s.id}`,
          title: truncate(s.firstPrompt || "(no prompt)", 100),
          subtitle: `${tailOf(p.displayPath)} · ${s.messageCount} msg`,
          kind: "session",
          projectDir: p.dir,
          sessionId: s.id,
        });
      }
    }
    return arr;
  }, [projectsQ, sessionQueries]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "subtitle"],
        threshold: 0.35,
        includeScore: true,
      }),
    [items]
  );

  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 60);
    return fuse.search(query).slice(0, 60).map((r) => r.item);
  }, [query, fuse, items]);

  useEffect(() => {
    setFocus(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const go = (item: PaletteItem) => {
    onClose();
    if (item.kind === "project") {
      navigate({ to: "/p/$projectDir", params: { projectDir: item.projectDir } });
    } else if (item.sessionId) {
      navigate({
        to: "/p/$projectDir/s/$sessionId",
        params: { projectDir: item.projectDir, sessionId: item.sessionId },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl mx-4 bg-bg border border-border rounded-lg shadow-xl overflow-hidden"
        role="dialog"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="w-4 h-4 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to project or session…"
            className="flex-1 bg-transparent outline-none text-sm py-1"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocus((f) => Math.min(results.length - 1, f + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocus((f) => Math.max(0, f - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = results[focus];
                if (item) go(item);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-auto py-1">
          {results.length === 0 && (
            <li className="px-3 py-4 text-sm text-fg-subtle">No results.</li>
          )}
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className={cn(
                  "w-full text-left px-3 py-1.5 flex items-center gap-2",
                  i === focus && "bg-surface-2"
                )}
                onMouseMove={() => setFocus(i)}
                onClick={() => go(r)}
              >
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                    r.kind === "project"
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-2 text-fg-subtle"
                  )}
                >
                  {r.kind}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] truncate">{r.title}</span>
                  <span className="block text-[11px] text-fg-subtle truncate">
                    {r.subtitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function useProjects() {
  // Use TanStack Query via the QueryClient already configured.
  const qs = useQueries({
    queries: [{ queryKey: qk.projects(), queryFn: api.listProjects, staleTime: 60_000 }],
  });
  return qs[0].data ?? [];
}

function tailOf(path: string): string {
  if (!path) return "(unknown)";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return path;
  if (parts.length === 1) return parts[0];
  return parts.slice(-2).join("/");
}
