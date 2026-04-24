import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";

import type { Annotation } from "../../lib/types";
import { api, qk } from "../../lib/api";
import { formatAbsolute } from "../../lib/format";
import { cn } from "../../lib/cn";

interface Props {
  projectDir: string;
  sessionId: string;
  messageUuid: string;
  annotation: Annotation | undefined;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  readOnly?: boolean;
}

// MessageAnnotation renders the note attached to a single message. It has
// two modes: view (shows text + controls) and edit (textarea). Empty-on-save
// deletes. Readonly mode (used in exported HTML) hides all controls.
export function MessageAnnotation({
  projectDir,
  sessionId,
  messageUuid,
  annotation,
  isEditing,
  onEdit,
  onCancelEdit,
  readOnly,
}: Props) {
  if (readOnly) {
    if (!annotation) return null;
    return <AnnotationView annotation={annotation} readOnly />;
  }

  if (isEditing) {
    return (
      <AnnotationEditor
        projectDir={projectDir}
        sessionId={sessionId}
        messageUuid={messageUuid}
        initialText={annotation?.text ?? ""}
        onDone={onCancelEdit}
      />
    );
  }

  if (!annotation) return null;

  return (
    <AnnotationView
      annotation={annotation}
      onEdit={onEdit}
      projectDir={projectDir}
      sessionId={sessionId}
      messageUuid={messageUuid}
    />
  );
}

function AnnotationView({
  annotation,
  onEdit,
  projectDir,
  sessionId,
  messageUuid,
  readOnly,
}: {
  annotation: Annotation;
  onEdit?: () => void;
  projectDir?: string;
  sessionId?: string;
  messageUuid?: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.deleteAnnotation(projectDir!, sessionId!, messageUuid!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.annotations(projectDir!, sessionId!) });
    },
  });

  return (
    <div className="mt-2 flex gap-2">
      <div className="shrink-0 mt-0.5 text-fg-subtle">
        <MessageSquare className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 rounded border border-border bg-surface-2/40 px-3 py-2">
        <div className="flex items-baseline gap-2 mb-1">
          <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
            Note
          </div>
          <div className="text-[10px] text-fg-subtle">
            {formatAbsolute(annotation.updatedAt)}
          </div>
          {!readOnly && (
            <div className="ml-auto flex items-center gap-1">
              <button
                className="p-0.5 rounded hover:bg-surface-2 text-fg-subtle hover:text-fg"
                onClick={onEdit}
                title="Edit (c)"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-surface-2 text-fg-subtle hover:text-fg disabled:opacity-50"
                onClick={() => {
                  if (confirm("Delete this annotation?")) del.mutate();
                }}
                disabled={del.isPending}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="whitespace-pre-wrap text-sm text-fg">
          {annotation.text}
        </div>
      </div>
    </div>
  );
}

function AnnotationEditor({
  projectDir,
  sessionId,
  messageUuid,
  initialText,
  onDone,
}: {
  projectDir: string;
  sessionId: string;
  messageUuid: string;
  initialText: string;
  onDone: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const upsert = useMutation({
    mutationFn: (t: string) => api.upsertAnnotation(projectDir, sessionId, messageUuid, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.annotations(projectDir, sessionId) });
      onDone();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
  });

  const del = useMutation({
    mutationFn: () => api.deleteAnnotation(projectDir, sessionId, messageUuid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.annotations(projectDir, sessionId) });
      onDone();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
  });

  const save = () => {
    const trimmed = text.trim();
    if (trimmed === "") {
      // Empty save deletes existing annotation, or does nothing for a new one.
      if (initialText !== "") del.mutate();
      else onDone();
      return;
    }
    upsert.mutate(trimmed);
  };

  const busy = upsert.isPending || del.isPending;

  return (
    <div className="mt-2 flex gap-2">
      <div className="shrink-0 mt-0.5 text-fg-subtle">
        <MessageSquare className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 rounded border border-border bg-surface-2/40 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-fg-subtle mb-1">
          {initialText ? "Edit note" : "New note"}
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onDone();
            } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          rows={3}
          placeholder="Write a note about this message…"
          className={cn(
            "w-full resize-y bg-transparent outline-none text-sm font-mono",
            "border border-border rounded px-2 py-1",
          )}
          disabled={busy}
        />
        <div className="mt-1 flex items-center gap-2">
          <div className="text-[10px] text-fg-subtle">
            ⌘/Ctrl+Enter save · Esc cancel · empty to delete
          </div>
          {error && (
            <div className="text-[10px] text-red-500">{error}</div>
          )}
          <div className="ml-auto flex gap-1">
            <button
              className="text-xs px-2 py-0.5 rounded hover:bg-surface-2 text-fg-subtle disabled:opacity-50"
              onClick={onDone}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="text-xs px-2 py-0.5 rounded bg-user text-user-fg hover:opacity-90 disabled:opacity-50"
              onClick={save}
              disabled={busy}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
