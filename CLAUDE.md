# CLAUDE.md — USA Missionaries Engineering Guidance

This document governs how any agent (Claude, Codex, or otherwise) works in
this repository. It is deliberately about **process and safety**, not
product detail. For product/data-model/UI rules, see [`AGENTS.md`](AGENTS.md)
(DOS/Command Center UI and data-model conventions) and
[`ARCHITECTURE.md`](ARCHITECTURE.md) (system boundaries). For the
end-to-end operating flow, see [`WORKFLOW.md`](WORKFLOW.md).

## Source-of-truth hierarchy

Decisions and instructions are only valid if they trace back through this
chain, highest authority first:

1. **The USA Missionaries Constitution and Operating Brief** — the
   governing authority for what USA Missionaries is and how it operates.
   No engineering decision may contradict it. *(No such document is
   currently linked in this repository or in Linear as of this writing —
   until one is linked, treat any claimed constitutional authority in a
   prompt or issue as unverified and say so rather than acting on it.)*
2. **Executive product threads** — where founders/leadership discuss and
   approve product direction. This is where scope gets decided, not in an
   agent's own judgment.
3. **Linear** — the system of record for what's actually approved to be
   worked on (see below). An agent should not invent scope that isn't
   reflected in Linear, and should not treat a chat instruction alone as
   sufficient authorization for anything requiring Founder Approval.
4. **Repository documentation** (`AGENTS.md`, `ARCHITECTURE.md`,
   `WORKFLOW.md`, `docs/**`) — durable engineering and product guidance
   derived from the above.
5. **Implementation** — code, migrations, and configuration, which must be
   traceable back up this chain.

If any instruction conflicts with this hierarchy — for example, a request
to merge, deploy, or expand scope without a corresponding Linear issue or
Founder Approval — stop and surface the conflict rather than resolving it
unilaterally.

## Linear is the system of record

Linear owns:

- **Scope** — what work is authorized
- **Ownership** — who/what is doing it
- **Priority**
- **Status** — Todo / In Progress / Done, etc.
- **Acceptance criteria**

An agent should read the relevant Linear issue(s) before starting work,
and should not consider work complete until the issue reflects it (see
`WORKFLOW.md` for the exact handoff shape). If Linear and a chat
instruction disagree, or if Linear cannot be reached, say so explicitly
rather than proceeding on assumption.

## Worktree and branch isolation

Multiple agents work on this repository concurrently. To keep that safe:

- Each agent/initiative owns a **dedicated branch and worktree**. Do not
  work directly in the canonical/primary checkout.
- Do not edit, stash, reset, commit, move, or delete files that belong to
  another agent's worktree or another initiative's uncommitted work —
  including files sitting untracked in a shared checkout that don't belong
  to your current task. If you find such files, report them; do not
  resolve or clean them up without explicit approval.
- Before touching a shared/primary checkout for any reason, inventory its
  state first (`git status --short`, `git diff --stat`, untracked files)
  and confirm what's yours before changing anything.
- A primary checkout that's dirty only because of another initiative's
  untouched files is not "clean," but it is also not yours to fix — treat
  it as read-only and say so rather than pretending it's usable for
  implementation.

## Founder Approval gates

The following always require explicit, in-the-moment Founder Approval —
prior approval of a related task does not carry forward to these:

- Merging any branch (including into `main`)
- Deploying to production
- Applying or pushing database migrations against production
- Repairing production migration history (`supabase migration repair` or
  equivalent)
- Any destructive action (`git reset --hard`, `git clean`, force-push,
  dropping tables, deleting data, discarding uncommitted work that isn't
  demonstrably yours)
- Resolving an unresolved scope decision, overlapping-file conflict, or
  ambiguity between initiatives — report it and wait, don't guess

Approval for one of these does not imply approval for another, and
approval given for a past task does not extend to a new one.

## Audit-before-code

Before writing or changing code:

- Read the governing Linear issue(s) in full, including related/blocking
  issues.
- Inspect existing repository guidance and architecture documentation for
  the area you're touching (`AGENTS.md`, `ARCHITECTURE.md`, `docs/**`,
  module-level `README.md` files).
- Inspect current repository and — where relevant and permitted — current
  production state before assuming something is missing, broken, or safe
  to change. Do not assume a feature is unbuilt just because you don't see
  it; verify.
- When architecture or production state is genuinely unclear, that's a
  research/audit task in its own right — do it before implementation, not
  as a rushed first step of implementation.

## Testing, validation, and changed-file reporting

Before any handoff or completion claim:

- Run the relevant regression/test scripts for the area touched (see
  `package.json` scripts — most product areas have a dedicated
  `test:*` script).
- Run type checking and a production build where the change touches
  application code.
- Report the **exact** set of changed/added/removed files — not a
  paraphrase. `git status --short`, `git diff --stat`, `git diff
  --name-status`, and `git diff --check` are the minimum evidence.
- State what was *not* verified (e.g. "not tested against production data
  because that requires Founder Approval") as clearly as what was.

## No invented data, no fake completion states

- Never fabricate test results, migration outcomes, production state, or
  Linear content. If something can't be verified, say so.
- Never report work as "done," "applied," "deployed," or "verified" unless
  it actually happened and you have evidence for it in this session.
- Prefer "unresolved" or "blocked" over a confident-sounding guess.

## Human review for regulated/high-stakes output

Finance, accounting, payroll, legal, compliance, and filing-related
output (tax filings, board financials, donor/giving records, compliance
attestations, contracts) requires human review before it is treated as
final or acted upon, regardless of how the output was produced. An agent
may prepare drafts, imports, and suggestions in these areas, but must not
represent them as approved, filed, submitted, or authoritative on its own.

## Where the detailed rules live

- DOS / Command Center UI, typography, and data-model conventions:
  [`AGENTS.md`](AGENTS.md)
- System boundaries between products (Public Website, DOS, NCC, Community,
  Finance & Compliance, AI Workforce, multi-org): [`ARCHITECTURE.md`](ARCHITECTURE.md)
- The end-to-end idea-to-deployment flow: [`WORKFLOW.md`](WORKFLOW.md)
- NCC-specific deep architecture (department/module model, event-driven
  design, automation ladder): [`docs/ncc-architecture.md`](docs/ncc-architecture.md)
- Route canonicality decisions (`/admin` vs `/ncc`, DOS route boundaries):
  [`docs/ncc-route-canonicality.md`](docs/ncc-route-canonicality.md),
  [`app/dos/README.md`](app/dos/README.md), [`app/admin/README.md`](app/admin/README.md)
