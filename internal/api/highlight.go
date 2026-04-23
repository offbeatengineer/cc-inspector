package api

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"sync"

	"github.com/alecthomas/chroma/v2"
	"github.com/alecthomas/chroma/v2/formatters/html"
	"github.com/alecthomas/chroma/v2/lexers"
	"github.com/alecthomas/chroma/v2/styles"

	"github.com/offbeatengineer/cc-inspector/internal/session"
)

// fencedCodeRE matches standard triple-backtick fenced blocks with an optional
// info string. It is deliberately permissive: whatever we extract here is only
// used as a lookup key on the client, so false positives waste a few bytes but
// never produce a wrong render.
var fencedCodeRE = regexp.MustCompile("(?s)```([A-Za-z0-9_+.#-]*)[^\\n]*\\n(.*?)\\n```")

// normalizeLang mirrors web/src/components/conversation/CodeBlock.tsx so hashes
// computed here match the ones computed in the browser.
func normalizeLang(lang string) string {
	switch lang {
	case "sh", "shell", "zsh":
		return "bash"
	case "yml":
		return "yaml"
	case "ts":
		return "typescript"
	case "js":
		return "javascript"
	case "py":
		return "python"
	case "rb":
		return "ruby"
	case "rs":
		return "rust"
	case "kt":
		return "kotlin"
	}
	return lang
}

// fnv1a64 keys highlighted snippets. Must match web/src/standalone/fnv.ts.
func fnv1a64(s string) string {
	var h uint64 = 14695981039346656037
	for i := 0; i < len(s); i++ {
		h ^= uint64(s[i])
		h *= 1099511628211
	}
	return fmt.Sprintf("%016x", h)
}

func hashKey(lang, code string) string {
	return fnv1a64(lang + "\x00" + code)
}

// collectCodeBlocks walks every message and extracts fenced code blocks from
// text, thinking, and string-valued tool_result content. Returns map of
// hash -> (lang, code) pairs, deduplicated.
func collectCodeBlocks(msgs []session.Message) map[string][2]string {
	out := map[string][2]string{}
	visit := func(lang, code string) {
		lang = normalizeLang(lang)
		h := hashKey(lang, code)
		if _, ok := out[h]; ok {
			return
		}
		out[h] = [2]string{lang, code}
	}
	extract := func(text string) {
		for _, m := range fencedCodeRE.FindAllStringSubmatch(text, -1) {
			visit(m[1], m[2])
		}
	}
	for i := range msgs {
		m := &msgs[i]
		if m.Message == nil {
			continue
		}
		for j := range m.Message.Content {
			b := &m.Message.Content[j]
			if b.Text != "" {
				extract(b.Text)
			}
			if b.Thinking != "" {
				extract(b.Thinking)
			}
			if len(b.ResultRaw) > 0 && b.ResultRaw[0] == '"' {
				var s string
				if err := json.Unmarshal(b.ResultRaw, &s); err == nil {
					extract(s)
				}
			}
		}
	}
	return out
}

// renderHighlights turns every collected (lang, code) pair into Chroma-
// classed HTML. Classes use the "ch-" prefix so they never clash with
// Tailwind utilities.
func renderHighlights(blocks map[string][2]string) map[string]string {
	formatter := html.New(html.WithClasses(true), html.ClassPrefix("ch-"), html.PreventSurroundingPre(true))
	style := styles.Get("github")
	if style == nil {
		style = styles.Fallback
	}
	out := make(map[string]string, len(blocks))
	for h, lc := range blocks {
		lang, code := lc[0], lc[1]
		lexer := lexers.Get(lang)
		if lexer == nil {
			lexer = lexers.Fallback
		}
		lexer = chroma.Coalesce(lexer)
		iter, err := lexer.Tokenise(nil, code)
		if err != nil {
			continue
		}
		var buf strings.Builder
		if err := formatter.Format(&buf, style, iter); err != nil {
			continue
		}
		out[h] = buf.String()
	}
	return out
}

var (
	highlightCSSOnce sync.Once
	highlightCSSVal  string
)

// highlightCSS returns a small stylesheet that colorizes the classes emitted
// by renderHighlights. Light theme is scoped to `.ch-container`, dark theme
// to `.dark .ch-container`, so it responds to the app's data-theme toggle.
func highlightCSS() string {
	highlightCSSOnce.Do(func() {
		formatter := html.New(html.WithClasses(true), html.ClassPrefix("ch-"))
		light := stylesOr("github", "github")
		dark := stylesOr("github-dark", "monokai")
		var b strings.Builder
		if s, err := cssForStyle(formatter, light); err == nil {
			b.WriteString(rewriteRootSelector(s, ".ch-container"))
		}
		if s, err := cssForStyle(formatter, dark); err == nil {
			b.WriteString(rewriteRootSelector(s, ".dark .ch-container"))
		}
		// Container frame — match Shiki's default visual (padding, rounded corners).
		b.WriteString(".ch-container{display:block;padding:.5rem .75rem;border-radius:.375rem;overflow-x:auto;background:#f6f8fa;}\n")
		b.WriteString(".dark .ch-container{background:#24292e;}\n")
		highlightCSSVal = b.String()
	})
	return highlightCSSVal
}

func stylesOr(name, fallback string) *chroma.Style {
	if s := styles.Get(name); s != nil {
		return s
	}
	if s := styles.Get(fallback); s != nil {
		return s
	}
	return styles.Fallback
}

func cssForStyle(f *html.Formatter, s *chroma.Style) (string, error) {
	var buf strings.Builder
	if err := f.WriteCSS(&buf, s); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// rewriteRootSelector turns Chroma's default wrapper class into our own
// `.ch-container` (or `.dark .ch-container`) scope. Because we set
// ClassPrefix("ch-") the actual class Chroma writes is `.ch-chroma`, not
// `.chroma`. We also drop its auto-generated background rules — the container
// CSS handles that.
func rewriteRootSelector(css, root string) string {
	css = strings.ReplaceAll(css, ".ch-chroma ", root+" ")
	css = strings.ReplaceAll(css, ".ch-chroma{", root+"{")
	// Drop the standalone `.ch-bg { background-color: ... }` rule Chroma emits.
	css = bgRuleRE.ReplaceAllString(css, "")
	return css
}

var bgRuleRE = regexp.MustCompile(`/\* Background \*/ \.ch-bg\s*\{[^}]*\}\n?`)
