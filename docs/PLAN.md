# cc-inspector — Implementation Plan

## Context

**Why this exists.** Claude Code keeps every session as a JSONL file under `~/.claude/projects/<encoded-project>/<session-uuid>.jsonl`. These files contain genuinely valuable context — what you tried, what worked, thinking blocks, tool calls — but they're unreadable in raw form. You want a local, private, polished way to browse your own session history.

**What we're building.** `cc-inspector` — a single static binary that, when launched, starts a local web server and opens a browser to a slick session-browsing UI. No cloud, no account, no telemetry. Distributed via Homebrew.

**Why a binary (not a web app or Electron).** Users install once with `brew install`, get a `~10 MB` executable, and run it. No Node runtime on their machine, no Docker, no signed DMG. Homebrew already solves the update path.

---

## Decisions (confirmed with user)

| Area | Choice |
|------|--------|
| Backend | **Go 1.23+**, stdlib `net/http` (Go 1.22 pattern routing), `embed.FS` for SPA |
| Frontend | **React 18 + Vite + TypeScript + Tailwind v4 + shadcn/ui** |
| Frontend libs | TanStack Router, TanStack Query, TanStack Virtual, Zustand, react-markdown, Shiki (lazy), lucide-react |
| Layout | **Two-pane + inspector** (resizable sidebar / conversation / toggleable right inspector) |
| Search v1 | **In-session Cmd-F** + **Cmd-K command palette** (cross-session FTS deferred to M5) |
| Distribution | **goreleaser** → Homebrew tap (placeholder `<user>/homebrew-tap`, filled at M4) |
| Binding | `127.0.0.1` by default; reject non-loopback unless `--host` explicitly set |
| Signing | Unsigned v1; `brew install` clears Gatekeeper xattr |

---

## Architecture

### Data layer (read-only, never mutates disk)

Three layers of laziness:

1. **Directory listing** — `os.ReadDir(~/.claude/projects)` + per-file `os.Stat`. No parsing. <10 ms for typical machine.
2. **Session metadata cache** — `{firstPrompt, messageCount, startedAt, lastActivity, cwd, gitBranch}` keyed by `{path, mtime, size}`. Persisted to `<claude-dir>/.cache/cc-inspector/meta.json`. Extraction streams the full file with `json.Decoder` (must reach EOF for last timestamp). If `sessions-index.json` exists and is fresh, trust it.
3. **Full session parse** — on demand when user opens a session. Streaming parse, tolerant to unknown types/blocks (yields `{type: "unknown", raw: ...}` instead of failing). Response cached in browser via TanStack Query + ETag = `mtime+size`.

**No SQLite.** Scale is ≤2000 sessions/user; a JSON cache is sufficient and keeps the binary lean.

### API (final shape)

```
GET  /api/projects
GET  /api/projects/{encoded}/sessions
GET  /api/projects/{encoded}/sessions/{id}
GET  /api/projects/{encoded}/sessions/{id}/subagents/{agentId}
GET  /api/projects/{encoded}/sessions/{id}/tool-results/{fileId}
GET  /api/projects/{encoded}/sessions/{id}/images/{messageUuid}/{blockIndex}
GET  /api/healthz
GET  /api/version
```

**Important transformations on the server side:**
- **Strip base64 images** from the session JSON; replace with `{type: "image_ref", url: "/api/.../images/<uuid>/<idx>", mediaType}`. Browser lazy-loads via `<img>`, caches per HTTP. Keeps session payload small.
- **Pair `tool_use` ↔ `tool_result` by id** (not position). Orphaned `tool_use` (no matching result → interrupted session) rendered with a `no result` marker.
- **Sub-agents summarized inline, fetched on expand.** Main-session `Agent` `tool_use` annotated with `{agentId, messageCount, firstPrompt}`; transcript pulled via separate endpoint when user expands.
- **Externalized tool-results not inlined.** Response carries `{external: true, path: "<id>.txt", sizeBytes}`; UI shows "Load full output (142 KB)" button.

### Parsing robustness

- Every message struct uses `json.RawMessage` for `content`, then type-switches; unknown types preserved.
- Catch `io.ErrUnexpectedEOF` / `json.SyntaxError` **on the last line only** (session may be actively being written). Drop silently, don't fail the whole session.
- Golden-file tests in `internal/session/testdata/` with 5–10 anonymized sample sessions covering: thinking blocks, multiple tool types, images, sub-agents, externalized outputs, permission-mode changes.

### Security

- Local-only bind by default.
- URL path params validated: `encoded` matches `^-?[A-Za-z0-9._-]+$`, `id` matches UUID regex, `agentId` / `fileId` are alphanumeric.
- After joining to claude-dir, `filepath.Clean` + prefix-check resolved path is still under claude-dir (defense against traversal).

---

## UI

### Layout (confirmed)

```
┌─────────┬──────────────────────────┬─────────┐
│ Projects│   Conversation           │ Inspect │
│  > repo1│   User: ...              │ cwd:... │
│    ses1 │   Assistant (thinking)   │ branch  │
│    ses2 │   ▸ Bash: ls -la         │ jumpto: │
│  > repo2│   ▸ Edit: foo.go (+12)   │  - msg1 │
│    ses3 │   Assistant: ...         │  tokens │
└─────────┴──────────────────────────┴─────────┘
```

- Resizable sidebar (shadcn `ResizablePanelGroup`), persisted to `localStorage`.
- Inspector toggleable; shows metadata + jump-to-prompt list + sub-agent index + token totals (parsed from `usage`).

### Conversation rendering

- **Flat thread, role-tinted cards.** Not bubbles — density matters for dev content.
- **Thinking**: collapsed; pill shows `Thinking · N words`; italicized muted tone on expand.
- **Tool calls** grouped server-side with their results. Dedicated renderers for:
  - `Bash` — command + stdout/stderr split + exit
  - `Read` — collapsed `path · N lines`
  - `Edit` / `Write` — diff view (`react-diff-viewer-continued`)
  - `Grep` / `Glob` — query + match list
  - `TodoWrite` — proper checkbox-list UI
  - `WebFetch` / `WebSearch` — link preview
  - `Agent` (Task) — expandable, inline-indented sub-agent transcript, plus `⤢` to open full-pane
  - MCP tools (`mcp__*` prefix) — distinct badge, generic JSON-tree fallback
  - Unknown — collapsible raw JSON
- **Images** inline at max-width with click-to-lightbox.
- **System / attachment / permission-mode / file-history-snapshot / last-prompt** — minimal single-line timeline markers, expandable.
- Every message rendered with `id="msg-<uuid>"` for anchor jumps.

### Virtualization

**TanStack Virtual required** for the conversation pane. Sessions with 500+ messages will otherwise cost >2 MB of DOM. Uses `measureElement` for dynamic heights.

### Keyboard

- `j` / `k` — next / prev message
- `g g` / `G` — top / bottom
- `/` or `⌘F` — in-session search with highlight + next/prev
- `⌘K` — command palette (fuzzy project + session jump, uses `fuse.js` lazy-loaded ~20 KB on first open)
- `[` / `]` — prev / next session in current project
- `?` — help overlay

### Dark mode

Day one. System preference + toggle. Tailwind `dark:` classes.

---

## Project structure

```
cc-inspector/
├── cmd/cc-inspector/main.go        # flags, bootstrap, --open
├── internal/
│   ├── config/                      # resolve claude-dir, cache-dir
│   ├── scanner/                     # projects, sessions, mtime cache
│   ├── session/
│   │   ├── types.go                 # Message, ContentBlock, Session
│   │   ├── parse.go                 # streaming tolerant parser
│   │   ├── subagents.go             # sidechain file resolution
│   │   ├── toolresults.go           # externalized output lookup
│   │   └── images.go                # base64 strip + serve
│   ├── api/                         # router.go, projects.go, sessions.go, assets.go, etag.go
│   ├── server/                      # http.Server + embed.FS + SPA fallback
│   └── version/
├── web/
│   ├── src/
│   │   ├── routes/                  # TanStack Router
│   │   ├── components/
│   │   │   ├── conversation/        # MessageCard, ThinkingBlock, ToolCall*, Diff, SubAgent
│   │   │   ├── sidebar/
│   │   │   ├── inspector/
│   │   │   └── ui/                  # shadcn copies
│   │   ├── lib/                     # api.ts, markdown.tsx, shiki.ts
│   │   └── stores/                  # zustand
│   └── vite.config.ts, tailwind.config.ts, tsconfig.json, package.json
├── embed.go                         # //go:embed web/dist/* (build tag !dev)
├── embed_dev.go                     # proxy to http://localhost:5173 (build tag dev)
├── .goreleaser.yaml
├── .github/workflows/{ci.yml,release.yml}
├── Justfile
├── go.mod
├── README.md
└── LICENSE
```

**Build**: `just build` → `cd web && pnpm build` → `go build ./cmd/cc-inspector`.
**Dev**: `just dev` runs Go server with `dev` build tag (proxies unknown routes to Vite on :5173); frontend HMR works.

---

## Distribution

### goreleaser

`.goreleaser.yaml`:
- `builds`: single binary, `CGO_ENABLED=0`, targets `darwin-{amd64,arm64}`, `linux-{amd64,arm64}`.
- ldflags inject `main.version`, `main.commit`, `main.date`.
- `archives`: `.tar.gz`, name `cc-inspector_{{.Os}}_{{.Arch}}.tar.gz`.
- `checksum`: sha256.
- `brews`: auto-PRs formula to `<user>/homebrew-tap`.
- `release`: GitHub release with conventional-commit changelog.

CI: `.github/workflows/release.yml` triggers on `v*` tag → `goreleaser release`.
`--version` flag prints injected version/commit/date.

### First-run UX

Missing `~/.claude/projects/`:
```
cc-inspector: no Claude Code sessions found at ~/.claude/projects
If Claude Code stores data elsewhere, pass --claude-dir /path/to/.claude
```
Exit 0 — user-environment issue, not a crash.

### Installation path

```
brew install <user>/tap/cc-inspector
cc-inspector           # starts, prints URL, opens browser
```

---

## Milestones

**M1 — data layer** (~1–2 d)
Go module. Stdlib HTTP serving `/api/projects` + `/api/projects/{e}/sessions` + `/api/.../sessions/{id}` with real data. Tolerant parser + sub-agent resolution + externalized tool-result handling. No UI.
**Exit**: `curl | jq` on 5 real sessions (including one with sub-agents, one with images) returns well-shaped JSON.

**M2 — minimal UI** (~2 d)
Vite/React/Tailwind/shadcn scaffolded, embedded via `embed.FS`. Two-pane layout. Renders text, thinking (collapsed), tool_use (raw), tool_result (raw). Dark mode. `j`/`k`. TanStack Query + Router wired.
**Exit**: read any real session end-to-end, ugly but complete.

**M3 — polish** (~3–4 d)
Dedicated renderers (Bash, Read, Edit/Write-diff, Grep, Glob, TodoWrite, WebFetch, Task expand, MCP fallback). Markdown + lazy Shiki. Inline images + lightbox. Jump-to-prompt rail. ⌘K palette. Inspector drawer with metadata + token totals.
**Exit**: side-by-side with raw JSONL — nothing important missing.

**M4 — ship** (~1 d)
`.goreleaser.yaml`, release workflow, homebrew-tap repo, first tagged release. Verify `brew install` on a clean machine. README with screenshots.

**M5 — follow-ups** (prioritize by usage feedback)
Cross-session FTS (Bleve or SQLite FTS5). SSE+fsnotify live-tail. Export session as Markdown/HTML. Per-session token-cost summary. Possibly Windows via a one-line goreleaser target.

---

## Critical files (to create)

- `/Users/duanzy/Code/gear/cc-inspector/cmd/cc-inspector/main.go` — flags, bootstrap, `--open`
- `/Users/duanzy/Code/gear/cc-inspector/internal/session/parse.go` — tolerant streaming JSONL parser
- `/Users/duanzy/Code/gear/cc-inspector/internal/session/subagents.go` — sidechain resolution
- `/Users/duanzy/Code/gear/cc-inspector/internal/session/images.go` — base64 strip + serve
- `/Users/duanzy/Code/gear/cc-inspector/internal/scanner/cache.go` — mtime-keyed meta cache
- `/Users/duanzy/Code/gear/cc-inspector/internal/api/router.go` — stdlib pattern-mux
- `/Users/duanzy/Code/gear/cc-inspector/web/src/components/conversation/MessageCard.tsx` — per-type renderer dispatch
- `/Users/duanzy/Code/gear/cc-inspector/web/src/components/conversation/ToolCall.tsx` — per-tool renderer dispatch
- `/Users/duanzy/Code/gear/cc-inspector/.goreleaser.yaml` — cross-compile + Homebrew tap
- `/Users/duanzy/Code/gear/cc-inspector/embed.go` — SPA embed + SPA fallback handler

---

## Risks & open questions

1. **Schema drift across Claude Code versions** — mitigated by tolerant parser + golden-file tests + version samples in `testdata/`. Unknown blocks render as a pill + "Report issue" link.
2. **Large sessions (1 MB+, 500+ messages)** — TanStack Virtual is non-negotiable. Scroll-to-anchor has a one-frame lag for offscreen items (acceptable).
3. **`tool_use_id` ↔ `tool_result` orphans** — pair by id; render orphans with interrupted marker.
4. **Sub-agent ↔ main-session linking** — verify in M1 that main-session `Task` `tool_use.id` matches sidechain file `agentId`. Fallback: match by timestamp window + tool name.
5. **Path-encoding collisions** — Claude Code's `-` encoding could theoretically collide. Use the JSONL's `cwd` field as source of truth for display; directory name is only a routing key.
6. **Partial final line during live write** — parser tolerates `io.ErrUnexpectedEOF` on the last line only.
7. **Port conflicts** — default `--port 0` (OS-assigned) dodges two-instance collisions. Print chosen URL prominently.
8. **MCP tool diversity** — don't try to per-server-special-case; generic JSON tree + `mcp__` badge.
9. **Symlinked `~/.claude`** — `os.ReadDir` handles; don't `EvalSymlinks` every file (slow).
10. **Windows** — out of scope v1 but use `filepath` (not `path`) everywhere so a community Scoop port stays possible.

---

## Verification

**M1 data layer**
- `curl -s localhost:PORT/api/projects | jq '. | length'` matches `ls ~/.claude/projects | wc -l`.
- Pick the session with the biggest file size: `curl -s .../sessions/<id> | jq '.messages | length'` equals `wc -l` of the JSONL minus any unparseable-trailing-line count.
- Session with sub-agents: response includes `subagentSummaries`; follow-up GET on `/subagents/<id>` returns non-empty transcript.
- Session with images: response has `image_ref` blocks; `/images/<uuid>/<idx>` serves a valid PNG/JPEG (check `file` on downloaded bytes).

**M2 UI**
- Open browser, click every project, confirm session list loads.
- Open a session — every message type renders (even if ugly). `j`/`k` navigates. Dark mode toggles.

**M3 polish**
- For 3 representative sessions, diff the UI against the raw JSONL: every substantive piece of content visible somewhere in the UI. No "missing content" regressions.
- Virtualized scroll stays smooth on the largest session on machine.
- ⌘K fuzzy-jumps to any project or session.

**M4 distribution**
- `git tag v0.1.0 && git push --tags` triggers release. GitHub release has 4 archives + checksums. Homebrew tap PR merged.
- Clean machine: `brew install <user>/tap/cc-inspector && cc-inspector` launches successfully.
- `cc-inspector --version` prints baked version/commit/date.

---

## Recommendation summary

Go stdlib backend + React/Vite/Tailwind/shadcn/TanStack frontend, `embed.FS` single binary, lazy three-layer indexing with mtime-keyed JSON cache, image/tool-result/sub-agent served as separate endpoints (never inlined), two-pane + inspector UI with dedicated per-tool renderers and virtualized conversation, goreleaser → Homebrew tap for distribution, ship unsigned, defer cross-session FTS and live-tail to M5.
