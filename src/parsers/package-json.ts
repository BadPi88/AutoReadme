import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectMetadata, ProjectScript } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

interface PackageJson {
  name?: string;
  description?: string;
  version?: string;
  license?: string;
  main?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function parsePackageJson(rootDir: string): Promise<ProjectMetadata | null> {
  const filePath = path.join(rootDir, "package.json");
  if (!(await fileExists(filePath))) return null;

  const raw = await readFile(filePath, "utf-8");
  const pkg = JSON.parse(raw) as PackageJson;

  const scripts: ProjectScript[] = Object.entries(pkg.scripts ?? {}).map(([name, command]) => ({
    name,
    command,
  }));

  const topDeps = (deps?: Record<string, string>, limit = 10) =>
    Object.keys(deps ?? {}).slice(0, limit);

  return {
    name: pkg.name ?? path.basename(rootDir),
    description: pkg.description,
    version: pkg.version,
    license: pkg.license,
    main: pkg.main,
    bin: pkg.bin,
    dependencies: topDeps(pkg.dependencies),
    devDependencies: topDeps(pkg.devDependencies),
    scripts,
  };
}
