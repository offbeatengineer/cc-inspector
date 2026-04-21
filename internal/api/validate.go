package api

import (
	"errors"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	projectDirRe = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)
	sessionIDRe  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	tokenRe      = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
)

// validateProject rejects traversal attempts and enforces the encoded-dir
// character set.
func validateProject(project string) error {
	if project == "" {
		return errors.New("missing project")
	}
	if !projectDirRe.MatchString(project) {
		return errors.New("invalid project name")
	}
	return nil
}

func validateSession(id string) error {
	if !sessionIDRe.MatchString(id) {
		return errors.New("invalid session id")
	}
	return nil
}

func validateToken(tok string) error {
	if tok == "" || len(tok) > 256 || !tokenRe.MatchString(tok) {
		return errors.New("invalid token")
	}
	return nil
}

// ensureUnderRoot returns an error if path is not a descendant of root.
func ensureUnderRoot(root, path string) error {
	clean := filepath.Clean(path)
	absRoot := filepath.Clean(root)
	rel, err := filepath.Rel(absRoot, clean)
	if err != nil || rel == "." || strings.HasPrefix(rel, "..") {
		return errors.New("path escapes root")
	}
	return nil
}
