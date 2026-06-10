import { app, safeStorage } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const KEY_FILE = "openai-key.dat";

function getKeyPath(): string {
  return path.join(app.getPath("userData"), KEY_FILE);
}

export async function saveApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await clearApiKey();
    return;
  }

  const dir = app.getPath("userData");
  await mkdir(dir, { recursive: true });

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(trimmed);
    await writeFile(getKeyPath(), encrypted);
  } else {
    await writeFile(getKeyPath(), Buffer.from(trimmed, "utf-8"));
  }
}

export async function loadApiKey(): Promise<string | undefined> {
  try {
    const data = await readFile(getKeyPath());
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    }
    return data.toString("utf-8").trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function clearApiKey(): Promise<void> {
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(getKeyPath());
  } catch {
    // no key stored
  }
}
