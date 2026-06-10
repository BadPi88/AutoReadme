import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import type { ProjectMetadata } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

interface CargoToml {
  package?: {
    name?: string;
    description?: string;
    version?: string;
    license?: string;
  };
  dependencies?: Record<string, unknown>;
  "dev-dependencies"?: Record<string, unknown>;
}

export async function parseCargoToml(rootDir: string): Promise<ProjectMetadata | null> {
  const filePath = path.join(rootDir, "Cargo.toml");
  if (!(await fileExists(filePath))) return null;

  const raw = await readFile(filePath, "utf-8");
  const data = parseToml(raw) as CargoToml;
  const pkg = data.package;

  return {
    name: pkg?.name ?? path.basename(rootDir),
    description: pkg?.description,
    version: pkg?.version,
    license: pkg?.license,
    dependencies: Object.keys(data.dependencies ?? {}).slice(0, 10),
    devDependencies: Object.keys(data["dev-dependencies"] ?? {}).slice(0, 10),
    scripts: [],
  };
}
