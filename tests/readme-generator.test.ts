import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateReadme } from "../src/generators/readme-generator.js";
import { scanProject } from "../src/scanners/project-scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeFixture = path.join(__dirname, "fixtures", "node-project");

describe("generateReadme", () => {
  it("genera README en español con secciones esperadas", async () => {
    const context = await scanProject(nodeFixture, { depth: 2 });
    const readme = generateReadme(context, { lang: "es" });

    expect(readme).toContain("# demo-api");
    expect(readme).toContain("API REST de demostración con Express");
    expect(readme).toContain("## Stack tecnológico");
    expect(readme).toContain("## Instalación");
    expect(readme).toContain("npm install");
    expect(readme).toContain("## Uso");
    expect(readme).toContain("## Estructura del proyecto");
    expect(readme).toContain("## Scripts");
    expect(readme).toContain("| `dev` |");
    expect(readme).toContain("## Licencia");
    expect(readme).toContain("Generado con");
  });

  it("genera README en inglés", async () => {
    const context = await scanProject(nodeFixture, { depth: 2 });
    const readme = generateReadme(context, { lang: "en" });

    expect(readme).toContain("## Tech stack");
    expect(readme).toContain("## Installation");
    expect(readme).toContain("## Usage");
    expect(readme).toContain("Generated with");
  });

  it("incluye secciones de IA cuando hay enhancement", async () => {
    const context = await scanProject(nodeFixture, { depth: 2 });
    const readme = generateReadme(context, {
      lang: "es",
      enhancement: {
        description: "API REST mejorada con IA para gestión de recursos.",
        features: ["Rutas Express", "Validación con Zod", "Tests con Vitest"],
        usageIntro: "Inicia el servidor en modo desarrollo y prueba los endpoints.",
        scriptHints: { dev: "Servidor con recarga automática" },
      },
    });

    expect(readme).toContain("API REST mejorada con IA");
    expect(readme).toContain("## Características");
    expect(readme).toContain("- Rutas Express");
    expect(readme).toContain("Inicia el servidor en modo desarrollo");
    expect(readme).toContain("| `dev` |");
    expect(readme).toContain("Servidor con recarga automática");
  });

  it("omite secciones según opciones", async () => {
    const context = await scanProject(nodeFixture, { depth: 2 });
    const readme = generateReadme(context, {
      includeTree: false,
      includeScripts: false,
      includeFooter: false,
    });

    expect(readme).not.toContain("## Estructura del proyecto");
    expect(readme).not.toContain("## Scripts");
    expect(readme).not.toContain("Generado con");
  });
});
