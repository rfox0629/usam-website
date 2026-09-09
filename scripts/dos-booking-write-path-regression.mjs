import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookingHostCandidates } from "../src/lib/dos/booking-host.ts";
import { matchBookingPerson, normalizeBookingPhone } from "../src/lib/dos/booking-person-match.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/* ---- Person resolution (founder rule 3) -------------------------------- */
const people = [
  { email: "tim@example.com", id: "p-tim-1", name: "Tim Tran", phone: "(555) 010-0001" },
  { email: "tim.tran@example.org", id: "p-tim-2", name: "Tim Tran", phone: "555-010-0001" },
  { email: "naomi@example.com", id: "p-naomi", name: "Naomi Lee", phone: "+1 555 010 0002" },
  { email: null, id: "p-george", name: "George Jenko", phone: null },
];

assert.equal(normalizeBookingPhone("+1 (555) 010-0002"), "5550100002", "a US country code is dropped");
assert.equal(normalizeBookingPhone("555-010-0002"), "5550100002");
assert.equal(normalizeBookingPhone("12345"), null, "short digit strings never match");

let match = matchBookingPerson({ email: "NAOMI@example.com ", name: "N. Lee", phone: null }, people);
assert.deepEqual([match.status, match.status === "linked" && match.personId], ["linked", "p-naomi"], "one exact email match links automatically");

match = matchBookingPerson({ email: "new@example.com", name: "Someone New", phone: "(555) 010-0002" }, people);
assert.deepEqual([match.status, match.status === "linked" && match.personId], ["linked", "p-naomi"], "one exact phone match links automatically, whatever the formatting");

match = matchBookingPerson({ email: "other@example.com", name: "Tim", phone: "5550100001" }, people);
assert.equal(match.status, "review", "two people on the same phone is ambiguous");
assert.equal(match.status === "review" && match.reason, "ambiguous");
assert.deepEqual(match.candidates.map((candidate) => candidate.personId).sort(), ["p-tim-1", "p-tim-2"]);

match = matchBookingPerson({ email: "tim@example.com", name: "Tim Tran", phone: "555-010-0001" }, people);
assert.equal(match.status, "review", "email points at one person and phone at two: still ambiguous, never silently linked");

match = matchBookingPerson({ email: "gj@example.com", name: "  george   JENKO ", phone: null }, people);
assert.deepEqual([match.status, match.status === "review" && match.reason, match.candidates[0]?.personId], ["review", "possible", "p-george"], "a name-only match is a possible match: flagged, not created, not linked");

match = matchBookingPerson({ email: "brand.new@example.com", name: "Brand New", phone: "555-999-0000" }, people);
assert.deepEqual([match.status, match.candidates.length], ["create", 0], "nothing credible: create a Person");

/* ---- Host candidates (founder rule 4, corrected 2026-09-09) ------------- */
const members = [
  { displayName: "Ryan Fox", dosUserId: "user-ryan", id: "m-ryan", relationship: "owner", sortOrder: 1, status: "active" },
  { displayName: "Brooke Fox", dosUserId: null, id: "m-brooke", relationship: "spouse", sortOrder: 2, status: "active" },
  { displayName: "Parker Fox", dosUserId: null, id: "m-parker", relationship: "child", sortOrder: 3, status: "active" },
  { displayName: "Andy Leenstra", dosUserId: "user-andy", id: "m-andy", relationship: "other", sortOrder: 4, status: "active" },
  { displayName: "Old Member", dosUserId: "user-old", id: "m-old", relationship: "other", sortOrder: 0, status: "archived" },
];

let hosts = bookingHostCandidates({ hostMemberIds: [], members });
assert.deepEqual([hosts.rule, hosts.candidates], ["workspace_owner", [{ memberId: "m-ryan", userId: "user-ryan" }]], "no configured hosts -> the workspace owner is the only candidate (the live links); the transaction still checks the owner is free");

hosts = bookingHostCandidates({ hostMemberIds: ["m-andy", "m-ryan"], members });
assert.deepEqual([hosts.rule, hosts.candidates.map((c) => c.memberId)], ["configured_hosts", ["m-andy", "m-ryan"]], "configured hosts are the candidates in the order listed on the link, not sort order");

hosts = bookingHostCandidates({ hostMemberIds: ["m-parker", "m-old", "m-brooke"], members });
assert.deepEqual([hosts.rule, hosts.candidates], ["configured_hosts", [{ memberId: "m-brooke", userId: null }]], "children and archived members are never candidates; a member without a linked account still can host");

hosts = bookingHostCandidates({ hostMemberIds: ["m-parker"], members });
assert.deepEqual([hosts.rule, hosts.candidates.map((c) => c.memberId)], ["workspace_owner", ["m-ryan"]], "a link whose only configured host is ineligible behaves as a link with no configured hosts");

hosts = bookingHostCandidates({ hostMemberIds: [], members: members.filter((member) => member.id !== "m-ryan") });
assert.deepEqual([hosts.rule, hosts.candidates], ["none", []], "no configured hosts and no owner -> no candidate; the transaction refuses the slot");

/* ---- Structural guards on the write path ------------------------------ */
const data = read("src/lib/dos/table-invitation-data.ts");
const migration = read("supabase/migrations/20260909090000_usa_246_booking_write_path.sql");
const rollback = read("supabase/migrations/20260909090000_usa_246_booking_write_path_rollback.sql");

assert.ok(migration.includes("pg_advisory_xact_lock(hashtext('dos_table_booking:' || v_workspace_id::text))"), "bookings are serialized per workspace inside the transaction");
assert.ok(migration.includes("dos_table_invitation_bookings_operation_key_unique") && migration.includes("(invitation_id, operation_key)"), "the operation key is unique per link");
assert.ok(migration.includes("raise exception 'slot_unavailable'") && migration.includes("raise exception 'invitation_unavailable'") && migration.includes("raise exception 'limit_reached'"), "rule failures raise, which rolls the whole booking back");
assert.ok(migration.includes("planned_start_at, planned_end_at, planned_date, planned_duration_minutes, planned_timezone"), "the meeting is created with the complete planned snapshot");
assert.ok(rollback.includes("drop function if exists public.dos_create_table_booking(jsonb)") && rollback.includes("drop column if exists operation_key"), "the rollback removes the function and the new columns");
assert.ok(data.includes('.rpc("dos_create_table_booking"'), "the JS write path goes through the transactional function");
assert.ok(data.includes("matchBookingPerson(") && data.includes("bookingHostCandidates("), "the JS write path uses the shared matching and host modules");
assert.ok(data.includes("host_candidates: hostCandidates") && !data.includes("host_member_id: host.member"), "the write path sends the ordered candidate list and lets the transaction choose the free host");
const hostMigration = read("supabase/migrations/20260909120000_usa_246_booking_host_availability.sql");
assert.ok(hostMigration.includes("raise exception 'host_unavailable'") && hostMigration.includes("for v_candidate in select value from jsonb_array_elements(v_host_candidates) loop") && hostMigration.includes("and t.created_by = v_candidate_user"), "host availability (live bookings as that host, meetings they own) is decided inside the transaction and a busy host is never assigned");
assert.ok(data.includes("bookingWritePathV2Enabled()"), "the new path is gated until the founder enables it in production");
const v2Start = data.indexOf("async function createPublicTableInvitationBookingV2(");
const v2End = data.indexOf("function formatBookingSlotDate(", v2Start);
const v2 = data.slice(v2Start, v2End);
assert.ok(v2Start !== -1 && v2End !== -1, "the v2 write path exists");
assert.ok(!v2.includes("Prayer request:") && !v2.includes("prayerRequest") || v2.includes("prayer_request: cleanText(input.prayerRequest)"), "in the new path the prayer request goes only to the booking record");
assert.ok(!v2.includes("`Prayer request:") && !v2.includes("`Phone:"), "the new path does not copy the prayer request or phone into meeting notes");
assert.ok(data.includes('description: "Booked through your DOS scheduling link. Details are in DOS."'), "the Google event carries no guest details beyond the name");

console.log("DOS booking write path (USA-246) regression passed.");
