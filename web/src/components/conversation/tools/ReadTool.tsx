import { FileText } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { ExternalResultLoader } from "./ExternalResultLoader";
import { shortenPath } from "../../../lib/format";

interface Input {
  file_path?: string;
  offset?: number;
  limit?: number;
}

export function ReadTool({
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
  const path = input.file_path ?? "(no path)";
  const content = pair.result?.content;
  const text = typeof content === "string" ? content : resultText(content);
  const lines = text ? text.split("\n").length : 0;
  return (
    <ToolShell
      pair={pair}
      icon={<FileText className="w-3.5 h-3.5" />}
      title={<span className="font-mono">{shortenPath(path, 60)}</span>}
      rightMeta={
        <>
          {input.offset != null && <span>@{input.offset}</span>}
          {input.limit != null && <span>·{input.limit}</span>}
          {lines ? <span>{lines} lines</span> : null}
        </>
      }
      body={
        pair.result?.external ? (
          <ExternalResultLoader
            external={pair.result.external}
            projectDir={projectDir}
            sessionId={sessionId}
          />
        ) : (
          text && <ResultText text={text} />
        )
      }
    />
  );
}
