package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	ClaudeDir      string
	ProjectsDir    string
	CacheDir       string
	AnnotationsDir string
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

	cache := filepath.Join(abs, ".cache", "cc-inspector")
	if err := os.MkdirAll(cache, 0o755); err != nil {
		return nil, fmt.Errorf("create cache dir: %w", err)
	}

	annotations, err := resolveAnnotationsDir()
	if err != nil {
		return nil, err
	}

	return &Config{
		ClaudeDir:      abs,
		ProjectsDir:    projects,
		CacheDir:       cache,
		AnnotationsDir: annotations,
	}, nil
}

// resolveAnnotationsDir returns the directory where cc-inspector stores
// per-session annotations. Honors $CC_INSPECTOR_HOME and $XDG_DATA_HOME;
// defaults to ~/.cc-inspector/annotations. The directory itself is created
// lazily on first write — we only compute the path here.
func resolveAnnotationsDir() (string, error) {
	if env := os.Getenv("CC_INSPECTOR_HOME"); env != "" {
		abs, err := filepath.Abs(env)
		if err != nil {
			return "", fmt.Errorf("resolve CC_INSPECTOR_HOME: %w", err)
		}
		return filepath.Join(abs, "annotations"), nil
	}
	if env := os.Getenv("XDG_DATA_HOME"); env != "" {
		abs, err := filepath.Abs(env)
		if err != nil {
			return "", fmt.Errorf("resolve XDG_DATA_HOME: %w", err)
		}
		return filepath.Join(abs, "cc-inspector", "annotations"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home dir: %w", err)
	}
	return filepath.Join(home, ".cc-inspector", "annotations"), nil
}
