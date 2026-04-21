//go:build !dev

// Package web exposes the compiled SPA as an http.Handler.
// In release builds the assets are read from an embedded FS. In dev builds
// (build tag "dev") the handler proxies to the Vite dev server.
//
// Keep the embed directive pointed at ../../web/dist by copying the dist
// contents into this directory's "dist" at build time (see Justfile).
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

// Handler returns an http.Handler that serves the embedded SPA with
// index.html fallback for unknown paths.
func Handler() (http.Handler, error) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil, err
	}
	fileServer := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := path.Clean(r.URL.Path)
		rel := strings.TrimPrefix(clean, "/")
		if rel == "" || rel == "." {
			rel = "index.html"
		}
		if _, err := fs.Stat(sub, rel); err != nil {
			data, readErr := fs.ReadFile(sub, "index.html")
			if readErr != nil {
				http.Error(w, "SPA not built: run `just build-web`", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(data)
			return
		}
		if strings.HasPrefix(rel, "assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		fileServer.ServeHTTP(w, r)
	}), nil
}
