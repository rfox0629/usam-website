import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const helper = read("src/lib/dos/table-invitations.ts");
const dataHelper = read("src/lib/dos/table-invitation-data.ts");
const appData = read("src/lib/dos/missionary-app.ts");
const inviteApi = read("app/api/dos/app/table-invitations/route.ts");
const bookingApi = read("app/api/dos/book/[token]/route.ts");
const bookingPage = read("app/dos/book/[token]/page.tsx");
const migration = read("supabase/migrations/20260708151213_dos_table_invitations.sql");

assert(migration.includes("create table if not exists public.dos_table_invitations"), "Missing invitations table migration.");
assert(migration.includes("create table if not exists public.dos_table_invitation_bookings"), "Missing invitation bookings table migration.");
assert(helper.includes("minimumNoticeHours") && helper.includes("bookingWindowDays"), "Invite rule defaults must include editable notice and booking window.");
assert(helper.includes("calendarRules") && helper.includes("blockDosMeetings") && helper.includes("blockDosReminders"), "Invite calendar rules must be explicit.");
assert(appData.includes("tableInvitations: DosTableInvitation[]") && appData.includes("loadTableInvitationsForWorkspace"), "DOS app data must load saved table invitations.");
assert(inviteApi.includes("export async function POST") && inviteApi.includes("export async function PATCH"), "Invite API must support create and edit.");
assert(inviteApi.includes("[89ab][0-9a-f]{3}-[0-9a-f]{12}"), "Invite API must accept full UUIDs when editing saved invitations and co-host ids.");
assert(bookingApi.includes("createPublicTableInvitationBooking"), "Public booking API must create bookings through the shared helper.");
assert(bookingPage.includes("loadPublicTableInvitation") && bookingPage.includes("DosTableBookingForm"), "Public booking page must load tokenized invites.");
assert(dataHelper.includes("generateDosTableInvitationSlots") && dataHelper.includes("selected_for_availability"), "Availability must respect selected blocking calendars.");
assert(dataHelper.includes(".from(\"missionary_tables\")") && dataHelper.includes(".from(\"dos_table_invitation_bookings\")"), "Bookings must create DOS table and booking records.");
assert(client.includes("Co-hosts") && client.includes("inviteCoHostCandidates"), "Hosts tab must expose functional co-hosting when data exists.");
assert(client.includes("isAdultHouseholdInviteCoHost") && client.includes("isExplicitInviteCoHostContact"), "Hosts tab must filter co-hosts to adult household roles and explicit contacts.");
assert(client.includes("Darren Pickett") && client.includes("andy leenstra"), "Hosts tab must allow the expected explicit adult co-host contacts.");
assert(inviteApi.includes(".from(\"missionary_field_people\")") && inviteApi.includes("isAdultHouseholdCoHost") && inviteApi.includes("isExplicitInviteCoHostName"), "Invite API must reject stale child/general household co-host ids.");
assert(!client.includes("Spouse / household\" status=\"Future"), "Hosts tab must not show dead Future spouse rows.");
assert(!client.includes("Team invitations\" status=\"Future"), "Hosts tab must hide unfinished team invitations.");
assert(client.includes("minimumNoticeHours") && client.includes("bookingWindowDays"), "Rules tab must edit notice and booking window.");
assert(client.includes("Block DOS table meetings") && client.includes("Block DOS reminders") && client.includes("Block Google calendars"), "Calendar tab must use plain blocking labels.");
assert(client.includes("Connected Calendar") && client.includes("Availability Preview") && client.includes("This invitation checks your Google Calendar for conflicts."), "Calendar tab must explain the connected calendar and show an availability preview.");
assert(client.includes("tableInvitationPublicUrl") && !client.includes("?invite="), "Copy Link must use the public booking URL, not the private DOS app query.");

console.log("DOS table invitation regression checks passed.");
