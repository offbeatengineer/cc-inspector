import type { ToolPair } from "../groupMessages";
import { ToolShell, JSONPreview, ResultText, resultText } from "./ToolShell";
import { ExternalResultLoader } from "./ExternalResultLoader";

export function GenericTool({
  pair,
  projectDir,
  sessionId,
}: {
  pair: ToolPair;
  searchQuery: string;
  projectDir: string;
  sessionId: string;
}) {
  const text = resultText(pair.result?.content);
  return (
    <ToolShell
      pair={pair}
      body={
        <>
          {pair.use.input != null && (
            <JSONPreview value={pair.use.input} label="input" />
          )}
          {pair.result?.external ? (
            <ExternalResultLoader
              external={pair.result.external}
              projectDir={projectDir}
              sessionId={sessionId}
            />
          ) : text ? (
            <ResultText text={text} />
          ) : null}
        </>
      }
    />
  );
}
