/**
 * USA-170 — participant preview parity.
 *
 * "Preview {First}'s Experience" and the participant's real secure link must be
 * the same surface. They used to be two implementations: the real link rendered
 * `GroupHomeMemberView` in the DOS light/white system, while the leader preview
 * rendered a separate hand-built black/gold mock that drifted from it.
 *
 * These checks pin the single-implementation rule, the read-only contract, and
 * the 390px layout fix so the duplicate cannot come back quietly.
 */

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

function assertNotIncludes(source, needle, message) {
  assert(!source.includes(needle), message);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

const packageJson = read("package.json");
const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const previewPanel = read("app/dos/app/MemberGroupHomePreview.tsx");
const previewAdapter = read("src/lib/groups/member-preview.ts");
const memberHomeView = read("app/groups/GroupHomeMemberView.tsx");
const memberInstallPrompt = read("app/groups/MemberHomeInstallPrompt.tsx");
const memberAccess = read("src/lib/groups/member-access.ts");
const publicGroupPage = read("app/groups/[slug]/page.tsx");

assertIncludes(packageJson, "test:dos-participant-preview-parity", "Package scripts must expose the preview parity check.");

/* ---------------------------------------------------------------- *
 * One implementation, not two.
 * ---------------------------------------------------------------- */

assertNotIncludes(appClient, "MemberExperiencePreviewPanel", "The duplicate legacy preview panel must stay deleted.");
assertIncludes(appClient, "MemberGroupHomePreview", "Leader preview must render the shared member Group Home preview.");
assertIncludes(previewPanel, "GroupHomeMemberView", "Preview must render the same shared member Group Home component as the real secure link.");
assertIncludes(publicGroupPage, "GroupHomeMemberView", "The participant's real secure link must render the same shared component.");
assertIncludes(previewPanel, "buildLeaderPreviewPortalData", "Preview must project leader data into the real portal payload shape.");

// The preview must not grow its own copy of the member Home sections. Every
// section name below belongs to GroupHomeMemberView alone.
for (const memberSection of ["Next gathering", "Current Journey", "MemberJourneySummaryRow", "MemberHomeInstallPrompt", "Scoped DOS member access"]) {
  assertNotIncludes(previewPanel, memberSection, `Preview must not re-implement the member Home section: ${memberSection}.`);
}

/* ---------------------------------------------------------------- *
 * DOS light/white with DOS blue actions. No black/gold revival.
 * ---------------------------------------------------------------- */

assertIncludes(previewPanel, "#1D4ED8", "Preview chrome must use DOS blue actions.");
for (const retiredHex of ["#C2A14E", "#F8C56A", "#0B0D10", "#111418", "#171B22", "#080A0D", "#060B16"]) {
  assertNotIncludes(previewPanel, retiredHex, `Preview must not reintroduce the retired black/gold treatment (${retiredHex}).`);
}
assertNotIncludes(previewPanel, "text-white/", "Preview must not reintroduce dark-surface text tokens.");

/* ---------------------------------------------------------------- *
 * Read-only preview. No participant state may move.
 * ---------------------------------------------------------------- */

assertIncludes(previewPanel, "readOnly", "Preview must render the shared member Home in read-only mode.");
// USA-170 founder follow-up: the preview is a click-through QA flow now —
// Group Home -> Journey -> save -> return -> reopen — but still zero-write.
assertIncludes(previewPanel, "GroupJourneyView", "Preview must click through to the same shared Journey component the member uses.");
assertIncludes(previewPanel, "onOpenJourney", "Preview Journey rows must open the shared Journey inside the overlay, not navigate the leader away.");
assertIncludes(previewPanel, "nothing you do here is saved", "The preview bar must state that nothing is saved.");
assertIncludes(previewPanel, "Preview as Member", "The overlay must carry the unmistakable Preview as Member indicator.");
assertIncludes(previewPanel, "Exit Preview", "The overlay must offer an explicit exit.");
assertIncludes(previewPanel, "createPortal", "The overlay must cover the whole app so no leader tools exist inside the preview.");
assertIncludes(memberHomeView, "readOnly ? (", "Shared member Home must branch its interactive edges on read-only.");
assertIncludes(memberHomeView, "signOutGroupMember", "Real member Home must keep the working sign-out action.");
assertIncludes(memberHomeView, "if (readOnly) {", "Read-only Journey rows must not navigate into the participant's Journey.");
assertIncludes(memberInstallPrompt, "if (!readOnly) {", "Install help must not write participant dismissal state from a preview.");
assertIncludes(memberInstallPrompt, "readOnly || window.localStorage.getItem(storageKey)", "Install help must not read participant dismissal state from a preview.");

// A preview projects data the leader already holds. It must not reach for
// tokens, sessions, or the network.
for (const forbidden of ["fetch(", "createGroupMemberAccessInvitation", "claimGroupMemberAccessToken", "send_member_access", "document.cookie", "localStorage"]) {
  assertNotIncludes(previewPanel, forbidden, `Preview must not perform access or state work: ${forbidden}.`);
  assertNotIncludes(previewAdapter, forbidden, `Preview adapter must stay pure: ${forbidden}.`);
}

/* ---------------------------------------------------------------- *
 * Secure access behavior around the preview stays intact.
 * ---------------------------------------------------------------- */

assertIncludes(appClient, "send_member_access", "Leader Copy Link must keep using the scoped member access endpoint.");
assertIncludes(appClient, "Copy Link", "Leader participant rows must keep Copy Link.");
assertIncludes(appClient, "buildPreviewParticipantAccessUrl", "Demo participant access links must survive the preview rewrite.");
assertIncludes(memberAccess, "revokeGroupMemberSession", "Session revocation must remain available.");
assertIncludes(memberAccess, "claimGroupMemberAccessToken", "Secure token claim must remain available.");

/* ---------------------------------------------------------------- *
 * Order: identity, gathering, Journey + Continue first. Install last.
 * ---------------------------------------------------------------- */

assertBefore(memberHomeView, "Group Home", "Next gathering", "Group identity must come before the next gathering.");
assertBefore(memberHomeView, "Next gathering", "Current Journey", "Next gathering must come before the current Journey.");
assertBefore(memberHomeView, "Current Journey", "Completed (", "The current Journey must come before completed history.");
assertBefore(memberHomeView, "Current Journey", "<MemberHomeInstallPrompt", "Install help must sit below the Journey.");
assertBefore(memberHomeView, "<MemberHomeInstallPrompt", "Scoped DOS member access", "Install help must sit near the bottom of the page.");
assertIncludes(memberHomeView, "Continue", "The current Journey must offer a visible Continue.");

// Completed Journeys must survive into the preview, not just the real link.
assertIncludes(memberHomeView, "completedAssignments.length ?", "Completed Journeys must stay available.");
assertIncludes(appClient, "completed Journeys stay visible in the participant's history", "Preview journey adapter must document that completed Journeys are preserved.");

/* ---------------------------------------------------------------- *
 * Install help: collapsed row, expands only on tap.
 * ---------------------------------------------------------------- */

assertIncludes(memberInstallPrompt, "useState(false)", "Install instructions must start collapsed.");
assertNotIncludes(memberInstallPrompt, "useState(previewExpanded)", "Preview must not force install instructions open.");
assertIncludes(memberInstallPrompt, "aria-expanded={showSteps}", "The install row must be an accessible disclosure.");
assertIncludes(memberInstallPrompt, "onClick={() => setShowSteps((value) => !value)}", "Install instructions must expand only when tapped.");
assertIncludes(memberInstallPrompt, "Add DOS to your Home Screen", "The collapsed install row must keep its label.");

/* ---------------------------------------------------------------- *
 * 390px: participant action rows must wrap, never clip.
 * ---------------------------------------------------------------- */

// Each participant row that carries the preview action is checked in isolation:
// walk back from the action label to the action group that encloses it.
const previewActionLabel = "Preview {participantFirstName(";
const previewActionOffsets = [];

for (let index = appClient.indexOf(previewActionLabel); index >= 0; index = appClient.indexOf(previewActionLabel, index + 1)) {
  previewActionOffsets.push(index);
}

assert(previewActionOffsets.length >= 2, "Both leader participant surfaces must offer the preview action.");

for (const offset of previewActionOffsets) {
  const beforeAction = appClient.slice(0, offset);
  const actionGroup = beforeAction.slice(beforeAction.lastIndexOf("<div className=\"flex"));

  assertNotIncludes(actionGroup, "shrink-0", "Participant action groups must not pin themselves to their max-content width at 390px.");
  assertIncludes(actionGroup, "flex-wrap", "Participant action buttons must wrap at narrow widths.");
  assertIncludes(actionGroup, "min-w-0", "Participant action groups must be allowed to shrink below their content width.");

  // The name column beside the wrapped actions must give up the row rather than
  // clip: full-basis under 420px, and wrapping text instead of truncation.
  const nameColumn = beforeAction.slice(beforeAction.lastIndexOf("<div className=\"min-w-0 flex-1 basis-full"));

  assertIncludes(nameColumn, "min-[420px]:basis-auto", "Participant name column must take its own line at 390px.");
  assertIncludes(nameColumn, "break-words", "Participant names must wrap rather than clip beside wrapped actions.");
}

// The Members roster shows the same participants with its own action cluster.
const membersRoster = appClient.slice(appClient.indexOf("{visibleMembers.length ? ("), appClient.indexOf("groupMemberPortalStatusLabel(member)}</p>"));

assertNotIncludes(membersRoster, "flex shrink-0 items-center gap-2", "Members roster actions must wrap at 390px too.");

console.log("dos-participant-preview-parity-regression: all checks passed.");

/* ---------------------------------------------------------------- *
 * USA-170 leader-side follow-through (founder comments, Aug 18).
 * ---------------------------------------------------------------- */

// Member rows state exactly the four identity conditions, tokenlessly.
for (const state of ["Person only", "Scoped access active", "Invitation expired", "Linked DOS account"]) {
  assertIncludes(appClient, `"${state}"`, `Member rows must state the identity condition: ${state}.`);
}
assertIncludes(appClient, "authLinked", "Member rows must read the auth-link flag, not guess from names.");
assertNotIncludes(appClient, "token_hash", "The leader client must never touch token values.");
assertIncludes(appClient, "Invitation not opened yet", "An active invitation must not claim system delivery.");

// An already-active member takes over the join-request card.
assertIncludes(appClient, "Already a member", "Join requests must surface an existing active member first.");
assertIncludes(appClient, "Repair/send Group access", "Join requests must offer access repair for existing members.");
assertIncludes(appClient, "joinRequestExistingActiveMember", "Existing-member detection must be shared, not inlined.");
assertBefore(appClient, "existingActiveMember ? (", "possibleMatches.length ? (", "The already-member panel must render before the match picker.");
assertIncludes(appClient, "None of these — create a new person", "Create new person must be the explicit last resort, not the normal path.");
assertIncludes(appClient, "maskEmailForLeader", "Ambiguous matches must show masked email, never full contact detail.");
assertIncludes(appClient, "maskPhoneForLeader", "Ambiguous matches must show masked phone, never full contact detail.");

// The founder-named leader action.
assertIncludes(appClient, "a fresh link`", "Leaders must have the Send {First} a fresh link action.");

// Desktop columns: no more nested three-column squeeze, no floating listbox
// in the join-request card.
assertNotIncludes(appClient, "xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]", "The People tab must not restack three side-by-side columns.");
assertNotIncludes(appClient, "xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]", "Pending Requests and Members must split the row evenly.");
{
  const joinCard = appClient.slice(appClient.indexOf("Choose who this is"), appClient.indexOf("Repair/send Group access"));
  assert(joinCard.length > 0, "Join-request card markers must exist.");
  assertNotIncludes(joinCard, "CompactOptionSelect", "The join-request match picker must be inline and contained, not a floating dropdown.");
}


/* ---------------------------------------------------------------- *
 * One Journey, permission-scoped (USA-170 founder follow-up).
 * ---------------------------------------------------------------- */

const groupJourneyView = read("app/groups/GroupJourneyView.tsx");
const guidedJourneyUi = read("src/components/dos/GuidedJourneyUi.tsx");

// The participant Journey composes the same shared response fields as the
// full DOS Journey, with the canonical helper copy visible — not hidden in an
// aria-label.
assertIncludes(groupJourneyView, "GuidedJourneyResponseField", "Member Journey must use the shared response field component.");
assertIncludes(groupJourneyView, "GuidedJourneyResponses", "Member Journey must use the shared responses section.");
assertIncludes(groupJourneyView, "guidedJourneyReflectionHelper", "Member Journey must read the canonical reflection helper.");
assertIncludes(groupJourneyView, "guidedJourneyActionHelper", "Member Journey must read the canonical action helper.");
assertIncludes(groupJourneyView, "guidedJourneyPrayerHelper", "Member Journey must read the canonical prayer helper.");
assertNotIncludes(groupJourneyView, ">WHAT STOOD OUT?<", "The bare uppercase prompt without visible helper must not return.");
assertIncludes(guidedJourneyUi, "helper", "Shared response fields must carry visible helper copy.");

// Preview save never reaches the server action.
assertIncludes(groupJourneyView, "action={preview ? undefined : saveGroupMemberJourneyProgress}", "Preview mode must disconnect the server action.");
assertIncludes(groupJourneyView, "handlePreviewSubmit", "Preview saves must land in overlay memory.");
assertIncludes(groupJourneyView, "event.preventDefault()", "Preview submit must not fall through to a network request.");

// One visual system: the gold-on-dark Journey theme is deleted, and the
// shared Journey UI uses the DOS token family, not the mockup's navy/ink.
assertIncludes(guidedJourneyUi, 'export type GuidedJourneyTheme = "light";', "The Journey has exactly one theme.");
for (const driftHex of ["#E8C884", "#8EA4C0", "#2450C8", "#1B3EA0", "#0F1520", "#3D4654", "#6B7686", "#9AA4B2"]) {
  assertNotIncludes(guidedJourneyUi, driftHex, `Shared Journey UI must use DOS tokens, not the drifted palette (${driftHex}).`);
}
assertIncludes(guidedJourneyUi, "#2563EB", "Shared Journey UI primary actions must use DOS blue.");

// Same text/voice response control on both surfaces — one shared component.
const voiceTextarea = read("src/components/dos/VoiceTextarea.tsx");
assertIncludes(voiceTextarea, "export function VoiceTextarea", "The voice/text control must live in a shared module.");
assertIncludes(groupJourneyView, "VoiceTextarea", "Member Journey must use the shared voice/text control.");
assertIncludes(appClient, 'from "@/src/components/dos/VoiceTextarea"', "The full DOS Journey must use the same shared voice/text control.");
assertNotIncludes(appClient, "function VoiceTextarea", "The leader client must not keep a private copy of the voice control.");
