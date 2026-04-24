// Package annotations persists per-message user notes for cc-inspector
// sessions. Annotations are keyed by Message.UUID; at most one annotation
// exists per message. Data is stored outside of ~/.claude so cc-inspector
// does not mutate Claude Code's own data directory.
package annotations

import "time"

// Annotation is a plain-text note attached to a single message.
type Annotation struct {
	MessageUUID string    `json:"messageUuid"`
	Text        string    `json:"text"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// fileFormat is the on-disk JSON schema for an annotations file.
type fileFormat struct {
	Version     int                   `json:"version"`
	Annotations map[string]Annotation `json:"annotations"`
}

const currentVersion = 1

// MaxTextBytes caps annotation size. Large enough for reasonable notes,
// small enough that a rogue paste cannot balloon a session file.
const MaxTextBytes = 10 * 1024
