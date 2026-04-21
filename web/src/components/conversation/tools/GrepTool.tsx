import { Search } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { ExternalResultLoader } from "./ExternalResultLoader";

interface Input {
  pattern?: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: string;
  "-i"?: boolean;
  "-n"?: boolean;
  head_limit?: number;
}

export function GrepTool({
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
      icon={<Search className="w-3.5 h-3.5" />}
      title={<span className="font-mono">{input.pattern ?? "(no pattern)"}</span>}
      rightMeta={lines.length ? <span>{lines.length} hits</span> : null}
      body={
        <>
          <div className="text-[11px] text-fg-subtle flex flex-wrap gap-x-3">
            <span>pattern: <span className="font-mono">{input.pattern}</span></span>
            {input.path && <span>path: <span className="font-mono">{input.path}</span></span>}
            {input.glob && <span>glob: <span className="font-mono">{input.glob}</span></span>}
            {input.type && <span>type: {input.type}</span>}
            {input.output_mode && <span>mode: {input.output_mode}</span>}
          </div>
          {pair.result?.external ? (
            <ExternalResultLoader
              external={pair.result.external}
              projectDir={projectDir}
              sessionId={sessionId}
            />
          ) : (
            text && <ResultText text={text} />
          )}
        </>
      }
    />
  );
}
