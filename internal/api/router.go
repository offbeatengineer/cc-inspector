package api

import (
	"net/http"

	"github.com/zhiyand/claude-reader/internal/config"
	"github.com/zhiyand/claude-reader/internal/scanner"
	"github.com/zhiyand/claude-reader/internal/version"
)

// Deps holds dependencies injected into handlers.
type Deps struct {
	Config *config.Config
	Cache  *scanner.MetaCache
}

// Register wires API handlers onto the given mux.
func Register(mux *http.ServeMux, deps Deps) {
	mux.Handle("GET /api/healthz", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}))
	mux.Handle("GET /api/version", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, version.Info())
	}))

	mux.Handle("GET /api/projects", handleListProjects(deps))
	mux.Handle("GET /api/projects/{project}/sessions", handleListSessions(deps))
	mux.Handle("GET /api/projects/{project}/sessions/{session}", handleGetSession(deps))
	mux.Handle("GET /api/projects/{project}/sessions/{session}/subagents/{agent}", handleGetSubagent(deps))
	mux.Handle("GET /api/projects/{project}/sessions/{session}/tool-results/{file}", handleToolResult(deps))
	mux.Handle("GET /api/projects/{project}/sessions/{session}/images/{uuid}/{index}", handleImage(deps))
}
