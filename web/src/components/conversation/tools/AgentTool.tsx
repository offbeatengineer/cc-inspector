import { Bot } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import type { SubagentSummary, Session } from "../../../lib/types";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { useQuery } from "@tanstack/react-query";
import { api, qk } from "../../../lib/api";
import { truncate } from "../../../lib/format";
import { MessageCard } from "../MessageCard";
import { groupMessages } from "../groupMessages";

interface Input {
  description?: string;
  prompt?: string;
  subagent_type?: string;
}

export function AgentTool({
  pair,
  projectDir,
  sessionId,
  subagentSummaries,
}: {
  pair: ToolPair;
  searchQuery: string;
  projectDir: string;
  sessionId: string;
  subagentSummaries: Record<string, SubagentSummary>;
}) {
  const input = (pair.use.input ?? {}) as Input;
  const desc = input.description ?? input.subagent_type ?? "sub-agent";

  // Find subagent summary by trying to match tool_use.id → agent id. The
  // server provides a map keyed by agent id, so we search by use id or by
  // matching firstPrompt as a heuristic fallback.
  const summary =
    (pair.use.id && subagentSummaries[pair.use.id]) ||
    findSummaryByPrompt(subagentSummaries, input.prompt);

  return (
    <ToolShell
      pair={pair}
      icon={<Bot className="w-3.5 h-3.5" />}
      title={<span>{desc}</span>}
      rightMeta={
        summary ? (
          <span>
            {summary.messageCount} msg
            {input.subagent_type && <span> · {input.subagent_type}</span>}
          </span>
        ) : input.subagent_type ? (
          <span>{input.subagent_type}</span>
        ) : null
      }
      body={
        <>
          {input.prompt && (
            <div>
              <div className="text-[11px] text-fg-subtle mb-1">prompt</div>
              <div className="text-[13px] whitespace-pre-wrap">{input.prompt}</div>
            </div>
          )}
          {summary ? (
            <SubagentTranscript
              projectDir={projectDir}
              sessionId={sessionId}
              agentId={summary.agentId}
            />
          ) : pair.result?.content ? (
            <ResultText text={resultText(pair.result.content)} />
          ) : null}
        </>
      }
    />
  );
}

function findSummaryByPrompt(
  summaries: Record<string, SubagentSummary>,
  prompt?: string
): SubagentSummary | null {
  if (!prompt) return null;
  const needle = prompt.slice(0, 60);
  for (const s of Object.values(summaries)) {
    if (s.firstPrompt && s.firstPrompt.startsWith(needle.slice(0, 40))) return s;
  }
  return null;
}

function SubagentTranscript({
  projectDir,
  sessionId,
  agentId,
}: {
  projectDir: string;
  sessionId: string;
  agentId: string;
}) {
  const q = useQuery({
    queryKey: qk.subagent(projectDir, sessionId, agentId),
    queryFn: () => api.getSubagent(projectDir, sessionId, agentId),
  });
  if (q.isLoading) {
    return <div className="text-xs text-fg-subtle">loading sub-agent…</div>;
  }
  if (q.error) {
    return <div className="text-xs text-error">{(q.error as Error).message}</div>;
  }
  if (!q.data) return null;

  const items = groupMessages(q.data.messages);
  const fakeSubsummaries: Session["subagentSummaries"] = {};
  return (
    <div className="border-l-2 border-accent/30 pl-3 -my-1 space-y-3">
      <div className="text-[11px] text-fg-subtle flex items-center gap-1">
        <Bot className="w-3 h-3" />
        {q.data.summary.agentType || "sub-agent"} ·{" "}
        {q.data.summary.messageCount} messages
        {q.data.summary.description && <span> · {truncate(q.data.summary.description, 40)}</span>}
      </div>
      {items.map((it) => (
        <div key={it.key}>
          <MessageCard
            item={it}
            searchQuery=""
            projectDir={projectDir}
            sessionId={sessionId}
            subagentSummaries={fakeSubsummaries}
          />
        </div>
      ))}
    </div>
  );
}

