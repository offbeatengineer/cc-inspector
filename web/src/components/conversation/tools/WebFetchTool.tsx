import { Globe } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { ExternalResultLoader } from "./ExternalResultLoader";

interface Input {
  url?: string;
  prompt?: string;
}

export function WebFetchTool({
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
  return (
    <ToolShell
      pair={pair}
      icon={<Globe className="w-3.5 h-3.5" />}
      title={
        input.url ? (
          <a href={input.url} target="_blank" rel="noreferrer" className="hover:underline">
            {input.url}
          </a>
        ) : (
          "(no url)"
        )
      }
      body={
        <>
          {input.prompt && (
            <div>
              <div className="text-[11px] text-fg-subtle mb-1">prompt</div>
              <div className="text-[13px]">{input.prompt}</div>
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
        </>
      }
    />
  );
}
