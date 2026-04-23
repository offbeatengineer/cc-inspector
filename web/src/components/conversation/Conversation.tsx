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
import { computeHitMap, locateHit } from "./searchHits";

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
  const setScrollToAnchor = useUI((s) => s.setScrollToAnchor);
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

  useEffect(() => {
    const handler = (anchorId: string) => {
      const idx = items.findIndex((it) => it.anchorId === anchorId);
      if (idx < 0) return;
      setFocusIndex(idx);
      virtualizer.scrollToIndex(idx, { align: "center" });
      const flash = (attempts: number) => {
        const el = document.getElementById(anchorId);
        if (!el) {
          if (attempts > 0)
            requestAnimationFrame(() => flash(attempts - 1));
          return;
        }
        el.classList.remove("prompt-flash");
        void el.offsetWidth;
        el.classList.add("prompt-flash");
        const onEnd = () => {
          el.classList.remove("prompt-flash");
          el.removeEventListener("animationend", onEnd);
        };
        el.addEventListener("animationend", onEnd);
      };
      requestAnimationFrame(() => flash(30));
    };
    setScrollToAnchor(handler);
    return () => setScrollToAnchor(null);
  }, [items, virtualizer, setScrollToAnchor]);

  // Session-wide hit map computed from source text — not affected by
  // virtualization. `perItem[i]` is the hit count in items[i].
  const hitMap = useMemo(() => computeHitMap(items, search), [items, search]);
  const hitCount = hitMap.total;

  // Resolve the active global hit into (itemIndex, subIndex) lazily.
  const activeLocation = useMemo(
    () => (hitCount > 0 ? locateHit(hitMap, activeHit) : null),
    [hitMap, activeHit, hitCount],
  );

  // Apply the `.search-hit-active` class to the subIndex-th `.search-hit` span
  // in the active item's row. Row may not be mounted yet (virtualizer) or its
  // highlights may not be applied yet (Markdown ref callback runs at commit);
  // poll a few frames.
  const applyActiveClass = (itemIndex: number, subIndex: number, attempts = 30) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const rowEl = scroller.querySelector<HTMLElement>(
      `[data-index="${itemIndex}"]`,
    );
    const hits = rowEl?.querySelectorAll<HTMLElement>(".search-hit");
    if (!hits || hits.length === 0) {
      if (attempts > 0)
        requestAnimationFrame(() =>
          applyActiveClass(itemIndex, subIndex, attempts - 1),
        );
      return;
    }
    scroller
      .querySelectorAll<HTMLElement>(".search-hit-active")
      .forEach((n) => n.classList.remove("search-hit-active"));
    const target = hits[Math.min(subIndex, hits.length - 1)];
    target.classList.add("search-hit-active");
  };

  const scrollToHit = (n: number) => {
    if (hitCount === 0) return;
    const idx = ((n % hitCount) + hitCount) % hitCount;
    const loc = locateHit(hitMap, idx);
    if (!loc) return;
    setActiveHit(idx);
    virtualizer.scrollToIndex(loc.itemIndex, { align: "center" });
    const focusHit = (attempts: number) => {
      const scroller = scrollerRef.current;
      const rowEl = scroller?.querySelector<HTMLElement>(
        `[data-index="${loc.itemIndex}"]`,
      );
      const hits = rowEl?.querySelectorAll<HTMLElement>(".search-hit");
      if (!hits || hits.length === 0) {
        if (attempts > 0)
          requestAnimationFrame(() => focusHit(attempts - 1));
        return;
      }
      scroller
        ?.querySelectorAll<HTMLElement>(".search-hit-active")
        .forEach((n) => n.classList.remove("search-hit-active"));
      const target = hits[Math.min(loc.subIndex, hits.length - 1)];
      target.classList.add("search-hit-active");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    requestAnimationFrame(() => focusHit(30));
  };

  // Re-apply the active class whenever the active location changes, the query
  // changes (spans are recreated), or the virtualizer mounts/unmounts rows
  // (spans inside the active row may need the class restored).
  useEffect(() => {
    if (!activeLocation) return;
    applyActiveClass(activeLocation.itemIndex, activeLocation.subIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocation?.itemIndex, activeLocation?.subIndex, search]);

  useEffect(() => {
    if (!searchOpen || !search) return;
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => {
      if (raf || !activeLocation) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        applyActiveClass(activeLocation.itemIndex, activeLocation.subIndex, 5);
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, search, activeLocation?.itemIndex, activeLocation?.subIndex]);

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
            // After the memo recomputes on next render, jump to the first hit.
            requestAnimationFrame(() => {
              const map = computeHitMap(items, v);
              if (map.total === 0) return;
              const loc = locateHit(map, 0);
              if (!loc) return;
              virtualizer.scrollToIndex(loc.itemIndex, { align: "center" });
            });
          }}
          onClose={() => {
            setSearchOpen(false);
            setSearch("");
          }}
          onNext={() => scrollToHit(activeHit + 1)}
          onPrev={() => scrollToHit(activeHit - 1)}
          hitCount={hitCount}
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

