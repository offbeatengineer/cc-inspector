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
      summary={
        desc ? (
          <span>{desc}</span>
        ) : tur.stdout ? (
          <span>{firstLine(tur.stdout)}</span>
        ) : null
      }
      rightMeta={
        tur.exitCode != null
          ? <span>exit {tur.exitCode}</span>
          : tur.interrupted
          ? <span>interrupted</span>
          : null
      }
      body={
        <>
          <div>
            <div className="text-[11px] text-fg-subtle mb-1">command</div>
            <pre className="text-[12.5px] font-mono bg-surface-2 border border-border rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
              {cmd}
            </pre>
            {desc && (
              <div className="mt-1 text-[11px] text-fg-subtle">{desc}</div>
            )}
          </div>
          {tur.stdout != null && tur.stdout !== "" && (
            <div>
              <div className="text-[11px] text-fg-subtle mb-1">stdout</div>
              <ResultText text={tur.stdout} />
            </div>
          )}
          {tur.stderr && (
            <div>
              <div className="text-[11px] text-error mb-1">stderr</div>
              <ResultText text={tur.stderr} />
            </div>
          )}
          {tur.error && (
            <div>
              <div className="text-[11px] text-error mb-1">error</div>
              <div className="text-[12px] text-error">{tur.error}</div>
            </div>
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
        </>
      }
    />
  );
}

function firstLine(s: string): string {
  const i = s.indexOf("\n");
  return i === -1 ? s : s.slice(0, i) + " …";
}
