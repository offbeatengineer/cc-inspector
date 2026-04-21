package scanner

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/offbeatengineer/cc-inspector/internal/session"
)

type ProjectInfo struct {
	Dir          string     `json:"dir"`
	DisplayPath  string     `json:"displayPath"`
	SessionCount int        `json:"sessionCount"`
	LastActivity *time.Time `json:"lastActivity,omitempty"`
	HasIndex     bool       `json:"hasIndex"`
}

// ListProjects walks projectsDir and returns one entry per project directory
// (excludes hidden/system entries). Each entry is computed via cheap os.Stat.
func ListProjects(projectsDir string) ([]ProjectInfo, error) {
	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		return nil, fmt.Errorf("read projects dir: %w", err)
	}
	var out []ProjectInfo
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}
		p := ProjectInfo{
			Dir:         name,
			DisplayPath: session.DecodeProjectDir(name),
		}
		dir := filepath.Join(projectsDir, name)
		sessions, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		var latest time.Time
		for _, s := range sessions {
			if s.IsDir() {
				continue
			}
			if !strings.HasSuffix(s.Name(), ".jsonl") {
				if s.Name() == "sessions-index.json" {
					p.HasIndex = true
				}
				continue
			}
			p.SessionCount++
			info, err := s.Info()
			if err != nil {
				continue
			}
			if info.ModTime().After(latest) {
				latest = info.ModTime()
			}
		}
		if !latest.IsZero() {
			t := latest.UTC()
			p.LastActivity = &t
		}
		out = append(out, p)
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
