// USA-170 legacy Group-linked assignment coverage.
//
// PR #67 scoped the member Group Home / Journey to exact assignment-instance
// context (assignment_context = 'group' AND source_group_id = <group>). That
// scoping is intentional and must stay — but it hid legacy assignments that
// predate instance contexts ('library' default, null source_group_id), which
// silently removed a member's real Journey and saved progress from their
// Group Home in production. This suite pins both halves of the contract:
//
//   1. The exact-context scoping stays exact (no accidental loosening back to
//      person/resource matching, which caused cross-instance bleed).
//   2. The legacy-adoption repair stays documented and shaped so a hidden
//      legacy row is repaired by adopting it into its Group — preserving the
//      assignment id and its assignment_id-bound progress rows — never by
//      inserting a replacement row or re-keying progress.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function assertNotIncludes(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`${label}: unexpectedly found ${needle}`);
  }
}

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex > secondIndex) {
    throw new Error(`${label}: expected ${first} before ${second}`);
  }
}

const failures = [];

function check(label, run) {
  try {
    run();
    console.log(`  PASS  ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`  FAIL  ${label}: ${error.message}`);
  }
}

const memberAccess = read("src/lib/groups/member-access.ts");
const memberActions = read("app/groups/[slug]/member/actions.ts");
const repairDoc = read("docs/usa-170-legacy-group-assignment-repair.sql");

// --- 1. Exact-context scoping stays exact -----------------------------------

check("Member portal scopes Journey assignments to the group context", () => {
  assertIncludes(memberAccess, '.eq("assignment_context", "group")', "portal assignment query");
  assertIncludes(memberAccess, '.eq("source_group_id", group.id)', "portal assignment query");
});

check("Member portal keeps progress keyed to visible assignment instances", () => {
  assertIncludes(memberAccess, "journeyAssignmentIds.has(progress.assignment_id)", "portal progress filter");
});

check("Member portal documents that exact scoping hides legacy rows", () => {
  assertIncludes(memberAccess, "usa-170-legacy-group-assignment-repair.sql", "legacy adoption pointer");
});

check("Member save action scopes the assignment lookup to the group context", () => {
  assertIncludes(memberActions, '.eq("assignment_context", "group")', "save assignment query");
  assertIncludes(memberActions, '.eq("source_group_id", session.groupId)', "save assignment query");
});

check("Member save action always binds progress to the assignment instance", () => {
  assertIncludes(memberActions, "assignment_id: assignmentId", "save patch");
  assertNotIncludes(memberActions, "if (assignmentId) {\n    patch.assignment_id = assignmentId;", "conditional legacy binding");
});

// --- 2. The legacy-adoption repair stays safe --------------------------------

check("Repair adopts the legacy row instead of replacing it", () => {
  assertIncludes(repairDoc, "update public.dos_resource_assignments", "repair statement");
  assertNotIncludes(repairDoc.toLowerCase(), "insert into", "repair must not create rows");
  assertNotIncludes(repairDoc.toLowerCase(), "delete from", "repair must not delete rows");
});

check("Repair adopts into the exact group context PR #67 requires", () => {
  assertIncludes(repairDoc, "set assignment_context = 'group'", "repair target context");
  assertIncludes(repairDoc, "source_group_id = '0e6e43aa-1d23-483d-9a8f-73cd7205519c'", "repair target group");
});

check("Repair is guarded to the audited legacy shape, so re-runs are no-ops", () => {
  assertIncludes(repairDoc, "and assignment_context = 'library'", "legacy context guard");
  assertIncludes(repairDoc, "and source_group_id is null", "legacy group guard");
  assertIncludes(repairDoc, "-- expect: UPDATE 1", "affected-row expectation");
});

check("Repair never touches progress rows (assignment_id binding carries them)", () => {
  assertNotIncludes(repairDoc.replace(/^--.*$/gm, ""), "dos_guided_resource_progress", "repair writes");
  assertIncludes(repairDoc, "bound by assignment_id", "progress preservation rationale");
});

check("Repair carries its rollback and the Founder Approval gate", () => {
  assertIncludes(repairDoc, "Rollback SQL", "rollback block");
  assertIncludes(repairDoc, "set assignment_context = 'library'", "rollback restores legacy context");
  assertIncludes(repairDoc, "source_group_id = null", "rollback restores legacy group");
  assertBefore(repairDoc, "Founder Approval", "begin;", "approval gate before the mutation");
});

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log("\nAll legacy Group-linked assignment checks passed.");
