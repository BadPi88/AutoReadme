import { LANGUAGE_LABELS } from "../config/defaults.js";
import type { LanguageStats } from "../types.js";
import { buildFileTree, countFilesByExtension } from "../utils/file-tree.js";

export async function analyzeStructure(
  rootDir: string,
  depth: number,
): Promise<{ fileTree: string; languageStats: LanguageStats[] }> {
  const fileTree = await buildFileTree(rootDir, depth);
  const extensionCounts = await countFilesByExtension(rootDir);

  const sourceExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".rs",
    ".go",
    ".java",
    ".kt",
    ".rb",
    ".php",
    ".cs",
    ".cpp",
    ".c",
    ".swift",
  ]);

  const languageStats: LanguageStats[] = [...extensionCounts.entries()]
    .filter(([ext]) => sourceExtensions.has(ext))
    .map(([extension, count]) => ({
      extension,
      label: LANGUAGE_LABELS[extension] ?? extension,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return { fileTree, languageStats };
}
