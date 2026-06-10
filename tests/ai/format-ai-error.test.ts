import { describe, expect, it } from "vitest";
import { formatAiError } from "../../src/ai/format-ai-error.js";

describe("formatAiError", () => {
  it("explica error 429 de OpenAI en español claro", () => {
    const msg = formatAiError(new Error("429 You exceeded your current quota"), "openai");
    expect(msg).toContain("sin créditos");
    expect(msg).toContain("ollama");
  });

  it("explica conexión fallida a Ollama", () => {
    const msg = formatAiError(new Error("fetch failed ECONNREFUSED"), "ollama");
    expect(msg).toContain("Ollama");
    expect(msg).toContain("ollama pull");
  });
});
