import type { ReactNode } from "react";
import type { ToolPair } from "../groupMessages";
import { Wrench, AlertTriangle } from "lucide-react";
import { cn } from "../../../lib/cn";
import { safeStringify } from "../SafeJSON";
import { PeekBlock } from "../PeekBlock";

interface Props {
  pair: ToolPair;
  title?: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "error";
  rightMeta?: ReactNode;
}

// ToolShell renders a tool call as a borderless tinted block.
// The body is always visible, clamped to ~6 rendered lines via PeekBlock so
// the user can scan tool outputs without expanding every one. Errors get a
// red-tinted background.
export function ToolShell({
  pair,
  title,
  body,
  icon,
  tone = "default",
  rightMeta,
}: Props) {
  const isError = tone === "error" || pair.result?.is_error;
  const orphan = !pair.result;
  return (
    <div
      className={cn(
        "rounded-md text-[13px]",
        isError ? "bg-error-bg" : "bg-tool-bg"
      )}
      style={{ "--peek-fade": isError ? "var(--color-error-bg)" : "var(--color-tool-bg)" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span className="text-fg-subtle shrink-0">
          {icon ?? <Wrench className="w-3.5 h-3.5" />}
        </span>
        <span className="font-medium shrink-0">{pair.use.name}</span>
        {title && (
          <span className="min-w-0 truncate text-fg-muted">{title}</span>
        )}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-fg-subtle shrink-0">
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
      </div>
      {body && (
        <div className="px-3 pb-2">
          <PeekBlock maxLines={6}>{body}</PeekBlock>
        </div>
      )}
    </div>
  );
}

export function JSONPreview({ value, label }: { value: unknown; label?: string }) {
  const s = safeStringify(value);
  return (
    <div>
      {label && <div className="text-[11px] text-fg-subtle mb-1">{label}</div>}
      <pre className="text-[12px] font-mono bg-surface-2/60 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
        {s}
      </pre>
    </div>
  );
}

export function ResultText({ text }: { text: string }) {
  return (
    <pre className="text-[12.5px] font-mono bg-surface-2/60 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
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
