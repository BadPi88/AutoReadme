import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

describe("launch-desktop paths", () => {
  it("desktop main.js existe tras build", async () => {
    const mainPath = path.join(rootDir, "dist", "desktop", "main.js");
    const { access } = await import("node:fs/promises");
    await expect(access(mainPath)).resolves.toBeUndefined();
  });

  it("preload.cjs existe tras build", async () => {
    const preloadPath = path.join(rootDir, "dist", "desktop", "preload.cjs");
    const { access } = await import("node:fs/promises");
    await expect(access(preloadPath)).resolves.toBeUndefined();
  });

  it("renderer index.html existe tras build", async () => {
    const htmlPath = path.join(rootDir, "dist", "desktop", "renderer", "index.html");
    const { access } = await import("node:fs/promises");
    await expect(access(htmlPath)).resolves.toBeUndefined();
  });
});
