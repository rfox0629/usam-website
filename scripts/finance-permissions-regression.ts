import { readFileSync } from "node:fs";
import { financeReadScope, financeRoles, hasFinanceCapability, type FinanceCapability, type FinanceRole } from "../src/lib/finance-ops/roles";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("finance-permissions-regression: running real unit tests + static guard checks\n");

// --- Role matrix matches the spec exactly, capability by capability --------

const expectedMatrix: Record<FinanceRole, Record<FinanceCapability, boolean>> = {
  accountant: {
    approve_transactions: true,
    approve_workpapers: true,
    edit_filing_fields: true,
    edit_transaction_categories: true,
    edit_worksheets: true,
    import_transactions: true,
    manage_finance_team: false,
    mark_package_ready: false,
    prepare_workpapers: true,
    record_filing_confirmation: false,
    upload_documents: true,
    view_payroll_and_donor_detail: true,
    view_restricted_documents: true,
  },
  bookkeeper: {
    approve_transactions: false,
    approve_workpapers: false,
    edit_filing_fields: true,
    edit_transaction_categories: true,
    edit_worksheets: true,
    import_transactions: true,
    manage_finance_team: false,
    mark_package_ready: false,
    prepare_workpapers: true,
    record_filing_confirmation: false,
    upload_documents: true,
    view_payroll_and_donor_detail: false,
    view_restricted_documents: false,
  },
  finance_owner: {
    approve_transactions: true,
    approve_workpapers: true,
    edit_filing_fields: true,
    edit_transaction_categories: true,
    edit_worksheets: true,
    import_transactions: true,
    manage_finance_team: true,
    mark_package_ready: true,
    prepare_workpapers: true,
    record_filing_confirmation: true,
    upload_documents: true,
    view_payroll_and_donor_detail: true,
    view_restricted_documents: true,
  },
  treasurer_readonly: {
    approve_transactions: false,
    approve_workpapers: false,
    edit_filing_fields: false,
    edit_transaction_categories: false,
    edit_worksheets: false,
    import_transactions: false,
    manage_finance_team: false,
    mark_package_ready: false,
    prepare_workpapers: false,
    record_filing_confirmation: false,
    upload_documents: false,
    view_payroll_and_donor_detail: false,
    view_restricted_documents: false,
  },
};

for (const role of financeRoles) {
  for (const [capability, expected] of Object.entries(expectedMatrix[role]) as [FinanceCapability, boolean][]) {
    test(`${role} x ${capability} = ${expected}`, () => {
      assert(hasFinanceCapability(role, capability) === expected, `hasFinanceCapability(${role}, ${capability}) should be ${expected}`);
    });
  }
}

// --- Read scope ---------------------------------------------------------

test("financeReadScope restricts only treasurer_readonly", () => {
  assert(financeReadScope("treasurer_readonly") === "approved_and_non_sensitive_only", "treasurer is restricted");
  assert(financeReadScope("finance_owner") === "full", "finance_owner has full read scope");
  assert(financeReadScope("accountant") === "full", "accountant has full read scope");
  assert(financeReadScope("bookkeeper") === "full", "bookkeeper has full read scope (write-restricted, not read-restricted)");
});

// --- Migration and RLS static checks ----------------------------------

const migration = read("supabase/migrations/20260715090000_finance_team_permissions_foundation.sql");
const financeAuth = read("src/lib/finance-auth.ts");

test("finance_team_members migration is documented as not applied", () => {
  assert(migration.includes("NOT APPLIED to any database"), "explicit non-application notice present");
});

test("finance_team_members RLS mirrors admin_users' own-row-read policy", () => {
  assert(migration.includes("lower(email) = lower(((select auth.jwt()) ->> 'email'))"), "own-row RLS policy present");
  assert(migration.includes("revoke all on table public.finance_team_members from anon"), "anon access revoked");
  assert(migration.includes("revoke all on table public.finance_team_members from authenticated"), "blanket authenticated access revoked before the narrow policy is added");
});

test("getFinanceTeamAuthorization uses the session-bound client, not the service-role client, for the RLS-enforced read", () => {
  const functionBody = financeAuth.slice(financeAuth.indexOf("export async function getFinanceTeamAuthorization"));
  const beforeQuery = functionBody.slice(0, functionBody.indexOf('.from("finance_team_members")'));
  assert(beforeQuery.includes("createSupabaseServerClient()"), "session-bound client used ahead of the finance_team_members query");
});

test("resolveFinanceAccess maps admin_users roles to Finance-equivalent roles without requiring a finance_team_members row", () => {
  assert(financeAuth.includes('adminAuthorization.role === "admin" ? "finance_owner"'), "admin -> finance_owner mapping present");
  assert(financeAuth.includes('adminAuthorization.role === "editor" ? "accountant"'), "editor -> accountant mapping present");
});

// --- Route-level separation: every non-Finance /ncc page independently guards ---

const nonFinancePages = [
  "app/ncc/page.tsx",
  "app/ncc/partnerships/page.tsx",
  "app/ncc/executive/page.tsx",
  "app/ncc/people/page.tsx",
  "app/ncc/development/page.tsx",
  "app/ncc/communications/page.tsx",
  "app/ncc/ministry-operations/page.tsx",
  "app/ncc/compliance-legal/page.tsx",
  "app/ncc/reports/page.tsx",
  "app/ncc/knowledge-base/page.tsx",
  "app/ncc/technology/page.tsx",
];

for (const pagePath of nonFinancePages) {
  test(`${pagePath} calls requireFullNccAccess()`, () => {
    const source = read(pagePath);
    assert(source.includes("requireFullNccAccess()"), `${pagePath} must independently guard against finance-only sessions`);
  });
}

test("requireFullNccAccess redirects (does not just hide UI) when admin_users authorization fails", () => {
  const guard = read("app/ncc/_lib/require-full-ncc-access.ts");
  assert(guard.includes('redirect("/ncc/finance")'), "guard redirects rather than silently rendering restricted content");
});

test("/ncc layout accepts finance-only sessions as an alternative to admin_users, not a replacement", () => {
  const layout = read("app/ncc/layout.tsx");
  assert(layout.includes("resolveFinanceAccess()"), "layout checks finance access as a fallback path");
  assert(layout.includes('if (authorization.status === "authorized") {\n    return children;'), "full admin_users sessions still pass through unchanged");
});

test("NccShell supports a finance-only nav scope that filters to a single department", () => {
  const shell = read("app/ncc/_components/NccShell.tsx");
  assert(shell.includes('navScope === "finance-only"'), "finance-only nav scope implemented");
  assert(shell.includes('item.activeKey === "finance"'), "finance-only nav filters to the Finance item");
});

// --- Every finance/compliance action checks a capability, not a blanket admin role ---

const actionFiles = [
  "app/ncc/finance/actions.ts",
  "app/ncc/finance/compliance/actions.ts",
  "app/ncc/finance/990/actions.ts",
  "app/ncc/finance/team-actions.ts",
];

for (const filePath of actionFiles) {
  test(`${filePath} uses requireFinanceCapability, not canEditAdminContent`, () => {
    const source = read(filePath);
    assert(source.includes("requireFinanceCapability"), `${filePath} must check a granular Finance capability`);
    assert(!source.includes("canEditAdminContent"), `${filePath} must not gate on the blanket admin/editor role`);
  });
}

test("recordComplianceFilingConfirmation requires record_filing_confirmation (owner-only)", () => {
  const source = read("app/ncc/finance/compliance/actions.ts");
  assert(source.includes('ensureFilingRow(filingKey, periodKey, "record_filing_confirmation")'), "confirmation gated to the owner-only capability");
});

test("markAccountantPackageReadyAction requires mark_package_ready (owner-only), distinct from generating the package", () => {
  const source = read("app/ncc/finance/990/actions.ts");
  assert(source.includes('requireFinanceOperationsAccess("mark_package_ready")'), "package-ready marking gated separately from generation");
});

test("updateTransactionReviewAction requires approve_transactions only when the target status is 'approved'", () => {
  const source = read("app/ncc/finance/990/actions.ts");
  assert(
    source.includes('updates.reviewStatus === "approved" ? "approve_transactions" : "edit_transaction_categories"'),
    "capability required depends on the requested status, not a flat check",
  );
});

console.log(`\nfinance-permissions-regression: ${passed} checks passed.`);
