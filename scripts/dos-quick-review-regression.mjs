import { readFileSync } from "node:fs";

const files = {
  circleScoring: "src/lib/dos/circle-scoring.ts",
  form: "app/dos/review/[token]/DosQuickReviewForm.tsx",
  formConfig: "src/lib/dos/review-form-config.ts",
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
const reviews = read(files.reviews);
const circleScoring = read(files.circleScoring);

for (const bannedCopy of [
  "DOS Review",
  "2 Minute Review",
  "A short reflection form someone completes after a saved Table.",
  "What fruit did you notice?",
  "May we share this testimony?",
  "Reviews are used internally",
]) {
  assert(!form.includes(bannedCopy), `Quick Review form must not include old copy: ${bannedCopy}`);
}

for (const requiredCopy of [
  "Quick Review",
  "Thank you for taking a minute to share your experience. Your feedback helps us care for people better.",
  "Personal Information",
  "Your Experience",
  "What stood out today?",
  "What stood out during your conversation?",
  "Is there anything you'd like to share?",
]) {
  assert(form.includes(requiredCopy) || formConfig.includes(requiredCopy), `Quick Review must include: ${requiredCopy}`);
}

for (const option of ["Yes", "Somewhat", "No"]) {
  assert(formConfig.includes(`label: "${option}"`), `Quick Review must keep segmented answer label ${option}.`);
}

for (const [label, value] of [
  ["I experienced encouragement", "Encouragement"],
  ["I experienced hope", "Hope"],
  ["I experienced peace", "Peace"],
  ["Someone prayed with me", "Prayer"],
  ["I experienced forgiveness", "Reconciliation"],
  ["I want to grow spiritually", "Discipling"],
  ["I made a decision to follow Jesus", "New Believers"],
  ["I'd like someone to follow up with me", "Follow Up Requested"],
]) {
  assert(formConfig.includes(`label: "${label}"`), `Quick Review display option missing: ${label}.`);
  assert(formConfig.includes(`value: "${value}"`), `Quick Review internal outcome mapping missing: ${value}.`);
}

for (const forbiddenWrite of [
  "createFruitEvent",
  "inferFruitEventsFromReview",
  ".from(\"missionary_fruit_items\")",
  ".from('missionary_fruit_items')",
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

console.log("DOS Quick Review regression passed.");
