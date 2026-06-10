import type {
  AiEnhancement,
  AnalysisContext,
  GenerateOptions,
  OutputLanguage,
  ProjectStack,
} from "../types.js";

const LABELS = {
  es: {
    techStack: "Stack tecnológico",
    runtime: "Runtime",
    language: "Lenguaje",
    frameworks: "Frameworks",
    keyDeps: "Dependencias clave",
    devDeps: "Dependencias de desarrollo",
    prerequisites: "Requisitos previos",
    installation: "Instalación",
    usage: "Uso",
    structure: "Estructura del proyecto",
    scripts: "Scripts",
    scriptName: "Script",
    scriptCommand: "Comando",
    license: "Licencia",
    entryPoints: "Puntos de entrada",
    features: "Características",
    scriptDesc: "Descripción",
    footer: "Generado con",
    files: "archivos",
    noScripts: "No se detectaron scripts configurados.",
    genericInstall: "Consulta la documentación del proyecto para instrucciones de instalación.",
  },
  en: {
    techStack: "Tech stack",
    runtime: "Runtime",
    language: "Language",
    frameworks: "Frameworks",
    keyDeps: "Key dependencies",
    devDeps: "Dev dependencies",
    prerequisites: "Prerequisites",
    installation: "Installation",
    usage: "Usage",
    structure: "Project structure",
    scripts: "Scripts",
    scriptName: "Script",
    scriptCommand: "Command",
    license: "License",
    entryPoints: "Entry points",
    features: "Features",
    scriptDesc: "Description",
    footer: "Generated with",
    files: "files",
    noScripts: "No configured scripts detected.",
    genericInstall: "Refer to the project documentation for installation instructions.",
  },
} as const;

function stackRuntime(stack: ProjectStack): string | null {
  const map: Partial<Record<ProjectStack, string>> = {
    node: "Node.js",
    typescript: "Node.js",
    python: "Python",
    rust: "Rust",
    go: "Go",
    java: "Java",
  };
  return map[stack] ?? null;
}

function stackPrerequisites(stack: ProjectStack, lang: OutputLanguage): string[] {
  const es: Record<ProjectStack, string[]> = {
    node: ["Node.js 18 o superior", "npm, yarn o pnpm"],
    typescript: ["Node.js 18 o superior", "npm, yarn o pnpm"],
    python: ["Python 3.10 o superior", "pip"],
    rust: ["Rust (rustup)", "Cargo"],
    go: ["Go 1.21 o superior"],
    java: ["JDK 17 o superior", "Maven o Gradle"],
    generic: [],
  };
  const en: Record<ProjectStack, string[]> = {
    node: ["Node.js 18 or later", "npm, yarn, or pnpm"],
    typescript: ["Node.js 18 or later", "npm, yarn, or pnpm"],
    python: ["Python 3.10 or later", "pip"],
    rust: ["Rust (rustup)", "Cargo"],
    go: ["Go 1.21 or later"],
    java: ["JDK 17 or later", "Maven or Gradle"],
    generic: [],
  };
  return (lang === "es" ? es : en)[stack];
}

function renderBadges(ctx: AnalysisContext): string {
  const badges: string[] = [];
  if (ctx.metadata.version) {
    badges.push(`![version](https://img.shields.io/badge/version-${ctx.metadata.version}-blue)`);
  }
  if (ctx.licenseText) {
    const license = ctx.licenseText.replace(/[^a-zA-Z0-9.-]/g, "");
    badges.push(`![license](https://img.shields.io/badge/license-${license}-green)`);
  }
  return badges.length > 0 ? badges.join(" ") + "\n" : "";
}

function renderTechStack(ctx: AnalysisContext, lang: OutputLanguage): string {
  const t = LABELS[lang];
  const lines: string[] = [`## ${t.techStack}`, ""];

  const runtime = stackRuntime(ctx.stack);
  if (runtime) {
    lines.push(`- **${t.runtime}:** ${runtime}`);
  }

  if (ctx.languageStats.length > 0) {
    const langSummary = ctx.languageStats
      .slice(0, 5)
      .map((l) => `${l.label} (${l.count} ${t.files})`)
      .join(", ");
    lines.push(`- **${t.language}:** ${langSummary}`);
  }

  if (ctx.frameworks.length > 0) {
    lines.push(`- **${t.frameworks}:** ${ctx.frameworks.join(", ")}`);
  }

  if (ctx.metadata.dependencies.length > 0) {
    lines.push(`- **${t.keyDeps}:** ${ctx.metadata.dependencies.join(", ")}`);
  }

  if (ctx.metadata.devDependencies.length > 0) {
    lines.push(`- **${t.devDeps}:** ${ctx.metadata.devDependencies.join(", ")}`);
  }

  lines.push("");
  return lines.join("\n");
}

function renderPrerequisites(ctx: AnalysisContext, lang: OutputLanguage): string {
  const prereqs = stackPrerequisites(ctx.stack, lang);
  if (prereqs.length === 0) return "";

  const t = LABELS[lang];
  const lines = [`## ${t.prerequisites}`, "", ...prereqs.map((p) => `- ${p}`), ""];
  return lines.join("\n");
}

function renderInstallation(ctx: AnalysisContext, lang: OutputLanguage): string {
  const t = LABELS[lang];
  const commands =
    ctx.installCommands.length > 0 ? ctx.installCommands : [t.genericInstall];

  const lines = [
    `## ${t.installation}`,
    "",
    "```bash",
    ...commands,
    "```",
    "",
  ];
  return lines.join("\n");
}

function renderFeatures(enhancement: AiEnhancement, lang: OutputLanguage): string {
  if (enhancement.features.length === 0) return "";

  const t = LABELS[lang];
  const lines = [`## ${t.features}`, ""];
  for (const feature of enhancement.features) {
    lines.push(`- ${feature}`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderUsage(
  ctx: AnalysisContext,
  lang: OutputLanguage,
  enhancement?: AiEnhancement | null,
): string {
  const t = LABELS[lang];
  const lines: string[] = [`## ${t.usage}`, ""];

  if (enhancement?.usageIntro) {
    lines.push(enhancement.usageIntro, "");
  }

  if (ctx.runCommands.length > 0) {
    lines.push("```bash");
    for (const cmd of ctx.runCommands) {
      lines.push(cmd);
    }
    lines.push("```", "");
  }

  if (ctx.entryPoints.length > 0) {
    lines.push(`### ${t.entryPoints}`, "");
    for (const ep of ctx.entryPoints) {
      lines.push(`- \`${ep.path}\` (${ep.label})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderStructure(ctx: AnalysisContext, lang: OutputLanguage): string {
  const t = LABELS[lang];
  return [
    `## ${t.structure}`,
    "",
    "```",
    ctx.fileTree,
    "```",
    "",
  ].join("\n");
}

function renderScripts(
  ctx: AnalysisContext,
  lang: OutputLanguage,
  enhancement?: AiEnhancement | null,
): string {
  const t = LABELS[lang];
  if (ctx.metadata.scripts.length === 0) {
    return `## ${t.scripts}\n\n${t.noScripts}\n\n`;
  }

  const hints = enhancement?.scriptHints ?? {};
  const hasHints = Object.keys(hints).length > 0;

  const lines = hasHints
    ? [
        `## ${t.scripts}`,
        "",
        `| ${t.scriptName} | ${t.scriptCommand} | ${t.scriptDesc} |`,
        "| --- | --- | --- |",
      ]
    : [`## ${t.scripts}`, "", `| ${t.scriptName} | ${t.scriptCommand} |`, "| --- | --- |"];

  for (const script of ctx.metadata.scripts) {
    const hint = hints[script.name] ?? "";
    if (hasHints) {
      lines.push(`| \`${script.name}\` | \`${script.command}\` | ${hint} |`);
    } else {
      lines.push(`| \`${script.name}\` | \`${script.command}\` |`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function renderLicense(ctx: AnalysisContext, lang: OutputLanguage): string {
  if (!ctx.hasLicenseFile && !ctx.licenseText) return "";

  const t = LABELS[lang];
  const text = ctx.licenseText ?? "Ver archivo LICENSE";
  return [`## ${t.license}`, "", text, ""].join("\n");
}

function renderFooter(lang: OutputLanguage): string {
  const t = LABELS[lang];
  const date = new Date().toISOString().split("T")[0];
  return `---\n\n*${t.footer} [AutoReadme](https://github.com/autoreadme/autoreadme) — ${date}*\n`;
}

export function generateReadme(
  context: AnalysisContext,
  options: GenerateOptions = {},
): string {
  const lang = options.lang ?? "es";
  const includeTree = options.includeTree !== false;
  const includeScripts = options.includeScripts !== false;
  const includeFooter = options.includeFooter !== false;
  const enhancement = options.enhancement ?? null;

  const description =
    enhancement?.description?.trim() || context.metadata.description?.trim() || "";

  const sections: string[] = [];

  sections.push(`# ${context.projectName}`, "");
  sections.push(renderBadges(context));

  if (description) {
    sections.push(description, "");
  }

  if (enhancement) {
    sections.push(renderFeatures(enhancement, lang));
  }

  sections.push(renderTechStack(context, lang));
  sections.push(renderPrerequisites(context, lang));
  sections.push(renderInstallation(context, lang));
  sections.push(renderUsage(context, lang, enhancement));

  if (includeTree) {
    sections.push(renderStructure(context, lang));
  }

  if (includeScripts) {
    sections.push(renderScripts(context, lang, enhancement));
  }

  sections.push(renderLicense(context, lang));

  if (includeFooter) {
    sections.push(renderFooter(lang));
  }

  return sections.filter((s) => s !== "").join("\n").trimEnd() + "\n";
}
