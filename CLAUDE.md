# Claude Code instructions (repository root)

- **DOS application** (`app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`): start from `app/dos/AGENTS.md`. The canonical UI and behavior specification is `docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md`; precedence is Linear issue → that spec → V10 reference → `app/dos/README.md` → root `AGENTS.md` (whose DOS-specific statements are superseded for those paths, decision D1). Verify with `npm run typecheck`, `npm run test:dos`, `npm run build`, `npm run test:dos:visual`.
- **Website and admin**: the root `AGENTS.md` applies.
- Engineering process (branches, PRs, founder review, what needs approval): `tooling/automation/docs/ENGINEERING_ONBOARDING.md`.
