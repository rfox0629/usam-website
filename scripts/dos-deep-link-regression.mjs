import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// USA-138: /dos/<workspace>/people/<personId> and /dos/<workspace>/meetings/<meetingId>
// used to redirect to the workspace root with the record id discarded, so every
// shared person/meeting link silently landed on the dashboard.

const legacyRedirect = read("app/dos/[collectiveSlug]/legacy-redirect.ts");
const personRoute = read("app/dos/[collectiveSlug]/people/[personId]/page.tsx");
const meetingRoute = read("app/dos/[collectiveSlug]/meetings/[meetingId]/page.tsx");
const client = read("app/dos/app/DosMvpAppClient.tsx");

assert(
  /query\?: Record<string, string>/.test(legacyRedirect),
  "redirectLegacyDosRoute must accept query params so record ids survive the redirect.",
);
assert(
  legacyRedirect.includes("new URLSearchParams"),
  "redirectLegacyDosRoute must serialize forwarded query params.",
);

assert(
  personRoute.includes("const { collectiveSlug, personId } = await params;"),
  "The legacy person route must read personId from its route params.",
);
assert(
  personRoute.includes("redirectLegacyDosRoute(collectiveSlug, { person: personId })"),
  "The legacy person route must forward personId so the person detail opens.",
);

assert(
  meetingRoute.includes("const { collectiveSlug, meetingId } = await params;"),
  "The legacy meeting route must read meetingId from its route params.",
);
assert(
  meetingRoute.includes("redirectLegacyDosRoute(collectiveSlug, { meeting: meetingId })"),
  "The legacy meeting route must forward meetingId so the meeting detail opens.",
);

assert(
  client.includes('const requestedPersonId = searchParams.get("person");'),
  "The DOS app must resolve the ?person= deep link.",
);
assert(
  client.includes('const requestedMeetingId = searchParams.get("meeting");'),
  "The DOS app must resolve the ?meeting= deep link.",
);
assert(
  client.includes("setSelectedMeetingId(requestedMeetingId);"),
  "The DOS app must open the requested meeting detail for a ?meeting= deep link.",
);

// The dead workspace route tree these pages used to render was removed with the
// redirect fix; reintroducing it would resurrect a second, unreachable People
// and Meetings implementation alongside the DOS app.
for (const orphan of [
  "app/dos/[collectiveSlug]/meetings/MeetingsWorkspaceClient.tsx",
  "app/dos/[collectiveSlug]/people/PeopleWorkspaceClient.tsx",
  "app/dos/[collectiveSlug]/people/[personId]/PersonRelationshipModal.tsx",
  "app/dos/[collectiveSlug]/people/[personId]/RelationshipInsightsPanel.tsx",
]) {
  assert(!exists(orphan), `${orphan} was removed as unreachable dead code and must not return.`);
}

console.log("DOS deep link regression passed.");
