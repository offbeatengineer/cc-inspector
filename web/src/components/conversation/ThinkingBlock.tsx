import { Brain, Lock } from "lucide-react";
import { Markdown } from "./Markdown";

export function ThinkingBlock({
  text,
  searchQuery,
}: {
  text: string;
  searchQuery?: string;
}) {
  const trimmed = text.trim();
  const redacted = trimmed.length === 0;

  if (redacted) {
    return (
      <div
        className="text-xs flex items-center gap-1.5 text-thinking-fg"
        title="Claude Code persisted a cryptographic signature but not the thinking plaintext for this block."
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="font-medium">Thinking</span>
        <span className="text-fg-subtle">·</span>
        <span className="text-fg-subtle inline-flex items-center gap-1">
          <Lock className="w-3 h-3" />
          redacted
        </span>
      </div>
    );
  }

  return (
    <div className="thinking-prose italic text-fg-muted">
      <div className="text-[11px] uppercase tracking-wide text-thinking-fg/80 not-italic mb-1 flex items-center gap-1">
        <Brain className="w-3 h-3" />
        thinking
      </div>
      <Markdown text={text} searchQuery={searchQuery} />
    </div>
  );
}
