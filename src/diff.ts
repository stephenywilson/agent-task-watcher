import type { ChangedFile, DiffResult, FileRecord, Snapshot } from "./types.js";
import { readPackageJsonState, diffPackageJson } from "./package-json.js";
import { loadConfig, loadLatestSnapshot } from "./snapshot.js";
import { hashFilePath, toRelative, walkFiles } from "./utils-imports.js";
import { promises as fs } from "node:fs";

const LOCKFILES = new Set(["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]);

function byPath(files: FileRecord[]): Map<string, FileRecord> {
  return new Map(files.map((file) => [file.path, file]));
}

async function currentFiles(root: string): Promise<FileRecord[]> {
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

  return records;
}

export async function diffFromSnapshot(root: string, snapshot?: Snapshot): Promise<DiffResult> {
  const baseline = snapshot ?? (await loadLatestSnapshot(root));
  const before = byPath(baseline.files);
  const after = byPath(await currentFiles(root));
  const changedFiles: ChangedFile[] = [];

  for (const [filePath, current] of after) {
    const previous = before.get(filePath);
    if (!previous) {
      changedFiles.push({ path: filePath, type: "added", after: current });
      continue;
    }

    if (previous.hash !== current.hash || previous.size !== current.size) {
      changedFiles.push({ path: filePath, type: "modified", before: previous, after: current });
    }
  }

  for (const [filePath, previous] of before) {
    if (!after.has(filePath)) {
      changedFiles.push({ path: filePath, type: "deleted", before: previous });
    }
  }

  changedFiles.sort((a, b) => a.path.localeCompare(b.path));

  return {
    snapshotCreatedAt: baseline.createdAt,
    generatedAt: new Date().toISOString(),
    changedFiles,
    packageJson: diffPackageJson(baseline.packageJson, await readPackageJsonState(root)),
    lockfilesChanged: changedFiles
      .map((file) => file.path)
      .filter((filePath) => LOCKFILES.has(filePath.split("/").pop() ?? ""))
      .sort()
  };
}
