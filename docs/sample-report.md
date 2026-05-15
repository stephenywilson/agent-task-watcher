# Agent Task Watcher Report

Generated: 2026-05-15T00:00:00.000Z

## Summary

- Added: 1
- Modified: 3
- Deleted: 0
- Total changed: 4
- Risk score: 35
- Risk level: HIGH

## High-Risk Findings

- **HIGH**: Dependencies added. New dependencies: example-package. Files: `package.json`.
- **HIGH**: Lockfile changed. Lockfile changes should be reviewed alongside dependency changes. Files: `package-lock.json`.

## Changed Files

- modified: `package.json`
- modified: `package-lock.json`
- modified: `src/app.ts`
- added: `src/app.test.ts`

## Suggested Review Order

1. `package.json`
2. `package-lock.json`
3. `src/app.ts`
4. `src/app.test.ts`

## Next Review Checklist

- [ ] Pause before committing and manually inspect high-risk findings.
- [ ] Review changed files in the suggested order.
- [ ] Inspect package.json and lockfile changes before running installs.
- [ ] Run the project build and test commands locally.
- [ ] Check that implementation changes have matching tests or manual verification notes.
- [ ] Confirm no secrets, credentials, or local-only paths were introduced.
