package api

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
)

// fileETag returns a quoted ETag derived from a file's mtime+size. Returns an
// empty string on stat failure.
func fileETag(path string) string {
	info, err := os.Stat(path)
	if err != nil {
		return ""
	}
	h := sha1.New()
	fmt.Fprintf(h, "%d-%d", info.ModTime().UnixNano(), info.Size())
	return `"` + hex.EncodeToString(h.Sum(nil))[:16] + `"`
}

// ifNoneMatch returns true if the client's If-None-Match matches our ETag.
func ifNoneMatch(r *http.Request, etag string) bool {
	if etag == "" {
		return false
	}
	return r.Header.Get("If-None-Match") == etag
}
