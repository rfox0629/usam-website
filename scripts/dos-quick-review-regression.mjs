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
]) {
  assert(!form.includes(bannedCopy), `Quick Review form must not include old copy: ${bannedCopy}`);
}

for (const requiredCopy of [
  "Quick Review",
  "Thank you for taking a minute to share your experience. Your feedback helps us care for people better.",
  "About You",
  "First Name",
  "Last Name",
  "Optional when this link already knows you.",
  "How was your experience today?",
  "How much do you agree?",
  "I felt heard",
  "I felt cared for",
  "This conversation was helpful",
  "I would be happy to meet again",
  "What did you experience today?",
  "Select all that apply.",
  "Overall, how would you describe today's conversation?",
  "Is there anything you'd like us to know? (Optional)",
  "We'd love to hear what encouraged you, what stood out, or anything we could do better.",
  "Submit Review",
  "Your feedback helps us care for people better. We're grateful you took a few moments to share your experience. If you requested follow-up, someone will reach out soon.",
]) {
  assert(form.includes(requiredCopy) || formConfig.includes(requiredCopy), `Quick Review must include: ${requiredCopy}`);
}

for (const option of ["Yes", "Somewhat", "No"]) {
  assert(formConfig.includes(`label: "${option}"`), `Quick Review must keep segmented answer label ${option}.`);
}

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
  reviews.includes(".from(\"participant_reviews\")") && reviews.includes(".from(\"dos_meeting_reviews\")"),
  "Quick Review submit path must store review records.",
);
assert(
  reviews.includes(".from(\"missionary_field_people\")") && reviews.includes("last_activity_at"),
  "Quick Review submit path must update the contact activity timestamp.",
);
assert(
  circleScoring.includes("quickReviewPositiveSignals") && circleScoring.includes("quickReviewRequestedFollowUp"),
  "Circle Engine must consume Quick Reviews as relationship/follow-up inputs.",
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
  appClient.includes("handleCopyExistingReviewLink") && appClient.includes("handleOpenExistingReviewLink"),
  "Existing Quick Review links must be copyable and openable after generation.",
);
assert(
  missionaryApp.includes("recipient_person_id") && missionaryApp.includes("reviewLinksByMeetingId") && missionaryApp.includes("reviewLinks:"),
  "DOS app loader must expose recipient-specific review links for person profile table detail.",
);

console.log("DOS Quick Review regression passed.");
