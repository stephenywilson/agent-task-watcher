export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ChangeType = "added" | "modified" | "deleted";

export interface WatcherConfig {
  version: string;
  ignore: string[];
}

export interface FileRecord {
  path: string;
  hash: string;
  size: number;
  mtimeMs: number;
}

export interface Snapshot {
  version: string;
  createdAt: string;
  root: string;
  files: FileRecord[];
  packageJson?: PackageJsonState;
}

export interface ChangedFile {
  path: string;
  type: ChangeType;
  before?: FileRecord;
  after?: FileRecord;
}

export interface PackageJsonChange {
  scriptsAdded: string[];
  scriptsRemoved: string[];
  scriptsChanged: string[];
  dependenciesAdded: string[];
  dependenciesRemoved: string[];
  devDependenciesAdded: string[];
  devDependenciesRemoved: string[];
}

export interface PackageJsonState {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface DiffResult {
  snapshotCreatedAt: string;
  generatedAt: string;
  changedFiles: ChangedFile[];
  packageJson?: PackageJsonChange;
  lockfilesChanged: string[];
}

export interface RiskFinding {
  level: RiskLevel;
  score: number;
  title: string;
  detail: string;
  files: string[];
}

export interface Report {
  generatedAt: string;
  summary: {
    added: number;
    modified: number;
    deleted: number;
    totalChanged: number;
  };
  riskScore: number;
  riskLevel: RiskLevel;
  changedFiles: ChangedFile[];
  highRiskFindings: RiskFinding[];
  findings: RiskFinding[];
  suggestedReviewOrder: string[];
  nextReviewChecklist: string[];
}
