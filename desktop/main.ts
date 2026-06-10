import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject, buildReadmeContent, writeReadme } from "../src/index.js";
import { loadApiKey, saveApiKey } from "./api-key-store.js";
import type { DesktopGenerateOptions, DesktopPreviewResult, DesktopProjectInfo } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function contextSummary(context: Awaited<ReturnType<typeof analyzeProject>>) {
  const fileCount = context.languageStats.reduce((sum, l) => sum + l.count, 0);
  return {
    projectName: context.projectName,
    description: context.metadata.description,
    stack: context.stack,
    languages: context.languageStats.map((l) => l.label).join(", ") || "N/A",
    fileCount,
  };
}

async function resolveAiOptions(
  options: DesktopGenerateOptions,
): Promise<
  | { enabled: true; provider: "openai" | "ollama"; apiKey?: string; model?: string; ollamaHost?: string }
  | { error: string }
  | undefined
> {
  if (!options.useAi) return undefined;

  const provider = options.aiProvider ?? "openai";

  if (provider === "ollama") {
    return {
      enabled: true,
      provider: "ollama",
      model: options.aiModel || "llama3.2",
      ollamaHost: options.ollamaHost || "http://localhost:11434",
    };
  }

  if (options.apiKey?.trim()) {
    await saveApiKey(options.apiKey.trim());
  }

  const storedKey = await loadApiKey();
  const apiKey =
    options.apiKey?.trim() || storedKey || process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      error:
        "Falta la API key de OpenAI. Escríbela en el campo, define OPENAI_API_KEY o elige «Ollama (gratis local)» como proveedor.",
    };
  }

  return {
    enabled: true,
    provider: "openai",
    apiKey,
    model: options.aiModel,
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    title: "AutoReadme",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0c0f14" : "#f0f2f5",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("Error al cargar preload:", preloadPath, error);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function handleAnalyzeFolder(projectPath: string): Promise<DesktopProjectInfo> {
  try {
    const context = await analyzeProject(projectPath, { depth: 1 });
    return { ok: true, ...contextSummary(context) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handlePreview(options: DesktopGenerateOptions): Promise<DesktopPreviewResult> {
  try {
    const context = await analyzeProject(options.projectPath, {
      depth: options.depth,
      includeTree: options.includeTree,
    });

    const aiResolved = await resolveAiOptions(options);
    if (aiResolved && "error" in aiResolved) {
      return { ok: false, error: aiResolved.error };
    }

    const { content, aiUsed, aiWarning } = await buildReadmeContent(context, {
      lang: options.lang,
      includeTree: options.includeTree,
      includeScripts: options.includeScripts,
      includeFooter: options.includeFooter,
      ai: aiResolved,
    });

    if (aiWarning) {
      console.error("[AutoReadme IA]", aiWarning);
    }

    return { ok: true, content, aiUsed, aiWarning, ...contextSummary(context) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleGenerate(options: DesktopGenerateOptions): Promise<DesktopPreviewResult> {
  try {
    const aiResolved = await resolveAiOptions(options);
    if (aiResolved && "error" in aiResolved) {
      return { ok: false, error: aiResolved.error };
    }

    const result = await writeReadme(options.projectPath, {
      lang: options.lang,
      depth: options.depth,
      includeTree: options.includeTree,
      includeScripts: options.includeScripts,
      includeFooter: options.includeFooter,
      force: options.force,
      backup: !options.force,
      ai: aiResolved,
    });

    if (result.aiWarning) {
      console.error("[AutoReadme IA]", result.aiWarning);
    }

    const context = await analyzeProject(options.projectPath, { depth: options.depth });

    return {
      ok: true,
      content: result.content,
      outputPath: result.outputPath,
      backedUp: result.backedUp,
      aiUsed: result.aiUsed,
      aiWarning: result.aiWarning,
      ...contextSummary(context),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function registerIpc(): void {
  ipcMain.handle("select-folder", async () => {
    if (!mainWindow) {
      throw new Error("La ventana principal no está disponible.");
    }

    mainWindow.focus();

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Seleccionar carpeta del proyecto",
      buttonLabel: "Seleccionar",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("analyze-folder", (_event, projectPath: string) =>
    handleAnalyzeFolder(projectPath),
  );

  ipcMain.handle("preview", (_event, options: DesktopGenerateOptions) =>
    handlePreview(options),
  );

  ipcMain.handle("generate", (_event, options: DesktopGenerateOptions) =>
    handleGenerate(options),
  );

  ipcMain.handle("get-api-key-status", async () => {
    const stored = await loadApiKey();
    const fromEnv = Boolean(process.env.OPENAI_API_KEY?.trim());
    return { hasStoredKey: Boolean(stored), hasEnvKey: fromEnv };
  });

  ipcMain.handle("save-api-key", async (_event, apiKey: string) => {
    await saveApiKey(apiKey);
    return { ok: true };
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
