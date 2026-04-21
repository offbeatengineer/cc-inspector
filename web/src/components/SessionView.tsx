import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import { api, qk } from "../lib/api";
import { SessionsPane } from "./ProjectSessionsPane";
import { Conversation } from "./conversation/Conversation";
import { Inspector } from "./inspector/Inspector";
import { Resizer } from "./Resizer";
import { useUI } from "../stores/ui";

const MIN = 240;
const MAX = 520;

export function SessionView() {
  const { projectDir, sessionId } = useParams({
    from: "/p/$projectDir/s/$sessionId",
  });
  const q = useQuery({
    queryKey: qk.session(projectDir, sessionId),
    queryFn: () => api.getSession(projectDir, sessionId),
  });
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const inspectorWidth = useUI((s) => s.inspectorWidth);
  const setInspectorWidth = useUI((s) => s.setInspectorWidth);

  return (
    <SessionsPane projectDir={projectDir} selectedId={sessionId}>
      <div className="flex-1 min-w-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          {q.isLoading && (
            <div className="p-6 text-fg-subtle text-sm">Loading session…</div>
          )}
          {q.error && (
            <div className="p-6 text-error text-sm">
              {(q.error as Error).message}
            </div>
          )}
          {q.data && (
            <Conversation
              session={q.data}
              projectDir={projectDir}
              sessionId={sessionId}
            />
          )}
        </div>
        {inspectorOpen && (
          <>
            <Resizer
              onResize={(delta) => {
                const next = Math.max(
                  MIN,
                  Math.min(MAX, inspectorWidth - delta)
                );
                setInspectorWidth(next);
              }}
            />
            <aside
              className="shrink-0 border-l border-border bg-surface min-w-0 overflow-auto"
              style={{ width: inspectorWidth }}
            >
              {q.data && <Inspector session={q.data} />}
            </aside>
          </>
        )}
      </div>
    </SessionsPane>
  );
}
