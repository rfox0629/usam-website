# Community Product Reset — Audit & Recommendation

USA-57. Prepared before any presentation rebuild, per the issue's "audit before rebuilding" instruction.

## Scope of this audit

Inspected the full DOS Groups implementation (USA-32 through USA-35 and the V2 simplification/shared-leadership/public-groups work that followed it):

- Data model and migrations: `supabase/migrations/20260707034007_dos_private_groups.sql`, `20260712235050_dos_groups_simplification_shared_leadership.sql`, `20260713022111_dos_identity_shared_leadership.sql`, and the public-site/member-portal migration described in `docs/dos-public-groups-member-portal-architecture.md`.
- Server logic: `app/api/dos/app/groups/*`, `app/groups/actions.ts`, `src/lib/dos/groups.ts`, `src/lib/dos/identity.ts`.
- Presentation: `app/groups/page.tsx` (public directory), `app/groups/[slug]/page.tsx` + `PublicGroupPageTemplate.tsx` (public group page), `app/groups/GroupHomeMemberView.tsx` (member portal), and the in-workspace Groups UI inside `app/dos/app/DosMvpAppClient.tsx`.
- Prior product direction: `docs/dos-groups-v2-polish-audit.md`, `docs/dos-groups-v2-rollout.md`, `docs/dos-identity-shared-leadership.md`, `docs/dos-groups-v2-shared-leadership-beta-validation.md`.
- Existing regression coverage: `scripts/dos-groups-regression.mjs` and seven related `dos-group-*` regression scripts.

## Finding 1 — The engine is sound and should be preserved in full

The data model and authorization layer already match the executive direction's "shared engine for people, gatherings, prayer, resources, attendance, invitations" description almost exactly:

- **Shared objects**: `dos_groups`, `dos_group_members`, `dos_group_gatherings`, `dos_group_attendance`, `dos_group_resources` — single source-of-truth rows, RLS-protected, `anon` revoked.
- **Shared leadership**: `leader` / `co_leader` / `helper` / `member` / `guest` roles with attribution split so co-leading doesn't double-count credit (`acting_leader_person_id`).
- **Canonical identity**: `dos_identity_links` bridges `auth.users` → `profiles` → `missionary_field_people`, with candidate/ambiguous/verified states — this is the duplicate-detection and per-leader-ownership mechanism the issue asks to preserve.
- **Join approvals**: public join requests write to `dos_group_join_requests`, never directly to members; leader review reuses/creates the canonical Field person before activating membership.
- **Member portal**: purpose-built, non-DOS access via hashed, single-use, expiring tokens and hashed, revocable sessions — no separate login system, no plaintext secrets stored.
- **Prayer, RSVP, resources, notifications**: reuse existing `prayer_requests` rather than a parallel table; RSVP (`dos_group_rsvps`) is explicitly kept distinct from leader-confirmed attendance (`dos_group_attendance`); notification preferences are scoped per member/group/channel/type and kept separate from donor/newsletter consent.
- **Public-site routing**: `hostname + /groups + slug → public_sites → organization → dos_groups`, with per-site slug uniqueness — already supports the org-scoped, per-leader-workspace directory model the issue asks for (see Finding 3).

This is not legacy debt. It is recent (July 2026), documented, and was already built with the "Communities" mental model in mind — the docs already describe groups as the shared substrate for "future shared features." **No architectural blocker exists that would justify a full rebuild.**

## Finding 2 — Public presentation is already at the target quality bar

`app/groups/page.tsx`, `PublicGroupPageTemplate.tsx`, and `GroupHomeMemberView.tsx` all use one consistent, premium visual system: dark `#080A0D` surfaces, `#C2A14E` / `#F8C56A` gold accents, restrained typography, compact fact rows, single-purpose sections. This is the same design language called for in the issue ("Premium DOS/USAM visual quality," "simple header and footer," "no internal management controls"). Concretely:

- The public directory distinguishes nothing internal — no attendance, settings, or leader tooling language, matching `docs/dos-groups-v2-polish-audit.md`'s "avoid exposing internal workflow language" recommendation.
- The public group page is organized around one join action, next-gathering facts, and "what to expect" — not a dashboard.
- The member portal is a single-column, role-appropriate surface (next gathering → RSVP → latest update → prayer → resources → notification preferences → sign out), matching the issue's "lightweight access... simple, welcoming, mobile-first" requirement exactly.

**Recommendation: preserve as-is.** This is Claude's strongest prior DOS/Community design work referenced in the issue, and it already lives in this codebase.

## Finding 3 — The real drift is workspace-side duplication, not visual quality

Inside `app/dos/app/DosMvpAppClient.tsx`, two parallel Groups implementations currently coexist, gated by the `dos_groups_simplified_v2` workspace feature flag:

| | Legacy (`GroupsWorkspace` / `GroupDetailWorkspace`) | V2 (`GroupsWorkspaceV2` / `GroupDetailWorkspaceV2`) |
|---|---|---|
| Detail hero | Up to 6 header CTAs, no single primary action | One primary action (Start/Log Meeting), Add Person, and a collapsed "More" sheet for everything else |
| Overview tab | 7–8 stacked `DesktopPanel` cards (Next Gathering, Attendance Trend, Recent Prayer, Recent Fruit, Follow Ups, Group Health, Recent Activity, Rhythms) | One status grid + one recent-activity panel |
| Tabs | 7 (overview/members/gatherings/attendance/prayer/resources/settings) | 4 (overview/people/gatherings/settings) |
| Enabled for | Every workspace *except* Ryan's | Ryan's workspace only (`docs/dos-groups-v2-rollout.md`) |

This is a direct instance of the AGENTS.md rule "Do not create duplicate UI paths for the same workflow," and it means **the majority of real users (Dirk and every other workspace) are still on the drifted legacy UI**, while the already-refined replacement sits behind a beta flag that was never widened.

Critically, V2 is not a mockup — it already implements almost everything `docs/dos-groups-v2-polish-audit.md` asked for (single primary CTA, collapsed secondary actions, status-focused overview, no stacked cards), and it uses the same operational blue/white system used consistently across the *rest* of the DOS app (644 uses of the blue accent across the file vs. 4 incidental gold references) — this is DOS/Field's own established design language, distinct from the public/member-facing gold-and-dark system, and distinct from Command Center's. Per AGENTS.md, "DOS/Field is the mobile daily-use app. Do not blur the product roles in UI copy" — so this is not drift to fix, it's intentional product separation.

`docs/dos-groups-v2-shared-leadership-beta-validation.md` confirms the live two-account validation (Ryan + Brandon) that gates widening the rollout **has not been executed.** That is the actual blocker to closing the drift — not a design problem.

## Finding 4 — "Communities" as the umbrella product is not yet reflected

Every surface still says "Group." The template registry (`src/lib/dos/groups.ts`) only offered Men's/Women's Discipleship and the 2three2 activity matrix — none of Kitchen Table, House Church, Prayer Community, Ministry Team, Cohort, or Custom Community existed as first-class options, even though the underlying schema (`template_key`, `template_category`, `type`) was already generic enough to support them without migration.

## Recommendation: Refine in place

All three conditions for "full rebuild" per the issue are absent — the architecture does not block the approved product, the engine is demonstrably preserved-worthy, and the public-facing presentation already meets the target bar. **Preserve the engine. Continue the already-started presentation refinement (V2) rather than rebuilding it. Close the duplication instead of adding a third implementation.**

Concretely, in priority order:

1. **Done in this pass (safe, additive, zero migration):** expanded `dosGroupCreationTemplates` with Kitchen Table, House Church, Prayer Community, Ministry Team, Cohort, and Custom Community, reusing existing `template_category` ("discipleship") and `type` ("discipleship"/"prayer") enum values already permitted by the `dos_groups_type_check` and `dos_groups_template_category_check` constraints — no schema change. Wired the new template labels into the workspace group card/detail header (`groupTemplateDisplayLabel`) and the public directory (`publicGroupType`) so a Community's template is recognizable everywhere it's already surfaced. See files changed below.
2. **Requires a founder decision before code work, not a design call:** execute the documented Ryan/Brandon shared-leadership validation (`docs/dos-groups-v2-shared-leadership-beta-validation.md`), then widen the `dos_groups_simplified_v2` flag to Dirk and, once validated, to the standard rollout — at which point the legacy `GroupsWorkspace`/`GroupDetailWorkspace` implementation (~700 lines) can be deleted outright. This is a rollout/data decision (affects other missionaries' live workspaces), not a presentation-layer change, and is explicitly gated by "No production deployment without Founder Approval."
3. **Scoped follow-up, requires sign-off given live-URL/SEO impact:** rename "Group" → "Community" in user-facing copy only (nav labels, page titles, headings) across the public directory, public group page, member portal, and V2 workspace UI, while leaving `dos_groups` and every API/table name untouched, per AGENTS.md's explicit instruction not to rename internal contracts for terminology. Not executed in this pass because it touches live, indexed public pages (including the production `2three2` URL) and should be a founder-reviewed, single-purpose change rather than bundled with template/engine work.
4. **Design follow-up:** People and Gatherings tabs (both legacy and V2) were not redesigned in this pass; they inherit V2's existing compact-row pattern already and were judged in-bounds for the current design system, but a dedicated pass matching the new template vocabulary (e.g., "Cohort" gatherings vs. "Kitchen Table" gatherings) is worth scoping once terminology lands.

## Files changed in this pass

- `src/lib/dos/groups.ts` — added six Community template definitions.
- `app/api/dos/app/groups/route.ts` — mapped the new `prayer_community` template to the existing `type = 'prayer'` DB value; all other new templates use the existing `type = 'discipleship'` default.
- `app/dos/app/DosMvpAppClient.tsx` — `groupTemplateDisplayLabel` now returns the correct label for each new template instead of falling back to a generic type label.
- `app/groups/page.tsx` — public directory now selects `template_key` and labels new-template groups correctly instead of defaulting to "Discipleship Group."

No database migration, no renamed identifiers, no changes to authorization, RLS, or the legacy/V2 flag routing.

## Explicitly not done in this pass

- No visual rebuild of any screen — none was warranted.
- No flag rollout change (Ryan-only stays Ryan-only) — validation is undone and this is a founder-gated rollout decision.
- No "Group" → "Community" terminology rename in shipped copy — scoped as a separate, founder-reviewed change due to live public-page/SEO impact.
- No deletion of the legacy V1 workspace implementation — it is still load-bearing for every non-Ryan workspace today.
