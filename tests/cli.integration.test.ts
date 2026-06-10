import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const cliPath = path.join(rootDir, "dist", "cli.js");
const nodeFixture = path.join(__dirname, "fixtures", "node-project");

const tempDirs: string[] = [];

async function runCli(args: string[], cwd?: string) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: cwd ?? rootDir,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return { stdout, stderr };
}

describe("CLI integration", () => {
  beforeAll(async () => {
    await access(cliPath);
  });

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("genera README con --dry-run", async () => {
    const { stdout } = await runCli(["--dry-run", nodeFixture]);
    expect(stdout).toContain("# demo-api");
    expect(stdout).toContain("npm install");
  });

  it("escribe README en directorio temporal", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "autoreadme-"));
    tempDirs.push(tmpDir);

    const pkg = {
      name: "temp-project",
      version: "0.0.1",
      description: "Proyecto temporal",
      scripts: { test: "echo ok" },
    };
    await writeFile(path.join(tmpDir, "package.json"), JSON.stringify(pkg, null, 2));
    await writeFile(path.join(tmpDir, "index.js"), "console.log('hi');");

    const { stdout } = await runCli(["--force", tmpDir]);
    expect(stdout).toContain("README generado");

    const readme = await readFile(path.join(tmpDir, "README.md"), "utf-8");
    expect(readme).toContain("# temp-project");
    expect(readme).toContain("Proyecto temporal");
  });

  it("crea backup al sobrescribir README existente", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "autoreadme-bak-"));
    tempDirs.push(tmpDir);

    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "bak-test", scripts: {} }),
    );
    await writeFile(path.join(tmpDir, "README.md"), "# Original\n");

    const { stderr } = await runCli([tmpDir]);
    expect(stderr).toContain("Backup creado");

    const backup = await readFile(path.join(tmpDir, "README.md.bak"), "utf-8");
    expect(backup).toBe("# Original\n");
  });
});
