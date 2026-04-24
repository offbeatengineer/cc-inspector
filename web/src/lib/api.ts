import type {
  Annotation,
  AnnotationMap,
  ProjectInfo,
  SessionInfo,
  Session,
  SubagentResponse,
} from "./types";

const BASE = "/api";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { Accept: "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function send<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T | null> {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => get<ProjectInfo[]>("/projects"),
  listSessions: (project: string) =>
    get<SessionInfo[]>(`/projects/${encodeURIComponent(project)}/sessions`),
  getSession: (project: string, sessionId: string) =>
    get<Session>(
      `/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(sessionId)}`
    ),
  getSubagent: (project: string, sessionId: string, agentId: string) =>
    get<SubagentResponse>(
      `/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(
        sessionId
      )}/subagents/${encodeURIComponent(agentId)}`
    ),
  toolResultURL: (project: string, sessionId: string, fileId: string) =>
    `${BASE}/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(
      sessionId
    )}/tool-results/${encodeURIComponent(fileId)}`,
  fetchToolResult: (project: string, sessionId: string, fileId: string) =>
    fetch(
      `${BASE}/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(
        sessionId
      )}/tool-results/${encodeURIComponent(fileId)}`
    ).then((r) => r.text()),
  listAnnotations: async (project: string, sessionId: string): Promise<AnnotationMap> => {
    const res = await get<{ annotations: AnnotationMap }>(
      `/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(sessionId)}/annotations`,
    );
    return res.annotations ?? {};
  },
  upsertAnnotation: (
    project: string,
    sessionId: string,
    messageUuid: string,
    text: string,
  ) =>
    send<Annotation>(
      `/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(sessionId)}/annotations/${encodeURIComponent(messageUuid)}`,
      "PUT",
      { text },
    ),
  deleteAnnotation: (project: string, sessionId: string, messageUuid: string) =>
    send<null>(
      `/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(sessionId)}/annotations/${encodeURIComponent(messageUuid)}`,
      "DELETE",
    ),
  exportSessionURL: (
    project: string,
    sessionId: string,
    opts?: { annotations?: boolean },
  ) => {
    const base = `${BASE}/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(sessionId)}/export`;
    const params = new URLSearchParams();
    if (opts?.annotations === false) params.set("annotations", "false");
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  },
};

export const qk = {
  projects: () => ["projects"] as const,
  sessions: (project: string) => ["sessions", project] as const,
  session: (project: string, sessionId: string) =>
    ["session", project, sessionId] as const,
  subagent: (project: string, sessionId: string, agentId: string) =>
    ["subagent", project, sessionId, agentId] as const,
  annotations: (project: string, sessionId: string) =>
    ["annotations", project, sessionId] as const,
};
