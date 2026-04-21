package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"syscall"

	"github.com/offbeatengineer/cc-inspector/internal/config"
	"github.com/offbeatengineer/cc-inspector/internal/server"
	"github.com/offbeatengineer/cc-inspector/internal/version"
	"github.com/offbeatengineer/cc-inspector/internal/web"
)

func main() {
	host := flag.String("host", "127.0.0.1", "host to bind to (use 0.0.0.0 only if you know what you're doing)")
	port := flag.Int("port", 0, "port to listen on (0 = OS-assigned)")
	open := flag.Bool("open", true, "open browser when server starts")
	claudeDir := flag.String("claude-dir", "", "override ~/.claude location (default: $CLAUDE_CONFIG_DIR or ~/.claude)")
	showVer := flag.Bool("version", false, "print version and exit")
	flag.Parse()

	if *showVer {
		info := version.Info()
		fmt.Printf("cc-inspector %s (commit %s, built %s)\n", info.Version, info.Commit, info.Date)
		return
	}

	cfg, err := config.Resolve(*claudeDir)
	if errors.Is(err, config.ErrNoProjects) {
		fmt.Fprintf(os.Stderr,
			"cc-inspector: no Claude Code sessions found at %s\n"+
				"If Claude Code stores data elsewhere, pass --claude-dir /path/to/.claude\n",
			cfg.ProjectsDir)
		os.Exit(0)
	}
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if !isLoopback(*host) {
		log.Printf("warning: binding to non-loopback host %q — sessions may be reachable on the local network", *host)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	onListen := func(addr string) {
		url := fmt.Sprintf("http://%s", addr)
		fmt.Printf("cc-inspector listening on %s\n", url)
		if *open {
			go openBrowser(url)
		}
	}

	static, err := web.Handler()
	if err != nil {
		log.Fatalf("static: %v", err)
	}

	if err := server.Run(ctx, server.Options{
		Host:     *host,
		Port:     *port,
		Config:   cfg,
		Static:   static,
		OnListen: onListen,
	}); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func isLoopback(host string) bool {
	h := strings.ToLower(host)
	return h == "127.0.0.1" || h == "localhost" || h == "::1" || h == ""
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	default:
		return
	}
	_ = cmd.Start()
}
