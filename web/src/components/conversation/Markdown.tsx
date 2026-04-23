import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import { highlightNodeTree, unhighlightNodeTree } from "./highlightSearch";

export const Markdown = memo(function Markdown({
  text,
  searchQuery,
  className,
}: {
  text: string;
  searchQuery?: string;
  className?: string;
}) {
  // react-markdown is expensive; memoize on (text).
  const rendered = useMemo(() => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children, ...rest }) => {
            // Extract language + code from the inner <code> child.
            const child: any = Array.isArray(children) ? children[0] : children;
            const cls: string = child?.props?.className ?? "";
            const match = /language-([\w-]+)/.exec(cls);
            const code = String(child?.props?.children ?? "").replace(/\n$/, "");
            if (match) {
              return <CodeBlock code={code} language={match[1]} />;
            }
            return <pre {...rest}>{children}</pre>;
          },
          a: ({ children, href, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  }, [text]);

  return (
    <div
      className={"prose-chat " + (className ?? "")}
      ref={(el) => {
        if (!el) return;
        if (searchQuery) highlightNodeTree(el, searchQuery);
        else unhighlightNodeTree(el);
      }}
    >
      {rendered}
    </div>
  );
});
