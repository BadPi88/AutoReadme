export type ProjectStack =
  | "node"
  | "typescript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "generic";

export type OutputLanguage = "es" | "en";

export interface ProjectScript {
  name: string;
  command: string;
}

export interface EntryPoint {
  path: string;
  label: string;
}

export interface LanguageStats {
  extension: string;
  label: string;
  count: number;
}

export interface ProjectMetadata {
  name: string;
  description?: string;
  version?: string;
  license?: string;
  main?: string;
  bin?: string | Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  scripts: ProjectScript[];
}

export interface AnalysisContext {
  rootDir: string;
  projectName: string;
  stack: ProjectStack;
  metadata: ProjectMetadata;
  languageStats: LanguageStats[];
  fileTree: string;
  entryPoints: EntryPoint[];
  installCommands: string[];
  runCommands: string[];
  frameworks: string[];
  hasLicenseFile: boolean;
  licenseText?: string;
}

export interface AiEnhancement {
  description: string;
  features: string[];
  usageIntro: string;
  scriptHints: Record<string, string>;
}

export type AiProvider = "openai" | "ollama";

export interface AiOptions {
  enabled?: boolean;
  provider?: AiProvider;
  apiKey?: string;
  model?: string;
  ollamaHost?: string;
}

export interface CodeSampleContext {
  entryPointSnippets: Array<{ path: string; content: string }>;
  existingReadme?: string;
  envVariables: string[];
  contextSummary: string;
}

export interface AnalyzeOptions {
  depth?: number;
  includeTree?: boolean;
}

export interface GenerateOptions {
  lang?: OutputLanguage;
  includeTree?: boolean;
  includeScripts?: boolean;
  includeFooter?: boolean;
  enhancement?: AiEnhancement | null;
}

export interface WriteOptions extends AnalyzeOptions, GenerateOptions {
  output?: string;
  force?: boolean;
  backup?: boolean;
  dryRun?: boolean;
  ai?: AiOptions;
}

export interface WriteResult {
  outputPath: string;
  content: string;
  backedUp: boolean;
  written: boolean;
  aiUsed?: boolean;
  aiWarning?: string;
}
