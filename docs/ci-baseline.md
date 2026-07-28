# CI Baseline

USA-93 adds the strongest safe baseline currently supported by this repository.

## Required checks

- `npm ci`
- `npm run typecheck`
- `npm run build`
- `npm run smoke`

## Skipped checks

- Lint is skipped because this repository does not currently include an ESLint configuration or lint script.
- Unit tests are skipped because there is no generic unit test runner. Existing domain regression scripts have mixed external-service requirements and remain available for targeted work.
