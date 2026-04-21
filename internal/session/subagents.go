package session

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// SubagentFile pairs an agent JSONL path with its meta.
type SubagentFile struct {
	AgentID   string
	AgentType string
	Desc      string
	Path      string
}

// ListSubagents returns the subagent files associated with a session (if any).
// Layout: <projectDir>/<sessionId>/subagents/agent-<id>.jsonl (+ .meta.json).
func ListSubagents(projectDir, sessionID string) ([]SubagentFile, error) {
	root := filepath.Join(projectDir, sessionID, "subagents")
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read subagents dir: %w", err)
	}
	var out []SubagentFile
	for _, e := range entries {
		name := e.Name()
		if !strings.HasPrefix(name, "agent-") || !strings.HasSuffix(name, ".jsonl") {
			continue
		}
		id := strings.TrimSuffix(strings.TrimPrefix(name, "agent-"), ".jsonl")
		file := SubagentFile{AgentID: id, Path: filepath.Join(root, name)}
		metaPath := filepath.Join(root, "agent-"+id+".meta.json")
		if data, err := os.ReadFile(metaPath); err == nil {
			var meta struct {
				AgentType   string `json:"agentType"`
				Description string `json:"description"`
			}
			if json.Unmarshal(data, &meta) == nil {
				file.AgentType = meta.AgentType
				file.Desc = meta.Description
			}
		}
		out = append(out, file)
	}
	return out, nil
}

// LoadSubagent parses a single subagent file and returns a summary + messages.
func LoadSubagent(file SubagentFile) (SubagentSummary, []Message, error) {
	msgs, err := ParseFile(file.Path)
	if err != nil {
		return SubagentSummary{}, nil, err
	}
	summary := SubagentSummary{
		AgentID:      file.AgentID,
		AgentType:    file.AgentType,
		Description:  file.Desc,
		MessageCount: len(msgs),
	}
	fp, started, last, _, _, _, _ := MetaFromMessages(msgs)
	summary.FirstPrompt = truncate(fp, 200)
	if started != nil {
		if t, ok := parseTime(*started); ok {
			summary.StartedAt = &t
		}
	}
	if last != nil {
		if t, ok := parseTime(*last); ok {
			summary.LastActivity = &t
		}
	}
	return summary, msgs, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
