import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import type { ProjectMetadata } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

interface PyProjectToml {
  project?: {
    name?: string;
    description?: string;
    version?: string;
    license?: { text?: string } | string;
    dependencies?: string[];
  };
  tool?: {
    poetry?: {
      name?: string;
      description?: string;
      version?: string;
      license?: string;
      dependencies?: Record<string, string>;
      "dev-dependencies"?: Record<string, string>;
    };
  };
}

function parseRequirementName(dep: string): string {
  return dep.split(/[<>=!~;[]/)[0]?.trim() ?? dep;
}

async function parseRequirementsTxt(rootDir: string): Promise<string[]> {
  const filePath = path.join(rootDir, "requirements.txt");
  if (!(await fileExists(filePath))) return [];

  const raw = await readFile(filePath, "utf-8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map(parseRequirementName)
    .slice(0, 10);
}

export async function parsePyProject(rootDir: string): Promise<ProjectMetadata | null> {
  const tomlPath = path.join(rootDir, "pyproject.toml");
  const hasToml = await fileExists(tomlPath);
  const reqDeps = await parseRequirementsTxt(rootDir);

  if (!hasToml && reqDeps.length === 0) return null;

  let metadata: ProjectMetadata = {
    name: path.basename(rootDir),
    dependencies: reqDeps,
    devDependencies: [],
    scripts: [],
  };

  if (hasToml) {
    const raw = await readFile(tomlPath, "utf-8");
    const data = parseToml(raw) as PyProjectToml;
    const project = data.project ?? data.tool?.poetry;

    if (project) {
      const license =
        typeof project.license === "string"
          ? project.license
          : typeof project.license === "object"
            ? project.license?.text
            : undefined;

      const poetryDeps = data.tool?.poetry?.dependencies
        ? Object.keys(data.tool.poetry.dependencies).filter((k) => k !== "python")
        : [];

      const poetryDevDeps = data.tool?.poetry?.["dev-dependencies"]
        ? Object.keys(data.tool.poetry["dev-dependencies"])
        : [];

      const projectDeps = data.project?.dependencies?.map(parseRequirementName) ?? [];

      metadata = {
        name: project.name ?? metadata.name,
        description: project.description,
        version: project.version,
        license,
        dependencies: (projectDeps.length > 0 ? projectDeps : poetryDeps).slice(0, 10),
        devDependencies: poetryDevDeps.slice(0, 10),
        scripts: [],
      };
    }
  }

  return metadata;
}
