import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { shouldIgnore } from "./ignore-patterns.js";

interface TreeNode {
  name: string;
  children: TreeNode[];
}

async function readDirectory(dir: string, depth: number, maxDepth: number): Promise<TreeNode[]> {
  if (depth > maxDepth) return [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: TreeNode[] = [];

  const sorted = entries
    .filter((e) => !shouldIgnore(e.name, e.isDirectory()))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    if (entry.isDirectory()) {
      const children = await readDirectory(path.join(dir, entry.name), depth + 1, maxDepth);
      nodes.push({ name: entry.name + "/", children });
    } else {
      nodes.push({ name: entry.name, children: [] });
    }
  }

  return nodes;
}

function renderTree(nodes: TreeNode[], prefix = ""): string[] {
  const lines: string[] = [];

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const connector = isLast ? "└── " : "├── ";
    lines.push(prefix + connector + node.name);

    if (node.children.length > 0) {
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      lines.push(...renderTree(node.children, childPrefix));
    }
  });

  return lines;
}

export async function buildFileTree(rootDir: string, maxDepth: number): Promise<string> {
  const rootName = path.basename(rootDir) || rootDir;
  const nodes = await readDirectory(rootDir, 1, maxDepth);
  const lines = [rootName + "/", ...renderTree(nodes)];
  return lines.join("\n");
}

export async function countFilesByExtension(rootDir: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (shouldIgnore(entry.name, entry.isDirectory())) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase() || "(sin ext)";
        counts.set(ext, (counts.get(ext) ?? 0) + 1);
      }
    }
  }

  await walk(rootDir);
  return counts;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}
