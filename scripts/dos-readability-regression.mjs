import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert(start >= 0, `Missing source section: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `Missing source section end: ${endNeedle}`);

  return source.slice(start, end);
}

function assertReadableSection(source, label) {
  assert(!source.includes("text-slate-300"), `${label} should not use text-slate-300 for readable content.`);
  assert(!source.includes("text-slate-400"), `${label} should not use text-slate-400 for readable content.`);
  assert(!source.includes("text-gray-300"), `${label} should not use text-gray-300 for readable content.`);
  assert(!source.includes("text-gray-400"), `${label} should not use text-gray-400 for readable content.`);
  assert(!source.includes("text-[#94A3B8]"), `${label} should not use the pale slate token for readable content.`);
  assert(!source.includes("text-[#CBD5E1]"), `${label} should not use the disabled slate token for readable content.`);
}

const client = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
const guide = readFileSync("app/guide/[slug]/page.tsx", "utf8");

const fieldLabel = sliceBetween(client, "function FieldLabel", "function FieldInputClass");
assert(fieldLabel.includes("text-[#475569]"), "DOS form labels should use readable secondary text.");
assertReadableSection(fieldLabel, "DOS form labels");

const compactOptionSelect = sliceBetween(client, "function CompactOptionSelect", "function FormOptionSelect");
assert(compactOptionSelect.includes("text-[#64748B]"), "Compact select helper text should use readable secondary text.");
assertReadableSection(compactOptionSelect.replaceAll("text-[#94A3B8] transition-transform", ""), "Compact select labels and helper text");

const prayerAudienceSelect = sliceBetween(client, "function PrayerRequestAudiencePicker", "function AddPrayerPartnerSheet");
assert(prayerAudienceSelect.includes("text-[#64748B]"), "Prayer audience helper text should use readable secondary text.");
assert(!prayerAudienceSelect.includes("font-medium text-[#94A3B8]"), "Prayer audience helper text should not look disabled.");

const myRecordDetailBlock = sliceBetween(client, "function MyRecordDetailBlock", "function MyRecordSheetFrame");
assert(myRecordDetailBlock.includes("text-[#64748B]"), "My Record detail block labels should use readable secondary text.");
assert(myRecordDetailBlock.includes("text-[#0F172A]"), "My Record detail block values should use primary text.");
assert(myRecordDetailBlock.includes("[&_li]:text-[#0F172A]"), "My Record detail block lists should keep primary readable text.");
assertReadableSection(myRecordDetailBlock, "My Record detail blocks");

const lifePlanSheet = sliceBetween(client, "if (sheet.kind === \"life_plan\")", "if (sheet.kind === \"external_assessment\")");
assert(lifePlanSheet.includes("label=\"Decision Filters\""), "Life Plan view should render Decision Filters.");
assert(lifePlanSheet.includes("label=\"Top 10 Priorities\""), "Life Plan view should render Top 10 Priorities.");
assert(lifePlanSheet.includes("label=\"Privacy\""), "Life Plan view should render private/default share language.");
assert(!lifePlanSheet.includes("text-[#94A3B8]"), "Life Plan sheet should not use pale slate text for readable content.");
assert(!lifePlanSheet.includes("text-[#CBD5E1]"), "Life Plan sheet should not use disabled slate text for readable content.");

const externalAssessmentForm = sliceBetween(client, "function MyRecordExternalAssessmentForm", "function MyRecordAssessmentsPanel");
assert(externalAssessmentForm.includes("Store user-owned results and summaries only."), "External assessment form should keep copyright-safe helper copy.");
assert(externalAssessmentForm.includes("text-[#64748B]\">Do not copy questions"), "External assessment copyright helper should be readable.");
assert(!externalAssessmentForm.includes("text-[#94A3B8]\">Do not copy questions"), "External assessment copyright helper should not look disabled.");

const assessmentResultCard = sliceBetween(client, "function MyRecordAssessmentResultCard", "function MyRecordAssessmentForm");
assert(assessmentResultCard.includes("text-[#64748B]"), "Assessment result metadata should use readable secondary text.");
assertReadableSection(assessmentResultCard, "Assessment result cards");

const sendableFormPreviewCard = sliceBetween(client, "function SendableFormPreviewCard", "function MeetingSendConfirmationSheet");
assert(sendableFormPreviewCard.includes("text-[#64748B]"), "Sendable form previews should use readable preview placeholder text.");
assert(!sendableFormPreviewCard.includes("text-xs text-[#94A3B8]"), "Sendable form preview placeholders should not look disabled.");

const detailRow = sliceBetween(client, "function DetailRow", "function BottomNavigation");
assert(detailRow.includes("text-[#64748B]"), "DOS detail row labels should use readable secondary text.");
assert(!detailRow.includes("tracking-[0.13em] text-[#94A3B8]"), "DOS detail row labels should not use the pale slate token.");

const assessmentQuestion = sliceBetween(guide, "function AssessmentQuestion", "function AssessmentBlock");
assert(assessmentQuestion.includes("text-[#0F172A]"), "Library assessment questions should use primary text.");
assert(assessmentQuestion.includes("text-[#475569]"), "Library assessment participant prompts should use readable body text.");
assert(assessmentQuestion.includes("text-[#64748B]"), "Library assessment notes should use readable helper text.");
assertReadableSection(assessmentQuestion, "Library assessment questions");

const filesToScan = [
  "app/dos/app/DosMvpAppClient.tsx",
  "app/dos/review/[token]/DosQuickReviewForm.tsx",
  "app/dos/setup/DosSetupClient.tsx",
  "app/dos/testimony/[token]/DosTestimonyForm.tsx",
  "app/guide/[slug]/page.tsx",
  "src/components/dos/WorkspaceV2Shell.tsx",
];

const lowContrastClassPattern = /text-(?:slate|gray)-(?:300|400)|opacity-(?:40|50)/;
const allowedLowContrastContext = /disabled:|placeholder|loading|skeleton|aria-disabled|animate-pulse/;

for (const filePath of filesToScan) {
  const lines = readFileSync(filePath, "utf8").split("\n");

  lines.forEach((line, index) => {
    if (!lowContrastClassPattern.test(line)) {
      return;
    }

    assert(
      allowedLowContrastContext.test(line),
      `${filePath}:${index + 1} uses a low-contrast utility outside an allowed disabled/placeholder/loading context.`,
    );
  });
}

console.log("DOS readability regression passed.");
