// Pure role/capability model for Finance-scoped access. No "server-only"
// import -- safe to import from client components that need to conditionally
// render based on a role already resolved server-side and passed as a prop.
// See src/lib/finance-auth.ts (server-only) for actually resolving a
// session's FinanceRole.

export const financeRoles = ["finance_owner", "accountant", "bookkeeper", "treasurer_readonly"] as const;
export type FinanceRole = (typeof financeRoles)[number];

export const financeRoleLabels: Record<FinanceRole, string> = {
  accountant: "Accountant",
  bookkeeper: "Bookkeeper",
  finance_owner: "Finance Owner",
  treasurer_readonly: "Treasurer (Read-Only)",
};

export const financeCapabilities = [
  "upload_documents",
  "view_restricted_documents",
  "view_payroll_and_donor_detail",
  "import_transactions",
  "edit_transaction_categories",
  "approve_transactions",
  "prepare_workpapers",
  "approve_workpapers",
  "manage_finance_team",
  "record_filing_confirmation",
  "mark_package_ready",
  "edit_worksheets",
  "edit_filing_fields",
] as const;
export type FinanceCapability = (typeof financeCapabilities)[number];

/**
 * The exact role matrix as specified:
 * - finance_owner: everything, including the two capabilities the spec
 *   calls out as owner-only regardless of how senior another role is:
 *   record_filing_confirmation and mark_package_ready.
 * - accountant: document upload/download, payroll/donor visibility, import +
 *   categorize + approve transactions, prepare and approve workpapers, edit
 *   worksheets and filing fields -- but not team management, not recording a
 *   filing confirmation, not marking a package ready.
 * - bookkeeper: upload, import, suggest/edit categories (not approve),
 *   prepare (reconcile) workpapers but not approve them -- no payroll/donor
 *   visibility, no restricted-document access, no team management, no
 *   filing confirmation, no package-ready marking.
 * - treasurer_readonly: no write capability at all. Read scope is handled
 *   separately by financeReadScope() below, not by this list.
 */
const roleCapabilities: Record<FinanceRole, readonly FinanceCapability[]> = {
  accountant: [
    "upload_documents",
    "view_restricted_documents",
    "view_payroll_and_donor_detail",
    "import_transactions",
    "edit_transaction_categories",
    "approve_transactions",
    "prepare_workpapers",
    "approve_workpapers",
    "edit_worksheets",
    "edit_filing_fields",
  ],
  bookkeeper: [
    "upload_documents",
    "import_transactions",
    "edit_transaction_categories",
    "prepare_workpapers",
    "edit_worksheets",
    "edit_filing_fields",
  ],
  finance_owner: [...financeCapabilities],
  treasurer_readonly: [],
};

export function hasFinanceCapability(role: FinanceRole, capability: FinanceCapability): boolean {
  return roleCapabilities[role].includes(capability);
}

export type FinanceReadScope = "full" | "approved_and_non_sensitive_only";

/**
 * Treasurer sees approved P&L/Balance Sheet/budget reports/board
 * packets/filing status/approved compliance records only -- never raw bank
 * statements, payroll detail, donor-level reports, tax IDs, or unrestricted
 * document downloads. Every other role gets the full read scope (subject to
 * their own write-capability restrictions above).
 */
export function financeReadScope(role: FinanceRole): FinanceReadScope {
  return role === "treasurer_readonly" ? "approved_and_non_sensitive_only" : "full";
}
