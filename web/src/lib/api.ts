import type {
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
};

export const qk = {
  projects: () => ["projects"] as const,
  sessions: (project: string) => ["sessions", project] as const,
  session: (project: string, sessionId: string) =>
    ["session", project, sessionId] as const,
  subagent: (project: string, sessionId: string, agentId: string) =>
    ["subagent", project, sessionId, agentId] as const,
};
