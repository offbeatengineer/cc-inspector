//go:build dev

package web

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// Handler in dev mode proxies all non-API requests to the Vite dev server at
// http://127.0.0.1:5173. Start Vite first (see `just dev-web`).
func Handler() (http.Handler, error) {
	target, err := url.Parse("http://127.0.0.1:5173")
	if err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		proxy.ServeHTTP(w, r)
	}), nil
}
