import { useState } from "react";
import type { ExternalResult } from "../../../lib/types";
import { api } from "../../../lib/api";
import { formatBytes } from "../../../lib/format";
import { ResultText } from "./ToolShell";

export function ExternalResultLoader({
  external,
  projectDir,
  sessionId,
}: {
  external: ExternalResult;
  projectDir: string;
  sessionId: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (text != null) return <ResultText text={text} />;
  return (
    <div className="text-[12px]">
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const t = await api.fetchToolResult(projectDir, sessionId, external.id);
            setText(t);
          } catch (e: any) {
            setErr(e?.message ?? "failed");
          } finally {
            setLoading(false);
          }
        }}
        className="px-2 py-1 rounded bg-surface-2 hover:bg-surface text-fg-muted"
      >
        {loading
          ? "Loading…"
          : `Load full output (${formatBytes(external.size)})`}
      </button>
      {err && <div className="text-error text-xs mt-1">{err}</div>}
    </div>
  );
}
