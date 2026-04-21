package scanner

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/zhiyand/claude-reader/internal/session"
)

type SessionInfo struct {
	ID           string     `json:"id"`
	ProjectDir   string     `json:"projectDir"`
	FirstPrompt  string     `json:"firstPrompt"`
	MessageCount int        `json:"messageCount"`
	StartedAt    *time.Time `json:"startedAt,omitempty"`
	LastActivity *time.Time `json:"lastActivity,omitempty"`
	Cwd          string     `json:"cwd,omitempty"`
	GitBranch    string     `json:"gitBranch,omitempty"`
	Version      string     `json:"version,omitempty"`
	SizeBytes    int64      `json:"sizeBytes"`
}

// ListSessions returns session summaries for one project, populated from the
// mtime-keyed cache when fresh. Cache misses stream-parse the file once.
func ListSessions(projectsDir, projectDir string, cache *MetaCache) ([]SessionInfo, error) {
	dir := filepath.Join(projectsDir, projectDir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read project dir: %w", err)
	}
	var out []SessionInfo
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".jsonl") {
			continue
		}
		path := filepath.Join(dir, e.Name())
		info, err := e.Info()
		if err != nil {
			continue
		}
		id := strings.TrimSuffix(e.Name(), ".jsonl")

		var meta MetaCacheEntry
		if cached, ok := cache.Lookup(path, info.ModTime(), info.Size()); ok {
			meta = cached
		} else {
			msgs, err := session.ParseFile(path)
			if err != nil {
				continue
			}
			meta = buildMetaEntry(path, info.ModTime(), info.Size(), msgs)
			cache.Put(meta)
		}

		out = append(out, SessionInfo{
			ID:           id,
			ProjectDir:   projectDir,
			FirstPrompt:  truncate(meta.FirstPrompt, 200),
			MessageCount: meta.MessageCount,
			StartedAt:    meta.StartedAt,
			LastActivity: meta.LastActivity,
			Cwd:          meta.Cwd,
			GitBranch:    meta.GitBranch,
			Version:      meta.Version,
			SizeBytes:    info.Size(),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].LastActivity == nil {
			return false
		}
		if out[j].LastActivity == nil {
			return true
		}
		return out[i].LastActivity.After(*out[j].LastActivity)
	})
	return out, nil
}

func buildMetaEntry(path string, mtime time.Time, size int64, msgs []session.Message) MetaCacheEntry {
	e := MetaCacheEntry{
		Path:         path,
		Mtime:        mtime,
		Size:         size,
		MessageCount: len(msgs),
	}
	var firstPrompt, cwd, gitBranch, version string
	var started, last *time.Time
	seen := map[string]bool{}
	for _, m := range msgs {
		if firstPrompt == "" && m.Type == "user" && m.Message != nil {
			for _, b := range m.Message.Content {
				if b.Type == "text" && b.Text != "" {
					firstPrompt = b.Text
					break
				}
			}
		}
		if m.Timestamp != nil {
			ts := m.Timestamp.UTC()
			if started == nil {
				s := ts
				started = &s
			}
			l := ts
			last = &l
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
			e.ModelsSeen = append(e.ModelsSeen, m.Message.Model)
			seen[m.Message.Model] = true
		}
	}
	e.FirstPrompt = firstPrompt
	e.Cwd = cwd
	e.GitBranch = gitBranch
	e.Version = version
	e.StartedAt = started
	e.LastActivity = last
	return e
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
