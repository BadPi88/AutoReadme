import { contextBridge, ipcRenderer } from "electron";
import type { DesktopGenerateOptions, DesktopPreviewResult, DesktopProjectInfo } from "./types.js";

contextBridge.exposeInMainWorld("autoreadme", {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke("select-folder"),
  analyzeFolder: (projectPath: string): Promise<DesktopProjectInfo> =>
    ipcRenderer.invoke("analyze-folder", projectPath),
  preview: (options: DesktopGenerateOptions): Promise<DesktopPreviewResult> =>
    ipcRenderer.invoke("preview", options),
  generate: (options: DesktopGenerateOptions): Promise<DesktopPreviewResult> =>
    ipcRenderer.invoke("generate", options),
  getApiKeyStatus: (): Promise<{ hasStoredKey: boolean; hasEnvKey: boolean }> =>
    ipcRenderer.invoke("get-api-key-status"),
  saveApiKey: (apiKey: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("save-api-key", apiKey),
});
