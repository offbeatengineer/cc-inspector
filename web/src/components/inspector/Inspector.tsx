import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AnnotationMap, Session, Usage } from "../../lib/types";
import { formatAbsolute, formatBytes, formatNumber, truncate } from "../../lib/format";
import { groupMessages, jumpList } from "../conversation/groupMessages";
import { useUI } from "../../stores/ui";
import { api, qk } from "../../lib/api";

export function Inspector({ session }: { session: Session }) {
  const { meta } = session;

  const items = useMemo(() => groupMessages(session.messages), [session.messages]);
  const jumps = useMemo(() => jumpList(items), [items]);

  const totals = useMemo(() => sumUsage(session), [session]);

  const subagents = Object.values(session.subagentSummaries ?? {});
  const scrollToAnchor = useUI((s) => s.scrollToAnchor);

  const annotationsQ = useQuery({
    queryKey: qk.annotations(meta.projectDir, meta.id),
    queryFn: () => api.listAnnotations(meta.projectDir, meta.id),
    staleTime: 0,
  });
  const annotations: AnnotationMap = annotationsQ.data ?? {};

  const noteJumps = useMemo(
    () => buildNoteJumps(items, annotations),
    [items, annotations],
  );

  return (
    <div className="p-3 space-y-5 text-[12.5px]">
      <section>
        <SectionHeader>Session</SectionHeader>
        <KV label="id" value={<span className="font-mono text-[11px]">{meta.id}</span>} />
        {meta.projectPath && <KV label="project" value={<span className="font-mono break-all">{meta.projectPath}</span>} />}
        {meta.cwd && meta.cwd !== meta.projectPath && <KV label="cwd" value={<span className="font-mono break-all">{meta.cwd}</span>} />}
        {meta.gitBranch && <KV label="branch" value={<span className="font-mono">{meta.gitBranch}</span>} />}
        {meta.version && <KV label="cc version" value={meta.version} />}
        {meta.modelsSeen?.length ? (
          <KV label="models" value={meta.modelsSeen.join(", ")} />
        ) : null}
        <KV label="messages" value={meta.messageCount} />
        <KV label="size" value={formatBytes(meta.sizeBytes)} />
        {meta.startedAt && <KV label="started" value={formatAbsolute(meta.startedAt)} />}
        {meta.lastActivity && <KV label="last activity" value={formatAbsolute(meta.lastActivity)} />}
      </section>

      {totals.total > 0 && (
        <section>
          <SectionHeader>Tokens</SectionHeader>
          <KV label="input" value={formatNumber(totals.input)} />
          <KV label="output" value={formatNumber(totals.output)} />
          {totals.cacheCreate > 0 && (
            <KV label="cache write" value={formatNumber(totals.cacheCreate)} />
          )}
          {totals.cacheRead > 0 && (
            <KV label="cache read" value={formatNumber(totals.cacheRead)} />
          )}
          <KV label="total" value={formatNumber(totals.total)} />
        </section>
      )}

      {subagents.length > 0 && (
        <section>
          <SectionHeader>Sub-agents ({subagents.length})</SectionHeader>
          <ul className="space-y-1">
            {subagents.map((s) => (
              <li key={s.agentId} className="border border-border rounded px-2 py-1.5 text-[12px]">
                <div className="font-medium">{s.agentType || "sub-agent"}</div>
                {s.firstPrompt && (
                  <div className="text-fg-subtle truncate">
                    {truncate(s.firstPrompt, 80)}
                  </div>
                )}
                <div className="text-[11px] text-fg-subtle">
                  {s.messageCount} msg
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader>Prompts ({jumps.length})</SectionHeader>
        <ul className="space-y-1 max-h-[40vh] overflow-auto">
          {jumps.map((j) => (
            <li key={j.key}>
              <button
                type="button"
                onClick={() => scrollToAnchor?.(j.anchorId)}
                className="block w-full text-left hover:bg-surface-2 rounded px-2 py-1 text-[12px] truncate"
                title={j.text}
              >
                {truncate(j.text, 100)}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {noteJumps.length > 0 && (
        <section>
          <SectionHeader>Notes ({noteJumps.length})</SectionHeader>
          <ul className="space-y-1 max-h-[40vh] overflow-auto">
            {noteJumps.map((n) => (
              <li key={n.key}>
                <button
                  type="button"
                  onClick={() => scrollToAnchor?.(n.anchorId)}
                  className="block w-full text-left rounded px-2 py-1 text-[12px] bg-note-bg/70 hover:bg-note-bg border-l-2 border-note-border text-note-fg"
                  title={n.text}
                >
                  <div className="whitespace-pre-wrap line-clamp-2 leading-snug">
                    {truncate(n.text, 140)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function buildNoteJumps(
  items: ReturnType<typeof groupMessages>,
  annotations: AnnotationMap,
): { anchorId: string; text: string; key: string }[] {
  const out: { anchorId: string; text: string; key: string }[] = [];
  // Walk in display order so the sidebar mirrors the conversation flow.
  for (const it of items) {
    const uuid = it.message.uuid;
    if (!uuid) continue;
    const ann = annotations[uuid];
    if (!ann) continue;
    out.push({ anchorId: it.anchorId, text: ann.text, key: uuid });
  }
  return out;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-1.5">
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5">
      <div className="text-fg-subtle w-24 shrink-0">{label}</div>
      <div className="min-w-0 flex-1 break-words">{value}</div>
    </div>
  );
}

function sumUsage(session: Session) {
  let input = 0, output = 0, cacheRead = 0, cacheCreate = 0;
  for (const m of session.messages) {
    const u = m.message?.usage as Usage | undefined | null;
    if (!u || typeof u !== "object") continue;
    input += u.input_tokens ?? 0;
    output += u.output_tokens ?? 0;
    cacheRead += u.cache_read_input_tokens ?? 0;
    cacheCreate += u.cache_creation_input_tokens ?? 0;
  }
  return {
    input,
    output,
    cacheRead,
    cacheCreate,
    total: input + output + cacheRead + cacheCreate,
  };
}
