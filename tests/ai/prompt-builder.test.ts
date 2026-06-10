import { describe, expect, it } from "vitest";
import { buildEnhancementPrompt } from "../../src/ai/prompt-builder.js";
import type { AnalysisContext, CodeSampleContext } from "../../src/types.js";

const baseContext: AnalysisContext = {
  rootDir: "/proj",
  projectName: "demo-api",
  stack: "node",
  metadata: {
    name: "demo-api",
    description: "API demo",
    scripts: [{ name: "dev", command: "node src/index.js" }],
    dependencies: ["express"],
    devDependencies: [],
  },
  languageStats: [{ extension: ".js", label: "JavaScript", count: 3 }],
  fileTree: "demo-api/\n└── src/",
  entryPoints: [{ path: "src/index.js", label: "main" }],
  installCommands: ["npm install"],
  runCommands: ["npm run dev"],
  frameworks: ["Express"],
  hasLicenseFile: false,
};

const baseSamples: CodeSampleContext = {
  entryPointSnippets: [{ path: "src/index.js", content: "const express = require('express');" }],
  envVariables: ["PORT"],
  contextSummary: '{"projectName":"demo-api"}',
};

describe("buildEnhancementPrompt", () => {
  it("genera prompt en español", () => {
    const { system, user } = buildEnhancementPrompt(baseContext, baseSamples, "es");
    expect(system).toContain("español");
    expect(user).toContain("demo-api");
    expect(user).toContain("src/index.js");
    expect(user).toContain("PORT");
  });

  it("genera prompt en inglés", () => {
    const { system } = buildEnhancementPrompt(baseContext, baseSamples, "en");
    expect(system).toContain("English");
  });
});
