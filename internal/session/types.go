package session

import (
	"encoding/json"
	"time"
)

// Message is one line of a session JSONL file. Claude Code writes many "type"
// values; we keep envelope fields common to most types and stash the raw line
// for renderers that need to show extra details.
type Message struct {
	Type        string          `json:"type"`
	UUID        string          `json:"uuid,omitempty"`
	ParentUUID  *string         `json:"parentUuid,omitempty"`
	SessionID   string          `json:"sessionId,omitempty"`
	IsSidechain bool            `json:"isSidechain,omitempty"`
	AgentID     string          `json:"agentId,omitempty"`
	Timestamp   *time.Time      `json:"timestamp,omitempty"`
	UserType    string          `json:"userType,omitempty"`
	Cwd         string          `json:"cwd,omitempty"`
	GitBranch   string          `json:"gitBranch,omitempty"`
	Version     string          `json:"version,omitempty"`

	// Subtype used by "system" / "attachment" etc.
	Subtype string `json:"subtype,omitempty"`

	// Message payload for user/assistant. Blocks are decoded lazily.
	Message *InnerMessage `json:"message,omitempty"`

	// Tool result metadata on user messages with tool_result blocks.
	ToolUseResult json.RawMessage `json:"toolUseResult,omitempty"`

	// Pointer to the assistant message that spawned a tool_result (for pairing).
	SourceToolAssistantUUID string `json:"sourceToolAssistantUUID,omitempty"`

	// Top-level fields present on various non-user/assistant types.
	Content        json.RawMessage `json:"content,omitempty"`
	URL            string          `json:"url,omitempty"`
	PermissionMode string          `json:"permissionMode,omitempty"`
	Attachment     json.RawMessage `json:"attachment,omitempty"`
	Snapshot       json.RawMessage `json:"snapshot,omitempty"`
	MessageID      string          `json:"messageId,omitempty"`
	IsMeta         bool            `json:"isMeta,omitempty"`
	PromptID       string          `json:"promptId,omitempty"`

	// Raw keeps the original JSON line for unknown types + "show raw" UIs.
	Raw json.RawMessage `json:"-"`
}

// InnerMessage mirrors the Anthropic message shape used by user/assistant rows.
// Content may appear on disk as either a JSON array of blocks or a bare string
// (short user prompts are written as strings).
type InnerMessage struct {
	ID      string          `json:"id,omitempty"`
	Role    string          `json:"role,omitempty"`
	Model   string          `json:"model,omitempty"`
	Content []ContentBlock  `json:"content,omitempty"`
	Usage   json.RawMessage `json:"usage,omitempty"`
	// StopReason, StopSequence, etc. passed through for inspector display.
	StopReason   string `json:"stop_reason,omitempty"`
	StopSequence string `json:"stop_sequence,omitempty"`
}

func (im *InnerMessage) UnmarshalJSON(data []byte) error {
	type alias InnerMessage
	var probe struct {
		alias
		Content json.RawMessage `json:"content"`
	}
	if err := json.Unmarshal(data, &probe); err != nil {
		return err
	}
	*im = InnerMessage(probe.alias)
	if len(probe.Content) == 0 {
		return nil
	}
	switch probe.Content[0] {
	case '"':
		var s string
		if err := json.Unmarshal(probe.Content, &s); err != nil {
			return err
		}
		im.Content = []ContentBlock{{Type: "text", Text: s, Raw: probe.Content}}
	case '[':
		if err := json.Unmarshal(probe.Content, &im.Content); err != nil {
			return err
		}
	default:
		// Unknown shape — preserve as a single block with raw.
		im.Content = []ContentBlock{{Type: "unknown", Raw: probe.Content}}
	}
	return nil
}

// ContentBlock is a single assistant/user content block. Decoded with a
// deferred payload so unknown types pass through untouched.
type ContentBlock struct {
	Type string          `json:"type"`
	Raw  json.RawMessage `json:"-"`

	// text
	Text string `json:"text,omitempty"`

	// thinking
	Thinking  string `json:"thinking,omitempty"`
	Signature string `json:"signature,omitempty"`

	// tool_use
	ToolUseID string          `json:"id,omitempty"`
	ToolName  string          `json:"name,omitempty"`
	ToolInput json.RawMessage `json:"input,omitempty"`

	// tool_result
	ToolResultID string          `json:"tool_use_id,omitempty"`
	IsError      bool            `json:"is_error,omitempty"`
	ResultRaw    json.RawMessage `json:"content,omitempty"`
	External     *ExternalResult `json:"external,omitempty"`

	// image — replaced with an ImageRef by the server.
	Source *ImageSource `json:"source,omitempty"`
	Ref    *ImageRef    `json:"image_ref,omitempty"`
}

// ExternalResult describes a tool output that was persisted to disk rather
// than stored inline in the JSONL.
type ExternalResult struct {
	ID   string `json:"id"`
	Size int64  `json:"size"`
	URL  string `json:"url"`
}

type ImageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type,omitempty"`
	Data      string `json:"data,omitempty"`
}

type ImageRef struct {
	URL       string `json:"url"`
	MediaType string `json:"mediaType"`
}

// UnmarshalJSON keeps the raw bytes around while still filling known fields.
func (c *ContentBlock) UnmarshalJSON(data []byte) error {
	type alias ContentBlock
	var a alias
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	*c = ContentBlock(a)
	c.Raw = append([]byte(nil), data...)
	return nil
}

// Session is the full API response for one session.
type Session struct {
	Meta              SessionMeta                 `json:"meta"`
	Messages          []Message                   `json:"messages"`
	SubagentSummaries map[string]SubagentSummary  `json:"subagentSummaries"`
}

type SessionMeta struct {
	ID            string     `json:"id"`
	ProjectPath   string     `json:"projectPath"` // decoded /-style path, from cwd
	ProjectDir    string     `json:"projectDir"`  // encoded dir name
	FirstPrompt   string     `json:"firstPrompt"`
	MessageCount  int        `json:"messageCount"`
	StartedAt     *time.Time `json:"startedAt,omitempty"`
	LastActivity  *time.Time `json:"lastActivity,omitempty"`
	Cwd           string     `json:"cwd,omitempty"`
	GitBranch     string     `json:"gitBranch,omitempty"`
	Version       string     `json:"version,omitempty"`
	SizeBytes     int64      `json:"sizeBytes"`
	ModelsSeen    []string   `json:"modelsSeen,omitempty"`
}

type SubagentSummary struct {
	AgentID       string     `json:"agentId"`
	AgentType     string     `json:"agentType,omitempty"`
	Description   string     `json:"description,omitempty"`
	MessageCount  int        `json:"messageCount"`
	FirstPrompt   string     `json:"firstPrompt,omitempty"`
	StartedAt     *time.Time `json:"startedAt,omitempty"`
	LastActivity  *time.Time `json:"lastActivity,omitempty"`
}
