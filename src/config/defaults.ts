import type { OutputLanguage } from "../types.js";

export const DEFAULT_DEPTH = 3;
export const DEFAULT_LANG: OutputLanguage = "es";
export const DEFAULT_OUTPUT = "README.md";
export const DEFAULT_AI_MODEL = "gpt-4o-mini";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
export const MAX_SAMPLE_BYTES = 12_000;
export const MAX_LINES_PER_FILE = 120;
export const MAX_ENTRY_POINT_FILES = 3;

export const FRAMEWORK_KEYWORDS: Record<string, string> = {
  react: "React",
  "react-dom": "React",
  vue: "Vue.js",
  nuxt: "Nuxt",
  next: "Next.js",
  express: "Express",
  fastify: "Fastify",
  koa: "Koa",
  nestjs: "@nestjs/core",
  angular: "Angular",
  svelte: "Svelte",
  fastapi: "FastAPI",
  flask: "Flask",
  django: "Django",
  sqlalchemy: "SQLAlchemy",
  actix: "Actix",
  rocket: "Rocket",
  gin: "Gin",
  echo: "Echo",
  fiber: "Fiber",
  spring: "Spring",
  vitest: "Vitest",
  jest: "Jest",
  mocha: "Mocha",
  pytest: "pytest",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (TSX)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (JSX)",
  ".mjs": "JavaScript (ESM)",
  ".cjs": "JavaScript (CJS)",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".swift": "Swift",
  ".md": "Markdown",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
};
