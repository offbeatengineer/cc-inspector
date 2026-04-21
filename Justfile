default:
    @just --list

# Run the production-style binary (serves embedded SPA) against the real ~/.claude.
run *args:
    go run ./cmd/cc-inspector {{args}}

# Dev loop: Vite HMR + Go server with the `dev` build tag (proxies to :5173).
# Run `just dev-web` in one pane and `just dev-go` in another.
dev:
    @echo "Run 'just dev-web' and 'just dev-go' in separate panes."

# Vite dev server (HMR). Proxies /api → :8787.
dev-web:
    cd web && npm install && npm run dev

# Go server in dev mode (proxies non-/api to Vite on :5173).
dev-go *args:
    go run -tags dev ./cmd/cc-inspector --port 8787 --open=false {{args}}

# Install web deps (idempotent).
web-install:
    cd web && npm install

# Compile the web SPA and copy it into internal/web/dist for embedding.
build-web:
    cd web && npm install && npm run build
    rm -rf internal/web/dist
    mkdir -p internal/web/dist
    cp -r web/dist/* internal/web/dist/

# Build the single-binary release binary.
build: build-web
    go build -o bin/cc-inspector ./cmd/cc-inspector

# Static analysis.
vet:
    go vet ./...

# Tests.
test:
    go test ./...

# Tidy modules.
tidy:
    go mod tidy

# Clean build outputs.
clean:
    rm -rf bin web/dist web/node_modules internal/web/dist/*
    mkdir -p internal/web/dist
    echo '<!doctype html><html><body><p>Run <code>just build-web</code>.</p></body></html>' > internal/web/dist/index.html
