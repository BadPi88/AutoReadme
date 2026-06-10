import {
  DEFAULT_AI_MODEL,
  DEFAULT_OLLAMA_HOST,
  DEFAULT_OLLAMA_MODEL,
} from "../config/defaults.js";
import { sampleCodeContext } from "../scanners/code-sampler.js";
import type { AiEnhancement, AiOptions, AnalysisContext, OutputLanguage } from "../types.js";
import { formatAiError } from "./format-ai-error.js";
import { buildEnhancementPrompt } from "./prompt-builder.js";
import { requestOllamaEnhancement } from "./ollama-client.js";
import {
  AiEnhancementError,
  createOpenAIClient,
  requestEnhancement,
  resolveApiKey,
} from "./openai-client.js";

export interface EnhanceResult {
  enhancement: AiEnhancement | null;
  warning?: string;
}

async function requestFromProvider(
  messages: ReturnType<typeof buildEnhancementPrompt>,
  options: AiOptions,
): Promise<AiEnhancement> {
  const provider = options.provider ?? "openai";

  if (provider === "ollama") {
    return requestOllamaEnhancement(
      messages,
      options.model ?? DEFAULT_OLLAMA_MODEL,
      options.ollamaHost ?? DEFAULT_OLLAMA_HOST,
    );
  }

  const apiKey = resolveApiKey(options);
  if (!apiKey) {
    throw new AiEnhancementError(
      "Falta OPENAI_API_KEY. Para IA gratis en local usa: --ai-provider ollama",
    );
  }

  const client = createOpenAIClient(apiKey);
  return requestEnhancement(client, messages, options.model ?? DEFAULT_AI_MODEL);
}

export async function enhanceReadme(
  context: AnalysisContext,
  lang: OutputLanguage,
  options?: AiOptions,
): Promise<EnhanceResult> {
  if (!options?.enabled) {
    return { enhancement: null };
  }

  const provider = options.provider ?? "openai";

  if (provider === "openai" && !resolveApiKey(options)) {
    return {
      enhancement: null,
      warning:
        "IA OpenAI no disponible: falta API key. Usa --ai-key, OPENAI_API_KEY o prueba --ai-provider ollama (gratis en local).",
    };
  }

  try {
    const samples = await sampleCodeContext(context);
    const messages = buildEnhancementPrompt(context, samples, lang);
    const enhancement = await requestFromProvider(messages, options);

    if (!enhancement.description && enhancement.features.length === 0) {
      return {
        enhancement: null,
        warning: "La IA no devolvió contenido útil. Se usó README estándar.",
      };
    }

    return { enhancement };
  } catch (err) {
    const friendly = formatAiError(err, provider);
    return {
      enhancement: null,
      warning: `IA falló: ${friendly} Se generó README sin mejora IA.`,
    };
  }
}
