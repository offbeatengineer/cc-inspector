package scanner

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// MetaCache is an mtime-keyed cache of session metadata. Persisted as a single
// JSON file. All reads/writes go through the mutex.
type MetaCache struct {
	path    string
	mu      sync.Mutex
	entries map[string]MetaCacheEntry
	dirty   bool
}

type MetaCacheEntry struct {
	Path         string     `json:"path"`
	Mtime        time.Time  `json:"mtime"`
	Size         int64      `json:"size"`
	FirstPrompt  string     `json:"firstPrompt"`
	MessageCount int        `json:"messageCount"`
	StartedAt    *time.Time `json:"startedAt,omitempty"`
	LastActivity *time.Time `json:"lastActivity,omitempty"`
	Cwd          string     `json:"cwd,omitempty"`
	GitBranch    string     `json:"gitBranch,omitempty"`
	Version      string     `json:"version,omitempty"`
	ModelsSeen   []string   `json:"modelsSeen,omitempty"`
}

func OpenMetaCache(cacheDir string) (*MetaCache, error) {
	path := filepath.Join(cacheDir, "meta.json")
	c := &MetaCache{path: path, entries: map[string]MetaCacheEntry{}}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return c, nil
		}
		return nil, fmt.Errorf("read meta cache: %w", err)
	}
	if err := json.Unmarshal(data, &c.entries); err != nil {
		// Corrupt cache — start fresh rather than failing.
		c.entries = map[string]MetaCacheEntry{}
	}
	return c, nil
}

func (c *MetaCache) Lookup(path string, mtime time.Time, size int64) (MetaCacheEntry, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[path]
	if !ok {
		return MetaCacheEntry{}, false
	}
	if !e.Mtime.Equal(mtime) || e.Size != size {
		return MetaCacheEntry{}, false
	}
	return e, true
}

func (c *MetaCache) Put(entry MetaCacheEntry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[entry.Path] = entry
	c.dirty = true
}

// Flush writes the cache to disk if there are pending changes.
func (c *MetaCache) Flush() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.dirty {
		return nil
	}
	data, err := json.MarshalIndent(c.entries, "", "  ")
	if err != nil {
		return err
	}
	tmp := c.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, c.path); err != nil {
		return err
	}
	c.dirty = false
	return nil
}
