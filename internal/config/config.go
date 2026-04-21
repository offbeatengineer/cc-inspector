package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	ClaudeDir   string
	ProjectsDir string
	CacheDir    string
}

// Resolve returns a Config for the given claude-dir override (empty = default).
// It verifies the projects directory exists; ErrNoProjects is returned when it
// does not, so the caller can print a friendly first-run message.
var ErrNoProjects = errors.New("claude projects directory not found")

func Resolve(override string) (*Config, error) {
	dir := override
	if dir == "" {
		if env := os.Getenv("CLAUDE_CONFIG_DIR"); env != "" {
			dir = env
		} else {
			home, err := os.UserHomeDir()
			if err != nil {
				return nil, fmt.Errorf("resolve home dir: %w", err)
			}
			dir = filepath.Join(home, ".claude")
		}
	}
	abs, err := filepath.Abs(dir)
	if err != nil {
		return nil, fmt.Errorf("resolve absolute claude dir: %w", err)
	}

	projects := filepath.Join(abs, "projects")
	info, err := os.Stat(projects)
	if err != nil || !info.IsDir() {
		return &Config{ClaudeDir: abs, ProjectsDir: projects}, ErrNoProjects
	}

	cache := filepath.Join(abs, ".cache", "claude-reader")
	if err := os.MkdirAll(cache, 0o755); err != nil {
		return nil, fmt.Errorf("create cache dir: %w", err)
	}

	return &Config{ClaudeDir: abs, ProjectsDir: projects, CacheDir: cache}, nil
}
