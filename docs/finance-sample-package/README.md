# Sample Finance Package — SYNTHETIC DATA, STAGING-ONLY

**Every file in this directory is fabricated.** No real transaction, donor,
employee, board member, or dollar amount appears anywhere here. Nothing in
this directory has been imported into any database — not staging, not
production — as of this commit. It exists so the Finance Operations and 990
Preparation Workspace pipeline can be exercised end-to-end with realistic
-shaped data once a staging environment exists, per
[docs/finance-staging-setup.md](../finance-staging-setup.md).

**Do not import these files into production, ever, under any circumstance.**
Once staging exists, they may be imported there for testing; even in
staging, label any resulting rows clearly as demo data before anyone reviews
them, and clear them out before staging is used for anything else.

## Contents

- `sample-transactions-2025.csv` — 12 months of synthetic bank activity: rent,
  twice-monthly payroll + payroll tax deposits, recurring and one-time
  donor gifts, utilities, insurance, software, bookkeeping fees, travel, and
  one deliberately unusual $9,800 "Unidentified Wire Transfer" in November to
  exercise the unusual-transaction detector.
- `sample-payroll-summary.md` — a synthetic payroll summary an accountant
  would receive from a payroll provider, in the shape the Payroll Summary
  workpaper expects to reconcile against.
- `sample-donation-summary.csv` — a synthetic donor-level giving summary
  (matches the "Synthetic Donor A–E" names used in the transaction CSV).
- `sample-board-roster.md` — fabricated board member names/roles for the
  Governance and Officer Compensation worksheets.
- `sample-housing-allowance-approval.md` — a fabricated board resolution
  approving a housing allowance, for testing document upload/categorization.
- `sample-arizona-formation-metadata.md` — fabricated Arizona Corporation
  Commission formation details (entity number, statutory agent) for testing
  the Arizona Annual Report workspace without using the organization's real
  formation document content.

## What's already been proven, offline, without a database

`scripts/finance-sample-package-demo.ts` runs `sample-transactions-2025.csv`
through the actual production parsing and workpaper-generation code
(`src/lib/finance-ops/logic.ts`) — the same functions the real app calls,
not a reimplementation — and writes its output to
`docs/finance-sample-package/demo-output.json`. This is real evidence the
pipeline works end-to-end at the logic layer: CSV parsing, dedupe-key
generation, rule-based category/payroll suggestions, the unusual-transaction
flag, and all nine transaction-derived workpapers. It does not touch any
database, because none exists yet to touch.

Run it yourself: `npx tsx scripts/finance-sample-package-demo.ts`

## What still requires staging

Everything that involves persistence: actually importing this CSV through
the UI (exercises dedupe against real unique constraints), uploading the
sample documents (exercises private storage + RLS), running the human
review workflow (exercises `finance_transactions.review_status`
transitions and the role-capability checks), generating and approving
workpapers through the UI (exercises `finance_draft_workpapers`), and
generating an accountant package (exercises `finance_accountant_packages`).
None of this can be demonstrated without a real database — see
[docs/finance-migration-test-plan.md](../finance-migration-test-plan.md).
