export const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "target",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".idea",
  ".vscode",
  "vendor",
]);

export const IGNORED_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

export function shouldIgnore(name: string, isDirectory: boolean): boolean {
  if (IGNORED_FILES.has(name)) return true;
  if (isDirectory && IGNORED_DIRS.has(name)) return true;
  if (name.startsWith(".") && name !== ".github" && name !== ".env.example") {
    if (isDirectory) return true;
  }
  return false;
}
