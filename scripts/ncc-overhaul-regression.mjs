import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

const nccLayout = read("app/ncc/layout.tsx");
const adminLayout = read("app/admin/layout.tsx");
const nccNav = read("app/ncc/_components/nccNav.ts");
const financeActions = read("app/ncc/finance/actions.ts");
const financeDocumentsLib = read("src/lib/finance-documents.ts");
const financeDocumentsAdmin = read("app/ncc/finance/FinanceDocumentsAdmin.tsx");
const monthlyChecklist = read("app/ncc/finance/MonthlyChecklistPrototype.tsx");
const partnershipsPage = read("app/ncc/partnerships/page.tsx");
const orgContext = read("app/ncc/_lib/organization-context.ts");

// --- /ncc uses the exact same auth gate as /admin -- no parallel identity system ---

assertIncludes(nccLayout, "getAdminAuthorization()", "/ncc layout must reuse getAdminAuthorization, not a new auth system.");
assertIncludes(nccLayout, 'redirect("/login?next=/ncc")', "/ncc must redirect unauthenticated users to login.");
assertIncludes(adminLayout, "getAdminAuthorization()", "/admin layout must remain unchanged and still gate on getAdminAuthorization.");

// --- All 15 requested departments are present in the nav ---

const expectedDepartments = [
  "Home",
  "Executive",
  "People",
  "Organizations",
  "Partnerships",
  "Finance",
  "Development",
  "Communications",
  "Prayer",
  "Ministry Operations",
  "Compliance & Legal",
  "Reports",
  "Knowledge Base",
  "Technology",
  "Settings",
];

for (const label of expectedDepartments) {
  assertIncludes(nccNav, `label: "${label}"`, `NCC nav must include the ${label} department.`);
}

// --- Finance document uploads must never silently hit a database without the migration applied ---

assertIncludes(
  financeActions,
  "isFinanceDocumentsWriteEnabled()",
  "Finance document actions must check isFinanceDocumentsWriteEnabled before touching Supabase.",
);
assertIncludes(
  financeDocumentsLib,
  'process.env.FINANCE_DOCUMENTS_MIGRATION_APPLIED === "true"',
  "Finance documents write gate must default to disabled unless explicitly enabled.",
);
assertIncludes(
  financeDocumentsAdmin,
  "Uploads Unavailable In This Preview",
  "Finance Documents UI must visibly disclose when uploads are disabled, not fail silently.",
);
assertIncludes(
  financeDocumentsAdmin,
  "disabled={isUploading || !writeEnabled}",
  "Finance Documents upload button must be disabled when writes are not enabled.",
);

// --- Monthly checklist is an explicitly labeled prototype, not connected to any table ---

assertIncludes(
  monthlyChecklist,
  "Prototype — Not Connected To A Database",
  "Monthly Checklist must be clearly labeled as a non-persisted prototype.",
);
assert(
  !monthlyChecklist.includes("createSupabaseAdminClient") && !monthlyChecklist.includes(".from(\""),
  "Monthly Checklist prototype must not make any database calls.",
);

// --- Partnerships Documents tab reuses the real, existing partners_documents component ---

assertIncludes(
  partnershipsPage,
  'import { PartnersDocumentsAdmin } from "../../admin/partners-documents/PartnersDocumentsAdmin"',
  "Partnerships Documents tab must reuse the existing PartnersDocumentsAdmin component, not a duplicate.",
);

// --- Multi-org extension point exists but returns a single hardcoded org (no switcher logic) ---

assertIncludes(orgContext, "export function getCurrentOrganization()", "Organization context extension point must be exported.");
assert(
  !orgContext.includes("createSupabaseAdminClient") && !orgContext.includes(".from(\""),
  "Organization context must not query the database yet -- it should return a hardcoded single org, not real switcher/membership resolution.",
);

console.log("ncc-overhaul-regression: all checks passed.");
