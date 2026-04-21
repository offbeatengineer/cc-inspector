package api

import (
	"net/http"

	"github.com/zhiyand/claude-reader/internal/scanner"
)

func handleListProjects(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		projects, err := scanner.ListProjects(deps.Config.ProjectsDir)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, projects)
	})
}
