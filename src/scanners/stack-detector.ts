import path from "node:path";
import type { ProjectStack } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

export interface StackDetectionResult {
  stack: ProjectStack;
  manifests: string[];
}

export async function detectStack(rootDir: string): Promise<StackDetectionResult> {
  const checks: Array<{ files: string[]; stack: ProjectStack }> = [
    { files: ["package.json"], stack: "node" },
    { files: ["pyproject.toml", "requirements.txt", "setup.py"], stack: "python" },
    { files: ["Cargo.toml"], stack: "rust" },
    { files: ["go.mod"], stack: "go" },
    { files: ["pom.xml", "build.gradle", "build.gradle.kts"], stack: "java" },
  ];

  for (const check of checks) {
    const found: string[] = [];
    for (const file of check.files) {
      if (await fileExists(path.join(rootDir, file))) {
        found.push(file);
      }
    }
    if (found.length > 0) {
      let stack = check.stack;
      if (stack === "node" && (await fileExists(path.join(rootDir, "tsconfig.json")))) {
        stack = "typescript";
      }
      return { stack, manifests: found };
    }
  }

  return { stack: "generic", manifests: [] };
}
