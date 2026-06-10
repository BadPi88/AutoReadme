import type { AnalysisContext, CodeSampleContext, OutputLanguage } from "../types.js";

export interface PromptMessages {
  system: string;
  user: string;
}

const SYSTEM_ES = `Eres un redactor técnico experto. Analiza el contexto del proyecto y genera contenido para un README.
Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura exacta:
{
  "description": "string (2-4 frases describiendo qué hace el proyecto)",
  "features": ["string", ...] (4-8 características concretas inferidas del código),
  "usageIntro": "string (párrafo introductorio sobre cómo usar el proyecto)",
  "scriptHints": { "nombreScript": "descripción corta", ... }
}
Reglas:
- NO inventes comandos, rutas ni dependencias que no aparezcan en el contexto.
- scriptHints solo para scripts listados en el contexto.
- Escribe en español.
- Sé específico y profesional.`;

const SYSTEM_EN = `You are an expert technical writer. Analyze the project context and generate README content.
Respond ONLY with a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "description": "string (2-4 sentences describing what the project does)",
  "features": ["string", ...] (4-8 concrete features inferred from the code),
  "usageIntro": "string (introductory paragraph on how to use the project)",
  "scriptHints": { "scriptName": "short description", ... }
}
Rules:
- Do NOT invent commands, paths, or dependencies not present in the context.
- scriptHints only for scripts listed in the context.
- Write in English.
- Be specific and professional.`;

export function buildEnhancementPrompt(
  context: AnalysisContext,
  samples: CodeSampleContext,
  lang: OutputLanguage,
): PromptMessages {
  const system = lang === "es" ? SYSTEM_ES : SYSTEM_EN;

  const snippetsBlock = samples.entryPointSnippets
    .map((s) => `### ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join("\n\n");

  const envBlock =
    samples.envVariables.length > 0
      ? `Variables de entorno (.env.example): ${samples.envVariables.join(", ")}`
      : "";

  const existingBlock = samples.existingReadme
    ? `README existente (referencia):\n${samples.existingReadme}`
    : "";

  const user = [
    `Proyecto: ${context.projectName}`,
    `Stack: ${context.stack}`,
    "",
    "Contexto del análisis:",
    samples.contextSummary,
    "",
    envBlock,
    existingBlock,
    "",
    "Muestras de código:",
    snippetsBlock || "(sin muestras de entry points)",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
