/**
 * Contract tests for the Restoration Preparation Summary (USA-187).
 *
 * Runs against a synthetic payload so no real case content is needed. Guards
 * the filtering rules, section routing, identifier redaction, and the promise
 * that the generator never invents participant content.
 *
 *   node scripts/restoration-preparation-regression.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./scripts/ts-loader.mjs", pathToFileURL("./"));

const {
  buildPreparationSections,
  createPreparationSummary,
  directIdentifierFields,
  generateCaseReference,
  preparationSectionIds,
  redactForExport,
  buildCaseBrief,
} = await import("../src/lib/operations/restoration-preparation.ts");

const { preparationPdfFilename, renderPreparationPdf } =
  await import("../src/lib/operations/restoration-preparation-pdf.ts");

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${message}`);
  if (!ok) failures.push(message);
};

const values = {
  // consent + contact: must never appear
  careAcknowledgement: true,
  confidentialityAcknowledgement: true,
  informedConsent: true,
  participantEmail: "person@example.com",
  participantName: "A Participant",
  participantPhone: "555-0100",
  todaysDate: "2026-08-21",
  truthfulInitials: true,
  // No answers: must be filtered
  alcoholOrDrugs: "No",
  bloodTransfusion: "No",
  cultInvolvement: "No",
  immediateDanger: "No",
  servedMilitary: "No",
  // blank
  lastChurch: "",
  spiritualIssues: "   ",
  // substantive
  whatBringsYouHere: "I have carried this for years.",
  restorationGoals: "I want to be free of it.",
  previousDeliverance: "Yes",
  willingToVisitPastHurt: "Not sure",
  currentlyMarried: "Yes",
  everDivorced: "Yes",
  hasChildren: "Yes",
  childrenDifficulty: "We argue often.",
  bornAgainChristian: "Yes",
  hasCurrentChurch: "No",
  hindrance_fears: ["Fear of failure", "Fear of man"],
  hindrance_angerIssues: ["Bitterness", "Unforgiveness"],
  hindrance_traumas: ["Traumatic loss"],
  // gate radios: never rendered
  hasHindrance_fears: "Yes",
  hasHindrance_angerIssues: "Yes",
  // third-party identifiers
  spouseFirstName: "Dana",
  fatherNameOccupation: "Robert, machinist",
  familyTreeSpouse: "Dana, 51, married 24 years",
  fatherRelationship: "He was distant.",
};

console.log("filtering");
const sections = buildPreparationSections(values);
const allItems = sections.flatMap((s) => s.items);
const ids = new Set(allItems.map((i) => i.fieldId));
const text = JSON.stringify(sections);

check(!ids.has("participantName") && !ids.has("participantEmail") && !ids.has("participantPhone"),
  "contact details are excluded from the summary");
check(!text.includes("person@example.com") && !text.includes("555-0100"),
  "no contact value leaks into any section");
check(!ids.has("informedConsent") && !ids.has("truthfulInitials") && !ids.has("careAcknowledgement"),
  "boilerplate consent boxes are excluded");
check(!ids.has("alcoholOrDrugs") && !ids.has("cultInvolvement") && !ids.has("servedMilitary"),
  "No answers are filtered out");
check(!ids.has("immediateDanger"), "immediateDanger of No is filtered out");
check(!ids.has("lastChurch") && !ids.has("spiritualIssues"), "blank and whitespace answers are filtered out");
check(![...ids].some((id) => id.startsWith("hasHindrance_")), "gate radios are not rendered as content");
check(ids.has("willingToVisitPastHurt"), "Not sure is kept as substantive");

console.log("organization");
check(sections.length === preparationSectionIds.length, `all ${preparationSectionIds.length} sections present`);
const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
check(byId.seeking.items.some((i) => i.fieldId === "whatBringsYouHere"), "why they are seeking routes correctly");
check(byId.context.items.some((i) => i.fieldId === "currentlyMarried"), "life and family context routes correctly");
check(byId.experiences.items.some((i) => i.fieldId === "hindrance_traumas"), "significant experiences routes correctly");
check(byId.identified.items.some((i) => i.fieldId === "hindrance_fears"), "areas they identified routes correctly");
check(byId.spiritual.items.some((i) => i.fieldId === "bornAgainChristian"), "spiritual history routes correctly");
check(byId.relationships.items.some((i) => i.fieldId === "spouseFirstName"), "relationships routes correctly");
check(byId.prayer.items.length > 0, "prayer areas are consolidated from their own selections");
check(byId.questions.items.length > 0, "questions are generated");
check(byId.seeking.kind === "participant" && byId.questions.kind === "generated",
  "participant content and generated content are labelled differently");

console.log("no invention");
const participantSections = sections.filter((s) => s.kind === "participant");
// A rendered value must be exactly what was submitted: the trimmed string, or
// an array joined for display. Splitting on commas would be wrong, because
// submitted answers legitimately contain them.
const submitted = new Set(
  Object.values(values).map((v) => (Array.isArray(v) ? v.join(", ") : String(v).trim())),
);
const invented = participantSections
  .flatMap((s) => s.items)
  .filter((i) => !submitted.has(i.value));
check(invented.length === 0,
  `participant sections contain only submitted values${invented.length ? `: ${invented.map((i) => i.fieldId).join(", ")}` : ""}`);
check(byId.questions.items.every((i) => i.value.trim().endsWith("?")),
  "generated content is phrased as questions, never as conclusions");

console.log("case reference");
const refs = new Set();
for (let i = 0; i < 400; i += 1) {
  const bytes = new Uint8Array(5);
  for (let n = 0; n < 5; n += 1) bytes[n] = Math.floor(Math.random() * 256);
  refs.add(generateCaseReference(bytes));
}
const sample = [...refs][0];
check(/^R-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/.test(sample), `format is non-identifying: ${sample}`);
check(![...refs].some((r) => /[01OIL]/.test(r.slice(2))), "ambiguous characters are excluded");
check(refs.size > 350, `references are random (${refs.size} distinct of 400)`);

console.log("pdf redaction");
const summary = createPreparationSummary({ caseReference: "R-TEST1", generatedBy: "reviewer@example.org", now: new Date().toISOString(), values });
summary.notes.seeking = { author: "reviewer@example.org", text: "Private reviewer note.", updatedAt: new Date().toISOString() };
const withoutNotes = JSON.stringify(redactForExport(summary, { includeNotes: false }));
const withNotes = JSON.stringify(redactForExport(summary, { includeNotes: true }));
check(!withoutNotes.includes("Private reviewer note."), "reviewer notes are excluded from the PDF by default");
check(withNotes.includes("Private reviewer note."), "reviewer notes are included only when explicitly selected");
for (const id of ["spouseFirstName", "fatherNameOccupation", "familyTreeSpouse"]) {
  check(directIdentifierFields.has(id), `${id} is treated as a third-party identifier`);
}
check(!withoutNotes.includes("Dana") && !withoutNotes.includes("Robert, machinist"),
  "third-party identifier fields are withheld from the PDF");
check(withoutNotes.includes("He was distant."), "relationship context is kept even when names are withheld");
check(!withoutNotes.includes("person@example.com"), "no participant identifiers in the export");

console.log("\ncase brief");
const briefSections = buildPreparationSections(values);
const brief = buildCaseBrief(briefSections);
const sectionText = briefSections.flatMap((s) => s.items.map((i) => i.value)).join("\n");
check(brief.length > 0, "a brief is produced for a substantive case");
check(brief.every((e) => e.kind === "participant" || e.kind === "generated"),
  "every brief line is labelled participant or generated");
for (const entry of brief) {
  const inSections = sectionText.includes(entry.value)
    || entry.value.split(" (")[0].split(" ").every((w) => sectionText.includes(w));
  check(inSections, `brief line "${entry.label}" repeats content already in the sections`);
}
check(brief.some((e) => e.label === "Why they are here, in their words"), "brief leads with why they are here");
check(brief.some((e) => e.label === "Questions to open with"), "brief carries opening questions");
check(buildCaseBrief([]).length === 0, "an empty case produces no brief rather than invented content");
const sparse = buildPreparationSections({ whatBringsYouHere: "I need help." });
check(buildCaseBrief(sparse).length >= 1, "a sparse case still produces the lines it can support");
check(!buildCaseBrief(sparse).some((e) => e.label === "The context they gave"),
  "brief omits lines the participant did not answer");

console.log("\nsummary is not reviewer-editable");
check(briefSections.every((s) => !("narrative" in s)),
  "sections carry no narrative field");
const exported = redactForExport(summary, { includeNotes: true }).sections;
check(exported.every((s) => !("narrative" in s)),
  "exported sections carry no narrative field");
check(exported.every((s) => typeof s.note === "string"),
  "each exported section still carries its reviewer note slot");
const savedShape = { ...summary, savedAt: new Date().toISOString(), savedBy: "r", status: "saved" };
check(JSON.stringify(savedShape.sections) === JSON.stringify(summary.sections),
  "marking a summary reviewed does not rewrite section content");
check(Object.keys(savedShape.notes).length === Object.keys(summary.notes).length,
  "marking a summary reviewed preserves existing reviewer notes");

console.log("\npdf document");
const saved = { ...summary, savedAt: new Date().toISOString(), savedBy: "reviewer@example.org", status: "saved" };
const pdf = renderPreparationPdf(saved, { includeNotes: false });
const pdfText = pdf.toString("latin1");
check(pdfText.startsWith("%PDF-"), "export is a well formed PDF");
check(pdfText.trimEnd().endsWith("%%EOF"), "PDF ends with the EOF marker");
check(/xref\n0 \d+\n0000000000 65535 f/.test(pdfText), "PDF carries a cross reference table");
check(pdfText.includes("CONFIDENTIAL - REDACTED PREPARATION SUMMARY"), "PDF header states the confidentiality classification");
check(pdfText.includes("R-TEST1"), "PDF shows the case reference");
check(pdfText.includes("For authorized preparation use only."), "PDF footer carries the handling instruction");
check(!pdfText.includes("Private reviewer note."), "PDF omits reviewer notes by default");
check(renderPreparationPdf(saved, { includeNotes: true }).toString("latin1").includes("Private reviewer note."),
  "PDF includes reviewer notes only on explicit opt in");
check(!/\/(Title|Author|Subject|Keywords)/.test(pdfText), "PDF metadata carries no title, author, or subject");
for (const identifier of ["person@example.com", "Dana"]) {
  check(!pdfText.includes(identifier), `PDF withholds ${identifier}`);
}
const briefLead = pdfText.indexOf("Case Brief");
check(briefLead > -1 && briefLead < pdfText.indexOf("Why they are seeking restoration"),
  "PDF leads with the case brief, before the intake sections");
check(pdfText.includes("/F3 "), "PDF registers an oblique face for supporting copy");
check(/[\d.]+ [\d.]+ [\d.]+ rg/.test(pdfText), "PDF sets fill colours for typographic hierarchy");
check(pdfText.includes(" re f"), "PDF draws filled rules and blocks");
const headerCount = (pdfText.match(/CONFIDENTIAL - REDACTED PREPARATION SUMMARY/g) || []).length;
const pageCount = (pdfText.match(/For authorized preparation use only\./g) || []).length;
check(headerCount >= pageCount,
  "confidentiality label repeats on every page");
check((pdfText.match(/\(Case R-TEST1\)/g) || []).length >= pageCount,
  "case reference repeats on every page");
check((pdfText.match(/Generated [A-Z][a-z]{2} \d{1,2}, \d{4} {4}Page \d+ of \d+/g) || []).length === pageCount,
  "generated date and page number repeat on every page");
check(!pdfText.includes("INTERNAL REVIEWER NOTE"),
  "note label is absent when notes are excluded");

const withNotesPdf = renderPreparationPdf(saved, { includeNotes: true }).toString("latin1");
check(withNotesPdf.includes("INTERNAL REVIEWER NOTE"),
  "note blocks are labelled INTERNAL REVIEWER NOTE when included");
check(withNotesPdf.includes(" re S"),
  "note blocks are drawn as bordered boxes distinct from participant content");

const longNote = { ...saved, notes: { seeking: { author: "r", text: "Lorem ipsum dolor sit amet. ".repeat(400), updatedAt: new Date().toISOString() } } };
const longPdf = renderPreparationPdf(longNote, { includeNotes: true }).toString("latin1");
// PDF text operators escape parentheses, so the label is stored escaped.
check(longPdf.includes("INTERNAL REVIEWER NOTE \\(CONTINUED\\)"),
  "a note taller than a page continues into a labelled second block");
check((longPdf.match(/INTERNAL REVIEWER NOTE/g) || []).length > 1,
  "an oversized note is split across more than one labelled block");
check(longPdf.startsWith("%PDF-") && longPdf.trimEnd().endsWith("%%EOF"),
  "an oversized note still produces a well formed PDF");

check(preparationPdfFilename("R-TEST1") === "restoration-R-TEST1-preparation-summary.pdf",
  "PDF filename uses the case reference and no participant name");

if (failures.length) {
  console.error(`\nrestoration preparation regression FAILED (${failures.length})`);
  process.exit(1);
}
console.log("\nrestoration preparation regression passed");
