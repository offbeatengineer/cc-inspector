import { Conversation } from "../components/conversation/Conversation";
import { Inspector } from "../components/inspector/Inspector";
import type { ExportPayload } from "./types";

const INSPECTOR_WIDTH = 340;

export function StandaloneApp({ payload }: { payload: ExportPayload }) {
  const { session, meta } = payload;

  function downloadJsonl() {
    const blob = new Blob([payload.jsonl], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.id}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen bg-bg text-fg">
      <div className="flex-1 min-w-0 flex flex-col">
        <Conversation
          session={session}
          projectDir={meta.projectDir}
          sessionId={meta.id}
          standalone
          onDownloadJsonl={downloadJsonl}
        />
      </div>
      <aside
        className="shrink-0 border-l border-border bg-surface overflow-auto"
        style={{ width: INSPECTOR_WIDTH }}
      >
        <Inspector session={session} />
      </aside>
    </div>
  );
}
