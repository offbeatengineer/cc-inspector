package api

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/offbeatengineer/cc-inspector/internal/annotations"
	"github.com/offbeatengineer/cc-inspector/internal/session"
	"github.com/offbeatengineer/cc-inspector/internal/web"
)

const exportURLPrefix = "/export"

func handleExportSession(deps Deps) http.Handler {
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

		jsonlPath := filepath.Join(deps.Config.ProjectsDir, project, sid+".jsonl")
		if err := ensureUnderRoot(deps.Config.ProjectsDir, jsonlPath); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		jsonlBytes, err := os.ReadFile(jsonlPath)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}

		sess, err := session.Build(session.BuildOptions{
			ProjectsDir: deps.Config.ProjectsDir,
			ProjectDir:  project,
			SessionID:   sid,
			URLPrefix:   exportURLPrefix,
		})
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}

		// Inline images as data: URLs directly on the session so <img src>
		// works offline without the fetch shim.
		if err := inlineImagesInline(sess.Messages, jsonlPath); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// Collect every external tool-result referenced by the session.
		toolResults := map[string]string{}
		collectToolResults(sess.Messages, func(id string) {
			if _, ok := toolResults[id]; ok {
				return
			}
			data, err := session.ReadExternalToolResult(deps.Config.ProjectsDir, project, sid, id)
			if err != nil {
				return
			}
			toolResults[id] = string(data)
		})

		// Pre-build every subagent response so the exported page can expand
		// AgentTool cards without a network call.
		subagents := map[string]any{}
		for agentID := range sess.SubagentSummaries {
			msgs, summary, err := session.BuildSubagent(session.BuildOptions{
				ProjectsDir: deps.Config.ProjectsDir,
				ProjectDir:  project,
				SessionID:   sid,
				URLPrefix:   exportURLPrefix,
			}, agentID)
			if err != nil {
				continue
			}
			// Subagent messages may reference images from the sidechain JSONL.
			sidePath := filepath.Join(deps.Config.ProjectsDir, project, sid+"."+agentID+".jsonl")
			_ = inlineImagesInline(msgs, sidePath)
			collectToolResults(msgs, func(id string) {
				if _, ok := toolResults[id]; ok {
					return
				}
				if data, err := session.ReadExternalToolResult(deps.Config.ProjectsDir, project, sid, id); err == nil {
					toolResults[id] = string(data)
				}
			})
			subagents[agentID] = map[string]any{
				"summary":  summary,
				"messages": msgs,
			}
		}

		// Collect every fenced code block and pre-render it server-side with
		// Chroma so the exported HTML does not need Shiki (saves ~1.8 MB).
		codeBlocks := collectCodeBlocks(sess.Messages)
		for _, agent := range subagents {
			if m, ok := agent.(map[string]any); ok {
				if msgs, ok := m["messages"].([]session.Message); ok {
					for k, v := range collectCodeBlocks(msgs) {
						if _, exists := codeBlocks[k]; !exists {
							codeBlocks[k] = v
						}
					}
				}
			}
		}
		highlights := renderHighlights(codeBlocks)

		// Annotations default to included; clients opt out with ?annotations=false.
		includeAnnotations := r.URL.Query().Get("annotations") != "false"
		anns := map[string]annotations.Annotation{}
		if includeAnnotations && deps.Annotations != nil {
			loaded, err := deps.Annotations.List(project, sid)
			if err == nil {
				anns = loaded
			}
		}

		payload := map[string]any{
			"meta": map[string]string{
				"id":         sid,
				"projectDir": project,
			},
			"session":      sess,
			"jsonl":        string(jsonlBytes),
			"toolResults":  toolResults,
			"subagents":    subagents,
			"highlights":   highlights,
			"highlightCSS": highlightCSS(),
			"annotations":  anns,
		}
		payloadJSON, err := json.Marshal(payload)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		var gzBuf bytes.Buffer
		gz, _ := gzip.NewWriterLevel(&gzBuf, gzip.BestCompression)
		if _, err := gz.Write(payloadJSON); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if err := gz.Close(); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		encoded := []byte(base64.StdEncoding.EncodeToString(gzBuf.Bytes()))

		html := bytes.Replace(web.StandaloneHTML, []byte("__EXPORT_PAYLOAD__"), encoded, 1)

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.html"`, sid))
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(html)
	})
}

// inlineImagesInline rewrites every image block whose Ref URL was produced
// by the export prefix into a data: URL, decoding the base64 blob from the
// JSONL on disk. Safe to no-op on errors — the UI handles missing images.
func inlineImagesInline(msgs []session.Message, jsonlPath string) error {
	for i := range msgs {
		m := &msgs[i]
		if m.Message == nil {
			continue
		}
		for j := range m.Message.Content {
			b := &m.Message.Content[j]
			if b.Type != "image" || b.Ref == nil {
				continue
			}
			data, mediaType, err := session.DecodeImage(jsonlPath, m.UUID, strconv.Itoa(j))
			if err != nil {
				continue
			}
			if mediaType == "" {
				mediaType = b.Ref.MediaType
			}
			b.Ref.URL = "data:" + mediaType + ";base64," + base64.StdEncoding.EncodeToString(data)
			b.Ref.MediaType = mediaType
		}
	}
	return nil
}

func collectToolResults(msgs []session.Message, visit func(id string)) {
	for i := range msgs {
		m := &msgs[i]
		if m.Message == nil {
			continue
		}
		for j := range m.Message.Content {
			b := &m.Message.Content[j]
			if b.External != nil && b.External.ID != "" {
				visit(b.External.ID)
			}
		}
	}
}
