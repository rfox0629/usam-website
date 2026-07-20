# WORKFLOW.md — Idea to Deployment

This is the operating flow every piece of work in this repository should
follow. See [`CLAUDE.md`](CLAUDE.md) for the governance rules behind each
step and [`ARCHITECTURE.md`](ARCHITECTURE.md) for product boundaries.

## The flow

```
Idea
  -> Executive discussion (product thread)
  -> Linear project/issue (scope, ownership, priority, acceptance criteria)
  -> Isolated branch/worktree
  -> Research/audit (when architecture or production state is unclear)
  -> Implementation
  -> Validation (tests, types, build, changed-file report)
  -> Linear handoff
  -> Founder review
  -> Merge
  -> Deploy
```

Every step feeds the next. Skipping a step (e.g. implementing before the
idea has a Linear issue, or merging without a founder review) is a process
violation even if the resulting code is correct.

## 1. Idea → executive discussion

Product direction is decided in executive product threads, not invented
by an agent mid-implementation. If a task reveals a product decision that
hasn't actually been made (a genuine scope question, not an
implementation detail), that decision belongs back in a product thread —
raise it, don't resolve it unilaterally.

## 2. Linear issue

Once a product thread produces a decision, it becomes a Linear issue (or
project) with scope, ownership, priority, and acceptance criteria. This
is what makes work "authorized" — see `CLAUDE.md`'s source-of-truth
hierarchy. An agent should read the full issue (and any related/blocking
issues) before starting.

## 3. Isolated branch/worktree

Each initiative gets its own dedicated branch and worktree before any
file changes happen. Never implement directly in the canonical/primary
checkout, and never share a worktree between unrelated initiatives. See
`CLAUDE.md`'s isolation rules for what to do if you find another
initiative's uncommitted work in a shared location.

## 4. Research/audit (when needed)

When the current architecture or production state is unclear — "is this
already built," "is this migration already applied," "does this table
exist," "what does the current route boundary say" — that uncertainty is
itself a task to resolve *before* writing implementation code, not an
assumption to implement around. Read the relevant `docs/**` files, module
READMEs, and (with appropriate care and approval boundaries) live
repository/production state.

Research/audit tasks should produce a clear written finding — what's
live, what's staged, what's incomplete, what's deprecated, what the
actual risk is — before any implementation proceeds on top of them.

## 5. Implementation

Build only what the Linear issue authorizes. Follow the relevant product
rules (`AGENTS.md` for DOS/Command Center UI and data model,
`ARCHITECTURE.md` for which boundary owns what). Stay inside the isolated
worktree/branch. Do not expand scope, touch another product boundary, or
start a different Linear issue's work without it also being authorized.

## 6. Validation

Before anything is reported as ready:

- Run the relevant `test:*` scripts for the area touched.
- Run TypeScript checking and a production build for application code
  changes.
- Produce the exact changed-file evidence: `git status --short`,
  `git diff --stat`, `git diff --name-status`, `git diff --check`.
- For anything touching finance, accounting, compliance, payroll, legal,
  or filing output, flag it explicitly for human review — validation
  tests do not substitute for that review (see `CLAUDE.md`).
- For database work, check migration-ledger state and production
  read-only evidence where appropriate; never assume a migration applied
  cleanly just because the SQL looks correct.

## 7. Linear handoff

Update the Linear issue with:

- Exact files inspected
- Exact files created/changed (not a summary — the real list)
- What existing guidance/architecture was preserved, reconciled, or found
  to conflict
- Validation evidence from step 6
- Local commit hash, if one was created
- Any blockers, unresolved conflicts, or scope questions that need a
  founder decision
- What was explicitly *not* done, and why (e.g. "no migration was pushed
  — requires Founder Approval")

Do not mark an issue done, or imply completion, based only on the agent's
own confidence — the evidence above is what makes a handoff verifiable.

## 8. Founder review

A human (the founder, or whoever Linear/the product thread designates)
reviews the handoff before anything moves further. This is a real gate,
not a formality — an agent's self-reported completion is never sufficient
grounds for the next step on its own.

## 9. Merge

Only after Founder Approval. Never merge based solely on tests passing or
an agent's own assessment that the work is ready.

## 10. Deploy

Only after Founder Approval and only through the established deployment
path (e.g. normal Git-integrated deploy — not a manual/out-of-band
production push). Production database migrations follow the same rule:
no migration repair or push against production without explicit,
in-the-moment Founder Approval, regardless of how confident the migration
plan is.

## Handling blockers, overlap, and scope changes

- **Blockers** (missing access, missing tooling, an unavailable
  integration): stop, state exactly what's blocked and why, and say what
  you were able to do around it. Don't silently skip a requirement or
  fabricate a workaround.
- **Overlap risk** (a file or table that looks like it belongs to another
  initiative or product boundary): report it before touching it. Resolving
  an overlap without reporting it first is a process violation even if the
  resolution turns out to be correct.
- **Migration risk**: treat any mismatch between the local migration
  ledger and production reality as a finding to report, not something to
  silently "fix" by repairing or pushing. See `CLAUDE.md`'s Founder
  Approval gates.
- **Scope changes**: if implementation reveals the Linear issue's scope
  was wrong or incomplete, go back to step 1/2 (raise it, get it reflected
  in Linear) rather than expanding scope inside the current task.
