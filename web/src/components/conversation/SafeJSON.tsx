import { useState } from "react";

export function SafeJSON({
  value,
  defaultOpen = false,
  maxPreview = 160,
}: {
  value: unknown;
  defaultOpen?: boolean;
  maxPreview?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const str = safeStringify(value);
  const isShort = str.length <= maxPreview;
  if (isShort && !str.includes("\n")) {
    return (
      <pre className="text-[12px] font-mono bg-surface-2 border border-border rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all">
        {str}
      </pre>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] text-fg-subtle hover:text-fg-muted"
      >
        {open ? "hide JSON" : `show JSON (${formatByteLen(str)})`}
      </button>
      {open && (
        <pre className="mt-1 text-[12px] font-mono bg-surface-2 border border-border rounded px-2 py-1.5 overflow-x-auto">
          {str}
        </pre>
      )}
    </div>
  );
}

export function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function formatByteLen(s: string) {
  const n = s.length;
  if (n < 1024) return `${n} chars`;
  return `${(n / 1024).toFixed(1)} KB`;
}
