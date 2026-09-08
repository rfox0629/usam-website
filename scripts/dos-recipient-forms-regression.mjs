// USA-243 Phase B2: the recipient-facing Quick Review, Testimony and Review
// Options pages, and the leader-side send sheet and previews, use the white
// canonical DOS form styling, say "meeting" rather than "Table", and never
// re-ask a securely identified recipient for a name or email.
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const testimony = read("app/dos/testimony/[token]/DosTestimonyForm.tsx");
const quickReview = read("app/dos/review/[token]/DosQuickReviewForm.tsx");
const options = read("app/dos/review-options/[token]/DosReviewOptionsForm.tsx");
const testimonyPage = read("app/dos/testimony/[token]/page.tsx");
const reviewPage = read("app/dos/review/[token]/page.tsx");
const config = read("src/lib/dos/review-form-config.ts");
const client = read("app/dos/app/DosMvpAppClient.tsx");
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start) + 1));
const sendSheet = between(client, "function MeetingSendConfirmationSheet(", "\nfunction ");
const previewCard = between(client, "function SendableFormPreviewCard(", "\nfunction MeetingSendConfirmationSheet(");
const previewSheet = between(client, "function FruitFormPreviewSheet(", "\nfunction ");

// 1. Identity comes from the secure link; the bound flow never asks for name or email.
assert(
  testimony.includes("const linkKnowsRecipient = Boolean(link.reviewerPersonName?.trim());")
    && testimony.includes("You&apos;re sharing as")
    && !testimony.includes("submittedEmail")
    && !testimony.includes('type="email"')
    && !testimony.includes("Email address")
    && testimony.includes("submittedName,")
    && testimony.includes('aria-label="Your name"'),
  "The bound Testimony flow must take identity from the link, ask no email, and only offer a name field when the link carries no recipient.",
);
assert(
  !config.includes('label: "Your name"') && !config.includes('label: "Email address"') && config.includes('label: "Who is sharing"'),
  "The Testimony form definition (leader preview) must not list name or email fields.",
);
assert(
  quickReview.includes("linkKnowsReviewer && !isEditingIdentity") && quickReview.includes("Not you?"),
  "Quick Review keeps its bound-identity line with the Not you? escape.",
);

// 2. Sharing consent stays explicit, three choices, never inferred.
assert(
  config.includes('{ label: "Yes, anonymously", value: "anonymous" }')
    && config.includes('{ label: "Yes, with my name included", value: "with_name" }')
    && config.includes('{ label: "No, keep it private", value: "private" }')
    && testimony.includes('sharePermission: "private",')
    && testimony.includes("dosReviewSharePermissionOptions.map(")
    && testimony.includes('draft.sharePermission === "with_name"'),
  "Testimony sharing must stay an explicit three-way choice defaulting to private, with the display name only for named sharing.",
);

// 3. White canonical surfaces: no baby-blue panels on the recipient pages, previews or send sheet.
const babyBlue = /bg-\[#(F8FBFF|DCEBFF|EAF2FF|F1F5F9)\]|border-\[#DCEBFF\]/;
for (const [name, source] of [["Testimony form", testimony], ["Review Options form", options], ["Testimony page", testimonyPage], ["Review page", reviewPage], ["send sheet", sendSheet], ["preview card", previewCard], ["preview sheet", previewSheet]]) {
  assert(!babyBlue.test(source.replace(/export const atmosphere = "[^"]*"/, "")), `${name} must not use baby-blue panels.`);
}
assert(testimony.includes("border-dos-hairline bg-white") && options.includes("border-dos-hairline bg-white") && previewCard.includes("border-dos-line bg-white"), "Recipient forms and previews must sit on white surfaces with hairline borders.");
assert(testimony.includes("bg-dos-blue") && testimony.includes("border-t border-dos-rule"), "The Testimony form must use blue only for the action and group questions with rules.");

// 4. "Table" is not user-facing wording on these surfaces (Kitchen Table Gospel excepted).
const tableWord = /\bTable\b(?! Gospel)|\btable\b(?! Gospel)/;
for (const [name, source] of [["Testimony form", testimony], ["Quick Review form", quickReview], ["Review Options form", options], ["review-form-config", config], ["send sheet", sendSheet], ["preview card", previewCard]]) {
  assert(!tableWord.test(source.replace(/kitchen_table|Kitchen table/g, "")), `${name} must say meeting, not Table.`);
}
for (const [file, phrase] of [["src/lib/dos/reviews.ts", "missing a meeting recipient"], ["src/lib/dos/testimonies.ts", "missing a meeting recipient"], ["src/lib/dos/review-requests.ts", "Select a recipient from this meeting"]]) {
  assert(read(file).includes(phrase), `${file} must use meeting wording in its recipient error.`);
}
assert(
  client.includes('description: "Preview the short review sent after a saved meeting."')
    && client.includes('description: "Preview the testimony form sent after a saved meeting."')
    && sendSheet.includes('label="Meeting" value={fallbackTitle}')
    && sendSheet.includes('label={recipientTitle ? "Meeting" : "Date"}'),
  "Leader-side review cards and the send sheet must say meeting.",
);

// 5. Activity stays activity: the Quick Review prayer chip keeps its wording and is not a fruit value anywhere.
assert(config.includes('{ label: "Someone prayed with me", value: "Prayer Received" }'), "Someone prayed with me stays a Quick Review activity chip.");

console.log("DOS recipient forms regression passed.");
