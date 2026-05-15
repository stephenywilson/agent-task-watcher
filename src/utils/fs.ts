import { promises as fs } from "node:fs";
import path from "node:path";

export const WATCHER_DIR = ".agent-task-watcher";
export const SNAPSHOT_FILE = "latest-snapshot.json";
export const CONFIG_FILE = "config.json";

export const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  WATCHER_DIR
];

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

export async function readJson<T>(target: string): Promise<T> {
  const raw = await fs.readFile(target, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJson(target: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function toRelative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/");
}

export function isIgnored(relativePath: string, ignores: string[]): boolean {
  const normalized = relativePath.split(path.sep).join("/");
  return ignores.some((ignore) => {
    const clean = ignore.replace(/^\/+|\/+$/g, "");
    return normalized === clean || normalized.startsWith(`${clean}/`);
  });
}

export async function walkFiles(root: string, ignores: string[]): Promise<string[]> {
  const results: string[] = [];

  async function visit(current: string): Promise<void> {
    const relative = toRelative(root, current);
    if (relative && isIgnored(relative, ignores)) {
      return;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const entryRelative = toRelative(root, fullPath);
      if (isIgnored(entryRelative, ignores)) {
        continue;
      }

      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  await visit(root);
  return results.sort();
}

export function watcherPath(root: string, ...parts: string[]): string {
  return path.join(root, WATCHER_DIR, ...parts);
}
