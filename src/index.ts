import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { enhanceReadme } from "./ai/enhance-readme.js";
import { DEFAULT_DEPTH, DEFAULT_LANG, DEFAULT_OUTPUT } from "./config/defaults.js";
import { generateReadme } from "./generators/readme-generator.js";
import { scanProject } from "./scanners/project-scanner.js";
import type {
  AnalysisContext,
  AnalyzeOptions,
  WriteOptions,
  WriteResult,
} from "./types.js";
import { fileExists } from "./utils/file-tree.js";

export type {
  AnalysisContext,
  AnalyzeOptions,
  GenerateOptions,
  WriteOptions,
  WriteResult,
  OutputLanguage,
  ProjectStack,
  AiEnhancement,
  AiOptions,
} from "./types.js";

export { generateReadme } from "./generators/readme-generator.js";
export { scanProject } from "./scanners/project-scanner.js";
export { enhanceReadme } from "./ai/enhance-readme.js";

export async function analyzeProject(
  dir: string,
  options?: AnalyzeOptions,
): Promise<AnalysisContext> {
  return scanProject(dir, {
    depth: options?.depth ?? DEFAULT_DEPTH,
    includeTree: options?.includeTree ?? true,
  });
}

export async function buildReadmeContent(
  context: AnalysisContext,
  options: WriteOptions = {},
): Promise<{ content: string; aiUsed: boolean; aiWarning?: string }> {
  const lang = options.lang ?? DEFAULT_LANG;
  let enhancement = options.enhancement ?? null;
  let aiUsed = false;
  let aiWarning: string | undefined;

  if (options.ai?.enabled && !enhancement) {
    const result = await enhanceReadme(context, lang, options.ai);
    enhancement = result.enhancement;
    aiWarning = result.warning;
    aiUsed = Boolean(enhancement);
  }

  const content = generateReadme(context, {
    lang,
    includeTree: options.includeTree ?? true,
    includeScripts: options.includeScripts ?? true,
    includeFooter: options.includeFooter ?? true,
    enhancement,
  });

  return { content, aiUsed, aiWarning };
}

export async function writeReadme(dir: string, options: WriteOptions = {}): Promise<WriteResult> {
  const rootDir = path.resolve(dir);
  const outputFile = options.output ?? DEFAULT_OUTPUT;
  const outputPath = path.isAbsolute(outputFile)
    ? outputFile
    : path.join(rootDir, outputFile);

  const context = await analyzeProject(rootDir, {
    depth: options.depth ?? DEFAULT_DEPTH,
    includeTree: options.includeTree ?? true,
  });

  const { content, aiUsed, aiWarning } = await buildReadmeContent(context, options);

  let backedUp = false;

  if (!options.dryRun && (await fileExists(outputPath))) {
    const shouldBackup = options.backup || !options.force;
    if (shouldBackup) {
      const backupPath = `${outputPath}.bak`;
      await copyFile(outputPath, backupPath);
      backedUp = true;
    }
  }

  let written = false;
  if (!options.dryRun) {
    await writeFile(outputPath, content, "utf-8");
    written = true;
  }

  return { outputPath, content, backedUp, written, aiUsed, aiWarning };
}
