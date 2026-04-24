package annotations

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Store persists annotations to a filesystem root. One JSON file per
// session. Concurrent writes on the same session serialize via a
// per-session mutex so upsert+delete cycles don't clobber each other.
type Store struct {
	root string

	mu    sync.Mutex
	locks map[string]*sync.Mutex
}

// NewStore returns a Store rooted at the given directory. The directory
// is created lazily on first write.
func NewStore(root string) *Store {
	return &Store{
		root:  root,
		locks: make(map[string]*sync.Mutex),
	}
}

// Path returns the on-disk path for a session's annotation file. Callers
// should treat the path as opaque; it is exposed for tests and logging.
func (s *Store) Path(projectDir, sessionID string) string {
	return filepath.Join(s.root, projectDir, sessionID+".json")
}

// List returns all annotations for the session keyed by message UUID.
// Missing file → empty map, nil error.
func (s *Store) List(projectDir, sessionID string) (map[string]Annotation, error) {
	path := s.Path(projectDir, sessionID)
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return map[string]Annotation{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read annotations: %w", err)
	}
	var f fileFormat
	if err := json.Unmarshal(data, &f); err != nil {
		return nil, fmt.Errorf("parse annotations: %w", err)
	}
	if f.Annotations == nil {
		return map[string]Annotation{}, nil
	}
	return f.Annotations, nil
}

// Upsert writes (or replaces) the annotation for a given message. On
// replace, CreatedAt is preserved; UpdatedAt is always set to now.
func (s *Store) Upsert(projectDir, sessionID, messageUUID, text string) (Annotation, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return Annotation{}, errors.New("text is required")
	}
	if len(text) > MaxTextBytes {
		return Annotation{}, fmt.Errorf("text exceeds %d bytes", MaxTextBytes)
	}

	unlock := s.lockSession(projectDir, sessionID)
	defer unlock()

	current, err := s.List(projectDir, sessionID)
	if err != nil {
		return Annotation{}, err
	}
	now := time.Now().UTC()
	ann := Annotation{
		MessageUUID: messageUUID,
		Text:        text,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if prev, ok := current[messageUUID]; ok {
		ann.CreatedAt = prev.CreatedAt
	}
	current[messageUUID] = ann
	if err := s.write(projectDir, sessionID, current); err != nil {
		return Annotation{}, err
	}
	return ann, nil
}

// Delete removes an annotation. Missing key is a no-op.
func (s *Store) Delete(projectDir, sessionID, messageUUID string) error {
	unlock := s.lockSession(projectDir, sessionID)
	defer unlock()

	current, err := s.List(projectDir, sessionID)
	if err != nil {
		return err
	}
	if _, ok := current[messageUUID]; !ok {
		return nil
	}
	delete(current, messageUUID)
	return s.write(projectDir, sessionID, current)
}

func (s *Store) write(projectDir, sessionID string, anns map[string]Annotation) error {
	path := s.Path(projectDir, sessionID)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create annotations dir: %w", err)
	}
	payload := fileFormat{Version: currentVersion, Annotations: anns}
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("encode annotations: %w", err)
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".tmp-*")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("rename annotations: %w", err)
	}
	return nil
}

func (s *Store) lockSession(projectDir, sessionID string) func() {
	key := projectDir + "/" + sessionID
	s.mu.Lock()
	m, ok := s.locks[key]
	if !ok {
		m = &sync.Mutex{}
		s.locks[key] = m
	}
	s.mu.Unlock()
	m.Lock()
	return m.Unlock
}
