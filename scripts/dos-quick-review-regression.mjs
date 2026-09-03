import { readFileSync, readdirSync } from "node:fs";

const files = {
  appClient: "app/dos/app/DosMvpAppClient.tsx",
  circleScoring: "src/lib/dos/circle-scoring.ts",
  form: "app/dos/review/[token]/DosQuickReviewForm.tsx",
  formConfig: "src/lib/dos/review-form-config.ts",
  missionaryApp: "src/lib/dos/missionary-app.ts",
  reviews: "src/lib/dos/reviews.ts",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const form = read(files.form);
const formConfig = read(files.formConfig);
const appClient = read(files.appClient);
const missionaryApp = read(files.missionaryApp);
const reviews = read(files.reviews);
const circleScoring = read(files.circleScoring);
const migrationFile = readdirSync(new URL("../supabase/migrations", import.meta.url))
  .find((file) => file.endsWith("_quick_review_name_rating_metadata.sql"));
const migration = migrationFile ? read(`supabase/migrations/${migrationFile}`) : "";

/* V2 is three questions and one request. Everything here was either asked at
   a resolution the Overall rating already covers, or is something the review
   link already knows. None of it may come back to the recipient's form --
   they all remain renderable for reviews that recorded them. */
for (const bannedCopy of [
  "DOS Review",
  "2 Minute Review",
  "A short reflection form someone completes after a saved Table.",
  "Reviews are used internally",
  "Personal Information",
  "Your Experience",
  "What stood out today?",
  "What stood out during your conversation?",
  "Is there anything you'd like to share?",
  "I felt heard",
  "I felt cared for",
  "This conversation was helpful",
  "I would be happy to meet again",
  "How much do you agree?",
  "Optional when this link already knows you.",
  "What did you experience today?",
  "Overall, how would you describe today's conversation?",
]) {
  assert(!form.includes(bannedCopy), `Quick Review form must not include retired copy: ${bannedCopy}`);
}

for (const requiredCopy of [
  "Quick Review",
  "How was your conversation with ${leaderFirstName}?",
  "You&apos;re answering as",
  "Not you?",
  "How was it?",
  "Did any of this happen? (optional)",
  "Anything you&apos;d like us to know? (optional)",
  "I&apos;d like someone to follow up with me",
  "Send",
]) {
  assert(form.includes(requiredCopy) || formConfig.includes(requiredCopy), `Quick Review must include: ${requiredCopy}`);
}

/* The recipient sees who is asking and when -- and nothing else about the
   meeting, the leader, or the workspace. */
for (const context of ["leaderFirstName", "meetingDate", "meetingType"]) {
  assert(form.includes(context), `Quick Review header must carry ${context}.`);
}
for (const leaked of ["notes", "accountability", "prayerRequest", "fruit", "circle", "relationshipScore"]) {
  assert(!form.toLowerCase().includes(leaked.toLowerCase()), `Quick Review must not expose ${leaked} to the recipient.`);
}

/* The four things V2 asks about, and the wider historical set kept so stored
   tags never become unrenderable. */
for (const [label, value] of [
  ["I felt closer to God", "Closer to God"],
  ["Someone prayed with me", "Prayer Received"],
  ["I decided to follow Jesus", "New Believers"],
  ["I want to keep growing", "Discipling"],
]) {
  assert(formConfig.includes(`{ label: "${label}", value: "${value}" }`), `Quick Review V2 option missing: ${label}.`);
}

for (const option of ["Yes", "Somewhat", "No"]) {
  assert(formConfig.includes(`label: "${option}"`), `Historical segmented answer label ${option} must stay renderable.`);
}

/* The retired ten-option selector stays in the config as history. */
for (const [label, value] of [
  ["I experienced encouragement", "Felt encouraged"],
  ["I experienced hope", "Hope"],
  ["I experienced peace", "Peace"],
  ["Someone prayed with me", "Prayer Received"],
  ["I experienced forgiveness", "Reconciliation"],
  ["I feel closer to God", "Closer to God"],
  ["I want to grow spiritually", "Discipling"],
  ["I made a decision to follow Jesus", "New Believers"],
  ["I'd like someone to follow up with me", "Follow Up Requested"],
  ["Other", "Other"],
]) {
  assert(formConfig.includes(`label: "${label}"`), `Quick Review display option missing: ${label}.`);
  assert(formConfig.includes(`value: "${value}"`), `Quick Review internal outcome mapping missing: ${value}.`);
}

for (const [label, value] of [
  ["Life-changing", "life_changing"],
  ["Very meaningful", "very_meaningful"],
  ["Helpful", "helpful"],
  ["Somewhat helpful", "somewhat_helpful"],
  ["Not very helpful", "not_very_helpful"],
]) {
  assert(formConfig.includes(`label: "${label}"`), `Quick Review overall rating option missing: ${label}.`);
  assert(formConfig.includes(`value: "${value}"`), `Quick Review overall rating value missing: ${value}.`);
}

for (const token of ["submittedFirstName", "submittedLastName", "overallRating"]) {
  assert(form.includes(token), `Quick Review form must send ${token}.`);
  assert(reviews.includes(token), `Quick Review submit path must normalize/store ${token}.`);
}

for (const column of ["submitted_first_name", "submitted_last_name", "overall_rating"]) {
  assert(reviews.includes(column), `Quick Review submit path must write ${column}.`);
  assert(migration.includes(column), `Quick Review migration must add ${column}.`);
}
assert(missionaryApp.includes("overall_rating"), "DOS app loader must hydrate Quick Review overall_rating.");
assert(appClient.includes("quickReviewOverallRatingLabel"), "DOS app must format Quick Review overall ratings.");
assert(appClient.includes("Overall: {overallRating}") || appClient.includes("Overall: {reviewOverallRating}"), "DOS Quick Review cards must display Overall rating.");
assert(appClient.includes("\"Review received\""), "Submitted Quick Reviews must be labeled Review received.");
assert(!appClient.includes("No table notes were added."), "Table detail empty notes copy must be concise.");

assert(reviews.includes("splitSubmittedName"), "Quick Review must preserve backward compatibility with submitted_name.");
assert(reviews.includes("submitted_name"), "Quick Review must continue writing submitted_name.");

for (const forbiddenWrite of [
  "createFruitEvent",
  "inferFruitEventsFromReview",
  ".from(\"missionary_fruit_items\")",
  ".from('missionary_fruit_items')",
  ".from(\"fruit_events\")",
  ".from('fruit_events')",
  "fruit_item_id",
  "source_app: \"dos_quick_review\"",
]) {
  assert(!reviews.includes(forbiddenWrite), `Quick Review submit path must not create or link fruit records: ${forbiddenWrite}`);
}

assert(
  reviews.includes(".from(\"dos_meeting_reviews\")")
    && reviews.includes("submitCanonicalReview")
    && !reviews.includes(".from(\"participant_reviews\")"),
  "Quick Review submit path must write only the canonical dos_meeting_reviews record.",
);
assert(
  reviews.includes(".from(\"missionary_field_people\")") && reviews.includes("last_activity_at"),
  "Quick Review submit path must update the contact activity timestamp.",
);
/* Reversed deliberately. Recipient satisfaction is not evidence about the
   depth of a relationship, so it no longer scores one. An explicit request to
   be contacted is still surfaced, because that is an actual fact. */
const circleScoringCode = circleScoring.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
assert(
  !circleScoringCode.includes("quickReviewPositiveSignals") && !circleScoringCode.includes("quickReviewGrowthSignals"),
  "Circle Engine must not score a relationship from how a conversation felt.",
);
assert(
  circleScoring.includes("quickReviewRequestedFollowUp"),
  "Circle Engine must still surface an explicit follow-up request.",
);
assert(
  !reviews.includes("recalculateCircleScores"),
  "Submitting a Quick Review must not recalculate circle scores.",
);
assert(
  circleScoring.includes("fruit: clampScore(personFruit.length * 50)"),
  "Circle Engine fruit score must remain based on approved fruit, not Quick Reviews.",
);
assert(
  appClient.includes("onOpenMeeting(meeting.id, person.id)")
    && appClient.includes("selectedMeetingReviewRecipientId")
    && appClient.includes("reviewLinkTokenForMeeting")
    && appClient.includes("reviewRequestUrl"),
  "Person profile table detail must preserve recipient-specific Quick Review link state.",
);
for (const action of ["Copy Review Link", "Open Review Link", "Send Again"]) {
  assert(appClient.includes(action), `Person profile table detail must expose ${action}.`);
}
assert(
  appClient.includes("<ReviewActionButton disabled={isSendingReview} icon={<Send")
    && !appClient.includes("!reviewIsCompleted ? (\n                  <ReviewActionButton disabled={isSendingReview}"),
  "Send Again must remain available even after a review is submitted.",
);
assert(
  appClient.includes("handleCopyExistingReviewLink") && appClient.includes("handleOpenExistingReviewLink"),
  "Existing Quick Review links must be copyable and openable after generation.",
);
assert(
  missionaryApp.includes("recipient_person_id") && missionaryApp.includes("reviewLinksByMeetingId") && missionaryApp.includes("reviewLinks:"),
  "DOS app loader must expose recipient-specific review links for person profile table detail.",
);

console.log("DOS Quick Review regression passed.");
