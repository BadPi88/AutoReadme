import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectMetadata } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

export async function parseGoMod(rootDir: string): Promise<ProjectMetadata | null> {
  const filePath = path.join(rootDir, "go.mod");
  if (!(await fileExists(filePath))) return null;

  const raw = await readFile(filePath, "utf-8");
  const moduleMatch = raw.match(/^module\s+(\S+)/m);
  const goVersionMatch = raw.match(/^go\s+(\S+)/m);

  const requireBlock = raw.match(/require\s*\(([\s\S]*?)\)/);
  const dependencies: string[] = [];

  if (requireBlock) {
    const lines = requireBlock[1].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) continue;
      const mod = trimmed.split(/\s+/)[0];
      if (mod) dependencies.push(mod);
    }
  } else {
    const singleRequires = raw.matchAll(/^require\s+(\S+)/gm);
    for (const match of singleRequires) {
      if (match[1]) dependencies.push(match[1]);
    }
  }

  return {
    name: moduleMatch?.[1]?.split("/").pop() ?? path.basename(rootDir),
    description: goVersionMatch ? `Go module (go ${goVersionMatch[1]})` : "Go module",
    version: undefined,
    license: undefined,
    dependencies: dependencies.slice(0, 10),
    devDependencies: [],
    scripts: [],
  };
}
