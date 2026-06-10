import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { main: "desktop/main.ts" },
    outDir: "dist/desktop",
    format: ["esm"],
    platform: "node",
    target: "node18",
    sourcemap: true,
    clean: true,
    external: ["electron"],
    bundle: true,
    splitting: false,
  },
  {
    entry: { preload: "desktop/preload.ts" },
    outDir: "dist/desktop",
    format: ["cjs"],
    platform: "node",
    target: "node18",
    sourcemap: true,
    clean: false,
    external: ["electron"],
    bundle: true,
    outExtension: () => ({ js: ".cjs" }),
  },
]);
