package api

import (
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/zhiyand/claude-reader/internal/scanner"
	"github.com/zhiyand/claude-reader/internal/session"
)

func handleListSessions(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		sessions, err := scanner.ListSessions(deps.Config.ProjectsDir, project, deps.Cache)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		_ = deps.Cache.Flush()
		writeJSON(w, http.StatusOK, sessions)
	})
}

func handleGetSession(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		sid := r.PathValue("session")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(sid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		path := filepath.Join(deps.Config.ProjectsDir, project, sid+".jsonl")
		if err := ensureUnderRoot(deps.Config.ProjectsDir, path); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		etag := fileETag(path)
		if etag != "" {
			w.Header().Set("ETag", etag)
			if ifNoneMatch(r, etag) {
				w.WriteHeader(http.StatusNotModified)
				return
			}
		}
		urlPrefix := fmt.Sprintf("/api/projects/%s/sessions/%s", project, sid)
		sess, err := session.Build(session.BuildOptions{
			ProjectsDir: deps.Config.ProjectsDir,
			ProjectDir:  project,
			SessionID:   sid,
			URLPrefix:   urlPrefix,
		})
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, sess)
	})
}

func handleGetSubagent(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		sid := r.PathValue("session")
		agent := r.PathValue("agent")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(sid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateToken(agent); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		urlPrefix := fmt.Sprintf("/api/projects/%s/sessions/%s", project, sid)
		msgs, summary, err := session.BuildSubagent(session.BuildOptions{
			ProjectsDir: deps.Config.ProjectsDir,
			ProjectDir:  project,
			SessionID:   sid,
			URLPrefix:   urlPrefix,
		}, agent)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"summary":  summary,
			"messages": msgs,
		})
	})
}
