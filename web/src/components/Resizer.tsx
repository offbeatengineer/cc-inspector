import { useEffect, useRef } from "react";

interface Props {
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  className?: string;
  direction?: "horizontal" | "vertical";
  title?: string;
}

export function Resizer({
  onResize,
  onResizeEnd,
  className,
  direction = "horizontal",
  title = "Drag to resize",
}: Props) {
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    function move(e: MouseEvent) {
      if (startRef.current == null) return;
      const pos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = pos - startRef.current;
      startRef.current = pos;
      onResize(delta);
    }
    function up() {
      if (startRef.current == null) return;
      startRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEnd?.();
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [direction, onResize, onResizeEnd]);

  return (
    <div
      role="separator"
      title={title}
      className={
        "shrink-0 " +
        (direction === "horizontal"
          ? "w-px cursor-col-resize hover:bg-accent hover:w-0.5 transition-colors"
          : "h-px cursor-row-resize hover:bg-accent hover:h-0.5 transition-colors") +
        " bg-border " +
        (className ?? "")
      }
      onMouseDown={(e) => {
        startRef.current = direction === "horizontal" ? e.clientX : e.clientY;
        document.body.style.cursor =
          direction === "horizontal" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
      }}
    />
  );
}
