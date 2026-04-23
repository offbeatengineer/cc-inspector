import type { ExportPayload } from "./types";

// Intercepts fetch() so `api.fetchToolResult` and `api.getSubagent` resolve
// from the embedded payload instead of hitting the network. Images are
// pre-rewritten to data: URLs server-side so <img src> already works offline.
export function installFetchShim(payload: ExportPayload) {
  const originalFetch = window.fetch.bind(window);
  const textRes = (body: string, ct: string) =>
    new Response(body, {
      status: 200,
      headers: { "Content-Type": ct },
    });
  const notFound = (url: string) =>
    new Response(`Not found in export: ${url}`, { status: 404 });

  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const toolResult = url.match(/\/tool-results\/([^/?#]+)/);
    if (toolResult) {
      const id = decodeURIComponent(toolResult[1]);
      const body = payload.toolResults[id];
      return body != null ? textRes(body, "text/plain") : notFound(url);
    }

    const subagent = url.match(/\/subagents\/([^/?#]+)/);
    if (subagent) {
      const id = decodeURIComponent(subagent[1]);
      const data = payload.subagents[id];
      return data != null
        ? textRes(JSON.stringify(data), "application/json")
        : notFound(url);
    }

    return originalFetch(input as RequestInfo, init);
  };
}
