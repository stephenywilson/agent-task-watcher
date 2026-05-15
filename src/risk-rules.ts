import { promises as fs } from "node:fs";
import path from "node:path";
import type { ChangedFile, DiffResult, Report, RiskFinding, RiskLevel } from "./types.js";
import { pathExists } from "./utils/fs.js";

const SECRET_FILE_RE = /(^|\/)(\.env($|\.)|.*secret.*|.*credential.*|.*token.*|.*key.*)(\/|$)/i;
const WORKFLOW_RE = /^\.github\/workflows\/.+\.ya?ml$/i;
const SENSITIVE_PATH_RE = /(auth|billing|payment|stripe|middleware|permission|permissions|rbac|session|oauth)/i;
const MIGRATION_RE = /(migration|migrations|schema)\//i;
const CONFIG_RE = /(^|\/)(vite|webpack|rollup|eslint|prettier|tsconfig|netlify|vercel|wrangler|next|nuxt|astro|tailwind|docker-compose)\.(json|js|mjs|cjs|ts|yaml|yml|toml)$|(^|\/)Dockerfile$/i;
const API_ROUTE_RE = /(^|\/)(api|routes?)\/.+\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const TEST_RE = /(^|\/)(__tests__|test|tests|spec)\/|(\.|-)(test|spec)\.(ts|tsx|js|jsx)$/i;
const DOC_RE = /\.(md|mdx|txt|rst)$/i;
const SHELL_RE = /\.(sh|bash|zsh)$/i;
const DESTRUCTIVE_COMMAND_RE = /\b(rm\s+-rf|rm\s+-fr|git\s+reset\s+--hard|git\s+clean\s+-fd|chmod\s+-R\s+777|mkfs|dd\s+if=|sudo\s+rm)\b/;

function addFinding(findings: RiskFinding[], finding: RiskFinding): void {
  findings.push({
    ...finding,
    files: Array.from(new Set(finding.files)).sort()
  });
}

function filesMatching(files: ChangedFile[], test: (file: ChangedFile) => boolean): string[] {
  return files.filter(test).map((file) => file.path);
}

async function shellFilesWithDestructiveCommands(root: string, changedFiles: ChangedFile[]): Promise<string[]> {
  const matches: string[] = [];
  for (const file of changedFiles) {
    if (file.type === "deleted" || !SHELL_RE.test(file.path)) {
      continue;
    }

    const fullPath = path.join(root, file.path);
    if (!(await pathExists(fullPath))) {
      continue;
    }

    const content = await fs.readFile(fullPath, "utf8");
    if (DESTRUCTIVE_COMMAND_RE.test(content)) {
      matches.push(file.path);
    }
  }
  return matches;
}

function riskLevelFromScore(score: number, hasCritical: boolean): RiskLevel {
  if (hasCritical || score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export async function buildReport(root: string, diff: DiffResult): Promise<Report> {
  const findings: RiskFinding[] = [];
  const changedFiles = diff.changedFiles;
  const deletedFiles = changedFiles.filter((file) => file.type === "deleted");
  const addedFiles = changedFiles.filter((file) => file.type === "added");
  const modifiedFiles = changedFiles.filter((file) => file.type === "modified");

  const secretFiles = filesMatching(changedFiles, (file) => SECRET_FILE_RE.test(file.path));
  if (secretFiles.length > 0) {
    addFinding(findings, {
      level: "critical",
      score: 40,
      title: "Secret-like files changed",
      detail: "Review these files manually and avoid committing credentials or local secrets.",
      files: secretFiles
    });
  }

  const riskyScripts = ["preinstall", "postinstall", "prepare"].filter((script) =>
    diff.packageJson?.scriptsAdded.includes(script)
  );
  if (riskyScripts.length > 0) {
    addFinding(findings, {
      level: "critical",
      score: 35,
      title: "Package lifecycle scripts added",
      detail: `New lifecycle scripts can execute during install: ${riskyScripts.join(", ")}.`,
      files: ["package.json"]
    });
  }

  const workflowFiles = filesMatching(changedFiles, (file) => WORKFLOW_RE.test(file.path));
  if (workflowFiles.length > 0) {
    addFinding(findings, {
      level: "critical",
      score: 30,
      title: "GitHub Actions workflow changed",
      detail: "Workflow changes can alter CI behavior or secret exposure.",
      files: workflowFiles
    });
  }

  const sensitiveFiles = filesMatching(changedFiles, (file) => SENSITIVE_PATH_RE.test(file.path));
  if (sensitiveFiles.length > 0) {
    addFinding(findings, {
      level: "critical",
      score: 30,
      title: "Sensitive application area changed",
      detail: "Auth, billing, payment, middleware, or permission-related files need first-pass review.",
      files: sensitiveFiles
    });
  }

  if (deletedFiles.length >= 10) {
    addFinding(findings, {
      level: "critical",
      score: 30,
      title: "Many files deleted",
      detail: `${deletedFiles.length} files were deleted.`,
      files: deletedFiles.map((file) => file.path)
    });
  }

  const destructiveShellFiles = await shellFilesWithDestructiveCommands(root, changedFiles);
  if (destructiveShellFiles.length > 0) {
    addFinding(findings, {
      level: "critical",
      score: 35,
      title: "Shell script contains destructive command",
      detail: "Review shell script changes for destructive commands before running them.",
      files: destructiveShellFiles
    });
  }

  const dependenciesAdded = [
    ...(diff.packageJson?.dependenciesAdded ?? []),
    ...(diff.packageJson?.devDependenciesAdded ?? [])
  ];
  if (dependenciesAdded.length > 0) {
    addFinding(findings, {
      level: "high",
      score: 20,
      title: "Dependencies added",
      detail: `New dependencies: ${dependenciesAdded.join(", ")}.`,
      files: ["package.json"]
    });
  }

  if (diff.lockfilesChanged.length > 0) {
    addFinding(findings, {
      level: "high",
      score: 15,
      title: "Lockfile changed",
      detail: "Lockfile changes should be reviewed alongside dependency changes.",
      files: diff.lockfilesChanged
    });
  }

  const migrationFiles = filesMatching(changedFiles, (file) => MIGRATION_RE.test(file.path));
  if (migrationFiles.length > 0) {
    addFinding(findings, {
      level: "high",
      score: 20,
      title: "Database migration changed",
      detail: "Migration changes can affect persisted data.",
      files: migrationFiles
    });
  }

  const configFiles = filesMatching(changedFiles, (file) => CONFIG_RE.test(file.path));
  if (configFiles.length > 0) {
    addFinding(findings, {
      level: "high",
      score: 15,
      title: "Config or deployment file changed",
      detail: "Configuration changes can alter builds, deployments, or runtime behavior.",
      files: configFiles
    });
  }

  const apiFiles = filesMatching(changedFiles, (file) => API_ROUTE_RE.test(file.path));
  if (apiFiles.length > 0) {
    addFinding(findings, {
      level: "high",
      score: 15,
      title: "API route changed",
      detail: "Review request handling, validation, auth, and error behavior.",
      files: apiFiles
    });
  }

  const docsOnly = changedFiles.length > 0 && changedFiles.every((file) => DOC_RE.test(file.path));
  const implementationChanged = changedFiles.some((file) => !DOC_RE.test(file.path) && !TEST_RE.test(file.path));
  const testsChanged = changedFiles.some((file) => TEST_RE.test(file.path));
  const testsRemoved = changedFiles.filter((file) => file.type === "deleted" && TEST_RE.test(file.path));

  if (docsOnly) {
    addFinding(findings, {
      level: "low",
      score: 5,
      title: "Documentation-only changes",
      detail: "Changes appear limited to documentation files.",
      files: changedFiles.map((file) => file.path)
    });
  } else if (changedFiles.some((file) => DOC_RE.test(file.path)) && implementationChanged) {
    addFinding(findings, {
      level: "medium",
      score: 10,
      title: "Documentation changed with implementation",
      detail: "Confirm docs still match the implementation.",
      files: filesMatching(changedFiles, (file) => DOC_RE.test(file.path))
    });
  }

  if (implementationChanged && !testsChanged) {
    addFinding(findings, {
      level: "medium",
      score: 15,
      title: "Implementation changed without test updates",
      detail: "Consider whether existing tests cover the changed behavior.",
      files: filesMatching(changedFiles, (file) => !DOC_RE.test(file.path) && !TEST_RE.test(file.path))
    });
  }

  if (changedFiles.length >= 25) {
    addFinding(findings, {
      level: "medium",
      score: 15,
      title: "Large number of files changed",
      detail: `${changedFiles.length} files changed in this diff.`,
      files: changedFiles.map((file) => file.path)
    });
  }

  if (testsRemoved.length > 0) {
    addFinding(findings, {
      level: "medium",
      score: 15,
      title: "Test files removed",
      detail: "Removed tests can reduce coverage of changed behavior.",
      files: testsRemoved.map((file) => file.path)
    });
  }

  if (findings.length === 0 && changedFiles.length > 0 && changedFiles.length <= 3) {
    addFinding(findings, {
      level: "low",
      score: 5,
      title: "Small isolated change set",
      detail: "No high-risk patterns were detected.",
      files: changedFiles.map((file) => file.path)
    });
  }

  const riskScore = Math.min(
    100,
    findings.reduce((total, finding) => total + finding.score, 0)
  );
  const riskLevel = riskLevelFromScore(riskScore, findings.some((finding) => finding.level === "critical"));

  return {
    generatedAt: diff.generatedAt,
    summary: {
      added: addedFiles.length,
      modified: modifiedFiles.length,
      deleted: deletedFiles.length,
      totalChanged: changedFiles.length
    },
    riskScore,
    riskLevel,
    changedFiles,
    highRiskFindings: findings.filter((finding) => finding.level === "critical" || finding.level === "high"),
    findings,
    suggestedReviewOrder: suggestedReviewOrder(changedFiles, findings),
    nextReviewChecklist: nextReviewChecklist(riskLevel)
  };
}

function suggestedReviewOrder(changedFiles: ChangedFile[], findings: RiskFinding[]): string[] {
  const findingFiles = findings.flatMap((finding) => finding.files);
  const remaining = changedFiles.map((file) => file.path).filter((file) => !findingFiles.includes(file));
  return Array.from(new Set([...findingFiles, ...remaining])).slice(0, 50);
}

function nextReviewChecklist(riskLevel: RiskLevel): string[] {
  const checklist = [
    "Review changed files in the suggested order.",
    "Inspect package.json and lockfile changes before running installs.",
    "Run the project build and test commands locally.",
    "Check that implementation changes have matching tests or manual verification notes.",
    "Confirm no secrets, credentials, or local-only paths were introduced."
  ];

  if (riskLevel === "critical" || riskLevel === "high") {
    checklist.unshift("Pause before committing and manually inspect high-risk findings.");
  }

  return checklist;
}
