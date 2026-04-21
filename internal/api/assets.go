package api

import (
	"net/http"
	"path/filepath"

	"github.com/offbeatengineer/cc-inspector/internal/session"
)

func handleToolResult(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		sid := r.PathValue("session")
		file := r.PathValue("file")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(sid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateToken(file); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		data, err := session.ReadExternalToolResult(deps.Config.ProjectsDir, project, sid, file)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write(data)
	})
}

func handleImage(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		sid := r.PathValue("session")
		uuid := r.PathValue("uuid")
		index := r.PathValue("index")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(sid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(uuid); err != nil {
			writeError(w, http.StatusBadRequest, "invalid message uuid")
			return
		}
		if err := validateToken(index); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		path := filepath.Join(deps.Config.ProjectsDir, project, sid+".jsonl")
		if err := ensureUnderRoot(deps.Config.ProjectsDir, path); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		data, mediaType, err := session.DecodeImage(path, uuid, index)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		w.Header().Set("Content-Type", mediaType)
		w.Header().Set("Cache-Control", "private, max-age=3600")
		_, _ = w.Write(data)
	})
}
