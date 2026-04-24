import { useEffect, useRef, useState } from "react";
import { getHighlighter } from "../../lib/shiki";
import { useUI } from "../../stores/ui";

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const theme = useUI((s) => s.theme);
  const ref = useRef<HTMLDivElement>(null);
  const dark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const hl = await getHighlighter();
        if (!alive) return;
        const out = hl.codeToHtml(code, {
          lang: normalizeLang(language),
          theme: dark ? "github-dark" : "github-light",
        });
        if (alive) setHtml(out);
      } catch {
        if (alive) setHtml(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, language, dark]);

  if (html) {
    return (
      <div
        ref={ref}
        className="shiki-wrap text-[12.5px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <pre className="bg-surface-2 rounded px-3 py-2 overflow-x-auto text-[12.5px] font-mono">
      <code>{code}</code>
    </pre>
  );
}

function normalizeLang(lang: string) {
  const map: Record<string, string> = {
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    yml: "yaml",
    ts: "typescript",
    js: "javascript",
    tsx: "tsx",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    kt: "kotlin",
  };
  return map[lang] ?? lang;
}
