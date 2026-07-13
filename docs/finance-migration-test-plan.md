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
4. `20260714090000_finance_operations_foundation.sql` (new — see below)

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
| 12 | Unauthorized-access rejection | Attempt every write action while signed out / signed in as a non-`admin_users` account; confirm `getAdminAuthorization()` rejects before any Supabase call |
| 13 | Treasurer read-only restrictions | See role model note below — requires the role itself to exist first |
| 14 | Finance-owner and accountant permissions | Same — requires role definitions below |

## Role model this test plan assumes (needs your confirmation)

The codebase's only role model today is `admin_users.role` (`admin` / `editor` /
`viewer`), used identically across every department — there's no
Finance-specific role yet. "Treasurer read-only," "Finance owner," and
"accountant" aren't concepts that exist in `admin_users` today. Before test #13/14
can mean anything, one of these needs to happen:

- **(a)** Map them onto the existing three roles (e.g. Treasurer → `viewer`,
  Finance owner → `admin` or `editor`, accountant → a new `viewer`-scoped account)
  and accept that "read-only" is enforced the same way it already is everywhere
  else (`canEditAdminContent()` gates writes to `admin`/`editor`, `viewer` can only
  read) — no schema change needed, ships immediately.
- **(b)** Add real Finance-scoped permission grants (a `finance_permissions`
  column on `admin_users`, mirroring the existing `prayer_permissions` precedent)
  so "accountant" can, say, write transactions and workpapers but not touch
  officer/statutory-agent data. This is a real schema decision and should be
  reviewed on its own, not folded silently into the finance_operations migration.

This test plan proceeds under **(a)** unless told otherwise, since it requires no
new schema and matches how every other department in this codebase already
enforces role-based write access.

## What "actual test evidence" will look like

Once staging credentials exist and each test above runs, this document will be
updated in place with: the exact SQL/action call made, the actual response
(row returned, error code, or rejection message), and a pass/fail per row —
not a restatement of the plan as if it were the result.
