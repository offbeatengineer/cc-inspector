import type { ReactNode } from "react";
import type { Session } from "../../lib/types";
import { formatAbsolute, formatBytes, plural, shortenPath } from "../../lib/format";
import { GitBranch, FolderOpen, Bot } from "lucide-react";

export function SessionTopbar({
  session,
  children,
}: {
  session: Session;
  children?: ReactNode;
}) {
  const { meta } = session;
  return (
    <header className="px-4 md:px-8 py-3 border-b border-border bg-surface/70 backdrop-blur">
      <div className="max-w-[880px] mx-auto flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate" title={meta.firstPrompt}>
            {meta.firstPrompt || "(no prompt)"}
          </div>
          <div className="mt-1 text-[11px] text-fg-subtle flex flex-wrap gap-x-3 gap-y-0.5 items-center">
            {meta.cwd && (
              <span className="inline-flex items-center gap-1" title={meta.cwd}>
                <FolderOpen className="w-3 h-3" />
                {shortenPath(meta.cwd, 42)}
              </span>
            )}
            {meta.gitBranch && (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {meta.gitBranch}
              </span>
            )}
            {meta.modelsSeen?.length ? (
              <span className="inline-flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {meta.modelsSeen.join(", ")}
              </span>
            ) : null}
            <span>
              {meta.messageCount} {plural(meta.messageCount, "msg")}
            </span>
            <span>· {formatBytes(meta.sizeBytes)}</span>
            {meta.startedAt && <span>· started {formatAbsolute(meta.startedAt)}</span>}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
