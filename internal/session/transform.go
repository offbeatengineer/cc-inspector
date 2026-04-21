package session

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
)

// BuildOptions controls session transformation for API responses.
type BuildOptions struct {
	ProjectsDir string // absolute path to the projects root
	ProjectDir  string // encoded project directory name
	SessionID   string
	URLPrefix   string // e.g. "/api/projects/<encoded>/sessions/<id>"
}

// Build loads a session file, transforms it for the API (strips base64 images,
// detects externalized tool outputs, attaches sub-agent summaries), and
// returns the assembled Session object.
func Build(opts BuildOptions) (*Session, error) {
	path := filepath.Join(opts.ProjectsDir, opts.ProjectDir, opts.SessionID+".jsonl")
	msgs, err := ParseFile(path)
	if err != nil {
		return nil, err
	}

	// Strip base64 images in place (replaced by URL refs) and detect
	// externalized tool outputs via toolUseResult.persistedOutputPath.
	stripImages(msgs, opts.URLPrefix)
	annotateExternalToolResults(msgs, opts.URLPrefix)

	// Load subagent summaries (sidechain files).
	subagents, err := ListSubagents(filepath.Join(opts.ProjectsDir, opts.ProjectDir), opts.SessionID)
	if err != nil {
		return nil, fmt.Errorf("list subagents: %w", err)
	}
	summaries := map[string]SubagentSummary{}
	for _, sf := range subagents {
		summary, sMsgs, err := LoadSubagent(sf)
		if err != nil {
			continue
		}
		_ = sMsgs // full transcript fetched via separate endpoint
		summaries[sf.AgentID] = summary
	}

	meta := buildMeta(opts, msgs)
	return &Session{Meta: meta, Messages: msgs, SubagentSummaries: summaries}, nil
}

// BuildSubagent loads a single subagent transcript.
func BuildSubagent(opts BuildOptions, agentID string) ([]Message, SubagentSummary, error) {
	subagents, err := ListSubagents(filepath.Join(opts.ProjectsDir, opts.ProjectDir), opts.SessionID)
	if err != nil {
		return nil, SubagentSummary{}, err
	}
	for _, sf := range subagents {
		if sf.AgentID != agentID {
			continue
		}
		summary, msgs, err := LoadSubagent(sf)
		if err != nil {
			return nil, SubagentSummary{}, err
		}
		stripImages(msgs, opts.URLPrefix+"/subagents/"+agentID)
		annotateExternalToolResults(msgs, opts.URLPrefix)
		return msgs, summary, nil
	}
	return nil, SubagentSummary{}, fmt.Errorf("subagent not found: %s", agentID)
}

// stripImages removes base64 payloads, replacing them with URL references.
// Url prefix is expected to resolve to /images/{messageUuid}/{blockIndex}.
func stripImages(msgs []Message, urlPrefix string) {
	for i := range msgs {
		m := &msgs[i]
		if m.Message == nil {
			continue
		}
		for j := range m.Message.Content {
			b := &m.Message.Content[j]
			if b.Type != "image" || b.Source == nil || b.Source.Type != "base64" {
				continue
			}
			b.Ref = &ImageRef{
				URL:       fmt.Sprintf("%s/images/%s/%d", urlPrefix, m.UUID, j),
				MediaType: b.Source.MediaType,
			}
			b.Source = nil
			b.Raw = nil // prevent the base64 blob leaking through raw
		}
	}
}

// annotateExternalToolResults replaces the inline preview content with an
// ExternalResult marker. Detected via toolUseResult.persistedOutputPath.
func annotateExternalToolResults(msgs []Message, urlPrefix string) {
	for i := range msgs {
		m := &msgs[i]
		if m.Type != "user" || len(m.ToolUseResult) == 0 {
			continue
		}
		var probe struct {
			PersistedPath string `json:"persistedOutputPath"`
			PersistedSize int64  `json:"persistedOutputSize"`
		}
		if err := json.Unmarshal(m.ToolUseResult, &probe); err != nil || probe.PersistedPath == "" {
			continue
		}
		id := externalFileID(probe.PersistedPath)
		if id == "" || m.Message == nil {
			continue
		}
		for j := range m.Message.Content {
			b := &m.Message.Content[j]
			if b.Type != "tool_result" {
				continue
			}
			b.ResultRaw = nil
			b.External = &ExternalResult{
				ID:   id,
				Size: probe.PersistedSize,
				URL:  fmt.Sprintf("%s/tool-results/%s", urlPrefix, id),
			}
		}
	}
}

func externalFileID(path string) string {
	base := filepath.Base(path)
	return strings.TrimSuffix(base, filepath.Ext(base))
}

func buildMeta(opts BuildOptions, msgs []Message) SessionMeta {
	m := SessionMeta{
		ID:         opts.SessionID,
		ProjectDir: opts.ProjectDir,
	}
	var models []string
	seen := map[string]bool{}
	for _, msg := range msgs {
		if m.FirstPrompt == "" && msg.Type == "user" && msg.Message != nil {
			for _, b := range msg.Message.Content {
				if b.Type == "text" && b.Text != "" {
					m.FirstPrompt = truncate(b.Text, 200)
					break
				}
			}
		}
		if msg.Timestamp != nil {
			ts := msg.Timestamp.UTC()
			if m.StartedAt == nil {
				s := ts
				m.StartedAt = &s
			}
			l := ts
			m.LastActivity = &l
		}
		if m.Cwd == "" && msg.Cwd != "" {
			m.Cwd = msg.Cwd
		}
		if m.GitBranch == "" && msg.GitBranch != "" {
			m.GitBranch = msg.GitBranch
		}
		if m.Version == "" && msg.Version != "" {
			m.Version = msg.Version
		}
		if msg.Message != nil && msg.Message.Model != "" && !seen[msg.Message.Model] {
			models = append(models, msg.Message.Model)
			seen[msg.Message.Model] = true
		}
	}
	m.MessageCount = len(msgs)
	m.ModelsSeen = models
	if m.Cwd != "" {
		m.ProjectPath = m.Cwd
	} else {
		m.ProjectPath = DecodeProjectDir(opts.ProjectDir)
	}
	return m
}
