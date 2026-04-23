// Replaces web/src/lib/shiki.ts in the standalone build via a Vite alias.
// The Go export handler pre-renders every fenced code block with Chroma and
// embeds them keyed by FNV-1a(lang + "\0" + code). This module re-exposes the
// Shiki `codeToHtml(code, { lang })` surface that CodeBlock.tsx expects, and
// simply looks up the pre-rendered HTML; on miss it throws so CodeBlock falls
// back to its plain <pre> render path.
import { hashKey } from "./fnv";

type Highlighter = {
  codeToHtml: (code: string, opts: { lang: string; theme: string }) => string;
};

let cached: Highlighter | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!cached) {
    cached = {
      codeToHtml(code, { lang }) {
        const map = (window as any).__EXPORT__?.highlights as
          | Record<string, string>
          | undefined;
        const html = map?.[hashKey(lang, code)];
        if (!html) throw new Error("no pre-rendered highlight");
        return `<pre class="ch-container"><code>${html}</code></pre>`;
      },
    };
  }
  return Promise.resolve(cached);
}
