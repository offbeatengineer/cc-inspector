package annotations

import (
	"strings"
	"sync"
	"testing"
)

const (
	proj = "test-project"
	sess = "abcd1234-0000-0000-0000-000000000000"
)

func TestUpsertAndList(t *testing.T) {
	store := NewStore(t.TempDir())

	if got, err := store.List(proj, sess); err != nil || len(got) != 0 {
		t.Fatalf("empty list: got %v err %v", got, err)
	}

	a, err := store.Upsert(proj, sess, "msg-1", "hello")
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if a.Text != "hello" || a.MessageUUID != "msg-1" {
		t.Fatalf("unexpected annotation: %+v", a)
	}

	got, err := store.List(proj, sess)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(got) != 1 || got["msg-1"].Text != "hello" {
		t.Fatalf("unexpected list: %+v", got)
	}
}

func TestUpsertPreservesCreatedAt(t *testing.T) {
	store := NewStore(t.TempDir())

	first, err := store.Upsert(proj, sess, "msg-1", "v1")
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	second, err := store.Upsert(proj, sess, "msg-1", "v2")
	if err != nil {
		t.Fatalf("second upsert: %v", err)
	}
	if !second.CreatedAt.Equal(first.CreatedAt) {
		t.Fatalf("CreatedAt should be preserved: first=%v second=%v", first.CreatedAt, second.CreatedAt)
	}
	if !second.UpdatedAt.After(first.UpdatedAt) && !second.UpdatedAt.Equal(first.UpdatedAt) {
		// Allow equal on fast clocks, but never before.
		t.Fatalf("UpdatedAt went backwards: first=%v second=%v", first.UpdatedAt, second.UpdatedAt)
	}
	if second.Text != "v2" {
		t.Fatalf("text not updated: %q", second.Text)
	}
}

func TestDelete(t *testing.T) {
	store := NewStore(t.TempDir())
	if _, err := store.Upsert(proj, sess, "msg-1", "keep"); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if err := store.Delete(proj, sess, "msg-1"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := store.Delete(proj, sess, "missing"); err != nil {
		t.Fatalf("delete missing should be noop: %v", err)
	}
	got, _ := store.List(proj, sess)
	if len(got) != 0 {
		t.Fatalf("expected empty after delete: %+v", got)
	}
}

func TestUpsertValidation(t *testing.T) {
	store := NewStore(t.TempDir())
	if _, err := store.Upsert(proj, sess, "m", "   "); err == nil {
		t.Fatalf("expected error for empty text")
	}
	huge := strings.Repeat("x", MaxTextBytes+1)
	if _, err := store.Upsert(proj, sess, "m", huge); err == nil {
		t.Fatalf("expected error for oversize text")
	}
}

func TestConcurrentUpsert(t *testing.T) {
	store := NewStore(t.TempDir())
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		i := i
		go func() {
			defer wg.Done()
			if _, err := store.Upsert(proj, sess, "msg-"+string(rune('a'+i%5)), "note"); err != nil {
				t.Errorf("concurrent upsert: %v", err)
			}
		}()
	}
	wg.Wait()
	got, err := store.List(proj, sess)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(got) != 5 {
		t.Fatalf("expected 5 distinct annotations, got %d: %+v", len(got), got)
	}
}
