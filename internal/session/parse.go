package session

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
)

// ParseFile streams a session JSONL and returns all messages. Tolerates an
// unparseable final line (the file may be under active write) but treats any
// other malformed line as an error.
func ParseFile(path string) ([]Message, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open session: %w", err)
	}
	defer f.Close()
	return parseReader(f)
}

func parseReader(r io.Reader) ([]Message, error) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 16*1024*1024)

	var messages []Message
	var pending []byte
	for scanner.Scan() {
		if pending != nil {
			messages = append(messages, unknownMessage(pending, "malformed: line did not parse"))
			pending = nil
		}
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		m, err := parseLine(line)
		if err != nil {
			// Defer the decision — if this is the final line, we silently drop it.
			pending = append([]byte(nil), line...)
			continue
		}
		messages = append(messages, m)
	}
	if err := scanner.Err(); err != nil && !errors.Is(err, io.EOF) {
		return nil, fmt.Errorf("scan session: %w", err)
	}
	// pending is intentionally discarded — it was the final line and is
	// likely a partial write from an active session.
	return messages, nil
}

func parseLine(line []byte) (Message, error) {
	var m Message
	if err := json.Unmarshal(line, &m); err != nil {
		return Message{}, err
	}
	m.Raw = append([]byte(nil), line...)
	return m, nil
}

func unknownMessage(raw []byte, reason string) Message {
	return Message{
		Type:    "unknown",
		Subtype: reason,
		Raw:     append([]byte(nil), raw...),
	}
}

// MetaFromMessages derives summary fields from a parsed message stream.
func MetaFromMessages(msgs []Message) (firstPrompt string, startedAt, lastActivity *string, cwd, gitBranch, version string, models []string) {
	seen := map[string]bool{}
	for _, m := range msgs {
		if firstPrompt == "" && m.Type == "user" && m.Message != nil {
			firstPrompt = firstUserText(m.Message.Content)
		}
		if m.Timestamp != nil {
			ts := m.Timestamp.UTC().Format("2006-01-02T15:04:05.000Z")
			if startedAt == nil {
				s := ts
				startedAt = &s
			}
			l := ts
			lastActivity = &l
		}
		if cwd == "" && m.Cwd != "" {
			cwd = m.Cwd
		}
		if gitBranch == "" && m.GitBranch != "" {
			gitBranch = m.GitBranch
		}
		if version == "" && m.Version != "" {
			version = m.Version
		}
		if m.Message != nil && m.Message.Model != "" && !seen[m.Message.Model] {
			models = append(models, m.Message.Model)
			seen[m.Message.Model] = true
		}
	}
	return
}

func firstUserText(blocks []ContentBlock) string {
	for _, b := range blocks {
		if b.Type == "text" && b.Text != "" {
			return b.Text
		}
	}
	return ""
}
