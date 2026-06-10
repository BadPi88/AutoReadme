import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AnalysisContext } from "../../src/types.js";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

const baseContext: AnalysisContext = {
  rootDir: "/proj",
  projectName: "demo-api",
  stack: "node",
  metadata: {
    name: "demo-api",
    scripts: [],
    dependencies: [],
    devDependencies: [],
  },
  languageStats: [],
  fileTree: "",
  entryPoints: [],
  installCommands: [],
  runCommands: [],
  frameworks: [],
  hasLicenseFile: false,
};

describe("enhanceReadme", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    delete process.env.OPENAI_API_KEY;
  });

  it("retorna warning si no hay API key", async () => {
    const { enhanceReadme } = await import("../../src/ai/enhance-readme.js");
    const result = await enhanceReadme(baseContext, "es", { enabled: true });
    expect(result.enhancement).toBeNull();
    expect(result.warning).toContain("OPENAI_API_KEY");
  });

  it("retorna enhancement con mock de OpenAI", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: "API REST de demostración.",
              features: ["Express", "Endpoints JSON"],
              usageIntro: "Ejecuta npm run dev para iniciar.",
              scriptHints: { dev: "Modo desarrollo" },
            }),
          },
        },
      ],
    });

    const { enhanceReadme } = await import("../../src/ai/enhance-readme.js");
    const result = await enhanceReadme(baseContext, "es", {
      enabled: true,
      apiKey: "sk-test-key",
    });

    expect(result.enhancement?.description).toContain("API REST");
    expect(result.enhancement?.features).toHaveLength(2);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("no llama a OpenAI si enabled es false", async () => {
    const { enhanceReadme } = await import("../../src/ai/enhance-readme.js");
    await enhanceReadme(baseContext, "es", { enabled: false, apiKey: "sk-test" });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
