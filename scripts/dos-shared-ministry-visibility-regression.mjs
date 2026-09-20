/* USA-276 — shared meeting visibility for ministry-team participants.
 *
 * The reported case, which every behavioral assertion below is built from:
 * Ryan logs ONE meeting with Samuel Gaffney and Skylar Gaffney and adds Brooke
 * Fox under More people → Ministry Team. Samuel and Skylar show it. Brooke's
 * record said "Nothing logged yet" and her Timeline showed nothing.
 *
 * Two halves are protected here:
 *
 *   1. The resolver (`shared-ministry-participation.ts`) actually runs, against
 *      fixtures shaped like that meeting. This is the part that decides who a
 *      ministry-team row belongs to, so it is tested by running it, not by
 *      reading it.
 *   2. The wiring: Person Timeline, Person Overview and My Record each read the
 *      resolver, the role language never says this person was discipled, and
 *      nothing on the write path or in Reports learned to count twice.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

register("./scripts/ts-loader.mjs", pathToFileURL("./"));

const {
  dosPersonSharedMinistryMeetings,
  dosPersonSharedMinistryParticipation,
  dosSharedMinistryLeaderName,
  dosSharedMinistryNameKey,
  dosSharedMinistryPersonIdsForMeeting,
  dosSharedMinistryTeamMemberPersonIds,
  dosSharedMinistryTitle,
} = await import("../src/lib/dos/shared-ministry-participation.ts");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), "utf8");

/* ---- Fixtures: the reported meeting, and nothing that is not in it ------- */

const householdMembers = [
  { displayName: "Ryan Fox", id: "member-ryan", status: "active" },
  { displayName: "Brooke Fox", id: "member-brooke", status: "active" },
  { displayName: "Retired Helper", id: "member-archived", status: "archived" },
];

const people = [
  { id: "person-ryan", name: "Ryan Fox", status: "active" },
  { id: "person-brooke", name: "Brooke Fox", status: "active" },
  { id: "person-samuel", name: "Samuel Gaffney", status: "active" },
  { id: "person-skylar", name: "Skylar Gaffney", status: "active" },
];

/* The one canonical meeting. Brooke is on it by `teamMemberId` only, which is
   how the picker's "Team" result stores a roster member. */
const sharedMeeting = {
  date: "2026-09-16",
  fieldPersonIds: ["person-samuel", "person-skylar"],
  id: "meeting-gaffney",
  meetingStatus: "logged",
  ministryTeam: [
    { fieldPersonId: null, role: "ministry_team", teamMemberId: "member-brooke" },
  ],
  recorder: { displayName: "Ryan Fox" },
};

/* An ordinary meeting with no ministry team, to prove nothing changed for the
   people DOS already served. */
const plainMeeting = {
  date: "2026-09-10",
  fieldPersonIds: ["person-samuel"],
  id: "meeting-plain",
  meetingStatus: "logged",
  ministryTeam: [],
};

const meetings = [sharedMeeting, plainMeeting];
const teamMemberPersonIds = dosSharedMinistryTeamMemberPersonIds(householdMembers, people);

/* ---- 1. Identity: a roster member reaches the Person who holds history --- */

assert.equal(dosSharedMinistryNameKey("Brooke  Fox"), "brookefox");
assert.equal(dosSharedMinistryNameKey("brooke-fox"), "brookefox");
assert.equal(
  dosSharedMinistryNameKey("Brooke Fox"),
  dosSharedMinistryNameKey("BROOKE FOX"),
  "Normalization must pair a roster member with their Person regardless of case or punctuation.",
);

assert.equal(
  teamMemberPersonIds.get("member-brooke"),
  "person-brooke",
  "Brooke's household roster row must resolve to her Person record.",
);

/* An ambiguous name resolves to nobody. Putting a meeting on the wrong
   person's record is worse than leaving it off, so this must never guess. */
const ambiguous = dosSharedMinistryTeamMemberPersonIds(
  [{ displayName: "Sam Taylor", id: "member-sam", status: "active" }],
  [
    { id: "person-sam-a", name: "Sam Taylor", status: "active" },
    { id: "person-sam-b", name: "sam taylor", status: "active" },
  ],
);

assert.equal(ambiguous.has("member-sam"), false, "Two people with one name must resolve to nobody, never to a guess.");

assert.equal(
  dosSharedMinistryTeamMemberPersonIds(householdMembers, []).size,
  0,
  "A roster member with no Person in the workspace resolves to nothing rather than erroring.",
);

/* ---- 2. Brooke's People Timeline shows the shared meeting ---------------- */

const brookeMeetings = dosPersonSharedMinistryMeetings(meetings, "person-brooke", teamMemberPersonIds);

assert.equal(brookeMeetings.length, 1, "Brooke must see exactly one shared ministry meeting.");
assert.equal(brookeMeetings[0].id, "meeting-gaffney", "It must be the canonical meeting Ryan logged, by id.");
assert.equal(
  dosPersonSharedMinistryParticipation(sharedMeeting, "person-brooke", teamMemberPersonIds),
  true,
  "Brooke participated in ministry at this meeting.",
);

/* ---- 3. Overview Last meeting stops reading "Nothing logged yet" --------- */

assert.ok(
  brookeMeetings[0].date,
  "The shared meeting must carry a date, which is what Overview's Last meeting card reads.",
);

/* ---- 4. Primary attendees behave exactly as before ----------------------- */

assert.deepEqual(
  sharedMeeting.fieldPersonIds,
  ["person-samuel", "person-skylar"],
  "Samuel and Skylar stay participants of the canonical meeting; their path is untouched.",
);

for (const personId of ["person-samuel", "person-skylar"]) {
  assert.equal(
    dosPersonSharedMinistryMeetings(meetings, personId, teamMemberPersonIds).length,
    0,
    `${personId} is a participant, so the meeting must never also be listed as shared ministry for them.`,
  );
}

/* A person who is BOTH a participant and named on the ministry team is counted
   once, as a participant. This is the rule that stops a duplicate Timeline row. */
const doubleRoleMeeting = {
  ...sharedMeeting,
  fieldPersonIds: ["person-samuel", "person-brooke"],
  id: "meeting-double-role",
};

assert.deepEqual(
  dosSharedMinistryPersonIdsForMeeting(doubleRoleMeeting, teamMemberPersonIds),
  [],
  "Someone already a participant must not also surface as a shared ministry participant.",
);

/* ---- 5. One meeting, counted once ---------------------------------------- */

const everyMeetingIdBrookeSees = new Set(brookeMeetings.map((meeting) => meeting.id));
const everyMeetingIdSamuelSees = new Set(
  meetings.filter((meeting) => meeting.fieldPersonIds.includes("person-samuel")).map((meeting) => meeting.id),
);

assert.equal(
  new Set([...everyMeetingIdBrookeSees, ...everyMeetingIdSamuelSees]).size,
  meetings.length,
  "Both perspectives together must resolve to the same set of canonical meetings — no record is invented.",
);
assert.equal(
  everyMeetingIdBrookeSees.has("meeting-gaffney") && everyMeetingIdSamuelSees.has("meeting-gaffney"),
  true,
  "The one canonical meeting is the same id on both records.",
);

/* Scheduled and canceled meetings are not activity. */
for (const status of ["scheduled", "canceled"]) {
  assert.equal(
    dosPersonSharedMinistryMeetings([{ ...sharedMeeting, meetingStatus: status }], "person-brooke", teamMemberPersonIds).length,
    0,
    `A ${status} meeting must not appear as logged ministry activity.`,
  );
}

/* ---- 6. Supporting attendees are deliberately a different role ----------- */

const supportingOnly = {
  ...sharedMeeting,
  id: "meeting-supporting",
  ministryTeam: [{ fieldPersonId: "person-brooke", role: "supporting_attendee", teamMemberId: null }],
};

assert.deepEqual(
  dosSharedMinistryPersonIdsForMeeting(supportingOnly, teamMemberPersonIds),
  [],
  "A supporting attendee must not gain ministry visibility: `ministry_event_people` states that participants receive person activity and supporting attendees do not.",
);

/* ---- 7. The role language says who joined whom, in whose meeting --------- */

/* The label is built from the record: the leader from the meeting's recorder,
   the names from its participants. Nothing is hardcoded. */
const brookeLeader = dosSharedMinistryLeaderName(sharedMeeting, "Brooke Fox");

assert.equal(brookeLeader, "Ryan Fox", "The leader comes from the meeting's recorder.");
assert.equal(
  dosSharedMinistryTitle(brookeLeader, sharedMeeting.fieldPersonIds.map((id) => ({
    "person-samuel": "Samuel Gaffney",
    "person-skylar": "Skylar Gaffney",
  })[id])),
  "Joined Ryan Fox in a meeting with Samuel Gaffney and Skylar Gaffney",
  "The shared ministry row must name the leader joined and the people the meeting was with.",
);

assert.equal(
  dosSharedMinistryTitle("Ryan Fox", ["Samuel Gaffney"]),
  "Joined Ryan Fox in a meeting with Samuel Gaffney",
);
assert.equal(
  dosSharedMinistryTitle("Ryan Fox", ["Samuel Gaffney", "Skylar Gaffney", "Patty Gaffney"]),
  "Joined Ryan Fox in a meeting with Samuel Gaffney, Skylar Gaffney and Patty Gaffney",
);

/* A meeting with no recorder still reads correctly rather than inventing a
   leader, which is what older rows look like. */
assert.equal(
  dosSharedMinistryLeaderName({ ...sharedMeeting, recorder: null }, "Brooke Fox"),
  "",
  "A meeting with no recorder yields no leader.",
);
assert.equal(
  dosSharedMinistryTitle("", ["Samuel Gaffney", "Skylar Gaffney"]),
  "Joined a meeting with Samuel Gaffney and Skylar Gaffney",
);
assert.equal(dosSharedMinistryTitle("", []), "Joined a ministry meeting");

/* Nobody joins themselves: when the leader IS the person whose record is being
   read, the leader is dropped instead of reading "Joined Ryan Fox" on Ryan's
   own record. */
assert.equal(
  dosSharedMinistryLeaderName(sharedMeeting, "Ryan Fox"),
  "",
  "A leader must never be shown as joining themselves.",
);
assert.equal(
  dosSharedMinistryLeaderName(sharedMeeting, "ryan  fox"),
  "",
  "That self-check normalizes the name, like every other pairing here.",
);

/* The wording must never invert who was serving whom, and must no longer read
   as though the participants were this person's fellow ministry partners --
   the reason "Ministered with ..." was replaced. */
for (const label of [
  dosSharedMinistryTitle("Ryan Fox", ["Samuel Gaffney", "Skylar Gaffney"]),
  dosSharedMinistryTitle("", ["Samuel Gaffney"]),
  dosSharedMinistryTitle("", []),
]) {
  assert.equal(/disciple|ministered to|mentored/i.test(label), false, `Shared ministry must never read as being discipled. Got "${label}"`);
  assert.equal(/ministered with/i.test(label), false, `"Ministered with" implies the participants were ministry partners. Got "${label}"`);
}

/* ---- 8. The wiring, in the surfaces that must read the resolver ---------- */

const client = read("app/dos/app/DosMvpAppClient.tsx");

assert.ok(
  client.includes("const personMinistryMeetings = dosPersonSharedMinistryMeetings(meetings, person.id, sharedMinistryTeamMemberPersonIds);"),
  "The Person record must derive the meetings this person ministered at.",
);
assert.ok(
  client.includes("id: `history-ministry-meeting-${meeting.id}`")
    && client.includes("title: dosSharedMinistryTitle(dosSharedMinistryLeaderName(meeting, person.name), meeting.participantNames),"),
  "Person Timeline must title its shared ministry row from the meeting's own leader and participants.",
);
assert.ok(
  client.includes("const lastMeetingIsSharedMinistry = Boolean(")
    && client.includes("lastMeetingIsSharedMinistry ? dosSharedMinistryTitle(dosSharedMinistryLeaderName(lastMeeting, person.name), lastMeeting.participantNames)"),
  "Overview's Last meeting must consider shared ministry and name the role accurately when it wins.",
);
assert.equal(
  /dosSharedMinistryTitle\(\s*"/.test(client),
  false,
  "The label must always be built from the record, never from a hardcoded name.",
);
assert.ok(
  client.includes("const myRecordSharedMinistryMeetings = useMemo(")
    && client.includes("buildMyRecordTimeline(record, people, sharedMinistryMeetings, myRecordOwnerName)")
    && client.includes('kind: "ministry" as const,'),
  "My Record's Timeline must include shared ministry participation under its own kind.",
);

/* My Record's Last meeting card is defined as a meeting with someone DISCIPLING
   the account holder. Shared ministry must not reach it, or the card would
   misdescribe Brooke's role (founder decision, USA-276). */
const myRecordMeetings = read("src/lib/dos/my-record-meetings.ts");

assert.equal(
  /ministryTeam|sharedMinistry/i.test(myRecordMeetings),
  false,
  "My Record's discipler-scoped meeting cards must stay discipler-scoped.",
);

/* ---- 9. Nothing learned to count twice, and nothing writes -------------- */

const report = read("src/lib/dos/ministry-report.ts");

assert.equal(
  /ministryTeam|sharedMinistry|dosPersonSharedMinistry/i.test(report),
  false,
  "Reports must not read ministry-team participation: aggregate totals stay one meeting, counted once.",
);

const sharedModule = read("src/lib/dos/shared-ministry-participation.ts");

for (const writeCall of [".insert(", ".update(", ".delete(", ".upsert(", "supabase"]) {
  assert.equal(
    sharedModule.includes(writeCall),
    false,
    `The shared participation module must read only; found ${writeCall}.`,
  );
}

const meetingsRoute = read("app/api/dos/app/meetings/route.ts");

assert.ok(
  meetingsRoute.includes('role: "ministry_team",') && meetingsRoute.includes('role: "participant",'),
  "The write path still records one ministry event with role rows, unchanged.",
);
assert.equal(
  /sharedMinistry|dosPersonSharedMinistry/i.test(meetingsRoute),
  false,
  "USA-276 is a read-side change: the meetings write path must be untouched, so no second record can be created.",
);

/* ---- 10. The demo fixture is the reported case, and is isolated ---------- */

const preview = read("app/dos/app/preview/page.tsx");

assert.ok(
  preview.includes('id: "demo-meeting-shared-ministry-gaffney"')
    && preview.includes('teamMemberId: "demo-household-member-brooke"')
    && preview.includes('fieldPersonIds: ["demo-person-samuel-gaffney", "demo-person-skylar-gaffney"]')
    && preview.includes('id: "demo-event-person-ryan-recorder"'),
  "The demo fixture must reproduce the reported case: one meeting, Samuel and Skylar as participants, Brooke on the ministry team by roster id.",
);
assert.ok(
  preview.includes("function buildBrookePerspectiveData(")
    && preview.includes('userPersonId: "demo-person-brooke-fox"'),
  "A Brooke perspective must exist so My Record can be reviewed without touching anyone's real record.",
);

console.log("DOS shared ministry visibility (USA-276) regression passed.");
