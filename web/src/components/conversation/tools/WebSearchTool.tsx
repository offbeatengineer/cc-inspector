import { Search } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";

interface Input {
  query?: string;
}

export function WebSearchTool({ pair }: { pair: ToolPair; searchQuery: string }) {
  const input = (pair.use.input ?? {}) as Input;
  const text = resultText(pair.result?.content);
  return (
    <ToolShell
      pair={pair}
      icon={<Search className="w-3.5 h-3.5" />}
      title={<span className="font-mono">{input.query ?? "(no query)"}</span>}
      body={text && <ResultText text={text} />}
    />
  );
}
