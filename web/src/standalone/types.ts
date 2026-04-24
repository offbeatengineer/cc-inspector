import type { AnnotationMap, Session, SubagentResponse } from "../lib/types";

export type ExportPayload = {
  meta: { id: string; projectDir: string };
  session: Session;
  jsonl: string;
  toolResults: Record<string, string>;
  subagents: Record<string, SubagentResponse>;
  highlights: Record<string, string>;
  highlightCSS: string;
  annotations?: AnnotationMap;
};

declare global {
  interface Window {
    __EXPORT__: ExportPayload;
  }
}
