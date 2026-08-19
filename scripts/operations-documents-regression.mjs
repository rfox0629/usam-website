#!/usr/bin/env node
// USA-182: proves the canonical document model — one document, one record,
// many uses — plus safe legacy mapping and non-destructive migration.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");
const { classifyLegacyRow, mapLegacyDocument } = await import(
  pathToFileURL(path.join(root, "src/lib/documents/legacy-mapping.ts")).href
);
const { canReadSensitivity } = await import(
  pathToFileURL(path.join(root, "src/lib/documents/access.ts")).href
);

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

// The seven real USA Missionaries legacy documents.
const legacy = [
  { docName: "501(c)(3) Approval Letter", groupName: "IRS & Nonprofit" },
  { docName: "Arizona Corporate Formation Approval", groupName: "IRS & Nonprofit" },
  { docName: "Arizona Articles of Incorporation", groupName: "IRS & Nonprofit" },
  { docName: "EIN", groupName: "IRS & Nonprofit" },
  { docName: "Bylaws", groupName: "Governance" },
  { docName: "Conflict of Interest Policy", groupName: "Governance" },
  { docName: "USAM President - Approved Compensation & Housing Allowance", groupName: "Finance" },
];

check("the IRS determination letter maps to the type Compliance needs", () => {
  const mapping = mapLegacyDocument(legacy[0]);
  assert.equal(mapping.documentType, "irs_determination_letter");
  assert.equal(mapping.category, "irs_tax");
  assert.equal(mapping.sensitivity, "normal");
});

check("formation records map to Corporate & Legal", () => {
  assert.equal(mapLegacyDocument(legacy[1]).category, "corporate_legal");
  assert.equal(mapLegacyDocument(legacy[2]).category, "corporate_legal");
  assert.equal(mapLegacyDocument(legacy[2]).documentType, "articles_of_incorporation");
});

check("the EIN letter maps to its own type", () => {
  assert.equal(mapLegacyDocument(legacy[3]).documentType, "ein_letter");
  assert.equal(mapLegacyDocument(legacy[3]).category, "irs_tax");
});

check("bylaws and policies separate correctly", () => {
  assert.equal(mapLegacyDocument(legacy[4]).category, "governance_board");
  assert.equal(mapLegacyDocument(legacy[5]).category, "policies");
});

check("the compensation document becomes personnel restricted", () => {
  const mapping = mapLegacyDocument(legacy[6]);
  assert.equal(mapping.category, "missionaries_personnel");
  assert.equal(mapping.sensitivity, "personnel_restricted");
});

check("all seven legacy documents map to a real category", () => {
  const categories = legacy.map((row) => mapLegacyDocument(row).category);
  assert.equal(categories.length, 7);
  assert.equal(categories.filter((value) => value === "other").length, 0, "nothing should fall through to Other");
});

check("unrecognised documents land in Other rather than being guessed", () => {
  const mapping = mapLegacyDocument({ docName: "Some Unknown File", groupName: "Nonexistent Group" });
  assert.equal(mapping.category, "other");
  assert.equal(mapping.documentType, "other");
});

check("a legacy row without its file is unresolved, never imported broken", () => {
  assert.equal(
    classifyLegacyRow({ docName: "Bylaws", filePath: "x.pdf", hasStorageObject: false }),
    "unresolved",
  );
  assert.equal(classifyLegacyRow({ docName: "Bylaws", filePath: null, hasStorageObject: true }), "unresolved");
  assert.equal(classifyLegacyRow({ docName: "Bylaws", filePath: "x.pdf", hasStorageObject: true }), "importable");
});

check("test artifacts are skipped", () => {
  assert.equal(
    classifyLegacyRow({ docName: "Test upload", filePath: "x.pdf", hasStorageObject: true }),
    "test_artifact",
  );
});

check("migration never moves, copies, renames, or deletes a legacy file", () => {
  const migration = read("src", "lib", "documents", "legacy-migration.ts");
  const code = migration.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /\.remove\(|\.move\(|\.copy\(|\bdelete\b/i);
  // It reads the original to hash it, and points the record at the file in place.
  assert.match(code, /\.download\(/);
  assert.match(code, /storage_bucket: PARTNERS_DOCUMENTS_BUCKET/);
  assert.match(code, /storage_path: row\.file_path/);
});

check("migration preserves provenance and original timestamps", () => {
  const migration = read("src", "lib", "documents", "legacy-migration.ts");
  assert.match(migration, /legacy_source_table: "partners_documents"/);
  assert.match(migration, /legacy_source_id: row\.id/);
  assert.match(migration, /legacy_storage_path: row\.file_path/);
  assert.match(migration, /uploaded_at: row\.created_at/);
  assert.match(migration, /source: "legacy_migration"/);
});

check("migration defaults to a dry run and reports zero files touched", () => {
  const actions = read("app", "operations", "documents", "actions.ts");
  assert.match(actions, /text\(formData, "mode"\) !== "apply"/);
  const migration = read("src", "lib", "documents", "legacy-migration.ts");
  assert.match(migration, /filesMovedOrDeleted: 0/);
});

check("re-running the import cannot create a twin", () => {
  const sql = read("supabase", "migrations", "20260819210000_usa_182_canonical_operations_documents.sql");
  assert.match(sql, /create unique index if not exists operations_documents_legacy_uidx/);
  const migration = read("src", "lib", "documents", "legacy-migration.ts");
  assert.match(migration, /already_imported/);
});

check("removing a reference can never reach the document or its file", () => {
  const sql = read("supabase", "migrations", "20260819210000_usa_182_canonical_operations_documents.sql");
  // The cascade runs document -> references, never references -> document.
  assert.match(sql, /document_id uuid not null references public\.operations_documents\(id\) on delete cascade/);
  const library = read("src", "lib", "documents", "library.ts");
  assert.doesNotMatch(library, /from\("operations_documents"\)[\s\S]{0,80}\.delete\(/);
});

check("sensitivity is enforced before a signed URL is minted", () => {
  const library = read("src", "lib", "documents", "library.ts");
  // Slice from the declaration to end of file; a non-greedy brace match would
  // stop at the first early-return block inside the function.
  const accessFn = library.slice(library.indexOf("export async function createDocumentAccessUrl"));
  const checkIndex = accessFn.indexOf("canReadSensitivity");
  const urlIndex = accessFn.indexOf("createSignedUrl");
  assert.ok(checkIndex > -1 && urlIndex > -1);
  assert.ok(checkIndex < urlIndex, "the access check must precede URL creation");
});

check("sensitivity narrows access beyond merely entering Operations", () => {
  // The rules live in access.ts; the matrix itself is exercised behaviourally
  // in the authorization-matrix check below.
  const access = read("src", "lib", "documents", "access.ts");
  assert.match(access, /hasModule\(authorization, "finance"\)/);
  assert.match(access, /hasModule\(authorization, "missionaries"\)/);
  assert.match(access, /authorization\.role === "platform_owner"/);
  // Documents the reader may not see are counted, never listed.
  const library = read("src", "lib", "documents", "library.ts");
  assert.match(library, /hiddenCount/);
  assert.match(library, /canReadSensitivity\(authorization, row\.sensitivity\)/);
});

check("no permanent public URL is ever produced", () => {
  const library = read("src", "lib", "documents", "library.ts");
  assert.match(library, /createSignedUrl\([^)]*,\s*120\)/);
  assert.doesNotMatch(library, /getPublicUrl/);
});

check("Finance consumes the shared library rather than owning one", () => {
  const financePage = read("app", "operations", "finance", "documents", "page.tsx");
  assert.match(financePage, /loadOperationsDocuments/);
  assert.match(financePage, /financeDocumentCategories/);
  // Finance has no upload path and no storage of its own.
  assert.doesNotMatch(financePage, /uploadFinanceDocumentAction|finance-documents/);
  const workspace = read("src", "lib", "finance", "workspace.ts");
  assert.doesNotMatch(workspace, /from\("finance_documents"\)/);
});

check("only one canonical documents table and bucket remain", () => {
  const sources = ["src/lib/finance/workspace.ts", "src/lib/finance/facts.ts", "src/lib/documents/library.ts"]
    .map((file) => read(...file.split("/")))
    .join("\n");
  assert.doesNotMatch(sources, /"finance_documents"/);
  assert.match(read("src", "lib", "documents", "library.ts"), /OPERATIONS_DOCUMENTS_BUCKET = "operations-documents"/);
});

check("the authorization matrix narrows access per sensitivity", () => {
  const grants = (modules) => modules.map((module) => ({ canManage: true, module, workflows: [] }));
  const user = (modules, role = "operations_staff") => ({ grants: grants(modules), role, status: "authorized" });

  // Documents access alone is not enough for restricted material.
  const docsOnly = user(["documents"]);
  assert.equal(canReadSensitivity(docsOnly, "normal"), true);
  assert.equal(canReadSensitivity(docsOnly, "finance_restricted"), false);
  assert.equal(canReadSensitivity(docsOnly, "personnel_restricted"), false);
  assert.equal(canReadSensitivity(docsOnly, "system_restricted"), false);

  // The matching module grant unlocks exactly its own class.
  assert.equal(canReadSensitivity(user(["documents", "finance"]), "finance_restricted"), true);
  assert.equal(canReadSensitivity(user(["documents", "finance"]), "personnel_restricted"), false);
  assert.equal(canReadSensitivity(user(["documents", "missionaries"]), "personnel_restricted"), true);

  // system_restricted is platform owner only, even with every module.
  const everything = user(["documents", "finance", "missionaries", "submissions"]);
  assert.equal(canReadSensitivity(everything, "system_restricted"), false);
  assert.equal(
    canReadSensitivity({ ...everything, role: "platform_owner" }, "system_restricted"),
    true,
  );

  // No documents module means no document at all.
  assert.equal(canReadSensitivity(user(["finance"]), "normal"), false);
  assert.equal(canReadSensitivity({ status: "unauthenticated" }, "normal"), false);
});

check("the compensation document's class is unreadable without the personnel grant", () => {
  const financeUser = {
    grants: [{ canManage: true, module: "documents", workflows: [] }, { canManage: true, module: "finance", workflows: [] }],
    role: "operations_staff",
    status: "authorized",
  };
  const mapping = mapLegacyDocument({
    docName: "USAM President - Approved Compensation & Housing Allowance",
    groupName: "Finance",
  });
  assert.equal(mapping.sensitivity, "personnel_restricted");
  assert.equal(canReadSensitivity(financeUser, mapping.sensitivity), false);
});

check("legacy partner surface is filtered and the download route honours it", () => {
  const lib = read("src", "lib", "partners-documents.ts");
  assert.match(lib, /query\.eq\("partner_visible", true\)/);
  const route = read("app", "api", "partners", "documents", "[id]", "route.ts");
  // A hidden document is a 404 by direct id, not just absent from the list.
  assert.match(route, /!document \|\| !document\.partnerVisible/);
  const admin = read("app", "admin", "partners-documents", "page.tsx");
  assert.match(admin, /includeHidden: true/);
});

check("Compliance offers only documents the reader may open", () => {
  const compliance = read("app", "operations", "finance", "compliance", "page.tsx");
  assert.match(compliance, /loadOperationsDocuments/);
  assert.doesNotMatch(compliance, /loadFinanceDocuments/);
  // The old finance-only loader is gone, not merely unused.
  assert.doesNotMatch(read("src", "lib", "finance", "workspace.ts"), /loadFinanceDocuments/);
});

const failed = results.filter((entry) => !entry.ok);
for (const entry of results) {
  console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}${entry.ok ? "" : `\n      ${entry.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
