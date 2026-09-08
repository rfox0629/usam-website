import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const meetingEngine = read("src/lib/dos/meeting-engine.ts");

const peopleSelectorStart = appClient.indexOf("function MeetingPeopleSelector");
const peopleSelectorEnd = appClient.indexOf("function MinistryTeamSelector", peopleSelectorStart);
const peopleSelectorBlock = appClient.slice(peopleSelectorStart, peopleSelectorEnd);
const meetingFormStart = appClient.indexOf("function MeetingFormContent");
const meetingFormEnd = appClient.indexOf("function CalendarConnectionCard", meetingFormStart);
const meetingFormBlock = appClient.slice(meetingFormStart, meetingFormEnd);

assert(peopleSelectorStart !== -1 && peopleSelectorEnd !== -1, "MeetingPeopleSelector must exist in DosMvpAppClient.tsx.");
assert(meetingFormStart !== -1 && meetingFormEnd !== -1, "MeetingFormContent must exist in DosMvpAppClient.tsx.");

assert(
  peopleSelectorBlock.includes("function selectPerson(personId: string)") &&
    peopleSelectorBlock.includes("onToggle(personId);") &&
    peopleSelectorBlock.includes("onQueryChange(\"\");") &&
    peopleSelectorBlock.includes("onClick={() => selectPerson(person.id)}"),
  "Selecting an existing participant must clear the participants search query after adding the chip.",
);

/* USA-168 locked the primary path to date -> who -> more people. "Your role"
   left the visible flow: a Person meeting is the user's relationship with that
   person, so it is no longer asked per meeting -- but the value still posts,
   which is asserted below. The guarantee being guarded is unchanged:
   participants come first, and everyone else stays behind one collapsed
   disclosure rather than expanding the form by default. */
assert(
  meetingFormBlock.indexOf('title="Who was there?"') !== -1
    && meetingFormBlock.indexOf('title="Who was there?"') < meetingFormBlock.indexOf('title="More people"'),
  "Log Meeting must show participants before the collapsed More people disclosure.",
);

const morePeopleStart = meetingFormBlock.indexOf('title="More people"');
const morePeopleBlock = meetingFormBlock.slice(0, morePeopleStart);

assert(
  morePeopleBlock.includes("<DisclosureSection"),
  "More people must be rendered as a collapsed disclosure.",
);

assert(
  meetingFormBlock.includes("<MinistryTeamSelector")
    && meetingFormBlock.includes("<SupportingAttendeeSelector"),
  "Ministry Team and Supporting Attendees must remain available inside the disclosure.",
);

// Role left the UI but not the contract: the payload still carries it, so
// historical role data and the backend stay unchanged.
assert(
  !meetingFormBlock.includes("<TableRolePicker")
    && meetingFormBlock.includes('name="table_role" type="hidden" value={selectedTableRole}'),
  "Your role must be gone from the visible flow while still posting table_role.",
);

// Nothing is prefilled any more -- the old workspace ministry-team default was
// a single household's workflow, not a DOS default -- so the disclosure opens
// only when the launch context genuinely supplied someone.
assert(
  meetingFormBlock.includes("defaultOpen={selectedMinistryTeamPersonIds.length + selectedMinistryTeamMemberIds.length + selectedSupportingAttendeeIds.length > 0}"),
  "More people must auto-open only for a genuinely supplied team member or supporting attendee.",
);

assert(
  appClient.includes("const [selectedMinistryTeamMemberIds, setSelectedMinistryTeamMemberIds] = useState<string[]>([]);"),
  "Log Meeting must not prefill any ministry team member by default.",
);

assert(
  meetingFormBlock.includes("summary={morePeopleSummary}")
    && meetingFormBlock.includes("const morePeopleSummary = (() => {"),
  "The collapsed More people header must report who it contains.",
);

assert(
  !meetingFormBlock.includes('title="What happened?"')
    && meetingFormBlock.includes('title={showScheduledTiming ? "What are you scheduling?" : "How did you connect?"}'),
  "Meeting context must ask how the interaction happened, not the vague \"What happened?\".",
);

const leaderStart = appClient.indexOf("function MeetingLeaderReflectionSection");
const leaderEnd = appClient.indexOf("function MeetingGrowthReflectionSection", leaderStart);
const leaderBlock = appClient.slice(leaderStart, leaderEnd);

assert(leaderStart !== -1 && leaderEnd !== -1, "MeetingLeaderReflectionSection must exist in DosMvpAppClient.tsx.");

assert(
  leaderBlock.includes('title="Meeting Notes"') && leaderBlock.includes("<MeetingCaptureNotes"),
  "The ministering reflection flow must lead with one primary Meeting Notes field.",
);

/* USA-168 renamed these to the locked vocabulary -- Accountability is what
   they must do, Reminder is what I must remember -- and gave them a heading so
   the structured records a conversation produces are not read as
   miscellaneous extras. They remain optional and inline. */
assert(
  leaderBlock.includes('title="From this meeting"') || leaderBlock.includes("From this meeting"),
  "The structured outcomes must sit under a From this meeting heading.",
);

assert(
  leaderBlock.includes('label: "Accountability"')
    && leaderBlock.includes('label: "Prayer request"')
    && leaderBlock.includes('label: "Reminder"')
    && leaderBlock.includes('label: "Observed Fruit"'),
  "Accountability, Prayer request, Reminder and Observed Fruit must be reachable as optional inline actions.",
);

// Every one is a true toggle: re-tapping collapses it and clears the values it
// owns, so a section opened and thought better of cannot save a blank record.
assert(
  leaderBlock.includes("const closePrayer = ")
    && leaderBlock.includes("const closeFollowUp = ")
    && leaderBlock.includes("const closeFruit = ")
    && leaderBlock.includes("const closeAccountability = "),
  "Each optional outcome must collapse and clear its own values.",
);

// Accountability is captured inline through the one shared field set rather
// than launching the separate legacy Commitment screen.
const composerBlock = appClient.slice(appClient.indexOf("function MeetingAccountabilityComposer("), appClient.indexOf("\nfunction ", appClient.indexOf("function MeetingAccountabilityComposer(") + 1));

assert(
  leaderBlock.includes("<MeetingAccountabilityComposer")
    && composerBlock.includes("<AccountabilityFields")
    && !leaderBlock.includes("New Commitment"),
  "Log Meeting accountability must use the canonical inline AccountabilityFields (through the USA-242 composer), not the legacy Commitment sheet.",
);

/* Existing data still opens its own section, so editing a meeting never hides
   previously saved fruit, prayer or reminder. Fruit additionally opens when the
   Person "Add observed fruit" path requests it. */
assert(
  leaderBlock.includes("useState(selectedOutcomeTags.length > 0 || openFruitSection)")
    && leaderBlock.includes("const [isPrayerOpen, setIsPrayerOpen] = useState(Boolean(prayerNeedsDefault?.trim()));")
    && leaderBlock.includes("const [isFollowUpNeeded, setIsFollowUpNeeded] = useState(followUpNeededDefault);"),
  "Optional sections with existing data must start open so editing a meeting never hides previously saved fruit, prayer or reminder.",
);

/* Follow-up is Reminder in V2: something the DOS user needs to remember, as
   against Accountability, which is what the person agreed to do. It still
   collects a specific note and a date rather than a bare checkbox. */
assert(
  leaderBlock.includes('name="follow_up_note"')
    && leaderBlock.includes("What do you want to remember?")
    && leaderBlock.includes('name="follow_up_date"'),
  "Reminder must collect a specific note and a date, not just a checkbox.",
);

/* Accountability is captured inline now rather than launching a sheet, and it
   knows the person from the meeting -- so it neither asks again nor needs the
   legacy Commitment record type. */
assert(
  composerBlock.includes("namePrefix={`meeting_accountability_${index}`}")
    && composerBlock.includes("name={`meeting_accountability_${index}_title`}")
    && !leaderBlock.includes("onOpenCommitment"),
  "Log Meeting accountability must be captured inline against the meeting's person.",
);

/* Inline items persist through the shared router, which sends a Recurring
   Accountability to the schedules API and a One-time one to commitments --
   the same decision the Person sheet makes, so the destination depends on the
   user's choice rather than the screen. */
assert(
  appClient.includes("accountabilityRoute(formData, `meeting_accountability_${index}`)")
    && appClient.includes('endpoint: "/api/dos/app/accountability/schedules"')
    && appClient.includes('endpoint: "/api/dos/app/commitments"'),
  "Inline accountability must persist through the shared routing contract.",
);

// Written after the meeting workflow, never inside it, so a failure here cannot
// make a saved meeting look unsaved or re-run its idempotent children -- and
// any item that fails is named rather than dropped.
/* Accountability is now written by one shared function used by both the direct
   Log Meeting path and the Schedule-then-Log path, which previously dropped it
   silently. Failures are still named rather than swallowed. */
assert(
  appClient.includes("async function persistMeetingAccountability({")
    && appClient.includes("These accountability items did not save")
    && (appClient.match(/await persistMeetingAccountability\(\{/g) ?? []).length === 2,
  "Both meeting paths must persist accountability through the shared writer and surface failures by name.",
);

assert(
  appClient.includes("followUpNote?: string;")
    && appClient.includes("const trimmedFollowUpNote = followUpNote?.trim() ?? \"\";")
    && appClient.includes('notes: joinTableFollowUpReminderMetadata(trimmedFollowUpNote || notes, meetingId)')
    && appClient.includes("title: trimmedFollowUpNote ? trimmedFollowUpNote.slice(0, 80) : \"Reminder from meeting\","),
  "saveTableFollowUpReminder must use the specific reminder note as the record's title/notes when provided, not a generic label.",
);

const saveReminderCallCount = (appClient.match(/await saveTableFollowUpReminder\(\{[^}]*followUpNote,/gs) ?? []).length;

assert(
  saveReminderCallCount >= 2
    && appClient.includes('return postWorkflowJson("/api/dos/app/reminders"')
    && appClient.includes("joinTableFollowUpReminderMetadata(trimmedFollowUpNote || meetingNotes, meetingId)"),
  "Create and edit Log Meeting paths must forward the specific follow-up note through their retry-safe reminder saves.",
);

assert(
  appClient.includes("const followUpNote = String(formData.get(\"follow_up_note\") ?? \"\");"),
  "Meeting submit handlers must read the new follow_up_note field out of the form.",
);

assert(
  appClient.includes("primaryPersonId: explicitPrimaryPersonId,")
    && appClient.includes("const primaryPersonId = explicitPrimaryPersonId || (personIds.length === 1 ? personIds[0] : null);"),
  "createPrayerRequestFromMeeting must accept an explicit primary person so prayer needs attach to the right participant when there are multiple attendees.",
);

assert(
  appClient.includes('name="prayer_needs_person_id"'),
  "The Prayer Need action must let the user choose which participant a request belongs to when more than one is selected.",
);

/* The Person profile and Log Meeting share one Accountability field set and
   one payload builder, so neither can drift into a second implementation. */
assert(
  appClient.includes("function AccountabilityFields({")
    && (appClient.match(/<AccountabilityFields/g) ?? []).length >= 2
    && appClient.includes("function accountabilitySchedulePayload(formData: FormData, prefix: string)"),
  "Person and Log Meeting must share one canonical Accountability component and payload.",
);

assert(
  meetingFormBlock.includes("<StickyFormFooter>") && meetingFormBlock.includes("</StickyFormFooter>"),
  "Log Table's primary action must sit in a sticky footer so it stays reachable on mobile.",
);

assert(
  meetingFormBlock.includes("<DiscussionGuideResponsesSection")
    && meetingFormBlock.includes("showConversationFlow && allowConversationFlows")
    && meetingFormBlock.includes("onConversationFlowChange(guide.id)")
    && meetingFormBlock.includes("dosDiscussionGuides.map((guide) => ("),
  "Log Meeting must expose the optional Kitchen Table response capture only when the workspace allows USAM conversation flows.",
);

assert(
  appClient.includes("function DiscussionGuideResponsesSection")
    && meetingEngine.includes('rowTitle: "Kitchen Table Gospel Responses"')
    && appClient.includes("<details")
    && !appClient.includes("function ConversationFlowPicker"),
  "Kitchen Table Gospel Responses must stay behind one collapsed row without exposing the legacy Conversation Flow picker.",
);

assert(
  meetingEngine.includes('id: "manifestationGifts"')
    && meetingEngine.includes('id: "serviceGifts"')
    && meetingEngine.includes('id: "fivefoldGifts"')
    && meetingEngine.includes('visibleWhen: { equals: "yes", questionId: "spiritualGifts" }')
    && meetingEngine.includes('id: "significantOutcomes"')
    && meetingEngine.includes('historicalOnly: true, id: "connectionOutcomes"')
    && meetingEngine.includes('historicalOnly: true, id: "faithCommitmentOutcomes"')
    && meetingEngine.includes('historicalOnly: true, id: "healingOutcomes"')
    && meetingEngine.includes('historicalOnly: true, id: "relationshipOutcomes"')
    && meetingEngine.includes('historicalOnly: true, id: "ministryMomentOutcomes"'),
  "Kitchen Table capture must include the three conditional gift families, the single significant-outcomes list, and the historical outcome groups marked historical-only.",
);

assert(
  meetingEngine.includes('id: "four_questions"')
    && !meetingFormBlock.includes("four_questions"),
  "Four Questions historical data support must remain in the engine without appearing in the Log Meeting UI.",
);

// USA-238: the collapsed row alone never marks the meeting as Kitchen Table;
// the flow activates from the first real answer, and gift groups are dropped
// again when the Spiritual Gifts answer that revealed them changes.
const kitchenTableSectionStart = appClient.indexOf("function DiscussionGuideResponsesSection");
const kitchenTableSectionEnd = appClient.indexOf("function ConversationQuestionCard", kitchenTableSectionStart);
const kitchenTableSection = appClient.slice(kitchenTableSectionStart, kitchenTableSectionEnd);

assert(
  kitchenTableSection.includes("if (!active && hasValue) {")
    && kitchenTableSection.includes("onActivate();")
    && kitchenTableSection.includes("dependent.visibleWhen?.questionId === questionId")
    && kitchenTableSection.includes("onResponseChange(dependent.id, undefined)"),
  "Kitchen Table must activate only from an entered response and must clear hidden gift selections when Spiritual Gifts is no longer Yes.",
);

assert(
  kitchenTableSection.includes("legacyFlowTitle")
    && kitchenTableSection.includes("Those responses stay on the record unless you add {rowTitle} here."),
  "Editing a historical Four Questions meeting must say those responses are kept until Kitchen Table Gospel Responses replace them.",
);

// USA-238: saved responses, gift labels, and outcomes render on the meeting
// record, inside the logged-meeting detail rather than a dead helper.
const meetingDetailStart = appClient.indexOf("function MeetingDetailOverlay(");
const meetingDetailEnd = appClient.indexOf("\nfunction ", meetingDetailStart + 1);
const meetingDetailBlock = appClient.slice(meetingDetailStart, meetingDetailEnd);

assert(
  appClient.includes("function ConversationResponsesSection({ meeting }: { meeting: DosAppMeeting })")
    && meetingDetailBlock.includes("<ConversationResponsesSection meeting={meeting} />")
    && !appClient.includes("function ConversationFlowDetail("),
  "Meeting detail must render the saved Kitchen Table Gospel Responses, gift labels, and outcomes.",
);

// USA-238: normalization is the only persistence gate, so exercise it for
// real. Invalid multi-select values, duplicates, and gift answers hidden by a
// non-Yes Spiritual Gifts answer must all disappear; nothing creates Fruit.
// USA-238 / USA-239: the USAM-only restriction is enforced at the API
// boundary from actual workspace state, not from the slug or the client.
const meetingsRoute = read("app/api/dos/app/meetings/route.ts");
const usamWorkspaceModule = read("src/lib/dos/usam-workspace.ts");
const missionaryApp = read("src/lib/dos/missionary-app.ts");

assert(
  (meetingsRoute.match(/const allowGatedConversationFlows = conversationFlowRequiresGate\(payload\.conversationFlowKey\)\n\s+\? await isUsamWorkspaceById\(supabase, workspaceId\)\n\s+: false;/g) ?? []).length === 2
    && !meetingsRoute.includes("isUsamKitchenTableGospelWorkspace")
    && !meetingsRoute.includes("`/missionaries/${workspace.slug}`"),
  "The meetings API (POST and PATCH) must gate Kitchen Table on the workspace's actual USAM state, never on a slug-derived profile path.",
);
assert(
  meetingsRoute.includes("const unavailableFlowResponse = unavailableConversationFlowResponse(payload.conversationFlowKey, allowGatedConversationFlows);")
    && meetingsRoute.includes("is not available for this workspace.")
    && meetingsRoute.includes("{ status: 403 }"),
  "A gated flow key from a non-USAM workspace must be rejected with 403 before any meeting is written.",
);
assert(
  missionaryApp.includes("isUsamWorkspace: decideUsamWorkspace({")
    && missionaryApp.includes("ownerOrganization: organization && !organization.inferred ? organization : null")
    && missionaryApp.includes("inferred: true,"),
  "The app loader must use the same decision as the API, and the display-only USAM organization fallback must not count as ownership.",
);
assert(
  !usamWorkspaceModule.includes("publicProfileHref?.startsWith")
    && !read("src/lib/dos/meeting-engine.ts").includes("function isUsamKitchenTableGospelWorkspace"),
  "The slug/profile-path heuristic is retired.",
);

const { register } = await import("node:module");
const repoRoot = new URL("../", import.meta.url).href;

register(
  `data:text/javascript,${encodeURIComponent(`
    const root = ${JSON.stringify(repoRoot)};
    export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@/")) {
        const target = root + specifier.slice(2);
        for (const suffix of ["", ".ts", ".tsx", "/index.ts"]) {
          try { return await next(target + suffix, context); } catch {}
        }
      }
      return next(specifier, context);
    }
  `)}`,
);

const engine = await import("../src/lib/dos/meeting-engine.ts");
const normalized = engine.normalizeConversationResponses("kitchen_table_gospel", {
  believeJesus: "yes",
  connectionOutcomes: "connected_to_church_partner",
  fivefoldGifts: ["pastor"],
  followUpActions: ["wants_prayer"],
  healingOutcomes: ["deliverance", "bogus", "deliverance", 42],
  manifestationGifts: ["faith", "not_a_gift"],
  relationshipWithJesus: 11,
  serviceGifts: ["mercy"],
  spiritualGifts: "no",
  tithe: "unsure",
});

assert(
  JSON.stringify(normalized) === JSON.stringify({ believeJesus: "yes", spiritualGifts: "no", healingOutcomes: ["deliverance"] }),
  `Normalization must drop invalid, duplicate, hidden, and out-of-range Kitchen Table values. Got ${JSON.stringify(normalized)}`,
);

const revealed = engine.normalizeConversationResponses("kitchen_table_gospel", {
  fivefoldGifts: ["pastor", "apostle"],
  manifestationGifts: ["faith"],
  relationshipWithJesus: "8",
  serviceGifts: ["mercy"],
  spiritualGifts: "yes",
});

assert(
  JSON.stringify(revealed) === JSON.stringify({
    spiritualGifts: "yes",
    manifestationGifts: ["faith"],
    serviceGifts: ["mercy"],
    fivefoldGifts: ["pastor", "apostle"],
    relationshipWithJesus: 8,
  })
    && engine.relationshipWithJesusTemperature(3) === "Cold"
    && engine.relationshipWithJesusTemperature(4) === "Lukewarm"
    && engine.relationshipWithJesusTemperature(7) === "Lukewarm"
    && engine.relationshipWithJesusTemperature(8) === "Hot",
  `Gift groups must persist when Spiritual Gifts is Yes and the 1-10 rating must read Cold / Lukewarm / Hot. Got ${JSON.stringify(revealed)}`,
);

assert(
  JSON.stringify(engine.normalizeConversationResponses("none", { believeJesus: "yes", healingOutcomes: ["deliverance"] })) === "{}"
    && engine.normalizeConversationFlowKey("kitchen_table_gospel", false) === "none",
  "A workspace without the USAM gate must not keep Kitchen Table data.",
);

const historical = engine.normalizeConversationResponses("four_questions", {
  followUpActions: ["wants_prayer"],
  recognizes_problem: "unsure",
  response_notes: "Kept for the record.",
});

assert(
  historical.recognizes_problem === "unsure"
    && historical.response_notes === "Kept for the record."
    && Array.isArray(historical.followUpActions),
  "Historical Four Questions responses must still normalize for existing meetings.",
);

// USA-238 founder review (2026-09-07): gift taxonomy. Labels follow the
// approved list; values are stable snake_case storage keys (the relabelled
// entry keeps `discerning_of_spirits`), and every supported gift saves,
// reopens, edits and is pruned through the same definition.
const kitchenTableFlow = engine.getConversationFlowDefinition("kitchen_table_gospel");
const giftQuestions = kitchenTableFlow.sections.flatMap((section) => section.questions).filter((question) => question.visibleWhen?.questionId === "spiritualGifts");
const giftLabels = Object.fromEntries(giftQuestions.map((question) => [question.id, question.options.map((option) => option.label)]));

assert(
  JSON.stringify(giftLabels.manifestationGifts) === JSON.stringify(["Word of Wisdom", "Word of Knowledge", "Faith", "Gifts of Healing", "Working of Miracles", "Prophecy", "Distinguishing/Discernment of Spirits", "Various Kinds of Tongues", "Interpretation of Tongues", "Exploring / Unsure"])
    && JSON.stringify(giftLabels.serviceGifts) === JSON.stringify(["Prophecy", "Serving (Ministry/Helps)", "Teaching", "Encouragement (Exhortation)", "Giving", "Leadership", "Mercy"])
    && JSON.stringify(giftLabels.fivefoldGifts) === JSON.stringify(["Apostle", "Prophet", "Evangelist", "Pastor (Shepherd)", "Teacher"]),
  `The three gift families must match the approved taxonomy. Got ${JSON.stringify(giftLabels)}`,
);

assert(
  giftQuestions.find((question) => question.id === "manifestationGifts").options.some((option) => option.value === "discerning_of_spirits" && option.label === "Distinguishing/Discernment of Spirits")
    && giftQuestions.every((question) => question.options.every((option) => /^[a-z_]+$/.test(option.value))),
  "A relabelled gift must keep its stored value and every gift value must be a stable snake_case key.",
);

const everyGift = Object.fromEntries(giftQuestions.map((question) => [question.id, question.options.map((option) => option.value)]));
const savedAll = engine.normalizeConversationResponses("kitchen_table_gospel", { spiritualGifts: "yes", ...everyGift });
const editedAll = engine.normalizeConversationResponses("kitchen_table_gospel", { ...savedAll, fivefoldGifts: ["teacher"], manifestationGifts: savedAll.manifestationGifts.slice(1) });
const prunedAll = engine.normalizeConversationResponses("kitchen_table_gospel", { ...savedAll, spiritualGifts: "no" });

assert(
  giftQuestions.every((question) => JSON.stringify(savedAll[question.id]) === JSON.stringify(everyGift[question.id]))
    && JSON.stringify(editedAll.manifestationGifts) === JSON.stringify(everyGift.manifestationGifts.slice(1))
    && JSON.stringify(editedAll.fivefoldGifts) === JSON.stringify(["teacher"])
    && JSON.stringify(editedAll.serviceGifts) === JSON.stringify(everyGift.serviceGifts)
    && Object.keys(prunedAll).every((key) => !(key in everyGift)),
  "Every supported gift must save, reopen and edit through normalization and vanish when Spiritual Gifts is no longer Yes.",
);

const detailSection = appClient.slice(appClient.indexOf("function ConversationResponsesSection("), appClient.indexOf("\nfunction ", appClient.indexOf("function ConversationResponsesSection(") + 1));

assert(
  detailSection.includes(".filter((option) => responseAsStringArray(value).includes(option.value))")
    && detailSection.includes(".map((option) => option.label)"),
  "Meeting detail must render every saved gift and outcome through the definition's labels.",
);

// USA-238 founder review: Ministry Team search hands the field back clean.
const ministrySelector = appClient.slice(appClient.indexOf("function MinistryTeamSelector("), appClient.indexOf("function SupportingAttendeeSelector("));

assert(
  (ministrySelector.match(/onPersonQueryChange\(""\);/g) ?? []).length === 2
    && ministrySelector.includes("if (!selectedMemberIds.includes(member.id)) {")
    && ministrySelector.includes("if (!selectedPersonIds.includes(person.id)) {")
    && ministrySelector.includes("people.filter((person) => !selectedPersonIds.includes(person.id))"),
  "Selecting a ministry team result must add the person once, clear the search query and leave the field ready for the next name.",
);

// USA-238 founder review: outcomes live with the meeting and never touch Fruit.
const guideSection = appClient.slice(appClient.indexOf("function DiscussionGuideResponsesSection"), appClient.indexOf("function ConversationQuestionCard"));
const questionSection = kitchenTableFlow.sections[0];
const significantOutcomes = questionSection.questions.find((question) => question.id === "significantOutcomes");
const outcomesOnly = engine.normalizeConversationResponses("kitchen_table_gospel", { significantOutcomes: significantOutcomes.options.map((option) => option.value) });

assert(
  !/fruit/i.test(meetingsRoute)
    && !/fruit/i.test(guideSection)
    && JSON.stringify(Object.keys(outcomesOnly)) === '["significantOutcomes"]'
    && outcomesOnly.significantOutcomes.length === 9,
  "Kitchen Table outcomes must be stored with the meeting only: neither the guide section nor the meetings API may reference Fruit, and the payload carries only the outcome key.",
);

// USA-238 second founder review (2026-09-07): conversational question order,
// gifts inline under Spiritual Gifts, one flat optional outcomes row, and
// historical outcome groups that still normalize and render.
const orderedIds = questionSection.questions.map((question) => question.id);

assert(
  JSON.stringify(orderedIds) === JSON.stringify([
    "believeJesus", "baptized", "disciplingAnyone", "tithe", "honorSabbath", "prayFastOften", "preachGoodNews", "attendChurchOften",
    "spiritualGifts", "manifestationGifts", "serviceGifts", "fivefoldGifts", "bibleDaily", "relationshipWithJesus", "significantOutcomes",
  ]),
  `Kitchen Table questions must follow the conversational order with the gift groups directly under Spiritual Gifts. Got ${JSON.stringify(orderedIds)}`,
);

assert(
  questionSection.questions.filter((question) => question.visibleWhen?.questionId === "spiritualGifts").every((question) => question.visibleWhen.equals === "yes" && !question.historicalOnly)
    && guideSection.includes("section.questions.filter((question) => !question.historicalOnly && conversationQuestionIsVisible(question, responses))")
    && guideSection.includes('const coreQuestions = (flow.sections[0]?.questions ?? []).filter((question) => question.kind !== "multi_select")'),
  "Gift groups must render inline, only while Spiritual Gifts is Yes, and the answered count must cover the eleven core questions.",
);

// USA-243 (2026-09-08): Kitchen Table Gospel captures no outcomes of its own.
// The significant-outcomes question stays historical-only (saved values
// normalize and render), the form offers no outcome picker, and the meeting's
// Observed Fruit disclosure is the single leader-facing fruit entry point.
assert(
  significantOutcomes.historicalOnly === true
    && significantOutcomes.detailLabel === "Significant outcomes"
    && kitchenTableFlow.sections.flatMap((section) => section.questions).filter((question) => question.kind === "multi_select" && !question.historicalOnly).every((question) => question.visibleWhen?.questionId === "spiritualGifts")
    && !guideSection.includes("Add significant outcomes")
    && meetingEngine.includes('rowDescription: "Questions, spiritual gifts, and relationship rating"'),
  "Kitchen Table Gospel Responses must offer only the questions, conditional gifts and the rating; no outcome picker.",
);

const observedFruitSection = appClient.slice(appClient.indexOf("function MeetingLeaderReflectionSection("), appClient.indexOf("\nfunction MeetingGrowthReflectionSection("));

assert(
  observedFruitSection.includes("<ObservedFruitMultiSelect")
    && observedFruitSection.includes('label: "Observed Fruit"')
    && appClient.includes("includeReflectionFields={selectedMeeting.meetingStatus !== \"scheduled\" || isLoggingSelectedScheduledMeeting}"),
  "Observed Fruit must remain the one universal fruit entry point on every logged meeting (Log and Edit).",
);

assert(
  JSON.stringify(engine.normalizeConversationResponses("kitchen_table_gospel", { significantOutcomes: ["decision_for_christ", "bogus"], believeJesus: "yes" }).significantOutcomes) === '["decision_for_christ"]',
  "Historical significant outcomes must keep normalizing for saved records.",
);

const legacySection = kitchenTableFlow.sections.find((section) => section.id === "outcomes");
const legacyKept = engine.normalizeConversationResponses("kitchen_table_gospel", { believeJesus: "yes", faithCommitmentOutcomes: ["rededication"], ministryMomentOutcomes: ["communion", "bogus"] });
const detailSectionForHistory = appClient.slice(appClient.indexOf("function ConversationResponsesSection("), appClient.indexOf("\nfunction ", appClient.indexOf("function ConversationResponsesSection(") + 1));

assert(
  legacySection.historicalOnly === true
    && legacySection.questions.length === 5
    && legacySection.questions.every((question) => question.historicalOnly)
    && JSON.stringify(legacyKept.faithCommitmentOutcomes) === '["rededication"]'
    && JSON.stringify(legacyKept.ministryMomentOutcomes) === '["communion"]'
    && !guideSection.includes("historicalOnly === false")
    && guideSection.includes("flow.sections.filter((section) => !section.historicalOnly)")
    && !detailSectionForHistory.includes("historicalOnly")
    && detailSectionForHistory.includes("{question.detailLabel ?? question.label}"),
  "Historical outcome groups must keep normalizing and rendering in meeting detail while the form never offers them.",
);

// USA-238 founder review: row copy, no extra explanation, no guide picker.
assert(
  meetingEngine.includes('rowTitle: "Kitchen Table Gospel Responses"')
    && meetingEngine.includes('rowDescription: "Questions, spiritual gifts, and relationship rating"')
    && !appClient.includes("Kitchen Table responses")
    && !appClient.includes("Optional USAM ministry record")
    && guideSection.includes("{rowTitle}")
    && guideSection.includes("guide.rowDescription")
    && guideSection.includes('"Not added"')
    && engine.dosDiscussionGuides.length === 1
    && engine.dosDiscussionGuides[0].id === "kitchen_table_gospel"
    && !appClient.includes("DiscussionGuidePicker")
    && !appClient.includes("Discussion Guide"),
  'The collapsed row must read "Kitchen Table Gospel Responses" with its supporting description and a status line, with no extra explanatory copy and no guide picker while one guide exists.',
);

// USA-238 founder review: the duration Stepper is three equal, centered regions.
const formPrimitives = read("src/components/dos/forms/primitives.tsx");
const stepperBlock = formPrimitives.slice(formPrimitives.indexOf("export function Stepper("), formPrimitives.indexOf("/* ---", formPrimitives.indexOf("export function Stepper(")));

assert(
  stepperBlock.includes('className="grid h-14 w-full grid-cols-[1fr_1.4fr_1fr] overflow-hidden')
    && stepperBlock.includes("min-[360px]:grid-cols-3")
    && (stepperBlock.match(/flex h-full w-full items-center justify-center/g) ?? []).length === 2
    && stepperBlock.includes('className="flex h-full min-w-0 items-center justify-center whitespace-nowrap'),
  "The duration Stepper must be 56px tall in three equal regions with the value and both buttons vertically centered.",
);

assert(
  !meetingEngine.toLowerCase().includes("fruit")
    && !read("app/api/dos/app/meetings/route.ts").includes("fruit_events"),
  "Kitchen Table outcomes are raw meeting responses; the engine and the meeting write path must not create Fruit.",
);

console.log("DOS Log Meeting form regression passed.");

// USA-238 / USA-239: exercise the boundary decision for real. USAM by active
// or approved application, by a live public profile, or by a USA Missionaries
// owning organization; generic otherwise — including a pending applicant with
// no owning organization and an archived workspace.
const { decideUsamWorkspace, publicProfileLiveForWorkspace } = await import("@/src/lib/dos/usam-workspace");
const { normalizeConversationFlowKey: normalizeFlowKeyForBoundary } = await import("@/src/lib/dos/meeting-engine");

const generic = { applicationStatus: "not_connected", ownerOrganization: null, publicProfileLive: false };
assert(decideUsamWorkspace({ ...generic, applicationStatus: "active" }) === true, "An active USAM application makes the workspace USAM.");
assert(decideUsamWorkspace({ ...generic, applicationStatus: "approved" }) === true, "An approved USAM application makes the workspace USAM.");
assert(decideUsamWorkspace({ ...generic, publicProfileLive: true }) === true, "A live public missionary profile makes the workspace USAM.");
assert(decideUsamWorkspace({ ...generic, ownerOrganization: { brandingMode: "usam", slug: "usa-missionaries" } }) === true, "A USA Missionaries owning organization makes the workspace USAM.");
assert(decideUsamWorkspace({ ...generic, ownerOrganization: { brandingMode: "default", slug: "some-ministry" } }) === false, "Another organization's workspace is generic.");
assert(decideUsamWorkspace({ ...generic, applicationStatus: "pending_review" }) === false, "A pending, unowned applicant is not yet USAM.");
assert(decideUsamWorkspace({ ...generic, applicationStatus: "archived" }) === false, "An archived workspace is not USAM.");
assert(decideUsamWorkspace(generic) === false, "A generic DOS workspace is not USAM.");
assert(publicProfileLiveForWorkspace({ public_visible: true, show_household: true }) === true && publicProfileLiveForWorkspace({ public_visible: true, show_household: false }) === false && publicProfileLiveForWorkspace({ public_visible: false, show_household: true }) === false, "Public profile is live only when visible and the household is shown.");
assert(normalizeFlowKeyForBoundary("kitchen_table_gospel", false) === "none" && normalizeFlowKeyForBoundary("four_questions", false) === "none", "Without USAM access every gated flow key normalizes to none.");
assert(normalizeFlowKeyForBoundary("kitchen_table_gospel", true) === "kitchen_table_gospel", "With USAM access Kitchen Table Gospel is accepted.");

console.log("USA-238 USAM boundary checks passed.");
