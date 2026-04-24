package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/offbeatengineer/cc-inspector/internal/annotations"
	"github.com/offbeatengineer/cc-inspector/internal/session"
)

var messageUUIDRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func validateMessageUUID(id string) error {
	if !messageUUIDRe.MatchString(id) {
		return errors.New("invalid messageUuid")
	}
	return nil
}

func handleListAnnotations(deps Deps) http.Handler {
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
		anns, err := deps.Annotations.List(project, sid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"annotations": anns})
	})
}

func handleUpsertAnnotation(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		sid := r.PathValue("session")
		muid := r.PathValue("messageUuid")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(sid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateMessageUUID(muid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var body struct {
			Text string `json:"text"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, annotations.MaxTextBytes+1024)).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if strings.TrimSpace(body.Text) == "" {
			writeError(w, http.StatusBadRequest, "text is required")
			return
		}

		if err := checkMessageExists(deps, project, sid, muid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		ann, err := deps.Annotations.Upsert(project, sid, muid, body.Text)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, ann)
	})
}

func handleDeleteAnnotation(deps Deps) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := r.PathValue("project")
		sid := r.PathValue("session")
		muid := r.PathValue("messageUuid")
		if err := validateProject(project); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateSession(sid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateMessageUUID(muid); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := deps.Annotations.Delete(project, sid, muid); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// checkMessageExists rejects upserts for UUIDs that are not present in the
// session JSONL. This prevents the annotations file from growing dangling
// entries if a client sends a typo, and keeps the per-session file bounded
// by the actual message count.
func checkMessageExists(deps Deps, project, sid, muid string) error {
	path := filepath.Join(deps.Config.ProjectsDir, project, sid+".jsonl")
	if err := ensureUnderRoot(deps.Config.ProjectsDir, path); err != nil {
		return err
	}
	msgs, err := session.ParseFile(path)
	if err != nil {
		return err
	}
	for _, m := range msgs {
		if m.UUID == muid {
			return nil
		}
	}
	return errors.New("messageUuid not found in session")
}
