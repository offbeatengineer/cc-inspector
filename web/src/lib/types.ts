// Mirrors the Go API response shapes.

export interface ProjectInfo {
  dir: string;
  displayPath: string;
  sessionCount: number;
  lastActivity?: string;
  hasIndex: boolean;
}

export interface SessionInfo {
  id: string;
  projectDir: string;
  firstPrompt: string;
  messageCount: number;
  startedAt?: string;
  lastActivity?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  sizeBytes: number;
}

export interface ImageRef {
  url: string;
  mediaType: string;
}

export interface ExternalResult {
  id: string;
  size: number;
  url: string;
}

export interface ContentBlock {
  type: string;

  // text
  text?: string;

  // thinking
  thinking?: string;
  signature?: string;

  // tool_use
  id?: string;
  name?: string;
  input?: unknown;

  // tool_result
  tool_use_id?: string;
  is_error?: boolean;
  content?: unknown;
  external?: ExternalResult;

  // image
  image_ref?: ImageRef;
  source?: { type: string; media_type?: string; data?: string };
}

export interface InnerMessage {
  id?: string;
  role?: string;
  model?: string;
  content?: ContentBlock[];
  usage?: Usage | null;
  stop_reason?: string;
  stop_sequence?: string;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  service_tier?: string;
}

export interface Message {
  type: string;
  uuid?: string;
  parentUuid?: string | null;
  sessionId?: string;
  isSidechain?: boolean;
  agentId?: string;
  timestamp?: string;
  userType?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  subtype?: string;
  message?: InnerMessage | null;
  toolUseResult?: unknown;
  sourceToolAssistantUUID?: string;
  content?: unknown;
  url?: string;
  permissionMode?: string;
  attachment?: unknown;
  snapshot?: unknown;
  messageId?: string;
  isMeta?: boolean;
  promptId?: string;
}

export interface SubagentSummary {
  agentId: string;
  agentType?: string;
  description?: string;
  messageCount: number;
  firstPrompt?: string;
  startedAt?: string;
  lastActivity?: string;
}

export interface SessionMeta {
  id: string;
  projectPath: string;
  projectDir: string;
  firstPrompt: string;
  messageCount: number;
  startedAt?: string;
  lastActivity?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  sizeBytes: number;
  modelsSeen?: string[];
}

export interface Session {
  meta: SessionMeta;
  messages: Message[];
  subagentSummaries: Record<string, SubagentSummary>;
}

export interface SubagentResponse {
  summary: SubagentSummary;
  messages: Message[];
}
