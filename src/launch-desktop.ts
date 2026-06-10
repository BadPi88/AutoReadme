import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function launchDesktopApp(): Promise<void> {
  const distDir = path.dirname(fileURLToPath(import.meta.url));
  const mainPath = path.join(distDir, "desktop", "main.js");

  try {
    await access(mainPath);
  } catch {
    throw new Error("La aplicación de escritorio no está compilada. Ejecuta: npm run build");
  }

  let electronPath: string;
  try {
    const require = createRequire(import.meta.url);
    electronPath = require("electron") as string;
  } catch {
    throw new Error(
      "Electron no está instalado. Ejecuta: npm install (incluye devDependencies)",
    );
  }

  const child = spawn(electronPath, [mainPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });

  child.unref();
}
