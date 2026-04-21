import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

import { api, qk } from "../lib/api";
import { cn } from "../lib/cn";
import { formatRelative, formatBytes, plural, truncate } from "../lib/format";
import { useUI } from "../stores/ui";
import { Resizer } from "./Resizer";

const MIN = 240;
const MAX = 560;

export function ProjectSessionsPane() {
  const { projectDir } = useParams({ from: "/p/$projectDir" });
  return (
    <SessionsPane projectDir={projectDir}>
      <div className="flex-1 flex items-center justify-center text-fg-subtle text-sm">
        Pick a session
      </div>
    </SessionsPane>
  );
}

export function SessionsPane({
  projectDir,
  children,
  selectedId,
}: {
  projectDir: string;
  children: React.ReactNode;
  selectedId?: string;
}) {
  const width = useUI((s) => s.sessionsWidth);
  const setWidth = useUI((s) => s.setSessionsWidth);
  const q = useQuery({
    queryKey: qk.sessions(projectDir),
    queryFn: () => api.listSessions(projectDir),
  });

  return (
    <>
      <section
        className="shrink-0 flex flex-col min-w-0 border-r border-border"
        style={{ width }}
      >
        <div className="px-3 py-2 border-b border-border">
          <div className="text-xs text-fg-subtle">Sessions</div>
          <div className="text-[13px] font-medium truncate">
            {q.data ? `${q.data.length} total` : "…"}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {q.isLoading && (
            <div className="text-fg-subtle text-xs p-3">Loading…</div>
          )}
          {q.error && (
            <div className="text-error text-xs p-3">
              {(q.error as Error).message}
            </div>
          )}
          {q.data?.length === 0 && (
            <div className="text-fg-subtle text-xs p-3">No sessions.</div>
          )}
          {q.data?.map((s) => (
            <Link
              key={s.id}
              to="/p/$projectDir/s/$sessionId"
              params={{ projectDir, sessionId: s.id }}
              className={cn(
                "block px-3 py-2.5 border-b border-border/60 hover:bg-surface-2 border-l-2 border-l-transparent",
                selectedId === s.id && "border-l-accent bg-surface-2"
              )}
            >
              <div className="text-[13px] font-medium leading-snug truncate">
                {truncate(s.firstPrompt, 120) || "(no prompt)"}
              </div>
              <div className="mt-1 text-[11px] text-fg-subtle flex gap-2 items-center">
                <span>
                  {s.messageCount} {plural(s.messageCount, "msg")}
                </span>
                <span>·</span>
                <span>{formatBytes(s.sizeBytes)}</span>
                {s.lastActivity && (
                  <>
                    <span>·</span>
                    <span>{formatRelative(s.lastActivity)}</span>
                  </>
                )}
              </div>
              {s.gitBranch && (
                <div className="mt-0.5 text-[11px] text-fg-subtle truncate">
                  {s.gitBranch}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>
      <Resizer
        onResize={(delta) => {
          const next = Math.max(MIN, Math.min(MAX, width + delta));
          setWidth(next);
        }}
      />
      {children}
    </>
  );
}
