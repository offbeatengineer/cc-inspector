import { ListTodo, Check, Square, Loader2 } from "lucide-react";
import type { ToolPair } from "../groupMessages";
import { ToolShell } from "./ToolShell";
import { cn } from "../../../lib/cn";

interface Todo {
  content?: string;
  activeForm?: string;
  status?: "pending" | "in_progress" | "completed";
}

interface Input {
  todos?: Todo[];
}

export function TodoWriteTool({ pair }: { pair: ToolPair }) {
  const input = (pair.use.input ?? {}) as Input;
  const todos = input.todos ?? [];
  const done = todos.filter((t) => t.status === "completed").length;
  const active = todos.find((t) => t.status === "in_progress");
  return (
    <ToolShell
      pair={pair}
      icon={<ListTodo className="w-3.5 h-3.5" />}
      title={
        <span>
          {active?.activeForm ?? active?.content ?? `${todos.length} todos`}
        </span>
      }
      rightMeta={
        <span>
          {done}/{todos.length}
        </span>
      }
      body={
        <ul className="space-y-1">
          {todos.map((t, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2 text-[13px]",
                t.status === "completed" && "text-fg-subtle line-through"
              )}
            >
              <span className="mt-0.5 text-fg-subtle shrink-0">
                {t.status === "completed" ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : t.status === "in_progress" ? (
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin-slow" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </span>
              <span>
                {t.status === "in_progress" ? t.activeForm ?? t.content : t.content}
              </span>
            </li>
          ))}
        </ul>
      }
    />
  );
}
