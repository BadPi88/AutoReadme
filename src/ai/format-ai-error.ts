export function formatAiError(err: unknown, provider: string): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Error desconocido";

  if (raw.includes("429") || raw.toLowerCase().includes("quota")) {
    if (provider === "openai") {
      return [
        "OpenAI rechazó la petición: sin créditos disponibles (error 429).",
        "Las cuentas nuevas ya no suelen incluir API gratuita automática.",
        "Soluciones: añade créditos en platform.openai.com/settings/billing",
        "o usa Ollama gratis en local (--ai-provider ollama).",
      ].join(" ");
    }
    return `Cuota agotada en ${provider} (429). ${raw}`;
  }

  if (raw.includes("401") || raw.toLowerCase().includes("incorrect api key")) {
    return "API key de OpenAI incorrecta o revocada. Verifica la key en platform.openai.com/api-keys.";
  }

  if (raw.includes("ECONNREFUSED") || raw.includes("fetch failed")) {
    if (provider === "ollama") {
      return [
        "No se pudo conectar con Ollama en localhost:11434.",
        "Instala Ollama (ollama.com), ejecútalo y descarga un modelo: ollama pull llama3.2",
      ].join(" ");
    }
    return `No se pudo conectar con ${provider}: ${raw}`;
  }

  if (raw.includes("404") && provider === "ollama") {
    return "Modelo no encontrado en Ollama. Ejecuta: ollama pull llama3.2 (o el modelo que configuraste).";
  }

  return raw;
}
