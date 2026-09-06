# DOS Groups Production Branch Lock

Date: 2026-07-09

Canonical production integration branch: `main`

Source branch merged into production integration: `codex/production-groups-restore`

Production deploys for DOS Groups must be created only from `main` after it contains this release note, or from descendants of this production integration state. Do not deploy DOS Groups production changes from `codex/public-launch-cleanup`, older feature branches, or older worktrees.

The production integration state must include the full DOS Groups implementation:

- Private DOS Groups admin under DOS.
- Groups sidebar navigation under MORE.
- Groups Apps/More launcher card.
- Real workspace group loading for signed-in DOS routes.
- Ryan Fox workspace group seed/upsert support.
- Unified DOS prayer request architecture.
- Group member and settings API routes.
- Public-safe `/groups` directory.
- Public-safe `/groups/[slug]` landing pages.
- DOS Groups regression script.

Required predeploy proof:

- Clean worktree.
- Release branch contains the restored Groups implementation from `codex/production-groups-restore`.
- Required files/routes exist, including `app/groups/page.tsx`, `app/groups/[slug]/page.tsx`, `app/api/dos/app/groups/members/route.ts`, `app/api/dos/app/groups/settings/route.ts`, `src/lib/dos/group-seeds.ts`, and `scripts/dos-groups-regression.mjs`.
- `npm run test:dos-groups`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- Browser smoke verifies `/dos/ryan-fox`, `/groups`, and `/groups/2three2`.

Last known restored production commit before this note: `20001041c0c2d18b69e7cb75246c726ffa304000`.
