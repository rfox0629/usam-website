# CI Baseline

USA-93 adds the strongest safe baseline currently supported by this repository.

## Required checks

- `npm ci`
- `npm test`

## Skipped checks

- Lint is skipped because this repository does not include a lint script or lint configuration.
- Typecheck is skipped because this repository does not include TypeScript sources or a TypeScript configuration.
- Build is skipped because this repository is a Node automation package without a build step.

## Branch target note

The registry default branch is `preservation/initial-20260727`, not `main`. The workflow listens to that active branch and also includes `main` for future compatibility.
