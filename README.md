# claude-reader

Browse your local Claude Code session history through a polished, private web UI.

Claude Code stores every session as a JSONL file under `~/.claude/projects/`. `claude-reader` reads those files directly and serves them through a local-only HTTP server so you can scroll through past conversations — thinking blocks, tool calls, sub-agents, and all.

## Status

M1 — data layer is complete: HTTP API serves projects, sessions, sub-agents, externalized tool outputs, and images. The web UI (M2+) lands next.

## Install

Not yet published. For now:

```sh
go install github.com/zhiyand/claude-reader/cmd/claude-reader@latest
```

## Usage

```sh
claude-reader              # starts server, prints URL, opens browser
claude-reader --port 8787  # pin a port
claude-reader --claude-dir /path/to/.claude
claude-reader --version
```

By default the server binds to `127.0.0.1`. The data never leaves your machine.

## API

```
GET /api/projects
GET /api/projects/{encoded}/sessions
GET /api/projects/{encoded}/sessions/{id}
GET /api/projects/{encoded}/sessions/{id}/subagents/{agentId}
GET /api/projects/{encoded}/sessions/{id}/tool-results/{fileId}
GET /api/projects/{encoded}/sessions/{id}/images/{messageUuid}/{blockIndex}
GET /api/healthz
GET /api/version
```

Responses for full sessions have base64 images stripped (replaced with `image_ref` URLs) and externalized tool outputs replaced with `external` markers pointing to the `/tool-results/{fileId}` endpoint.

## Development

```sh
just run         # go run ./cmd/claude-reader
just build       # local dev binary
just test
just vet
```

## License

MIT — see [LICENSE](./LICENSE).
