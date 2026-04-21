import { Brain } from "lucide-react";
import { Markdown } from "./Markdown";

export function ThinkingBlock({
  text,
  searchQuery,
}: {
  text: string;
  searchQuery?: string;
}) {
  const words = text.trim().split(/\s+/).length;
  return (
    <details className="group rounded border border-border bg-surface/40">
      <summary className="list-none cursor-pointer select-none px-2.5 py-1.5 text-xs flex items-center gap-1.5 text-thinking-fg">
        <Brain className="w-3.5 h-3.5" />
        <span className="font-medium">Thinking</span>
        <span className="text-fg-subtle">· {words} words</span>
        <span className="ml-auto text-fg-subtle group-open:hidden">expand</span>
        <span className="ml-auto text-fg-subtle hidden group-open:inline">collapse</span>
      </summary>
      <div className="px-3 pb-3 pt-1 italic text-fg-muted">
        <Markdown text={text} searchQuery={searchQuery} />
      </div>
    </details>
  );
}
