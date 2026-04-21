import type { DisplayItem, ToolPair } from "./groupMessages";
import type { ContentBlock, Message, SubagentSummary } from "../../lib/types";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCall } from "./tools/ToolCall";
import { Markdown } from "./Markdown";
import { Bot, User, FileText, Paperclip, Shield, Radio } from "lucide-react";
import { formatAbsolute, truncate } from "../../lib/format";
import { SafeJSON } from "./SafeJSON";
import { ImageBlock } from "./ImageBlock";

export function MessageCard({
  item,
  searchQuery,
  projectDir,
  sessionId,
  subagentSummaries,
}: {
  item: DisplayItem;
  searchQuery: string;
  projectDir: string;
  sessionId: string;
  subagentSummaries: Record<string, SubagentSummary>;
}) {
  switch (item.kind) {
    case "user":
      return <UserCard message={item.message} searchQuery={searchQuery} />;
    case "assistant":
      return (
        <AssistantCard
          message={item.message}
          tools={item.tools}
          searchQuery={searchQuery}
          projectDir={projectDir}
          sessionId={sessionId}
          subagentSummaries={subagentSummaries}
        />
      );
    case "system":
      return <TimelineMarker icon={<Radio className="w-3 h-3" />} label="system" message={item.message} />;
    case "summary":
      return <TimelineMarker icon={<FileText className="w-3 h-3" />} label="summary" message={item.message} />;
    case "file-snapshot":
      return (
        <TimelineMarker
          icon={<FileText className="w-3 h-3" />}
          label="file snapshot"
          message={item.message}
        />
      );
    case "attachment":
      return (
        <TimelineMarker
          icon={<Paperclip className="w-3 h-3" />}
          label="attachment"
          message={item.message}
        />
      );
    case "permission-mode":
      return (
        <TimelineMarker
          icon={<Shield className="w-3 h-3" />}
          label={`permission → ${item.message.permissionMode ?? "?"}`}
          message={item.message}
        />
      );
    case "last-prompt":
      return (
        <TimelineMarker
          icon={<FileText className="w-3 h-3" />}
          label="last prompt"
          message={item.message}
        />
      );
    case "unknown":
    default:
      return (
        <TimelineMarker
          icon={<FileText className="w-3 h-3" />}
          label={item.message.type || "unknown"}
          message={item.message}
        />
      );
  }
}

function UserCard({ message, searchQuery }: { message: Message; searchQuery: string }) {
  const blocks = message.message?.content ?? [];
  // Detect injected local command output ("local-command-stdout" etc.)
  return (
    <div className="flex gap-3" id={`msg-${message.uuid}`}>
      <div className="shrink-0 mt-1">
        <div className="w-6 h-6 rounded-full bg-user text-user-fg flex items-center justify-center">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-baseline gap-2">
          <div className="text-xs font-medium text-fg-muted">User</div>
          {message.timestamp && (
            <div className="text-[10px] text-fg-subtle">
              {formatAbsolute(message.timestamp)}
            </div>
          )}
        </div>
        {blocks.map((b, i) => (
          <UserBlock key={i} block={b} searchQuery={searchQuery} />
        ))}
        {blocks.length === 0 && typeof message.content === "string" && (
          <Markdown text={message.content} searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}

function UserBlock({ block, searchQuery }: { block: ContentBlock; searchQuery: string }) {
  if (block.type === "text") {
    return <Markdown text={block.text ?? ""} searchQuery={searchQuery} />;
  }
  if (block.type === "image") {
    if (block.image_ref) return <ImageBlock url={block.image_ref.url} mediaType={block.image_ref.mediaType} />;
    return <div className="text-xs text-fg-subtle">[image]</div>;
  }
  if (block.type === "tool_result") {
    // Rare: a user-initiated tool_result not attached to any tool_use.
    return (
      <div className="text-xs text-fg-subtle">
        <div className="font-medium mb-0.5">orphan tool_result</div>
        <SafeJSON value={block.content ?? null} />
      </div>
    );
  }
  return (
    <div className="text-xs">
      <div className="text-fg-subtle mb-0.5">{block.type}</div>
      <SafeJSON value={block} />
    </div>
  );
}

function AssistantCard({
  message,
  tools,
  searchQuery,
  projectDir,
  sessionId,
  subagentSummaries,
}: {
  message: Message;
  tools: ToolPair[];
  searchQuery: string;
  projectDir: string;
  sessionId: string;
  subagentSummaries: Record<string, SubagentSummary>;
}) {
  const blocks = message.message?.content ?? [];
  const model = message.message?.model;
  return (
    <div className="flex gap-3" id={`msg-${message.uuid}`}>
      <div className="shrink-0 mt-1">
        <div className="w-6 h-6 rounded-full bg-surface-2 text-fg-muted flex items-center justify-center">
          <Bot className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-baseline gap-2">
          <div className="text-xs font-medium text-fg-muted">Assistant</div>
          {model && (
            <div className="text-[10px] text-fg-subtle" title={model}>
              {truncate(model, 28)}
            </div>
          )}
          {message.timestamp && (
            <div className="text-[10px] text-fg-subtle">
              {formatAbsolute(message.timestamp)}
            </div>
          )}
        </div>
        {blocks.map((b, i) => (
          <AssistantBlock
            key={i}
            block={b}
            tools={tools}
            searchQuery={searchQuery}
            projectDir={projectDir}
            sessionId={sessionId}
            subagentSummaries={subagentSummaries}
          />
        ))}
      </div>
    </div>
  );
}

function AssistantBlock({
  block,
  tools,
  searchQuery,
  projectDir,
  sessionId,
  subagentSummaries,
}: {
  block: ContentBlock;
  tools: ToolPair[];
  searchQuery: string;
  projectDir: string;
  sessionId: string;
  subagentSummaries: Record<string, SubagentSummary>;
}) {
  if (block.type === "text") {
    return <Markdown text={block.text ?? ""} searchQuery={searchQuery} />;
  }
  if (block.type === "thinking") {
    return <ThinkingBlock text={block.thinking ?? ""} searchQuery={searchQuery} />;
  }
  if (block.type === "tool_use") {
    const pair = tools.find((t) => t.use.id === block.id);
    if (!pair) return null;
    return (
      <ToolCall
        pair={pair}
        searchQuery={searchQuery}
        projectDir={projectDir}
        sessionId={sessionId}
        subagentSummaries={subagentSummaries}
      />
    );
  }
  if (block.type === "image") {
    if (block.image_ref) return <ImageBlock url={block.image_ref.url} mediaType={block.image_ref.mediaType} />;
    return null;
  }
  // Unknown block
  return (
    <div className="text-xs">
      <div className="text-fg-subtle mb-0.5">{block.type}</div>
      <SafeJSON value={block} />
    </div>
  );
}

function TimelineMarker({
  icon,
  label,
  message,
}: {
  icon: React.ReactNode;
  label: string;
  message: Message;
}) {
  return (
    <details className="group text-[11px] text-fg-subtle">
      <summary className="flex items-center gap-1.5 cursor-pointer select-none hover:text-fg-muted">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
        {message.timestamp && <span>· {formatAbsolute(message.timestamp)}</span>}
      </summary>
      <div className="mt-1 ml-5">
        <SafeJSON value={stripRender(message)} />
      </div>
    </details>
  );
}

function stripRender(m: Message): Partial<Message> {
  const { message: _m, ...rest } = m;
  void _m;
  return rest;
}
