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

/* Resolve the DOS text tokens so a token-based assertion still proves the
   colour is readable, not merely that a class name is spelled correctly.
   tailwind.config.js is the single source these classes compile from. */
const tailwindConfig = readFileSync("tailwind.config.js", "utf8");
const dosColorBlock = sliceBetween(tailwindConfig, "        dos: {", "\n        },");

function dosColor(token) {
  const match = new RegExp(`\\n\\s*${token}: "(#[0-9A-Fa-f]{6})"`).exec(dosColorBlock);
  assert(match, `tailwind.config.js should define the dos-${token} colour.`);

  return match[1];
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/* Contrast against the white sheet these surfaces render on. */
function assertReadableToken(token, label) {
  const hex = dosColor(token);
  const ratio = 1.05 / (relativeLuminance(hex) + 0.05);

  assert(ratio >= 4.5, `${label} use dos-${token} (${hex}), which is ${ratio.toFixed(2)}:1 on white and fails WCAG AA.`);
}

const client = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
// USA-211 moved the form primitives and option selects into shared modules; the assertions are unchanged.
const formPrimitives = readFileSync("src/components/dos/forms/FormPrimitives.tsx", "utf8");
const optionSelect = readFileSync("src/components/dos/forms/OptionSelect.tsx", "utf8");
const guide = readFileSync("app/guide/[slug]/page.tsx", "utf8");

const fieldLabel = sliceBetween(formPrimitives, "function FieldLabel", "function FieldInputClass");
assert(fieldLabel.includes("text-[#475569]"), "DOS form labels should use readable secondary text.");
assertReadableSection(fieldLabel, "DOS form labels");

const compactOptionSelect = sliceBetween(optionSelect, "function CompactOptionSelect", "function FormOptionSelect");
assert(compactOptionSelect.includes("text-[#64748B]"), "Compact select helper text should use readable secondary text.");
assertReadableSection(compactOptionSelect.replaceAll("text-[#94A3B8] transition-transform", ""), "Compact select labels and helper text");

const prayerAudienceSelect = sliceBetween(client, "function PrayerRequestAudiencePicker", "function AddPrayerPartnerSheet");
assert(prayerAudienceSelect.includes("text-[#64748B]"), "Prayer audience helper text should use readable secondary text.");
assert(!prayerAudienceSelect.includes("font-medium text-[#94A3B8]"), "Prayer audience helper text should not look disabled.");

/* USA-272 rebuilt the My Record read view on the shared DOS text tokens, which
   `app/dos/AGENTS.md` §3 requires in place of one-off hex values. The
   guarantee this file exists to protect is unchanged, so it is now asserted
   against the token's resolved colour rather than against a literal hex: the
   label and the body must both clear WCAG AA on the white sheet. The tokens
   are in fact darker than the hexes they replaced (#6B7686 vs #64748B for the
   label, #0B1220 vs #0F172A for the body). */
const myRecordDetailBlock = sliceBetween(client, "function MyRecordDetailBlock", "function MyRecordSheetFrame");
assert(myRecordDetailBlock.includes("text-dos-eyebrow"), "My Record detail block labels should use the readable eyebrow token.");
assert(myRecordDetailBlock.includes("text-dos-primary"), "My Record detail block values should use the primary text token.");
assert(myRecordDetailBlock.includes("[&_li]:text-dos-primary"), "My Record detail block lists should keep primary readable text.");
assertReadableSection(myRecordDetailBlock, "My Record detail blocks");
assertReadableToken("eyebrow", "My Record detail block labels");
assertReadableToken("primary", "My Record detail block values");

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
  /* src/components/dos/WorkspaceV2Shell.tsx was deleted in USA-239 (zero importers on main). */
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
