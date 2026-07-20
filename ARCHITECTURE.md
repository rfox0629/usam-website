# ARCHITECTURE.md — System Boundaries

This document defines the stable boundaries between the products that
share this repository and Supabase project. It is intentionally about
*ownership and boundaries*, not implementation detail — see
[`docs/ncc-architecture.md`](docs/ncc-architecture.md) for the deep NCC
department/module architecture, and [`AGENTS.md`](AGENTS.md) for DOS/
Command Center UI and data-model rules.

There is **one shared Supabase project**. Product boundaries below are
ownership and access boundaries, not separate databases or duplicated data
models — see `AGENTS.md`'s Core Principle for why duplicate models are
disallowed.

## Public Website

**Owns:** public marketing, mission/vision content, missionary profile
pages (public-facing), Financial Freedom public intake, and public
application/join intake.

- Public front door only — no admin/operational dashboards.
- Displays only approved, curated data (mirrors the DOS `RAW → REVIEWED →
  APPROVED` rule in `AGENTS.md` — never expose RAW or REVIEWED content
  publicly).
- Canonical routes today: `/`, `/financialfreedom`, `/give/[userId]`,
  `/missionaries`, and public profile routes.

## Discipleship Operating System (DOS)

**Owns:** personal discipleship and ministry activity — People, Tables
(meetings), Encounters, Reviews, Discipleship Assessment, Fruit,
Connection Logs, and the daily ministry loop.

- Canonical entry route: `/dos`. Mobile is "the Field," desktop/Command
  Center view is "the Hub" — see `app/dos/README.md` for the full route
  boundary and canonical data tables (`missionary_field_people`,
  `missionary_tables`, etc.).
- DOS Core is platform-level and organization-agnostic; USA Missionaries'
  Missionary Workspace is an implementation layer on top of it. Other DOS
  organizations must not see USAM-specific fundraising/profile/support
  features by default.
- Detailed product/data-model rules for this surface live in `AGENTS.md`
  and should be read before touching DOS code.

## National Command Center (NCC)

**Owns:** organizational operations — finance, compliance, governance,
payroll, reporting, annual filings, and document intelligence for USA
Missionaries (and, in the future, other organizations on the platform).

- Canonical route tree going forward: `/ncc` (additive; see
  [`docs/ncc-route-canonicality.md`](docs/ncc-route-canonicality.md) for
  the full decision record). `/admin` remains fully functional as the
  legacy Command Center surface and is not being removed — departments
  migrate from `/admin` to `/ncc` one at a time, not in a single cutover.
- NCC may read, review, manage, approve, and report on shared Supabase
  data written by DOS (e.g. discipleship activity feeding organizational
  reporting), but does not own DOS's core discipleship data model.
- Deep department/module architecture (Finance, Partnerships, People, the
  event-driven automation model, the human-review automation ladder) is
  documented in `docs/ncc-architecture.md` — read it before adding or
  changing an NCC department, don't re-derive it from scratch.

## Community

**Owns:** shared group and gathering experiences (as distinct from DOS's
one-to-one/personal discipleship activity and NCC's organizational
operations).

- **Not yet built in this repository as of this writing.** Community work
  is being developed in parallel by a separate agent/initiative in its own
  isolated worktree and branch (see `WORKFLOW.md` and USA-31 in Linear).
  Do not build or modify Community features from the NCC worktree — if
  Community boundaries need to be assumed for NCC work, treat them as
  undefined and flag it rather than guessing at Community's data model or
  routes.
- Existing DOS "groups" functionality (`dos_groups`, `dos_group_members`,
  etc.) currently lives under the DOS boundary above; whether/how it
  relates to the Community product boundary is an open architecture
  question, not a settled one — do not assume they are the same thing.

## Finance and Compliance

**Owns:** the specific NCC department covering financial document intake,
transaction import/categorization, compliance filing workflows (e.g.
Arizona Annual Report, Form 990), draft workpaper generation, and
accountant package assembly.

- Lives under `/ncc/finance` and `/ncc/finance/compliance`.
- Explicitly **not** a general ledger or double-entry accounting system —
  no chart of accounts, no debit/credit posting, no account balancing
  logic. It supports human-reviewed workflows around real accounting
  systems, it does not replace one.
- All finance/compliance output requires human review before being
  treated as final — see the Human Review rule in `CLAUDE.md`. AI
  suggestions (category suggestions, missing-document detection, draft
  workpaper summaries) must remain visibly separate from approved,
  human-confirmed values; nothing in this department files, marks a
  filing complete, approves categories, or sends an accountant package
  without an explicit human action.
- Role model: `finance_owner`, `accountant`, `bookkeeper`,
  `treasurer_readonly`, resolved independently of `/admin`/`/ncc` global
  access — see `src/lib/finance-auth.ts` and `src/lib/finance-ops/roles.ts`.

## AI Workforce / Dispatcher

**Owns:** orchestration and implementation operations — i.e. how agent
work gets planned, isolated, validated, and handed off (see
`WORKFLOW.md`).

- Does **not** own ministry product features. An agent operating as part
  of the AI Workforce implements what Linear and executive threads have
  authorized; it does not decide product direction for DOS, NCC,
  Community, or the Public Website.
- Worktree/branch isolation, Founder Approval gates, and audit-before-code
  behavior (all defined in `CLAUDE.md`) are the operating rules for this
  boundary.

## Multi-organization support

- USA Missionaries is the first and currently only fully-operational
  organization on the platform, but the data model (`organizations`,
  `organization_memberships`, `networks`, `network_memberships`,
  `collectives`, `collective_memberships`) is multi-tenant by design.
- Any new table, RLS policy, or feature that assumes "there is only one
  organization" is a boundary violation — scope by `organization_id` (or
  the equivalent workspace/household scoping already established in DOS)
  rather than hardcoding USA Missionaries specifics into shared logic.
- Organization-level and network-level (cross-organization) concerns are
  different altitudes — see `docs/ncc-architecture.md` §11 ("Multi-
  Organization Operating Model") for the full reasoning before adding new
  cross-organization functionality.

## Shared data requires explicit ownership

When a table or feature is genuinely shared across two of the boundaries
above (e.g. `admin_users` gating both `/admin` and `/ncc`, or DOS activity
feeding NCC reporting), that sharing must be intentional and documented at
the point of use — not an implicit side effect of using the same Supabase
project. When in doubt about which boundary owns a piece of data, that's
an open architecture question to raise (per `WORKFLOW.md`'s
research/audit step), not something to resolve by picking whichever
boundary is more convenient for the current task.
