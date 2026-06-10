import chalk from "chalk";
import { Command } from "commander";
import path from "node:path";
import { DEFAULT_AI_MODEL, DEFAULT_DEPTH, DEFAULT_LANG, DEFAULT_OUTPUT } from "./config/defaults.js";
import { analyzeProject, writeReadme } from "./index.js";
import { launchDesktopApp } from "./launch-desktop.js";
import type { OutputLanguage } from "./types.js";

const program = new Command();

program
  .name("autoreadme")
  .description("Generador automático de README.md basado en análisis de código fuente")
  .version("1.0.0");

program
  .command("app")
  .description("Abrir la aplicación de escritorio")
  .action(async () => {
    try {
      await launchDesktopApp();
      console.log(chalk.green("Aplicación de escritorio iniciada."));
      process.exit(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      console.error(chalk.dim("También puedes usar: npm run app"));
      process.exit(1);
    }
  });

program
  .command("generate [path]", { isDefault: true })
  .description("Generar README.md para un proyecto")
  .option("-o, --output <file>", "Archivo de salida", DEFAULT_OUTPUT)
  .option("-f, --force", "Sobrescribir sin crear backup", false)
  .option("--dry-run", "Imprimir resultado en stdout sin escribir archivo", false)
  .option("--lang <lang>", "Idioma del README (es|en)", DEFAULT_LANG)
  .option("--depth <n>", "Profundidad del árbol de directorios", String(DEFAULT_DEPTH))
  .option("--no-tree", "Omitir sección de estructura")
  .option("--no-scripts", "Omitir sección de scripts")
  .option("--no-footer", "Omitir pie de página")
  .option("--backup", "Crear backup (.bak) antes de sobrescribir", false)
  .option("--ai", "Mejorar README con IA", false)
  .option(
    "--ai-provider <provider>",
    "Proveedor de IA: openai u ollama (local, gratis)",
    "openai",
  )
  .option("--ai-model <model>", "Modelo (openai: gpt-4o-mini | ollama: llama3.2)", DEFAULT_AI_MODEL)
  .option("--ai-key <key>", "API key de OpenAI (alternativa a OPENAI_API_KEY)")
  .option("--ollama-host <url>", "URL de Ollama si usas --ai-provider ollama", "http://localhost:11434")
  .action(async (projectPath: string, opts) => {
    const lang = opts.lang as OutputLanguage;
    if (lang !== "es" && lang !== "en") {
      console.error(chalk.red("Error: --lang debe ser 'es' o 'en'"));
      process.exit(1);
    }

    const depth = parseInt(opts.depth, 10);
    if (isNaN(depth) || depth < 1) {
      console.error(chalk.red("Error: --depth debe ser un número positivo"));
      process.exit(1);
    }

    const resolvedPath = path.resolve(projectPath ?? ".");

    try {
      const { stat } = await import("node:fs/promises");
      const s = await stat(resolvedPath);
      if (!s.isDirectory()) {
        console.error(chalk.red(`Error: La ruta no es un directorio: ${resolvedPath}`));
        process.exit(1);
      }
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === "ENOENT") {
        console.error(chalk.red(`Error: El directorio no existe: ${resolvedPath}`));
        console.error(
          chalk.dim(
            "Comprueba la ruta o prueba con un proyecto de ejemplo: tests/fixtures/node-project",
          ),
        );
      } else {
        console.error(
          chalk.red(`Error: No se puede acceder al directorio: ${resolvedPath}`),
        );
        if (nodeErr.message) {
          console.error(chalk.dim(nodeErr.message));
        }
      }
      process.exit(1);
    }

    try {
      const result = await writeReadme(resolvedPath, {
        output: opts.output,
        force: opts.force,
        backup: opts.backup,
        dryRun: opts.dryRun,
        lang,
        depth,
        includeTree: opts.tree !== false,
        includeScripts: opts.scripts !== false,
        includeFooter: opts.footer !== false,
        ai: opts.ai
          ? {
              enabled: true,
              provider: opts.aiProvider === "ollama" ? "ollama" : "openai",
              apiKey: opts.aiKey,
              model:
                opts.aiProvider === "ollama" && opts.aiModel === DEFAULT_AI_MODEL
                  ? "llama3.2"
                  : opts.aiModel,
              ollamaHost: opts.ollamaHost,
            }
          : undefined,
      });

      if (opts.ai && result.aiWarning) {
        console.error(chalk.red.bold(result.aiWarning));
      } else if (result.aiUsed) {
        console.error(chalk.green(`IA aplicada (modelo: ${opts.aiModel})`));
      } else if (opts.ai) {
        console.error(chalk.yellow("IA solicitada pero no se aplicaron cambios."));
      }

      if (opts.dryRun) {
        process.stdout.write(result.content);
        console.error(chalk.dim("\n(dry-run: no se escribió ningún archivo)"));
      } else {
        if (result.backedUp) {
          console.error(chalk.yellow(`Backup creado: ${result.outputPath}.bak`));
        }
        console.log(chalk.green(`README generado: ${result.outputPath}`));

        const ctx = await analyzeProject(resolvedPath, { depth });
        console.error(
          chalk.dim(
            `Stack: ${ctx.stack} | Lenguajes: ${ctx.languageStats.map((l) => l.label).join(", ") || "N/A"}`,
          ),
        );
      }

      process.exit(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error al generar README: ${message}`));

      if (message.includes("analizar") || message.includes("parse")) {
        process.exit(1);
      }
      process.exit(2);
    }
  });

program.parse();
