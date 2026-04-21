// Lazy-load Shiki's core highlighter and only the grammars we need so the
// main bundle stays lean. Each grammar arrives as its own chunk.
import type { HighlighterCore } from "shiki/core";

let promise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  if (promise) return promise;
  promise = (async () => {
    const [{ createHighlighterCore }, { createOnigurumaEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/oniguruma"),
    ]);
    const hl = await createHighlighterCore({
      themes: [
        import("@shikijs/themes/github-light"),
        import("@shikijs/themes/github-dark"),
      ],
      langs: [
        import("@shikijs/langs/bash"),
        import("@shikijs/langs/diff"),
        import("@shikijs/langs/go"),
        import("@shikijs/langs/javascript"),
        import("@shikijs/langs/json"),
        import("@shikijs/langs/jsx"),
        import("@shikijs/langs/markdown"),
        import("@shikijs/langs/python"),
        import("@shikijs/langs/rust"),
        import("@shikijs/langs/sql"),
        import("@shikijs/langs/toml"),
        import("@shikijs/langs/tsx"),
        import("@shikijs/langs/typescript"),
        import("@shikijs/langs/yaml"),
        import("@shikijs/langs/html"),
        import("@shikijs/langs/css"),
      ],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });
    return hl;
  })();
  return promise;
}
