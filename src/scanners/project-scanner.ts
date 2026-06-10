import { readFile } from "node:fs/promises";
import path from "node:path";
import { FRAMEWORK_KEYWORDS } from "../config/defaults.js";
import { parseCargoToml } from "../parsers/cargo-toml.js";
import { parseGoMod } from "../parsers/go-mod.js";
import { parsePackageJson } from "../parsers/package-json.js";
import { parsePyProject } from "../parsers/pyproject.js";
import type { AnalysisContext, AnalyzeOptions, ProjectMetadata } from "../types.js";
import { fileExists } from "../utils/file-tree.js";
import {
  findEntryPoints,
  inferInstallCommands,
  inferRunCommands,
} from "./entry-point-finder.js";
import { analyzeStructure } from "./structure-analyzer.js";
import { detectStack } from "./stack-detector.js";

async function parseMetadata(
  rootDir: string,
  stack: AnalysisContext["stack"],
): Promise<ProjectMetadata> {
  let metadata: ProjectMetadata | null = null;

  switch (stack) {
    case "node":
    case "typescript":
      metadata = await parsePackageJson(rootDir);
      break;
    case "python":
      metadata = await parsePyProject(rootDir);
      break;
    case "rust":
      metadata = await parseCargoToml(rootDir);
      break;
    case "go":
      metadata = await parseGoMod(rootDir);
      break;
    default:
      break;
  }

  if (!metadata) {
    metadata = {
      name: path.basename(rootDir),
      dependencies: [],
      devDependencies: [],
      scripts: [],
    };
  }

  return metadata;
}

function detectFrameworks(metadata: ProjectMetadata): string[] {
  const allDeps = [...metadata.dependencies, ...metadata.devDependencies];
  const frameworks = new Set<string>();

  for (const dep of allDeps) {
    const normalized = dep.toLowerCase();
    for (const [keyword, label] of Object.entries(FRAMEWORK_KEYWORDS)) {
      if (normalized.includes(keyword) || normalized === keyword) {
        frameworks.add(label);
      }
    }
  }

  return [...frameworks];
}

async function detectLicense(rootDir: string, metadata: ProjectMetadata) {
  const licenseFiles = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE"];
  for (const file of licenseFiles) {
    const filePath = path.join(rootDir, file);
    if (await fileExists(filePath)) {
      const text = await readFile(filePath, "utf-8");
      const firstLine = text.split("\n")[0]?.trim();
      return { hasLicenseFile: true, licenseText: metadata.license ?? firstLine };
    }
  }
  return {
    hasLicenseFile: false,
    licenseText: metadata.license,
  };
}

function inferDescription(
  metadata: ProjectMetadata,
  stack: AnalysisContext["stack"],
  languageStats: AnalysisContext["languageStats"],
): string {
  if (metadata.description) return metadata.description;

  const totalFiles = languageStats.reduce((sum, l) => sum + l.count, 0);
  const primaryLang = languageStats[0]?.label ?? "código";

  const stackLabels: Record<string, string> = {
    node: "Node.js",
    typescript: "TypeScript",
    python: "Python",
    rust: "Rust",
    go: "Go",
    java: "Java",
    generic: primaryLang,
  };

  const stackLabel = stackLabels[stack] ?? primaryLang;
  return `Proyecto ${stackLabel} con ${totalFiles} archivo(s) fuente.`;
}

export async function scanProject(
  rootDir: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisContext> {
  const resolvedDir = path.resolve(rootDir);
  const depth = options.depth ?? 3;

  const { stack } = await detectStack(resolvedDir);
  const metadata = await parseMetadata(resolvedDir, stack);
  const { fileTree, languageStats } = await analyzeStructure(resolvedDir, depth);
  const entryPoints = await findEntryPoints(resolvedDir, metadata, stack);
  const frameworks = detectFrameworks(metadata);
  const license = await detectLicense(resolvedDir, metadata);

  const description = inferDescription(metadata, stack, languageStats);
  metadata.description = description;

  return {
    rootDir: resolvedDir,
    projectName: metadata.name,
    stack,
    metadata,
    languageStats,
    fileTree,
    entryPoints,
    installCommands: inferInstallCommands(stack),
    runCommands: inferRunCommands(stack, metadata, entryPoints),
    frameworks,
    hasLicenseFile: license.hasLicenseFile,
    licenseText: license.licenseText,
  };
}
