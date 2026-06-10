import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  MAX_ENTRY_POINT_FILES,
  MAX_LINES_PER_FILE,
  MAX_SAMPLE_BYTES,
} from "../config/defaults.js";
import type { AnalysisContext, CodeSampleContext } from "../types.js";
import { fileExists } from "../utils/file-tree.js";

function truncateText(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf-8") <= maxBytes) return text;
  return text.slice(0, maxBytes) + "\n... (truncado)";
}

async function readFileHead(filePath: string, maxLines: number): Promise<string | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return raw.split("\n").slice(0, maxLines).join("\n");
  } catch {
    return null;
  }
}

async function parseEnvExample(rootDir: string): Promise<string[]> {
  const envPath = path.join(rootDir, ".env.example");
  if (!(await fileExists(envPath))) return [];

  try {
    const raw = await readFile(envPath, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=")[0]?.trim())
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

function buildContextSummary(context: AnalysisContext): string {
  const summary = {
    projectName: context.projectName,
    stack: context.stack,
    frameworks: context.frameworks,
    languages: context.languageStats.map((l) => `${l.label}: ${l.count}`),
    dependencies: context.metadata.dependencies,
    devDependencies: context.metadata.devDependencies,
    scripts: context.metadata.scripts,
    entryPoints: context.entryPoints,
    installCommands: context.installCommands,
    runCommands: context.runCommands,
    fileTree: context.fileTree.split("\n").slice(0, 40).join("\n"),
  };
  return JSON.stringify(summary, null, 2);
}

export async function sampleCodeContext(context: AnalysisContext): Promise<CodeSampleContext> {
  const entryPointSnippets: Array<{ path: string; content: string }> = [];
  let totalBytes = 0;

  for (const ep of context.entryPoints.slice(0, MAX_ENTRY_POINT_FILES)) {
    const fullPath = path.join(context.rootDir, ep.path);
    const content = await readFileHead(fullPath, MAX_LINES_PER_FILE);
    if (!content) continue;

    const snippet = { path: ep.path, content };
    const snippetBytes = Buffer.byteLength(JSON.stringify(snippet), "utf-8");
    if (totalBytes + snippetBytes > MAX_SAMPLE_BYTES) break;

    entryPointSnippets.push(snippet);
    totalBytes += snippetBytes;
  }

  let existingReadme: string | undefined;
  const readmePath = path.join(context.rootDir, "README.md");
  if (await fileExists(readmePath)) {
    const raw = await readFile(readmePath, "utf-8");
    existingReadme = truncateText(raw, 2000);
  }

  const envVariables = await parseEnvExample(context.rootDir);

  return {
    entryPointSnippets,
    existingReadme,
    envVariables,
    contextSummary: buildContextSummary(context),
  };
}
