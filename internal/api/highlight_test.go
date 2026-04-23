package api

import "testing"

func TestFnv1a64KnownVectors(t *testing.T) {
	// Well-known FNV-1a 64 test vectors from http://www.isthe.com/chongo/src/fnv/test_fnv.c
	cases := []struct {
		in   string
		want string
	}{
		{"", "cbf29ce484222325"},
		{"a", "af63dc4c8601ec8c"},
		{"foobar", "85944171f73967e8"},
	}
	for _, c := range cases {
		got := fnv1a64(c.in)
		if got != c.want {
			t.Errorf("fnv1a64(%q) = %s, want %s", c.in, got, c.want)
		}
	}
}
