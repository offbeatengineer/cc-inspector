package server

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/zhiyand/claude-reader/internal/api"
	"github.com/zhiyand/claude-reader/internal/config"
	"github.com/zhiyand/claude-reader/internal/scanner"
)

type Options struct {
	Host     string
	Port     int
	Config   *config.Config
	Static   http.Handler // SPA assets handler; required
	OnListen func(addr string)
}

// Run starts the HTTP server and blocks until ctx is canceled.
func Run(ctx context.Context, opts Options) error {
	cache, err := scanner.OpenMetaCache(opts.Config.CacheDir)
	if err != nil {
		return fmt.Errorf("open meta cache: %w", err)
	}
	defer cache.Flush()

	mux := http.NewServeMux()
	api.Register(mux, api.Deps{Config: opts.Config, Cache: cache})

	if opts.Static != nil {
		mux.Handle("/", opts.Static)
	} else {
		mux.Handle("/", http.HandlerFunc(placeholderIndex))
	}

	addr := net.JoinHostPort(opts.Host, fmt.Sprintf("%d", opts.Port))
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen on %s: %w", addr, err)
	}
	realAddr := ln.Addr().String()
	if opts.OnListen != nil {
		opts.OnListen(realAddr)
	}

	srv := &http.Server{
		Handler:           loggingMiddleware(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
		return nil
	case err := <-errCh:
		return err
	}
}

func loggingMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lw := &statusRecorder{ResponseWriter: w, status: 200}
		h.ServeHTTP(lw, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, lw.status, time.Since(start).Truncate(time.Millisecond))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func placeholderIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprint(w, placeholderHTML)
}

const placeholderHTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>claude-reader</title>
    <style>
      body { font-family: ui-sans-serif, system-ui; max-width: 640px; margin: 5rem auto; padding: 0 1rem; line-height: 1.5; color: #1f2937; }
      code { background: #f3f4f6; padding: 0.1em 0.4em; border-radius: 4px; }
      ul { padding-left: 1.4em; }
    </style>
  </head>
  <body>
    <h1>claude-reader</h1>
    <p>The API is running. The web UI will be embedded here at M2.</p>
    <p>Try the API directly:</p>
    <ul>
      <li><a href="/api/projects"><code>/api/projects</code></a></li>
      <li><code>/api/projects/&lt;encoded&gt;/sessions</code></li>
      <li><code>/api/projects/&lt;encoded&gt;/sessions/&lt;id&gt;</code></li>
      <li><a href="/api/healthz"><code>/api/healthz</code></a> · <a href="/api/version"><code>/api/version</code></a></li>
    </ul>
  </body>
</html>`
