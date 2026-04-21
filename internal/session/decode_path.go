package session

import "strings"

// DecodeProjectDir converts Claude Code's dash-encoded project directory name
// back to an approximate absolute path. The encoding is lossy (it does not
// distinguish between "/" and an original "-"), but for display this is fine.
// Prefer cwd from the JSONL when available.
func DecodeProjectDir(name string) string {
	return "/" + strings.ReplaceAll(strings.TrimPrefix(name, "-"), "-", "/")
}
