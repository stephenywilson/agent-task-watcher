#!/usr/bin/env node
import { diffFromSnapshot } from "./diff.js";
import { generateReport } from "./report.js";
import { createSnapshot, initWatcher } from "./snapshot.js";

const HELP = `Agent Task Watcher

Track what AI coding agents changed before you trust the result.

Usage:
  agent-task-watcher init
  agent-task-watcher snapshot
  agent-task-watcher diff
  agent-task-watcher report
`;

function printHelp(): void {
  console.log(HELP.trim());
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const root = process.cwd();

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await initWatcher(root);
    console.log("Initialized .agent-task-watcher");
    return;
  }

  if (command === "snapshot") {
    const snapshot = await createSnapshot(root);
    console.log(`Snapshot saved with ${snapshot.files.length} files.`);
    return;
  }

  if (command === "diff") {
    const diff = await diffFromSnapshot(root);
    console.log(JSON.stringify(diff, null, 2));
    return;
  }

  if (command === "report") {
    const report = await generateReport(root);
    console.log(`Report saved to .agent-task-watcher/reports/latest-report.md`);
    console.log(`JSON saved to .agent-task-watcher/reports/latest-report.json`);
    console.log(`Risk: ${report.riskLevel.toUpperCase()} (${report.riskScore})`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`agent-task-watcher: ${message}`);
  process.exitCode = 1;
});
