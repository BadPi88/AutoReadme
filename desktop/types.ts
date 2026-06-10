import type { OutputLanguage } from "../src/types.js";

export interface DesktopGenerateOptions {
  projectPath: string;
  lang: OutputLanguage;
  depth: number;
  includeTree: boolean;
  includeScripts: boolean;
  includeFooter: boolean;
  force: boolean;
  useAi?: boolean;
  aiProvider?: "openai" | "ollama";
  apiKey?: string;
  aiModel?: string;
  ollamaHost?: string;
}

export interface DesktopProjectInfo {
  ok: boolean;
  projectName?: string;
  description?: string;
  stack?: string;
  languages?: string;
  fileCount?: number;
  error?: string;
}

export interface DesktopPreviewResult {
  ok: boolean;
  content?: string;
  outputPath?: string;
  backedUp?: boolean;
  projectName?: string;
  description?: string;
  stack?: string;
  languages?: string;
  fileCount?: number;
  aiUsed?: boolean;
  aiWarning?: string;
  error?: string;
}
