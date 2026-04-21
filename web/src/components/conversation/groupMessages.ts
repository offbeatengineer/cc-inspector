import type { ContentBlock, Message } from "../../lib/types";

export interface ToolPair {
  use: ContentBlock;
  result?: ContentBlock;
  resultMessage?: Message;
  // parent message uuid (assistant that issued the tool_use)
  assistantUUID?: string;
}

export type DisplayItem =
  | { kind: "user"; key: string; anchorId: string; message: Message }
  | { kind: "assistant"; key: string; anchorId: string; message: Message; tools: ToolPair[] }
  | { kind: "system"; key: string; anchorId: string; message: Message }
  | { kind: "summary"; key: string; anchorId: string; message: Message }
  | { kind: "file-snapshot"; key: string; anchorId: string; message: Message }
  | { kind: "attachment"; key: string; anchorId: string; message: Message }
  | { kind: "permission-mode"; key: string; anchorId: string; message: Message }
  | { kind: "last-prompt"; key: string; anchorId: string; message: Message }
  | { kind: "unknown"; key: string; anchorId: string; message: Message };

// groupMessages collapses tool_result user messages into the assistant row
// that spawned them. Also yields timeline markers for non-chat types.
export function groupMessages(messages: Message[]): DisplayItem[] {
  // Build a tool_use_id -> (result block, result message) index.
  const resultIndex = new Map<string, { block: ContentBlock; message: Message }>();
  const resultMessageUUIDs = new Set<string>();
  for (const m of messages) {
    if (m.type !== "user" || !m.message?.content) continue;
    const blocks = m.message.content;
    let hasToolResult = false;
    for (const b of blocks) {
      if (b.type === "tool_result" && b.tool_use_id) {
        resultIndex.set(b.tool_use_id, { block: b, message: m });
        hasToolResult = true;
      }
    }
    if (hasToolResult && blocks.every((b) => b.type === "tool_result")) {
      if (m.uuid) resultMessageUUIDs.add(m.uuid);
    }
  }

  const out: DisplayItem[] = [];
  let userCount = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const key = m.uuid ?? `i${i}`;
    const anchorId = `msg-${key}`;
    if (m.uuid && resultMessageUUIDs.has(m.uuid)) continue;

    switch (m.type) {
      case "user": {
        // Treat as a user prompt — but skip pure-text messages that are
        // meta/system noise (e.g. local command injections) unless they have
        // user text content.
        if (!m.message || !m.message.content?.length) {
          out.push({ kind: "unknown", key, anchorId, message: m });
          break;
        }
        userCount++;
        out.push({ kind: "user", key, anchorId, message: m });
        break;
      }
      case "assistant": {
        const tools: ToolPair[] = [];
        const blocks = m.message?.content ?? [];
        for (const b of blocks) {
          if (b.type === "tool_use" && b.id) {
            const hit = resultIndex.get(b.id);
            tools.push({
              use: b,
              result: hit?.block,
              resultMessage: hit?.message,
              assistantUUID: m.uuid,
            });
          }
        }
        out.push({ kind: "assistant", key, anchorId, message: m, tools });
        break;
      }
      case "system":
        out.push({ kind: "system", key, anchorId, message: m });
        break;
      case "summary":
        out.push({ kind: "summary", key, anchorId, message: m });
        break;
      case "file-history-snapshot":
        out.push({ kind: "file-snapshot", key, anchorId, message: m });
        break;
      case "attachment":
        out.push({ kind: "attachment", key, anchorId, message: m });
        break;
      case "permission-mode-change":
      case "permission-mode":
        out.push({ kind: "permission-mode", key, anchorId, message: m });
        break;
      case "last-prompt":
      case "last_prompt":
        out.push({ kind: "last-prompt", key, anchorId, message: m });
        break;
      default:
        out.push({ kind: "unknown", key, anchorId, message: m });
    }
  }
  void userCount;
  return out;
}

// jumpList returns a list of user-prompt anchors for the inspector's rail.
export function jumpList(items: DisplayItem[]): {
  anchorId: string;
  text: string;
  key: string;
}[] {
  const out: { anchorId: string; text: string; key: string }[] = [];
  for (const it of items) {
    if (it.kind !== "user") continue;
    const blocks = it.message.message?.content ?? [];
    const text =
      blocks.find((b) => b.type === "text" && b.text)?.text ?? "(empty prompt)";
    out.push({ anchorId: it.anchorId, text, key: it.key });
  }
  return out;
}
