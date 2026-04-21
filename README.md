# CC Inspector

Browse your local Claude Code session history through a polished, private web UI.

Claude Code stores every session as a JSONL file under `~/.claude/projects/`.
`cc-inspector` reads those files directly and serves them through a local-only
HTTP server so you can scroll through past conversations — thinking blocks, tool
calls, sub-agents, and all.

- **Local-only**: binds to `127.0.0.1` by default; nothing leaves your machine.
- **Single binary**: Go + embedded React SPA. No runtime deps.
- **Read-only**: never writes to your session files.
- **Fast**: streaming JSONL parser, mtime-keyed session-list cache, virtualized
  conversation view for sessions with 1000+ messages.

## Install

```sh
# Once the Homebrew tap is published:
brew install offbeatengineer/tap/cc-inspector

# Or install from source:
go install github.com/offbeatengineer/cc-inspector/cmd/cc-inspector@latest
```

## Usage

```sh
cc-inspector                            # start server, print URL, open browser
cc-inspector --port 8787                # pin a port
cc-inspector --host 127.0.0.1 --port 0  # default — OS-assigned port
cc-inspector --claude-dir /path/to/.claude
cc-inspector --open=false               # don't open the browser
cc-inspector --version
```

## Features

- **Two-pane layout + inspector**: projects → sessions → conversation, with a
  toggleable right-side inspector for metadata, token totals, sub-agent index,
  and jump-to-prompt rail.
- **Per-tool renderers**: dedicated views for `Bash`, `Read`, `Edit`/`Write`
  (with diff view), `Grep`, `Glob`, `TodoWrite`, `WebFetch`/`WebSearch`, `Task`
  (with inline sub-agent transcript), and MCP tools. Unknown tools fall back to
  a collapsible JSON view.
- **Markdown + syntax highlighting** via Shiki, lazy-loaded per language.
- **Images** are served as separate endpoints (base64 stripped from the JSON
  payload) and rendered inline with click-to-lightbox.
- **Externalized tool outputs** show a "Load full output (N KB)" button instead
  of being inlined.
- **Dark mode**: follows system preference with a manual override.

## Keyboard

| Key          | Action                       |
| ------------ | ---------------------------- |
| `j` / `k`    | next / previous message      |
| `g g` / `G`  | top / bottom                 |
| `i`          | toggle inspector             |
| `/` or `⌘F`  | find in session              |
| `⌘K`         | command palette              |
| `[` / `]`    | previous / next session      |
| `?`          | show keyboard help           |

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

Session responses have base64 images stripped (replaced with `image_ref` URLs)
and externalized tool outputs replaced with `external` markers pointing to the
`/tool-results/{fileId}` endpoint.

## Development

```sh
just build-web   # build the SPA and copy it into internal/web/dist
just build       # build the release binary (depends on build-web)
just run         # go run ./cmd/cc-inspector against ~/.claude

# HMR loop — two panes:
just dev-web     # Vite dev server on :5173 (proxies /api to :8787)
just dev-go      # Go server in dev mode (proxies non-/api to Vite)
```

## Distribution

Releases are cut by pushing a `v*` tag. `.github/workflows/release.yml` triggers
`goreleaser` which:

1. builds the SPA,
2. cross-compiles for `darwin-{amd64,arm64}` and `linux-{amd64,arm64}`,
3. creates a GitHub release with checksums,
4. auto-PRs an updated formula to `offbeatengineer/homebrew-tap`.

## License

MIT — see [LICENSE](./LICENSE).
