import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "desktop", "renderer");
const dest = path.join(root, "dist", "desktop", "renderer");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log("Renderer copiado a dist/desktop/renderer");
