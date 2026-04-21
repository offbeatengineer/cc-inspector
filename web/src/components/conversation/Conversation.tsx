import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanelRight, PanelRightClose, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import type { Session } from "../../lib/types";
import { useUI } from "../../stores/ui";
import { MessageCard } from "./MessageCard";
import { api, qk } from "../../lib/api";
import { cn } from "../../lib/cn";
import { groupMessages, type DisplayItem } from "./groupMessages";
import { SessionTopbar } from "./SessionTopbar";

export function Conversation({
  session,
  projectDir,
  sessionId,
}: {
  session: Session;
  projectDir: string;
  sessionId: string;
}) {
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const toggleInspector = useUI((s) => s.toggleInspector);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const searchOpen = useUI((s) => s.searchOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const [search, setSearch] = useState("");
  const [activeHit, setActiveHit] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);

  const items = useMemo(() => groupMessages(session.messages), [session.messages]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => 120,
    overscan: 6,
    measureElement: (el) =>
      (el as HTMLElement).getBoundingClientRect().height,
    getItemKey: (i) => items[i].key,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(0, { align: "start" });
    setFocusIndex(0);
    setSearch("");
    setActiveHit(0);
  }, [sessionId, virtualizer]);

  const hitNodesRef = useRef<HTMLElement[]>([]);
  const recomputeHits = () => {
    const nodes = scrollerRef.current?.querySelectorAll<HTMLElement>(
      ".search-hit"
    );
    hitNodesRef.current = nodes ? Array.from(nodes) : [];
    hitNodesRef.current.forEach((n, i) =>
      n.classList.toggle("search-hit-active", i === activeHit)
    );
  };
  useEffect(() => {
    recomputeHits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeHit, focusIndex]);

  const scrollToHit = (n: number) => {
    recomputeHits();
    const hits = hitNodesRef.current;
    if (!hits.length) return;
    const idx = ((n % hits.length) + hits.length) % hits.length;
    setActiveHit(idx);
    hits[idx].scrollIntoView({ block: "center", behavior: "smooth" });
    hits.forEach((h, i) => h.classList.toggle("search-hit-active", i === idx));
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (!inInput && e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (inInput) return;
      if (e.key === "j") {
        const next = Math.min(items.length - 1, focusIndex + 1);
        setFocusIndex(next);
        virtualizer.scrollToIndex(next, { align: "center" });
      } else if (e.key === "k") {
        const next = Math.max(0, focusIndex - 1);
        setFocusIndex(next);
        virtualizer.scrollToIndex(next, { align: "center" });
      } else if (e.key === "G") {
        const next = items.length - 1;
        setFocusIndex(next);
        virtualizer.scrollToIndex(next, { align: "end" });
      } else if (e.key === "g") {
        if (lastKeyRef.current === "g") {
          setFocusIndex(0);
          virtualizer.scrollToIndex(0, { align: "start" });
          lastKeyRef.current = "";
          return;
        }
        lastKeyRef.current = "g";
        setTimeout(() => (lastKeyRef.current = ""), 600);
      } else if (e.key === "i") {
        toggleInspector();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusIndex, items.length, virtualizer, setSearchOpen, toggleInspector]);

  const lastKeyRef = useRef("");

  // Neighbor sessions for [ / ]
  const sessionsQ = useQuery({
    queryKey: qk.sessions(projectDir),
    queryFn: () => api.listSessions(projectDir),
  });
  const navigate = useNavigate();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inInput) return;
      const list = sessionsQ.data;
      if (!list) return;
      const idx = list.findIndex((s) => s.id === sessionId);
      if (idx === -1) return;
      if (e.key === "[") {
        const prev = list[idx + 1];
        if (prev)
          navigate({
            to: "/p/$projectDir/s/$sessionId",
            params: { projectDir, sessionId: prev.id },
          });
      } else if (e.key === "]") {
        const next = list[idx - 1];
        if (next)
          navigate({
            to: "/p/$projectDir/s/$sessionId",
            params: { projectDir, sessionId: next.id },
          });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, projectDir, sessionId, sessionsQ.data]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <SessionTopbar session={session}>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded hover:bg-surface-2 text-fg-subtle hover:text-fg"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Find in session (/ or ⌘F)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-surface-2 text-fg-subtle hover:text-fg"
            onClick={toggleInspector}
            title="Toggle inspector (i)"
          >
            {inspectorOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </SessionTopbar>

      {searchOpen && (
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setActiveHit(0);
            requestAnimationFrame(() => {
              recomputeHits();
              if (hitNodesRef.current[0])
                hitNodesRef.current[0].scrollIntoView({ block: "center" });
            });
          }}
          onClose={() => {
            setSearchOpen(false);
            setSearch("");
          }}
          onNext={() => scrollToHit(activeHit + 1)}
          onPrev={() => scrollToHit(activeHit - 1)}
          hitCount={hitNodesRef.current.length}
          activeHit={activeHit}
        />
      )}

      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto"
        id="conversation-scroller"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((v) => {
            const item = items[v.index];
            return (
              <div
                key={item.key}
                data-index={v.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${v.start}px)`,
                }}
              >
                <Row
                  item={item}
                  focused={v.index === focusIndex}
                  searchQuery={search}
                  projectDir={projectDir}
                  sessionId={sessionId}
                  subagentSummaries={session.subagentSummaries}
                />
              </div>
            );
          })}
        </div>
        <div className="h-40" />
      </div>
    </div>
  );
}

function Row({
  item,
  focused,
  searchQuery,
  projectDir,
  sessionId,
  subagentSummaries,
}: {
  item: DisplayItem;
  focused: boolean;
  searchQuery: string;
  projectDir: string;
  sessionId: string;
  subagentSummaries: Session["subagentSummaries"];
}) {
  return (
    <div
      id={item.anchorId}
      className={cn(
        "px-4 md:px-8 py-2",
        focused && "bg-surface-2/30"
      )}
    >
      <MessageCard
        item={item}
        searchQuery={searchQuery}
        projectDir={projectDir}
        sessionId={sessionId}
        subagentSummaries={subagentSummaries}
      />
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  onClose,
  onNext,
  onPrev,
  hitCount,
  activeHit,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hitCount: number;
  activeHit: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-border">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find in session…"
        className="flex-1 bg-transparent outline-none text-sm py-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === "Escape") onClose();
        }}
      />
      <div className="text-xs text-fg-subtle tabular-nums">
        {hitCount === 0
          ? value
            ? "no hits"
            : ""
          : `${activeHit + 1} / ${hitCount}`}
      </div>
      <button
        onClick={onPrev}
        className="p-1 rounded hover:bg-surface-2 text-fg-subtle"
        title="Previous (Shift+Enter)"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onNext}
        className="p-1 rounded hover:bg-surface-2 text-fg-subtle"
        title="Next (Enter)"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={onClose}
        className="text-xs px-2 py-1 rounded hover:bg-surface-2 text-fg-subtle"
        title="Close (Esc)"
      >
        Esc
      </button>
    </div>
  );
}

