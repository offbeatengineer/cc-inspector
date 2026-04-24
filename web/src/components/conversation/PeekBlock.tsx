import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// PeekBlock visually clamps its children at `maxLines` rendered lines
// (post-wrap, so a single long line of text still only costs 1 peek-line).
// Detection uses scrollHeight vs clientHeight with a ResizeObserver — this
// stays accurate as the viewport / parent width changes.
export function PeekBlock({
  children,
  maxLines = 6,
  lineHeight = 1.5,
  collapsedLabel = "show more",
  expandedLabel = "show less",
}: {
  children: ReactNode;
  maxLines?: number;
  lineHeight?: number;
  collapsedLabel?: string;
  expandedLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const clampHeight = `${maxLines * lineHeight}em`;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!el) return;
      const prev = el.style.maxHeight;
      el.style.maxHeight = clampHeight;
      const does = el.scrollHeight > el.clientHeight + 1;
      el.style.maxHeight = prev;
      setOverflows(does);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, clampHeight]);

  const showToggle = overflows;

  return (
    <div>
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          maxHeight: expanded ? "none" : clampHeight,
          lineHeight,
        }}
      >
        {children}
        {!expanded && overflows && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
            style={{
              background:
                "linear-gradient(to top, var(--peek-fade, var(--color-bg)) 0%, transparent 100%)",
            }}
          />
        )}
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-fg-subtle hover:text-fg"
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {expanded ? expandedLabel : collapsedLabel}
        </button>
      )}
    </div>
  );
}
