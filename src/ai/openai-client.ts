import OpenAI from "openai";
import { DEFAULT_AI_MODEL } from "../config/defaults.js";
import type { AiEnhancement, AiOptions } from "../types.js";
import type { PromptMessages } from "./prompt-builder.js";

export class AiEnhancementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiEnhancementError";
  }
}

export function resolveApiKey(options?: AiOptions): string | undefined {
  return options?.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });
}

function parseEnhancement(raw: string): AiEnhancement {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiEnhancementError("La respuesta de OpenAI no es JSON válido.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AiEnhancementError("Formato de respuesta inválido.");
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

export async function requestEnhancement(
  client: OpenAI,
  messages: PromptMessages,
  model: string = DEFAULT_AI_MODEL,
): Promise<AiEnhancement> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: messages.system },
      { role: "user", content: messages.user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new AiEnhancementError("OpenAI devolvió una respuesta vacía.");
  }

  return parseEnhancement(content);
}
