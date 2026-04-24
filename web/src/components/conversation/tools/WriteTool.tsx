import { lazy, Suspense } from "react";
import { FilePlus } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell } from "./ToolShell";
import { shortenPath } from "../../../lib/format";
import { useUI } from "../../../stores/ui";

const DiffViewer = lazy(() => import("react-diff-viewer-continued"));

interface Input {
  file_path?: string;
  content?: string;
}

export function WriteTool({ pair }: { pair: ToolPair; searchQuery: string }) {
  const input = (pair.use.input ?? {}) as Input;
  const path = input.file_path ?? "";
  const content = input.content ?? "";
  const theme = useUI((s) => s.theme);
  const dark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const lines = content ? content.split("\n").length : 0;
  return (
    <ToolShell
      pair={pair}
      icon={<FilePlus className="w-3.5 h-3.5" />}
      title={<span className="font-mono">{shortenPath(path, 60)}</span>}
      rightMeta={<span className="text-success">+{lines}</span>}
      body={
        <div className="rounded overflow-hidden text-[12px]">
          <Suspense
            fallback={
              <div className="p-2 text-fg-subtle text-xs">loading diff…</div>
            }
          >
            <DiffViewer
              oldValue=""
              newValue={content}
              splitView={false}
              useDarkTheme={dark}
              showDiffOnly={false}
              styles={{
                contentText: { fontFamily: "var(--font-mono)", fontSize: 12 },
                line: { padding: "0 6px" },
              }}
            />
          </Suspense>
        </div>
      }
    />
  );
}
