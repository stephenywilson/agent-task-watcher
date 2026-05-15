import path from "node:path";
import type { ChangedFile, Report, RiskFinding } from "./types.js";
import { diffFromSnapshot } from "./diff.js";
import { buildReport } from "./risk-rules.js";
import { ensureDir, watcherPath, writeJson } from "./utils/fs.js";
import { promises as fs } from "node:fs";

function changedFileLine(file: ChangedFile): string {
  return `- ${file.type}: \`${file.path}\``;
}

function findingLine(finding: RiskFinding): string {
  const files = finding.files.length > 0 ? ` Files: ${finding.files.map((file) => `\`${file}\``).join(", ")}.` : "";
  return `- **${finding.level.toUpperCase()}**: ${finding.title}. ${finding.detail}${files}`;
}

export function renderMarkdownReport(report: Report): string {
  const highRiskFindings = report.highRiskFindings.length > 0
    ? report.highRiskFindings.map(findingLine).join("\n")
    : "- No high-risk findings detected.";

  const findings = report.findings.length > 0
    ? report.findings.map(findingLine).join("\n")
    : "- No risk findings detected.";

  const changedFiles = report.changedFiles.length > 0
    ? report.changedFiles.map(changedFileLine).join("\n")
    : "- No file changes detected.";

  const reviewOrder = report.suggestedReviewOrder.length > 0
    ? report.suggestedReviewOrder.map((file, index) => `${index + 1}. \`${file}\``).join("\n")
    : "No changed files to review.";

  return `# Agent Task Watcher Report

Generated: ${report.generatedAt}

## Summary

- Added: ${report.summary.added}
- Modified: ${report.summary.modified}
- Deleted: ${report.summary.deleted}
- Total changed: ${report.summary.totalChanged}
- Risk score: ${report.riskScore}
- Risk level: ${report.riskLevel.toUpperCase()}

## High-Risk Findings

${highRiskFindings}

## All Findings

${findings}

## Changed Files

${changedFiles}

## Suggested Review Order

${reviewOrder}

## Next Review Checklist

${report.nextReviewChecklist.map((item) => `- [ ] ${item}`).join("\n")}
`;
}

export async function generateReport(root: string): Promise<Report> {
  const diff = await diffFromSnapshot(root);
  const report = await buildReport(root, diff);
  const reportsDir = watcherPath(root, "reports");
  await ensureDir(reportsDir);
  await writeJson(path.join(reportsDir, "latest-report.json"), report);
  await fs.writeFile(path.join(reportsDir, "latest-report.md"), renderMarkdownReport(report), "utf8");
  return report;
}
