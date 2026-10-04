import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Relative base so the build can be served from any path.
// `--mode hosted` (scripts/build-hosted.mjs) swaps the bundled fonts for
// Google Fonts, for the single-file hosted build.
export default defineConfig(({ mode }) => ({
  base: "./",
  resolve: {
    alias:
      mode === "hosted"
        ? [{ find: /^\.\/fonts\.js$/, replacement: fileURLToPath(new URL("./src/fonts.hosted.js", import.meta.url)) }]
        : [],
  },
  build: mode === "hosted" ? { outDir: "dist-hosted/.vite", emptyOutDir: true } : {},
}));
