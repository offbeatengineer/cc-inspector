default:
    @just --list

# Run the server locally against the real ~/.claude directory.
run *args:
    go run ./cmd/claude-reader {{args}}

# Build a local dev binary.
build:
    go build -o bin/claude-reader ./cmd/claude-reader

# Static analysis.
vet:
    go vet ./...

# Tests.
test:
    go test ./...

# Tidy modules.
tidy:
    go mod tidy
