import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectStack } from "../src/scanners/stack-detector.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures");

describe("detectStack", () => {
  it("detecta proyecto Node.js", async () => {
    const result = await detectStack(path.join(fixtures, "node-project"));
    expect(result.stack).toBe("node");
    expect(result.manifests).toContain("package.json");
  });

  it("detecta proyecto Python", async () => {
    const result = await detectStack(path.join(fixtures, "python-project"));
    expect(result.stack).toBe("python");
    expect(result.manifests).toContain("pyproject.toml");
  });

  it("retorna generic para carpetas sin manifest", async () => {
    const result = await detectStack(__dirname);
    expect(result.stack).toBe("generic");
    expect(result.manifests).toHaveLength(0);
  });
});
