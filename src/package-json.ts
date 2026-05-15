import { promises as fs } from "node:fs";
import path from "node:path";
import type { PackageJsonChange, PackageJsonState } from "./types.js";
import { pathExists } from "./utils/fs.js";

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

export async function readPackageJsonState(root: string): Promise<PackageJsonState | undefined> {
  const packagePath = path.join(root, "package.json");
  if (!(await pathExists(packagePath))) {
    return undefined;
  }

  const raw = await fs.readFile(packagePath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    scripts: stringRecord(parsed.scripts),
    dependencies: stringRecord(parsed.dependencies),
    devDependencies: stringRecord(parsed.devDependencies)
  };
}

function addedKeys(before: Record<string, string>, after: Record<string, string>): string[] {
  return Object.keys(after).filter((key) => !(key in before)).sort();
}

function removedKeys(before: Record<string, string>, after: Record<string, string>): string[] {
  return Object.keys(before).filter((key) => !(key in after)).sort();
}

function changedKeys(before: Record<string, string>, after: Record<string, string>): string[] {
  return Object.keys(after).filter((key) => key in before && before[key] !== after[key]).sort();
}

export function diffPackageJson(
  before: PackageJsonState | undefined,
  after: PackageJsonState | undefined
): PackageJsonChange | undefined {
  if (!before && !after) {
    return undefined;
  }

  const previous = before ?? { scripts: {}, dependencies: {}, devDependencies: {} };
  const current = after ?? { scripts: {}, dependencies: {}, devDependencies: {} };

  return {
    scriptsAdded: addedKeys(previous.scripts, current.scripts),
    scriptsRemoved: removedKeys(previous.scripts, current.scripts),
    scriptsChanged: changedKeys(previous.scripts, current.scripts),
    dependenciesAdded: addedKeys(previous.dependencies, current.dependencies),
    dependenciesRemoved: removedKeys(previous.dependencies, current.dependencies),
    devDependenciesAdded: addedKeys(previous.devDependencies, current.devDependencies),
    devDependenciesRemoved: removedKeys(previous.devDependencies, current.devDependencies)
  };
}
