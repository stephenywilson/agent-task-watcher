import { promises as fs } from "node:fs";
import path from "node:path";
import type { FileRecord, Snapshot, WatcherConfig } from "./types.js";
import { readPackageJsonState } from "./package-json.js";
import { DEFAULT_IGNORES, CONFIG_FILE, SNAPSHOT_FILE, ensureDir, hashFilePath, pathExists, readJson, toRelative, walkFiles, watcherPath, writeJson } from "./utils-imports.js";

export async function initWatcher(root: string): Promise<void> {
  const watcherDir = watcherPath(root);
  await ensureDir(watcherDir);
  await ensureDir(watcherPath(root, "reports"));

  const configPath = watcherPath(root, CONFIG_FILE);
  if (!(await pathExists(configPath))) {
    const config: WatcherConfig = {
      version: "0.1",
      ignore: DEFAULT_IGNORES
    };
    await writeJson(configPath, config);
  }

  const metadataPath = watcherPath(root, "metadata.json");
  if (!(await pathExists(metadataPath))) {
    await writeJson(metadataPath, {
      version: "0.1",
      createdAt: new Date().toISOString(),
      root
    });
  }
}

export async function loadConfig(root: string): Promise<WatcherConfig> {
  const configPath = watcherPath(root, CONFIG_FILE);
  if (!(await pathExists(configPath))) {
    return {
      version: "0.1",
      ignore: DEFAULT_IGNORES
    };
  }
  return readJson<WatcherConfig>(configPath);
}

export async function createSnapshot(root: string): Promise<Snapshot> {
  await initWatcher(root);
  const config = await loadConfig(root);
  const files = await walkFiles(root, config.ignore);
  const records: FileRecord[] = [];

  for (const file of files) {
    const stat = await fs.stat(file);
    records.push({
      path: toRelative(root, file),
      hash: await hashFilePath(file),
      size: stat.size,
      mtimeMs: stat.mtimeMs
    });
  }

  const snapshot: Snapshot = {
    version: "0.1",
    createdAt: new Date().toISOString(),
    root: path.resolve(root),
    files: records,
    packageJson: await readPackageJsonState(root)
  };

  await writeJson(watcherPath(root, SNAPSHOT_FILE), snapshot);
  return snapshot;
}

export async function loadLatestSnapshot(root: string): Promise<Snapshot> {
  const snapshotPath = watcherPath(root, SNAPSHOT_FILE);
  if (!(await pathExists(snapshotPath))) {
    throw new Error("No snapshot found. Run `agent-task-watcher snapshot` first.");
  }
  return readJson<Snapshot>(snapshotPath);
}
