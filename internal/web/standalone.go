package web

import _ "embed"

// StandaloneHTML is the self-contained single-file session export template.
// The placeholder `__EXPORT_PAYLOAD__` is replaced at request time with the
// JSON payload (session + raw JSONL + inlined tool results & subagents).
// See Justfile target `build-web-standalone` for how this file is produced.
//
//go:embed dist-standalone/standalone.html
var StandaloneHTML []byte
