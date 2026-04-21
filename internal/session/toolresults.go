package session

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

var fileIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// ReadExternalToolResult returns the contents of an externalized tool output.
// fileID is the base filename (without .txt).
func ReadExternalToolResult(projectsDir, projectDir, sessionID, fileID string) ([]byte, error) {
	if !fileIDPattern.MatchString(fileID) {
		return nil, fmt.Errorf("invalid file id")
	}
	path := filepath.Join(projectsDir, projectDir, sessionID, "tool-results", fileID+".txt")
	return os.ReadFile(path)
}
