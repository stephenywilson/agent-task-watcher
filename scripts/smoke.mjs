import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const cliPath = path.join(projectRoot, "dist", "cli.js");
const tempRoot = mkdtempSync(path.join(tmpdir(), "agent-task-watcher-smoke-"));

function runCli(args) {
  execFileSync(process.execPath, [cliPath, ...args], {
    cwd: tempRoot,
    stdio: "pipe",
    encoding: "utf8"
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  writeFileSync(
    path.join(tempRoot, "package.json"),
    JSON.stringify({ name: "fake-project", version: "0.0.0", scripts: { test: "echo ok" } }, null, 2)
  );
  writeFileSync(path.join(tempRoot, "index.js"), "console.log('before');\n");

  runCli(["init"]);
  runCli(["snapshot"]);

  writeFileSync(path.join(tempRoot, "index.js"), "console.log('after');\n");

  runCli(["report"]);

  const markdownReport = path.join(tempRoot, ".agent-task-watcher", "reports", "latest-report.md");
  const jsonReport = path.join(tempRoot, ".agent-task-watcher", "reports", "latest-report.json");

  assert(existsSync(markdownReport), "Expected latest-report.md to exist");
  assert(existsSync(jsonReport), "Expected latest-report.json to exist");

  const parsedReport = JSON.parse(readFileSync(jsonReport, "utf8"));
  assert(typeof parsedReport.riskScore === "number", "Expected JSON report to contain numeric riskScore");
  assert(typeof parsedReport.riskLevel === "string", "Expected JSON report to contain riskLevel");
  assert(parsedReport.summary?.totalChanged >= 1, "Expected report to detect at least one changed file");

  console.log("Smoke test passed");
} finally {
  if (tempRoot.startsWith(tmpdir())) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
