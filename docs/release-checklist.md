# Release Checklist

Use this checklist before publishing Agent Task Watcher v0.1.

## Local Validation

```bash
npm install
npm run build
npm run smoke
npm pack --dry-run
node dist/cli.js --help
```

## Separate Repository Test

1. Create or open a separate local test repository.
2. Run `node /absolute/path/to/agent-task-watcher/dist/cli.js init`.
3. Run `node /absolute/path/to/agent-task-watcher/dist/cli.js snapshot`.
4. Modify a small file in the test repository.
5. Run `node /absolute/path/to/agent-task-watcher/dist/cli.js report`.
6. Confirm both reports exist:
   - `.agent-task-watcher/reports/latest-report.md`
   - `.agent-task-watcher/reports/latest-report.json`
7. Confirm the JSON report includes `riskScore` and `riskLevel`.

## Git Tag Checklist

1. Confirm `npm run build` passes.
2. Confirm `npm run smoke` passes.
3. Confirm `npm pack --dry-run` includes only expected files.
4. Review `CHANGELOG.md`.
5. Commit the release changes.
6. Create a tag:

```bash
git tag v0.1.0
```

## npm Publish Checklist

1. Confirm the package name is available or intentionally scoped.
2. Confirm `package.json` version is correct.
3. Confirm `bin.agent-task-watcher` points to `./dist/cli.js`.
4. Confirm no `.env`, local reports, credentials, or private files are included in `npm pack --dry-run`.
5. Publish only after the dry run looks clean:

```bash
npm publish
```
