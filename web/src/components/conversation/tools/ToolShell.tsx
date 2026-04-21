import type { ReactNode } from "react";
import { useState } from "react";
import type { ToolPair } from "../groupMessages";
import { Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/cn";
import { safeStringify } from "../SafeJSON";

interface Props {
  pair: ToolPair;
  title?: ReactNode;
  summary?: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  tone?: "default" | "error";
  rightMeta?: ReactNode;
}

export function ToolShell({
  pair,
  title,
  summary,
  body,
  icon,
  defaultOpen = false,
  tone = "default",
  rightMeta,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const isError = tone === "error" || pair.result?.is_error;
  const orphan = !pair.result;
  return (
    <div
      className={cn(
        "rounded border text-[13px]",
        isError
          ? "border-error/40 bg-error/5"
          : "border-border bg-surface/60"
      )}
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-fg-subtle transition-transform",
            open && "rotate-90"
          )}
        />
        <span className="text-fg-subtle">
          {icon ?? <Wrench className="w-3.5 h-3.5" />}
        </span>
        <span className="font-medium">{pair.use.name}</span>
        {title && (
          <span className="min-w-0 truncate text-fg-muted">{title}</span>
        )}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-fg-subtle">
          {rightMeta}
          {orphan && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              no result
            </span>
          )}
          {isError && !orphan && (
            <span className="inline-flex items-center gap-1 text-error">
              <AlertTriangle className="w-3 h-3" />
              error
            </span>
          )}
        </span>
      </button>
      {!open && summary && (
        <div className="px-2.5 pb-1.5 pt-0 text-[12px] text-fg-subtle truncate">
          {summary}
        </div>
      )}
      {open && <div className="px-2.5 pb-2.5 pt-1 space-y-2">{body}</div>}
    </div>
  );
}

export function JSONPreview({ value, label }: { value: unknown; label?: string }) {
  const s = safeStringify(value);
  return (
    <div>
      {label && <div className="text-[11px] text-fg-subtle mb-1">{label}</div>}
      <pre className="text-[12px] font-mono bg-surface-2 border border-border rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
        {s}
      </pre>
    </div>
  );
}

export function ResultText({ text }: { text: string }) {
  return (
    <pre className="text-[12.5px] font-mono bg-surface-2 border border-border rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap max-h-[360px] overflow-y-auto">
      {text}
    </pre>
  );
}

// Coerce a tool_result content shape into plain text.
// The canonical shape is:
//   content: [{type:"text", text:"..."}] OR "..." OR { type:"text", text:"..." }
export function resultText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((b) => {
        if (!b) return "";
        if (typeof b === "string") return b;
        if (typeof b === "object" && "text" in (b as any)) return (b as any).text ?? "";
        return safeStringify(b);
      })
      .join("\n");
  }
  if (typeof value === "object" && "text" in (value as any)) {
    return (value as any).text ?? "";
  }
  return safeStringify(value);
}
