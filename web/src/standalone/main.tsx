import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { qk } from "../lib/api";
import "../styles/index.css";
import { StandaloneApp } from "./StandaloneApp";
import { installFetchShim } from "./fetchShim";
import type { ExportPayload } from "./types";

async function loadPayload(): Promise<ExportPayload> {
  const b64 = document.getElementById("export-payload")?.textContent ?? "";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text) as ExportPayload;
}

function injectHighlightCSS(css: string) {
  if (!css) return;
  const style = document.createElement("style");
  style.setAttribute("data-source", "chroma");
  style.textContent = css;
  document.head.appendChild(style);
}

(async () => {
  const payload = await loadPayload();
  (window as any).__EXPORT__ = payload;
  installFetchShim(payload);
  injectHighlightCSS(payload.highlightCSS);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
  queryClient.setQueryData(
    qk.session(payload.meta.projectDir, payload.meta.id),
    payload.session,
  );

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <StandaloneApp payload={payload} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
})().catch((e) => {
  const root = document.getElementById("root");
  if (root)
    root.innerHTML = `<pre style="padding:2rem;font-family:ui-monospace,monospace;color:#b91c1c">Export failed to load: ${String(e)}</pre>`;
});
