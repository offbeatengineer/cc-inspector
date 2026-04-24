package api

import (
	"net/http"

	"github.com/offbeatengineer/cc-inspector/internal/annotations"
	"github.com/offbeatengineer/cc-inspector/internal/config"
	"github.com/offbeatengineer/cc-inspector/internal/scanner"
	"github.com/offbeatengineer/cc-inspector/internal/version"
)

// Deps holds dependencies injected into handlers.
type Deps struct {
	Config      *config.Config
	Cache       *scanner.MetaCache
	Annotations *annotations.Store
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
	mux.Handle("GET /api/projects/{project}/sessions/{session}/export", handleExportSession(deps))

	mux.Handle("GET /api/projects/{project}/sessions/{session}/annotations", handleListAnnotations(deps))
	mux.Handle("PUT /api/projects/{project}/sessions/{session}/annotations/{messageUuid}", handleUpsertAnnotation(deps))
	mux.Handle("DELETE /api/projects/{project}/sessions/{session}/annotations/{messageUuid}", handleDeleteAnnotation(deps))
}
