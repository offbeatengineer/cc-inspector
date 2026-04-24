import { FolderSearch } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { ExternalResultLoader } from "./ExternalResultLoader";

interface Input {
  pattern?: string;
  path?: string;
}

export function GlobTool({
  pair,
  projectDir,
  sessionId,
}: {
  pair: ToolPair;
  searchQuery: string;
  projectDir: string;
  sessionId: string;
}) {
  const input = (pair.use.input ?? {}) as Input;
  const text = resultText(pair.result?.content);
  const lines = text ? text.split("\n").filter(Boolean) : [];
  return (
    <ToolShell
      pair={pair}
      icon={<FolderSearch className="w-3.5 h-3.5" />}
      title={<span className="font-mono">{input.pattern ?? "(no pattern)"}</span>}
      rightMeta={lines.length ? <span>{lines.length} files</span> : null}
      body={
        <div className="space-y-1.5">
          {input.path && (
            <div className="text-[11px] text-fg-subtle">
              path: <span className="font-mono">{input.path}</span>
            </div>
          )}
          {pair.result?.external ? (
            <ExternalResultLoader
              external={pair.result.external}
              projectDir={projectDir}
              sessionId={sessionId}
            />
          ) : (
            text && <ResultText text={text} />
          )}
        </div>
      }
    />
  );
}
