import { DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_MODEL } from "../config/defaults.js";
import type { AiEnhancement } from "../types.js";
import type { PromptMessages } from "./prompt-builder.js";
import { AiEnhancementError } from "./openai-client.js";

interface OllamaChatResponse {
  message?: { content?: string };
}

function parseEnhancement(raw: string): AiEnhancement {
  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiEnhancementError("Ollama no devolvió JSON válido.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AiEnhancementError("Formato de respuesta de Ollama inválido.");
  }

  const obj = parsed as Record<string, unknown>;

  return {
    description: typeof obj.description === "string" ? obj.description : "",
    features: Array.isArray(obj.features)
      ? obj.features.filter((f): f is string => typeof f === "string")
      : [],
    usageIntro: typeof obj.usageIntro === "string" ? obj.usageIntro : "",
    scriptHints:
      obj.scriptHints && typeof obj.scriptHints === "object" && !Array.isArray(obj.scriptHints)
        ? Object.fromEntries(
            Object.entries(obj.scriptHints as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : {},
  };
}

export async function requestOllamaEnhancement(
  messages: PromptMessages,
  model: string = DEFAULT_OLLAMA_MODEL,
  host: string = DEFAULT_OLLAMA_HOST,
): Promise<AiEnhancement> {
  const url = `${host.replace(/\/$/, "")}/api/chat`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: messages.system },
        { role: "user", content: messages.user },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiEnhancementError(`${response.status} ${response.statusText} ${body}`.trim());
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content;
  if (!content) {
    throw new AiEnhancementError("Ollama devolvió una respuesta vacía.");
  }

  return parseEnhancement(content);
}
