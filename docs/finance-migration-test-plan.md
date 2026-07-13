# Finance & Compliance Migration Test Plan

**Not yet executed.** This is the checklist that will be run against the staging
environment described in [docs/finance-staging-setup.md](finance-staging-setup.md)
once its credentials are available. Nothing in this document has been applied to
any database yet, per your instruction not to touch production until staging
validation is complete.

## Migrations to apply, in order

1. All existing migrations already in `supabase/migrations/` (staging starts from
   the full schema, not a subset).
2. `20260711120000_finance_documents_foundation.sql`
3. `20260713090000_compliance_filings_foundation.sql`
4. `20260714090000_finance_operations_foundation.sql`
5. `20260715090000_finance_team_permissions_foundation.sql` (new — real
   Finance-scoped roles, see below; supersedes the "map onto admin/editor/viewer"
   option this document originally proposed)

## Test checklist

| # | Test | Method |
|---|---|---|
| 1 | Finance document upload | Upload a real (test) PDF via `/ncc/finance?tab=documents` with `FINANCE_DOCUMENTS_MIGRATION_APPLIED=true`; confirm row in `finance_documents` and object in the `finance-documents` bucket |
| 2 | Private storage | Attempt to fetch the uploaded object's storage path directly via the anon/public REST endpoint; confirm `403`/not found |
| 3 | Signed downloads | Confirm the admin UI can still open/download the file via the service-role-backed action (no public URL is ever generated) |
| 4 | Category and month metadata | Confirm `group_name`/`doc_category` and `created_at` persist and round-trip correctly through `listFinanceDocuments()` / `listComplianceFilingDocuments()` |
| 5 | Restricted-document handling | Confirm `revoke all ... from anon, authenticated` actually blocks a direct anon-key query against `finance_documents`, `compliance_filings`, `compliance_filing_documents`, `finance_transactions` |
| 6 | Filing creation | Call `startTrackingComplianceFiling()` for both `arizona-annual-report` and `990`; confirm rows appear with seed defaults |
| 7 | Filing status updates | Call `updateComplianceFilingFields()`; confirm `assigned_person`, `readiness_percentage`, `workflow_stage` persist |
| 8 | Annual Report due-date handling | Confirm `arizonaAnnualReportDueDate(2026) === "2026-08-03"` and that a persisted row doesn't silently recompute a different due date on update |
| 9 | 990 unknown-field handling | Confirm a fresh `990`/`unknown` filing has `original_due_date IS NULL` and `extra.filingType/accountingYearEnd/extensionStatus = "Unknown"` until explicitly updated |
| 10 | Confirmation-number requirement | Attempt `recordComplianceFilingConfirmation()` with an empty confirmation number (should be rejected by the action); attempt a raw SQL `update ... set status = 'filed'` without a confirmation number (should be rejected by the `compliance_filings_require_confirmation` trigger) |
| 11 | Filing-receipt upload | Upload a document tagged `filing_receipt` category; confirm it's retrievable and distinct from source documents |
| 12 | Unauthorized-access rejection | Attempt every write action while signed out / signed in as a non-`admin_users`, non-`finance_team_members` account; confirm `resolveFinanceAccess()` rejects before any Supabase call |
| 13 | Finance-owner login and permissions | Sign in as a `finance_team_members` row with `finance_role = 'finance_owner'` and no `admin_users` row at all; confirm `/ncc` loads with only the Finance nav item visible, `/ncc/partnerships` and every other department redirect to `/ncc/finance`, and every write action succeeds (upload, import, approve transactions, approve workpapers, invite a team member, mark a package ready, record a filing confirmation) |
| 14 | Accountant login and permissions | Same account setup with `finance_role = 'accountant'`; confirm upload/import/categorize/approve-transactions/prepare+approve-workpapers/payroll-visibility all succeed, and confirm `manage_finance_team`, `record_filing_confirmation`, and `mark_package_ready` are rejected server-side even via direct action calls (not just hidden in the UI) |
| 15 | Bookkeeper login and permissions | `finance_role = 'bookkeeper'`; confirm upload/import/suggest-categories/prepare-workpapers succeed; confirm setting a transaction's `review_status` to `approved` is rejected; confirm the Payroll & Compensation tab and payroll-tagged documents are inaccessible; confirm workpaper approval and team management are rejected |
| 16 | Treasurer-readonly login and permissions | `finance_role = 'treasurer_readonly'`; confirm every write action is rejected; confirm the Transactions tab, Payroll & Compensation tab, and payroll/donation-report documents are not shown; confirm Financial Statements only shows workpapers with `review_status = 'approved'` |
| 17 | Role-boundary bypass attempt | As bookkeeper, call `updateTransactionReviewAction` directly with `reviewStatus: "approved"` (bypassing the UI's dropdown filtering); confirm the server action still rejects it — this is the test that actually proves enforcement is server-side, not just hidden navigation |

## Role model (built, not yet tested against a real database)

Real Finance-scoped roles exist now: `finance_team_members`
(organization-scoped, keyed by email — no `admin_users` row required),
resolved via `src/lib/finance-auth.ts::resolveFinanceAccess()`, checked by
`requireFinanceCapability()` in every Finance/Compliance server action. See
[docs/finance-permission-model.md](finance-permission-model.md) for the full
schema and role-matrix writeup.

Existing `admin_users` staff (Ryan, other NCC admins/editors) get Finance
access mapped from their existing global role (`admin` → `finance_owner`,
`editor` → `accountant`, `viewer` → `treasurer_readonly`) with zero
re-onboarding required. External accountants/bookkeepers/treasurers get
access purely from `finance_team_members`, with no broader `/admin` or
`/ncc` access at all — tests 13–16 above are what actually proves that
boundary holds, not just that the roles exist.

## What "actual test evidence" will look like

Once staging credentials exist and each test above runs, this document will be
updated in place with: the exact SQL/action call made, the actual response
(row returned, error code, or rejection message), and a pass/fail per row —
not a restatement of the plan as if it were the result.
