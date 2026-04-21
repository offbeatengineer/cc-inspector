import type { ToolPair } from "../groupMessages";
import type { SubagentSummary } from "../../../lib/types";

import { BashTool } from "./BashTool";
import { ReadTool } from "./ReadTool";
import { EditTool } from "./EditTool";
import { WriteTool } from "./WriteTool";
import { GrepTool } from "./GrepTool";
import { GlobTool } from "./GlobTool";
import { TodoWriteTool } from "./TodoWriteTool";
import { WebFetchTool } from "./WebFetchTool";
import { WebSearchTool } from "./WebSearchTool";
import { AgentTool } from "./AgentTool";
import { MCPTool } from "./MCPTool";
import { GenericTool } from "./GenericTool";

export function ToolCall({
  pair,
  searchQuery,
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
  const name = pair.use.name ?? "Tool";

  // MCP tools have the prefix mcp__.
  if (name.startsWith("mcp__")) {
    return <MCPTool pair={pair} searchQuery={searchQuery} />;
  }

  switch (name) {
    case "Bash":
      return <BashTool pair={pair} searchQuery={searchQuery} projectDir={projectDir} sessionId={sessionId} />;
    case "Read":
      return <ReadTool pair={pair} searchQuery={searchQuery} projectDir={projectDir} sessionId={sessionId} />;
    case "Edit":
      return <EditTool pair={pair} searchQuery={searchQuery} />;
    case "Write":
      return <WriteTool pair={pair} searchQuery={searchQuery} />;
    case "Grep":
      return <GrepTool pair={pair} searchQuery={searchQuery} projectDir={projectDir} sessionId={sessionId} />;
    case "Glob":
      return <GlobTool pair={pair} searchQuery={searchQuery} projectDir={projectDir} sessionId={sessionId} />;
    case "TodoWrite":
      return <TodoWriteTool pair={pair} />;
    case "WebFetch":
      return <WebFetchTool pair={pair} searchQuery={searchQuery} projectDir={projectDir} sessionId={sessionId} />;
    case "WebSearch":
      return <WebSearchTool pair={pair} searchQuery={searchQuery} />;
    case "Task":
    case "Agent":
      return (
        <AgentTool
          pair={pair}
          searchQuery={searchQuery}
          projectDir={projectDir}
          sessionId={sessionId}
          subagentSummaries={subagentSummaries}
        />
      );
    default:
      return <GenericTool pair={pair} searchQuery={searchQuery} projectDir={projectDir} sessionId={sessionId} />;
  }
}
