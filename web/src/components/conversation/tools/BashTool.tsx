import { Terminal } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { ExternalResultLoader } from "./ExternalResultLoader";

interface Input {
  command?: string;
  description?: string;
  timeout?: number;
}

interface UseResultShape {
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  isImage?: boolean;
  sandbox?: boolean;
  error?: string;
  exitCode?: number | null;
}

export function BashTool({
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
  const tur = (pair.resultMessage?.toolUseResult ?? {}) as UseResultShape;
  const cmd = input.command ?? "";
  const desc = input.description;

  return (
    <ToolShell
      pair={pair}
      icon={<Terminal className="w-3.5 h-3.5" />}
      title={<span className="font-mono truncate">{cmd || "(no command)"}</span>}
      rightMeta={
        tur.exitCode != null
          ? <span>exit {tur.exitCode}</span>
          : tur.interrupted
          ? <span>interrupted</span>
          : null
      }
      body={
        <div className="space-y-1.5">
          {desc && (
            <div className="text-[11px] text-fg-subtle italic">{desc}</div>
          )}
          {tur.stdout != null && tur.stdout !== "" && (
            <ResultText text={tur.stdout} />
          )}
          {tur.stderr && (
            <div>
              <div className="text-[11px] text-error mb-0.5">stderr</div>
              <ResultText text={tur.stderr} />
            </div>
          )}
          {tur.error && (
            <div className="text-[12px] text-error">{tur.error}</div>
          )}
          {pair.result?.external && (
            <ExternalResultLoader
              external={pair.result.external}
              projectDir={projectDir}
              sessionId={sessionId}
            />
          )}
          {!tur.stdout &&
            !tur.stderr &&
            !tur.error &&
            pair.result &&
            !pair.result.external && (
              <ResultText text={resultText(pair.result.content)} />
            )}
        </div>
      }
    />
  );
}
