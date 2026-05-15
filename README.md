# Agent Task Watcher - Catalayer

Track what AI coding agents changed before you trust the result.

AI coding agents can write code faster than humans can review it. Agent Task Watcher helps developers inspect what changed before they trust the result.

## What It Does

Agent Task Watcher is a local-first TypeScript CLI for reviewing repository changes made by Claude Code, Codex, Cursor, and other AI coding agents.

The workflow is simple:

1. Take a snapshot before the agent works.
2. Let the agent modify the repository.
3. Generate a diff and risk report before trusting or committing the result.

The report highlights changed files, dependency changes, lockfile changes, risky package scripts, sensitive paths, and review order.

## Why AI Coding Agents Need Inspection

AI coding agents are useful because they move quickly. That speed also creates review risk:

- A package lifecycle script can be added quietly.
- CI workflows can change how secrets or deployments behave.
- Auth, billing, middleware, or permission files can be modified.
- Tests can be removed or skipped.
- Lockfiles and dependencies can change without enough attention.

Agent Task Watcher gives developers a local review checkpoint before they run unfamiliar commands, trust the output, or commit the change set.

## Installation

For local development from this repository:

```bash
npm install
npm run build
node dist/cli.js --help
```

Optional local linking:

```bash
npm link
agent-task-watcher --help
```

When published later, the intended install shape is:

```bash
npm install -g agent-task-watcher
agent-task-watcher --help
```

## Local Usage

From the repository you want to inspect:

```bash
agent-task-watcher init
agent-task-watcher snapshot
```

Then ask an AI coding agent to work in that repository. After it finishes:

```bash
agent-task-watcher diff
agent-task-watcher report
```

Reports are written to:

```text
.agent-task-watcher/reports/latest-report.md
.agent-task-watcher/reports/latest-report.json
```

## Example Workflow

```bash
cd my-app
agent-task-watcher init
agent-task-watcher snapshot

# Run Claude Code, Codex, Cursor, or another AI coding agent.

agent-task-watcher report
open .agent-task-watcher/reports/latest-report.md
```

Review the report before committing.

## Command Reference

### `agent-task-watcher init`

Creates `.agent-task-watcher`, default config, baseline metadata, and the reports directory.

### `agent-task-watcher snapshot`

Captures the current repository state. Each tracked file records:

- relative path
- SHA-256 hash
- file size
- modified timestamp

The default ignore list skips:

```text
node_modules
.git
dist
build
coverage
.next
.turbo
.agent-task-watcher
```

### `agent-task-watcher diff`

Compares the current repository state with the latest snapshot and prints JSON to stdout.

It detects:

- added files
- modified files
- deleted files
- changed `package.json` scripts
- added or removed dependencies
- lockfile changes

### `agent-task-watcher report`

Generates Markdown and JSON reports with:

- summary
- risk score
- risk level
- changed files
- high-risk findings
- suggested review order
- next review checklist

## Example Risk Findings

Critical findings include:

- `.env` or secret-like files changed
- `preinstall`, `postinstall`, or `prepare` scripts added
- GitHub Actions workflows changed
- auth, billing, payment, Stripe, middleware, or permission-related files changed
- many files deleted
- shell scripts changed with destructive commands

High findings include:

- dependencies added
- lockfile changed
- database migration changed
- config files changed
- API routes changed
- Dockerfile or deployment config changed

Medium findings include:

- implementation changed without test updates
- README or docs changed with implementation changes
- large change sets
- test files removed

Low findings include:

- documentation-only changes
- small isolated changes with no high-risk patterns detected

## Sample Report Preview

```markdown
# Agent Task Watcher Report

- Added: 2
- Modified: 4
- Deleted: 0
- Risk score: 35
- Risk level: HIGH

## High-Risk Findings

- **HIGH**: Dependencies added. New dependencies: example-package. Files: `package.json`.
- **HIGH**: Lockfile changed. Lockfile changes should be reviewed alongside dependency changes. Files: `package-lock.json`.
```

See [docs/sample-report.md](docs/sample-report.md) for a fuller example.

## Privacy and Local-First Design

Agent Task Watcher is local-first.

- No telemetry.
- No external API calls.
- No paid API calls.
- No repository contents are sent anywhere.
- Reports stay inside `.agent-task-watcher`.
- Secrets and `.env` files should not be committed; the tool flags secret-like file changes as critical.

## Release Validation

Before publishing or tagging:

```bash
npm install
npm run build
npm run smoke
npm pack --dry-run
node dist/cli.js --help
```

See [docs/release-checklist.md](docs/release-checklist.md).

## Roadmap

- Named snapshots.
- Configurable risk rules.
- Better formatting-only detection.
- Git-aware review helpers.
- HTML report output.
- Optional baseline labels for multi-agent workflows.

## Catalayer Positioning

Agent Task Watcher - Catalayer helps developers inspect AI-generated code changes before trust, review, and commit.
