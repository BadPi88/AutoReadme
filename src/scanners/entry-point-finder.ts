import path from "node:path";
import type { EntryPoint, ProjectMetadata, ProjectStack } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

const COMMON_ENTRY_POINTS = [
  "src/index.ts",
  "src/index.tsx",
  "src/main.ts",
  "src/main.tsx",
  "src/app.ts",
  "src/server.ts",
  "index.ts",
  "index.js",
  "main.ts",
  "main.js",
  "app.ts",
  "app.js",
  "src/main.py",
  "main.py",
  "app.py",
  "src/main.rs",
  "src/lib.rs",
  "main.go",
  "cmd/main.go",
];

export async function findEntryPoints(
  rootDir: string,
  metadata: ProjectMetadata,
  stack: ProjectStack,
): Promise<EntryPoint[]> {
  const entryPoints: EntryPoint[] = [];

  if (metadata.main) {
    const mainPath = metadata.main;
    if (await fileExists(path.join(rootDir, mainPath))) {
      entryPoints.push({ path: mainPath, label: "main" });
    }
  }

  if (metadata.bin) {
    if (typeof metadata.bin === "string") {
      if (await fileExists(path.join(rootDir, metadata.bin))) {
        entryPoints.push({ path: metadata.bin, label: "bin" });
      }
    } else {
      for (const [name, binPath] of Object.entries(metadata.bin)) {
        if (await fileExists(path.join(rootDir, binPath))) {
          entryPoints.push({ path: binPath, label: name });
        }
      }
    }
  }

  for (const candidate of COMMON_ENTRY_POINTS) {
    if (entryPoints.some((e) => e.path === candidate)) continue;
    if (await fileExists(path.join(rootDir, candidate))) {
      entryPoints.push({ path: candidate, label: path.basename(candidate) });
    }
  }

  if (stack === "rust" && (await fileExists(path.join(rootDir, "src/main.rs")))) {
    if (!entryPoints.some((e) => e.path === "src/main.rs")) {
      entryPoints.push({ path: "src/main.rs", label: "binary" });
    }
  }

  if (stack === "go") {
    const cmdDir = path.join(rootDir, "cmd");
    try {
      const { readdir } = await import("node:fs/promises");
      const entries = await readdir(cmdDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const mainGo = path.join("cmd", entry.name, "main.go");
          if (await fileExists(path.join(rootDir, mainGo))) {
            entryPoints.push({ path: mainGo, label: entry.name });
          }
        }
      }
    } catch {
      // cmd/ may not exist
    }
  }

  return entryPoints.slice(0, 5);
}

export function inferInstallCommands(stack: ProjectStack): string[] {
  switch (stack) {
    case "node":
    case "typescript":
      return ["npm install"];
    case "python":
      return ["pip install -e .", "# o: pip install -r requirements.txt"];
    case "rust":
      return ["cargo build"];
    case "go":
      return ["go mod download", "go build ./..."];
    case "java":
      return ["./mvnw install", "# o: ./gradlew build"];
    default:
      return [];
  }
}

export function inferRunCommands(
  stack: ProjectStack,
  metadata: ProjectMetadata,
  entryPoints: EntryPoint[],
): string[] {
  const commands: string[] = [];

  if (metadata.scripts.length > 0) {
    const startScript = metadata.scripts.find((s) =>
      ["start", "dev", "serve"].includes(s.name),
    );
    if (startScript) {
      commands.push(`npm run ${startScript.name}`);
    }
  }

  if (commands.length === 0 && entryPoints.length > 0) {
    const ep = entryPoints[0];
    switch (stack) {
      case "node":
      case "typescript":
        commands.push(`node ${ep.path.replace(/\.tsx?$/, ".js")}`);
        break;
      case "python":
        commands.push(`python ${ep.path}`);
        break;
      case "rust":
        commands.push("cargo run");
        break;
      case "go":
        commands.push(`go run ${ep.path}`);
        break;
    }
  }

  if (stack === "python" && commands.length === 0) {
    commands.push("python main.py");
  }

  return commands;
}
