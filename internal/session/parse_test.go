package session

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseFileToleratesMalformedTrailingLine(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.jsonl")
	content := strings.Join([]string{
		`{"type":"user","uuid":"a"}`,
		`{"type":"assistant","uuid":"b"}`,
		`{"type":"user","uuid":"c"`, // truncated final line
	}, "\n")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	msgs, err := ParseFile(path)
	if err != nil {
		t.Fatalf("ParseFile: %v", err)
	}
	if got, want := len(msgs), 2; got != want {
		t.Fatalf("got %d messages, want %d", got, want)
	}
	if msgs[0].UUID != "a" || msgs[1].UUID != "b" {
		t.Errorf("unexpected UUIDs: %+v", msgs)
	}
}

func TestParseFileRejectsMalformedMiddleLine(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.jsonl")
	content := strings.Join([]string{
		`{"type":"user","uuid":"a"}`,
		`{"type":"assistant","uuid":"b",`, // malformed middle line
		`{"type":"user","uuid":"c"}`,
	}, "\n")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	msgs, err := ParseFile(path)
	if err != nil {
		t.Fatalf("ParseFile: %v", err)
	}
	// Middle malformed line should emit an "unknown" marker, not drop silently.
	if len(msgs) != 3 {
		t.Fatalf("got %d messages, want 3; %+v", len(msgs), msgs)
	}
	if msgs[1].Type != "unknown" {
		t.Errorf("middle message should be type=unknown, got %q", msgs[1].Type)
	}
}

func TestParseFileEmpty(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "empty.jsonl")
	if err := os.WriteFile(path, nil, 0o644); err != nil {
		t.Fatal(err)
	}
	msgs, err := ParseFile(path)
	if err != nil {
		t.Fatalf("ParseFile: %v", err)
	}
	if len(msgs) != 0 {
		t.Fatalf("expected 0 messages, got %d", len(msgs))
	}
}

func TestInnerMessageDecodesStringContent(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "str.jsonl")
	content := `{"type":"user","uuid":"a","message":{"role":"user","content":"hello"}}`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	msgs, err := ParseFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 1 || msgs[0].Message == nil {
		t.Fatalf("expected 1 message with inner: %+v", msgs)
	}
	blocks := msgs[0].Message.Content
	if len(blocks) != 1 || blocks[0].Type != "text" || blocks[0].Text != "hello" {
		t.Errorf("expected single text block 'hello', got %+v", blocks)
	}
}
