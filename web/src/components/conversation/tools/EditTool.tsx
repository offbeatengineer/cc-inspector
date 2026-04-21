import { lazy, Suspense } from "react";
import { Pencil } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell, ResultText, resultText } from "./ToolShell";
import { shortenPath } from "../../../lib/format";
import { useUI } from "../../../stores/ui";

const DiffViewer = lazy(() => import("react-diff-viewer-continued"));

interface Input {
  file_path?: string;
  old_string?: string;
  new_string?: string;
  replace_all?: boolean;
}

export function EditTool({ pair }: { pair: ToolPair; searchQuery: string }) {
  const input = (pair.use.input ?? {}) as Input;
  const path = input.file_path ?? "";
  const oldText = input.old_string ?? "";
  const newText = input.new_string ?? "";
  const theme = useUI((s) => s.theme);
  const dark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const delta = lineDelta(oldText, newText);
  return (
    <ToolShell
      pair={pair}
      icon={<Pencil className="w-3.5 h-3.5" />}
      title={<span className="font-mono">{shortenPath(path, 60)}</span>}
      rightMeta={
        <span className="tabular-nums">
          <span className="text-success">+{delta.added}</span>{" "}
          <span className="text-error">−{delta.removed}</span>
          {input.replace_all && <span> · all</span>}
        </span>
      }
      body={
        <>
          <div className="text-[11px] text-fg-subtle font-mono break-all">
            {path}
          </div>
          <div className="rounded border border-border overflow-hidden text-[12px]">
            <Suspense
              fallback={
                <div className="p-2 text-fg-subtle text-xs">loading diff…</div>
              }
            >
              <DiffViewer
                oldValue={oldText}
                newValue={newText}
                splitView={false}
                useDarkTheme={dark}
                hideLineNumbers={false}
                showDiffOnly
                extraLinesSurroundingDiff={2}
                styles={{
                  contentText: { fontFamily: "var(--font-mono)", fontSize: 12 },
                  line: { padding: "0 6px" },
                }}
              />
            </Suspense>
          </div>
          {pair.result?.content != null && !pair.result.external && (
            <details>
              <summary className="text-[11px] text-fg-subtle cursor-pointer">
                result
              </summary>
              <ResultText text={resultText(pair.result.content)} />
            </details>
          )}
        </>
      }
    />
  );
}

function lineDelta(oldText: string, newText: string) {
  const a = oldText ? oldText.split("\n").length : 0;
  const b = newText ? newText.split("\n").length : 0;
  const added = Math.max(0, b - 0);
  const removed = Math.max(0, a - 0);
  return { added, removed };
}
