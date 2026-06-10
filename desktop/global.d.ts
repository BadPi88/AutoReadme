import type {
  DesktopGenerateOptions,
  DesktopPreviewResult,
  DesktopProjectInfo,
} from "./types";

declare global {
  interface Window {
    autoreadme: {
      selectFolder: () => Promise<string | null>;
      analyzeFolder: (projectPath: string) => Promise<DesktopProjectInfo>;
      preview: (options: DesktopGenerateOptions) => Promise<DesktopPreviewResult>;
      generate: (options: DesktopGenerateOptions) => Promise<DesktopPreviewResult>;
      getApiKeyStatus: () => Promise<{ hasStoredKey: boolean; hasEnvKey: boolean }>;
      saveApiKey: (apiKey: string) => Promise<{ ok: boolean }>;
    };
  }
}

export {};
