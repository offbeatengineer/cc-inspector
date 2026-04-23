import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

const shikiMockPath = path.resolve(__dirname, "./src/standalone/shikiMock.ts");

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Redirect CodeBlock's `import { getHighlighter } from "../../lib/shiki"`
      // to a tiny lookup-based mock so Shiki (and its ~1.8 MB of grammars +
      // Oniguruma WASM) drop out of the standalone bundle entirely. Anchored
      // to the exact import specifier used by CodeBlock.tsx.
      { find: /^\.\.\/\.\.\/lib\/shiki$/, replacement: shikiMockPath },
    ],
  },
  build: {
    outDir: "dist-standalone",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "standalone.html"),
    },
  },
});
