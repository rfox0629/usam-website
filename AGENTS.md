# AGENTS.md v2

These instructions are the working contract for this repo. Follow them before making product, UI, data, auth, or deployment decisions.

## Product Structure

This repo contains three active surfaces:

- USA Missionaries public website: public nonprofit and training movement pages.
- DOS mobile app: active launch priority for everyday discipleship.
- DOS Command Center/admin: internal leadership, operations, review, publishing, and workspace management.

Current product meaning:

- USA Missionaries = public nonprofit / training movement.
- Kitchen Table Gospel = discipleship methodology and teaching flow.
- DOS = mobile discipleship app.
- Command Center = admin / leadership / operations layer.

DOS is not limited to USA Missionaries. USA Missionaries is the first major implementation built on top of DOS.

## Current Priority

DOS mobile app is the active launch priority.

For now:

- Build and polish the DOS mobile experience.
- Keep DOS fast, simple, and field-first.
- Do not build a desktop DOS app yet.
- Desktop work belongs in Command Center unless Ryan explicitly asks for otherwise.
- Workspace v2 is parked; do not work on it unless explicitly requested.

## Route Boundaries

Launch routes:

- `/dos` = user entry, login, onboarding, and workspace selection.
- `/dos/app?workspace=<slug>` = primary DOS mobile app.
- `/dos/workspaces/[slug]` = parked Workspace v2 route unless the existing feature flag enables it.
- `/admin/*` = Command Center / internal admin.

Internal routes:

- `/admin/dashboard` = Command Center.
- `/admin/missionary-profiles` = classic Missionary Workspace / admin workspace.
- `/admin/workspaces/[id]/preview` = admin-only Workspace v2 preview when needed.

Do not send normal external users into `/admin` routes.

## DOS UI Rules

DOS is mobile-first only for now.

- Entire DOS app shell should stay centered on desktop.
- DOS app shell max width should stay around `430px` to `480px`.
- Do not expand DOS into a desktop dashboard.
- Use the DOS blue/white visual system.
- Use Inter for DOS UI.
- Keep it Planning Center inspired: clean, calm, simple, useful.
- Prefer bottom sheets, compact cards, rounded controls, segmented choices, and low-copy flows.
- Avoid CRM language, CRM density, and admin-style dashboards.
- Keep the bottom nav visible across authenticated DOS app screens unless a temporary modal/sheet intentionally overlays it.
- Use progressive disclosure for optional details.
- Every DOS flow should feel usable on a phone in seconds.

DOS language:

- People, not contacts as the primary product word.
- Meetings, not Tables, in user-facing DOS UI.
- Reviews are verification/testimony input from people ministered to.
- Fruit is curated/moderated output, not a raw activity label.
- Follow Ups are action-oriented next steps.

## Command Center UI Rules

Command Center is internal operations software.

- Dark/gold brand system.
- Desktop optimized, but still responsive.
- Admin only.
- Use compact operational layouts.
- Prioritize review queues, publishing, leadership visibility, metrics, workspace management, and exceptions.
- Do not make Command Center look like DOS.
- Do not leak DOS blue into Command Center chrome unless explicitly requested.
- Admin pages must stay protected by Supabase auth and admin access checks.

Command Center language:

- Command Center = internal/admin operating layer.
- Missionary Workspace = classic admin workspace for USAM missionary operations.
- Profiles = public missionary profile publishing layer.
- Publishing = curated public output only.

## Public Website Rules

Public pages are invitational, not app dashboards.

- Keep public pages simple, clear, and mission-forward.
- Do not expose raw, reviewed, private, admin-only, or unapproved data.
- Public Profiles show approved and curated data only.
- Do not add app-style dashboards to public pages.

Typography:

- Do not introduce new fonts unless explicitly requested.
- Preserve the existing public site font system.
- Display/headline font is for major public page titles only.
- Body/UI font is for paragraphs, buttons, cards, forms, and testimonials.
- Testimonials should not use new serif or decorative fonts.

## Data Rules

Supabase is the single source of truth.

Do not:

- Create duplicate data models.
- Create separate people/contact systems.
- Sync between parallel copies of the same data.
- Store disciples or ministry relationships in public Team records.
- Expose service-role data or private records to client components.

People:

- `missionary_field_people` is the canonical people table.
- `workspace_id` is the primary workspace scope.
- `household_id` fallback exists only for backward compatibility with older/local schemas.
- Do not create `people`, `dos_people`, `workspace_people`, or another duplicate table.
- Mobile quick add, mobile people read/edit, desktop Add/Edit Person, and CSV import should all use `missionary_field_people`.

Meetings:

- Use `Meetings` in user-facing DOS UI.
- Backend may still use table-oriented names such as `missionary_tables`; do not rename schema casually.
- Meeting Context = how we met, such as Kitchen Table, Coffee, Phone, Zoom, Text, Prayer, Group, Discipleship, Other.
- Conversation Flow = what spiritual discussion happened, such as None or Kitchen Table Gospel.
- Kitchen Table Gospel is USAM-gated unless product direction changes.
- Notes belong primarily inside meetings, not as a standalone person activity stream.

Reviews and Fruit:

- Quick Reviews and Fruit are separate by purpose.
- Quick Reviews are external verification/testimony input.
- Quick Reviews should default to pending/private review states.
- Fruit is moderated, curated, and approved output.
- Approved Fruit may later feed public Profiles; raw reviews should not publish automatically.

Workspace scope:

- Preserve `workspace_id` on new records where supported.
- Keep multi-tenant assumptions intact.
- Ryan & Brooke may be the primary test workspace, but code must not hardcode to that workspace.

## Circle Rules

My 3 / My 12 / My 70 are active MVP features.

- Circle Engine exists.
- Engagement scoring exists.
- Engagement score range is `-3` to `+3`.
- Use the existing `engagement_level` field for the engagement score.
- Do not create duplicate scoring fields.
- Do not create parallel circle tables or competing score systems unless explicitly requested.
- Circle logic should remain explainable and easy to override later.

Circle language:

- My 3 = highest-focus people.
- My 12 = active discipleship relationships.
- My 70 = broader field.

## Auth Rules

- `/admin/*` requires admin access.
- `/dos/app` requires authenticated DOS workspace access.
- Admin users may access admin tools and may inspect workspaces.
- Non-admin DOS users may access only their own DOS workspace.
- If a user is authenticated but not connected to a workspace, show a clear access state.
- If a user is unauthenticated, route to login with the intended DOS destination preserved.
- Do not send normal DOS users to an admin login wall.

## Workflow Rules To Save Time

Localhost first.

- Work locally before thinking about deployment.
- Do not deploy until Ryan approves.
- Do not work on preview/demo routes unless explicitly requested.
- Use the Ryan & Brooke workspace as the primary test environment.
- Keep code multi-tenant even when testing with Ryan & Brooke.
- Batch related UI changes instead of tiny scattered edits.
- Avoid overbuilding.
- Prefer the smallest change that preserves the architecture.
- Do not touch unrelated local files.
- Do not commit generated or unrelated artifacts.

Report back using only:

```text
Changed:
Tested:
Local URL:
Risks:
```

## Validation

Before committing code changes, run:

- `npx tsc --noEmit`
- `npm run lint --if-present`
- `npm run build` when appropriate

For documentation-only changes, build is usually not required. Say clearly when validation is skipped because the change is docs-only.

## Deployment Workflow

- Do not deploy to production unless Ryan explicitly asks.
- Pushing to GitHub is allowed when Ryan requests a commit/push.
- Vercel production deployment should happen only after Ryan approval.
- For production auth or routing fixes, verify the exact production URL after deployment.
- Never assume production is fixed just because local build passed.

## Protected Preview Smoke Tests

Vercel preview deployments may be protected by SSO or Deployment Protection.

- Use the local-only `VERCEL_AUTOMATION_BYPASS_SECRET` in `.env.local` when smoke testing protected preview URLs.
- Never commit, paste, log, screenshot, or expose the bypass secret.
- If the secret is missing, generate or retrieve the project Protection Bypass for Automation token and add it to `.env.local`; do not deploy to production just to get around preview protection.
- Prefer the HTTP header for scripts and CLI checks:

```bash
SECRET="$(awk -F= '/^VERCEL_AUTOMATION_BYPASS_SECRET=/{print substr($0,index($0,"=")+1)}' .env.local)"
curl -I -H "x-vercel-protection-bypass: $SECRET" "$PREVIEW_URL/dos/app/preview?demo=dos2026"
```

- For browser smoke where custom headers are awkward, open the preview once with the bypass query and cookie setter:

```text
$PREVIEW_URL/dos/app/preview?demo=dos2026&x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true
```

- Do not print `Set-Cookie` headers while testing bypass cookies; the cookie is sensitive.
- After the bypass cookie is set, smoke test the expected routes without fighting the SSO wall:
  - `/dos/app/preview?demo=dos2026`
  - `/dos/app?workspace=ryan-brooke-fox`
  - `/admin/circle-engine`
  - `/admin/relationship-intelligence`
  - `/admin/login`
- Prefer one automated Chrome smoke test across the critical routes above instead of repeatedly clicking through protected preview pages manually.
- For DOS launch checks, also run a 390px mobile smoke and verify the Fruit tab, bottom nav, and horizontal overflow.
- If a preview still returns `401` with the bypass header, treat the bypass setup as the blocker and fix that before testing app behavior.

## Coding Standards

- Read existing code before changing it.
- Reuse existing helpers, route patterns, auth checks, and Supabase clients.
- Keep server-only Supabase service-role usage on the server.
- Keep client components free of private credentials.
- Use TypeScript types where they clarify behavior.
- Keep comments rare and useful.
- Use TODO comments only for real deferred work.
- Keep changes scoped to the request.
- Do not refactor unrelated modules while shipping a launch fix.

## Git Rules

- Commit only intentional files.
- Do not commit `.agents/`, generated lock files, temp files, local SQL scratch files, or unrelated work.
- Do not revert user changes unless explicitly asked.
- If unrelated dirty files exist, leave them alone and mention them.

## Anti-Bloat Rules

- Do not add features because there is empty space.
- Do not add tutorial copy to compensate for unclear UX.
- Simplify the UX instead.
- Do not create duplicate UI paths for the same workflow.
- Do not create duplicate data models for separate interfaces.
- Do not expose raw/private data publicly.
- Do not build desktop DOS until requested.
- Do not revive legacy DOS collective prototype routes/helpers unless explicitly requested.

## Current Launch Bias

When unsure, bias toward:

- DOS mobile app over Workspace v2.
- People and Meetings over dashboards.
- Fast capture over full CRM detail.
- Local validation over premature deploys.
- Canonical tables over compatibility duplication.
- Clean access paths over clever route architecture.
