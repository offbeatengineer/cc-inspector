import { Puzzle } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, JSONPreview, ResultText, resultText } from "./ToolShell";
import { SafeJSON } from "../SafeJSON";

export function MCPTool({ pair }: { pair: ToolPair; searchQuery: string }) {
  const name = pair.use.name ?? "";
  const [, server, tool] = /^mcp__([^_]+)__(.+)$/.exec(name) ?? [];
  const text = resultText(pair.result?.content);
  return (
    <ToolShell
      pair={pair}
      icon={<Puzzle className="w-3.5 h-3.5" />}
      title={
        <span>
          <span className="text-fg-subtle">mcp · {server ?? "?"} · </span>
          <span className="font-mono">{tool ?? name}</span>
        </span>
      }
      body={
        <>
          {pair.use.input != null && (
            <JSONPreview value={pair.use.input} label="input" />
          )}
          {pair.result?.external ? (
            <SafeJSON value={pair.result.external} defaultOpen />
          ) : text ? (
            <ResultText text={text} />
          ) : null}
        </>
      }
    />
  );
}
