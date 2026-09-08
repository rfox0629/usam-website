/* USA-243 — the one fruit vocabulary, shared by meetings, recipient forms and
   reporting.
 *
 * DOS used to carry several competing lists that meant the same thing: the
 * leader's Observed Fruit labels, the Quick Review chips, the Testimony tags
 * and the Kitchen Table outcome groups. The same ministry result could be
 * entered twice under different words, and ministry activity ("someone prayed
 * with me") sat in the same list as actual fruit ("answered prayer"). This
 * module is the single source of truth for what a value MEANS.
 *
 * Two rules govern everything here:
 *
 * 1. **Nothing stored is rewritten.** Classification is read-time: the stored
 *    string stays exactly as it was written, and the canonical key is derived
 *    from a static alias table. Reverting this module restores today's
 *    rendering without touching a single row.
 * 2. **No inference from free text.** A value is classified only by an exact
 *    match on its normalized form. Narrative is never scanned for fruit, and a
 *    value nobody has mapped stays unclassified rather than being guessed at.
 *
 * The vocabulary and the mapping table are the ones published for founder
 * review in `docs/dos-ui-refresh/usa-243/phase-c-decision-package.md`. */

export const fruitGroups = [
  { key: "spiritual_response", label: "Spiritual response" },
  { key: "prayer_and_restoration", label: "Prayer and restoration" },
  { key: "growth_and_discipleship", label: "Growth and discipleship" },
  { key: "community_and_mission", label: "Community and mission" },
] as const;

export type FruitGroupKey = typeof fruitGroups[number]["key"];

/* The 11 canonical labels. `label` is also the value stored on new records, so
   history written before this module is already canonical wherever the wording
   matched, and a rollback needs no data change. Detail belongs in the optional
   context note on the assertion, never in a twelfth label. */
export const canonicalFruitOptions = [
  { group: "spiritual_response", key: "new_believer", label: "New believer" },
  { group: "spiritual_response", key: "rededication", label: "Rededication" },
  { group: "spiritual_response", key: "baptized", label: "Baptized" },
  { group: "spiritual_response", key: "baptized_holy_spirit", label: "Baptized in the Holy Spirit" },
  { group: "prayer_and_restoration", key: "answered_prayer", label: "Answered prayer" },
  { group: "prayer_and_restoration", key: "healing_or_freedom", label: "Healing or freedom" },
  { group: "prayer_and_restoration", key: "reconciliation", label: "Reconciliation / relationship restored" },
  { group: "growth_and_discipleship", key: "discipleship_growth", label: "Discipleship growth" },
  { group: "growth_and_discipleship", key: "began_discipling_others", label: "Began discipling others" },
  { group: "community_and_mission", key: "connected_to_community", label: "Connected to church or Christian community" },
  { group: "community_and_mission", key: "serving_or_mission", label: "Serving or mission engagement" },
] as const satisfies ReadonlyArray<{ group: FruitGroupKey; key: string; label: string }>;

export type CanonicalFruitKey = typeof canonicalFruitOptions[number]["key"];

/* What a recorded value is, once you stop treating every checkbox as fruit.

   - `fruit`      a ministry result worth counting, and the only class that
                  becomes an assertion
   - `activity`   ministry happened (a gospel conversation, prayer received,
                  communion, a testimony being shared). Evidence, never fruit.
   - `impact`     how it felt (encouraged, peaceful, closer to God). Real and
                  worth showing on the response; not an event.
   - `follow_up`  something still to do (a prayer request, wants baptism)
   - `narrative`  free text and "other" — evidence, read by people
   - `unmapped`   a value no table covers; shown as recorded, counted as
                  nothing. Deliberately not guessed. */
export const fruitEvidenceClasses = ["fruit", "activity", "impact", "follow_up", "narrative", "unmapped"] as const;
export type FruitEvidenceClass = typeof fruitEvidenceClasses[number];

/* Where an assertion came from. Provenance is preserved on every observation so
   reporting can always answer "who said this?" — the leader who watched it, or
   the person it happened to. */
export const fruitProvenanceSources = ["leader_observed", "recipient_reported", "system_evidenced", "historical"] as const;
export type FruitProvenanceSource = typeof fruitProvenanceSources[number];

export const fruitProvenanceLabels: Record<FruitProvenanceSource, string> = {
  historical: "Recorded earlier",
  leader_observed: "Observed by the leader",
  recipient_reported: "Reported by the person",
  system_evidenced: "Evidenced in DOS",
};

type AliasEntry = {
  /* Extra detail this wording carries that the canonical label drops, kept as
     the assertion's context so "marriage restoration" is still legible under
     Reconciliation rather than becoming a twelfth top-level label. */
  context?: string;
  class: FruitEvidenceClass;
  key?: CanonicalFruitKey;
};

export function normalizeFruitValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
}

/* Every value DOS has ever written, from any surface, mapped once.
   Left column: the normalized stored value. Sources are noted where the same
   wording came from more than one place. */
const fruitAliasTable: ReadonlyArray<readonly [string, AliasEntry]> = [
  // --- Spiritual response -------------------------------------------------
  ["new believer", { class: "fruit", key: "new_believer" }],
  ["new believers", { class: "fruit", key: "new_believer" }],
  ["new birth", { class: "fruit", key: "new_believer" }],
  ["born again", { class: "fruit", key: "new_believer" }],
  ["salvation", { class: "fruit", key: "new_believer" }],
  ["received christ", { class: "fruit", key: "new_believer" }],
  ["gave their life", { class: "fruit", key: "new_believer" }],
  ["decision for christ", { class: "fruit", key: "new_believer" }],
  ["first time decision for christ", { class: "fruit", key: "new_believer" }],
  ["decision to follow jesus", { class: "fruit", key: "new_believer" }],
  ["i made a decision to follow jesus", { class: "fruit", key: "new_believer" }],
  ["i decided to follow jesus", { class: "fruit", key: "new_believer" }],
  ["rededication", { class: "fruit", key: "rededication" }],
  ["re dedication", { class: "fruit", key: "rededication" }],
  ["repentance", { class: "fruit", context: "Repentance", key: "rededication" }],
  ["surrendered something", { class: "fruit", context: "Surrender", key: "rededication" }],
  ["i surrendered something", { class: "fruit", context: "Surrender", key: "rededication" }],
  ["baptized", { class: "fruit", key: "baptized" }],
  ["baptism", { class: "fruit", key: "baptized" }],
  ["baptism in the holy spirit", { class: "fruit", key: "baptized_holy_spirit" }],
  ["baptized in the holy spirit", { class: "fruit", key: "baptized_holy_spirit" }],

  // --- Prayer and restoration --------------------------------------------
  ["answered prayer", { class: "fruit", key: "answered_prayer" }],
  ["prayer answered", { class: "fruit", key: "answered_prayer" }],
  ["answered prayers", { class: "fruit", key: "answered_prayer" }],
  ["god answered prayer", { class: "fruit", key: "answered_prayer" }],
  ["healing", { class: "fruit", key: "healing_or_freedom" }],
  ["healing or freedom", { class: "fruit", key: "healing_or_freedom" }],
  ["healing or breakthrough", { class: "fruit", context: "Breakthrough", key: "healing_or_freedom" }],
  ["deliverance", { class: "fruit", context: "Deliverance", key: "healing_or_freedom" }],
  ["freedom deliverance", { class: "fruit", context: "Deliverance", key: "healing_or_freedom" }],
  ["reconciliation", { class: "fruit", key: "reconciliation" }],
  ["reconciled relationship", { class: "fruit", key: "reconciliation" }],
  ["i reconciled a relationship", { class: "fruit", key: "reconciliation" }],
  ["relationship restored", { class: "fruit", key: "reconciliation" }],
  ["restored relationship", { class: "fruit", key: "reconciliation" }],
  ["restored relationships", { class: "fruit", key: "reconciliation" }],
  ["forgiveness", { class: "fruit", context: "Forgiveness", key: "reconciliation" }],
  ["forgave", { class: "fruit", context: "Forgiveness", key: "reconciliation" }],
  ["marriage restoration", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["marriage restored", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["marriage reconciliation", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["marriage healing", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["marriage healed", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["restored marriage", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["healed marriage", { class: "fruit", context: "Marriage", key: "reconciliation" }],
  ["relationship connection", { class: "fruit", key: "reconciliation" }],

  // --- Growth and discipleship -------------------------------------------
  ["discipleship growth", { class: "fruit", key: "discipleship_growth" }],
  ["bible study started", { class: "fruit", context: "Bible study", key: "discipleship_growth" }],
  ["started discipling others", { class: "fruit", key: "began_discipling_others" }],
  ["began discipling others", { class: "fruit", key: "began_discipling_others" }],
  ["multiplying", { class: "fruit", key: "began_discipling_others" }],
  ["multiplication", { class: "fruit", key: "began_discipling_others" }],

  // --- Community and mission ---------------------------------------------
  ["connected to church or christian community", { class: "fruit", key: "connected_to_community" }],
  ["joined discipleship", { class: "fruit", key: "connected_to_community" }],
  ["joined a group", { class: "fruit", key: "connected_to_community" }],
  ["i joined a group", { class: "fruit", key: "connected_to_community" }],
  ["church connection", { class: "fruit", key: "connected_to_community" }],
  ["joined church", { class: "fruit", key: "connected_to_community" }],
  ["connected to a church or ministry", { class: "fruit", key: "connected_to_community" }],
  ["church partner", { class: "fruit", key: "connected_to_community" }],
  ["ministry partner", { class: "fruit", key: "connected_to_community" }],
  ["serving", { class: "fruit", key: "serving_or_mission" }],
  ["serving or mission engagement", { class: "fruit", key: "serving_or_mission" }],
  ["marketplace ministry", { class: "fruit", context: "Marketplace", key: "serving_or_mission" }],

  // --- Activity: ministry happened; never counted as fruit -----------------
  ["gospel conversation", { class: "activity" }],
  ["prayer received", { class: "activity" }],
  ["someone prayed with me", { class: "activity" }],
  ["prayer ministry took place", { class: "activity" }],
  ["communion", { class: "activity" }],
  ["washing of feet", { class: "activity" }],
  ["prophetic prayer", { class: "activity" }],
  ["healing prayer", { class: "activity" }],
  ["deliverance prayer", { class: "activity" }],
  ["church visit", { class: "activity" }],
  ["ongoing accountability", { class: "activity" }],
  ["discipling", { class: "activity" }],
  ["discipleship", { class: "activity" }],
  ["walking with", { class: "activity" }],
  ["disciple", { class: "activity" }],
  ["disciple maker", { class: "activity" }],
  ["testimony shared", { class: "activity" }],
  ["shared testimony", { class: "activity" }],

  // --- Impact: how it felt. Real, shown, never counted as an event ---------
  /* "Closer to God" is the one row the founder was asked to rule on: a feeling
     rather than an event, so it stays impact and out of fruit counts. Moving it
     to fruit later is a one-line change here. */
  ["closer to god", { class: "impact" }],
  ["feel closer to god", { class: "impact" }],
  ["i feel closer to god", { class: "impact" }],
  ["i felt closer to god", { class: "impact" }],
  ["deeper trust", { class: "impact" }],
  ["nearer to god", { class: "impact" }],
  ["felt encouraged", { class: "impact" }],
  ["encouraging", { class: "impact" }],
  ["encouragement", { class: "impact" }],
  ["felt heard", { class: "impact" }],
  ["felt cared for", { class: "impact" }],
  ["cared for", { class: "impact" }],
  ["peaceful", { class: "impact" }],
  ["peace", { class: "impact" }],
  ["received peace", { class: "impact" }],
  ["hope", { class: "impact" }],
  ["life giving", { class: "impact" }],
  ["transformational", { class: "impact" }],
  ["transformation", { class: "impact" }],
  ["changed my life", { class: "impact" }],
  ["challenging in a good way", { class: "impact" }],
  ["challenging good", { class: "impact" }],
  ["still processing", { class: "impact" }],
  ["not sure yet", { class: "impact" }],
  ["not sure", { class: "impact" }],

  // --- Follow-up: something still to do -----------------------------------
  ["prayer request", { class: "follow_up" }],
  ["follow up requested", { class: "follow_up" }],
  ["wants follow up", { class: "follow_up" }],
  ["i want to keep growing", { class: "follow_up" }],
  ["baptism requested", { class: "follow_up" }],
  ["i requested baptism", { class: "follow_up" }],
  ["requested baptism", { class: "follow_up" }],
  ["desire to be baptized", { class: "follow_up" }],
  ["desire to join discipleship group", { class: "follow_up" }],
  ["committed to fasting", { class: "follow_up" }],
  ["committed to tithe", { class: "follow_up" }],

  // --- Narrative ----------------------------------------------------------
  ["other", { class: "narrative" }],
  ["other significant outcome", { class: "narrative" }],
];

const fruitAliasIndex: ReadonlyMap<string, AliasEntry> = new Map(fruitAliasTable);
const canonicalByKey: ReadonlyMap<string, typeof canonicalFruitOptions[number]> = new Map(canonicalFruitOptions.map((option) => [option.key, option]));

export type FruitClassification = {
  class: FruitEvidenceClass;
  /* Detail the canonical label drops, e.g. "Marriage" under Reconciliation. */
  context: string | null;
  key: CanonicalFruitKey | null;
  /* The canonical label, or the value exactly as recorded when unmapped. */
  label: string;
  /* Always the string as it was stored. Nothing is ever rewritten. */
  originalValue: string;
};

/* The one classifier. Exact match on the normalized value — never a substring
   scan, never a look inside narrative text. */
export function classifyFruitValue(value: unknown): FruitClassification {
  const originalValue = typeof value === "string" ? value.trim() : "";
  const entry = fruitAliasIndex.get(normalizeFruitValue(originalValue));

  if (!entry) {
    return { class: originalValue ? "unmapped" : "narrative", context: null, key: null, label: originalValue, originalValue };
  }

  const canonical = entry.key ? canonicalByKey.get(entry.key) ?? null : null;

  return {
    class: entry.class,
    context: entry.context ?? null,
    key: canonical ? (canonical.key as CanonicalFruitKey) : null,
    label: canonical ? canonical.label : originalValue,
    originalValue,
  };
}

export function isCanonicalFruitValue(value: unknown) {
  return classifyFruitValue(value).class === "fruit";
}

export function canonicalFruitLabel(key: string) {
  return canonicalByKey.get(key)?.label ?? null;
}

export const canonicalFruitGroupOptions = fruitGroups.map((group) => ({
  key: group.key,
  label: group.label,
  options: canonicalFruitOptions.filter((option) => option.group === group.key),
}));

/* One observation of fruit, from any surface, already carrying its provenance.
   The reader builds these from `fruit_events`, reviews and testimonies without
   any of them having to agree on a schema first. */
export type FruitObservation = {
  context?: string | null;
  /* The meeting this was observed in or reported about, when there is one. */
  meetingId?: string | null;
  narrative?: string | null;
  observedAt?: string | null;
  personId?: string | null;
  /* Whether the person consented to their words being shared. Counting is never
     gated on consent; showing their story is. */
  shareConsent?: "private" | "anonymous" | "named" | null;
  source: FruitProvenanceSource;
  sourceId?: string | null;
  value: string;
  workspaceId?: string | null;
};

export type FruitAssertion = {
  context: string | null;
  /* Deterministic identity: workspace + person + canonical key + meeting (or a
     30-day window when no meeting links them). */
  id: string;
  key: CanonicalFruitKey;
  label: string;
  meetingId: string | null;
  observations: FruitObservation[];
  observedAt: string | null;
  personId: string | null;
  /* Every distinct provenance backing this one assertion. Two sources agreeing
     is corroboration, not two results. */
  sources: FruitProvenanceSource[];
};

const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

/* When no meeting ties observations together, group them into 30-day windows so
   a leader's note and the person's review of the same event still land on one
   assertion, while the same fruit six months later is a new one. */
function windowBucket(observedAt: string | null | undefined) {
  const time = observedAt ? Date.parse(observedAt) : Number.NaN;

  return Number.isNaN(time) ? "no-date" : `w${Math.floor(time / thirtyDaysMs)}`;
}

export function fruitAssertionId(observation: FruitObservation, key: CanonicalFruitKey) {
  return [
    observation.workspaceId ?? "workspace",
    observation.personId ?? "person",
    key,
    observation.meetingId ? `m:${observation.meetingId}` : windowBucket(observation.observedAt),
  ].join("|");
}

/* Turn raw observations into what reporting should count.

   An assertion is a distinct ministry result. Every observation that maps to
   the same assertion is corroboration of it, so a leader's "Reconciliation" and
   the person's "Reconciliation" on one meeting are ONE result with two sources
   — never two. Activity, impact, follow-up and narrative never become
   assertions at all; they are returned separately so nothing is lost. */
export function buildFruitAssertions(observations: ReadonlyArray<FruitObservation>) {
  const assertions = new Map<string, FruitAssertion>();
  const activity: Array<FruitObservation & { classification: FruitClassification }> = [];
  const impact: typeof activity = [];
  const followUp: typeof activity = [];
  const narrative: typeof activity = [];
  const unmapped: typeof activity = [];

  observations.forEach((observation) => {
    const classification = classifyFruitValue(observation.value);
    const decorated = { ...observation, classification };

    if (classification.class !== "fruit" || !classification.key) {
      if (classification.class === "activity") activity.push(decorated);
      else if (classification.class === "impact") impact.push(decorated);
      else if (classification.class === "follow_up") followUp.push(decorated);
      else if (classification.class === "unmapped") unmapped.push(decorated);
      else narrative.push(decorated);

      return;
    }

    const id = fruitAssertionId(observation, classification.key);
    const existing = assertions.get(id);

    if (existing) {
      existing.observations.push(observation);

      if (!existing.sources.includes(observation.source)) {
        existing.sources.push(observation.source);
      }

      /* Keep the earliest date and the first context offered, so corroboration
         never moves the result's date or overwrites its detail. */
      if (observation.observedAt && (!existing.observedAt || observation.observedAt < existing.observedAt)) {
        existing.observedAt = observation.observedAt;
      }

      existing.context = existing.context ?? classification.context ?? observation.context ?? null;

      return;
    }

    assertions.set(id, {
      context: classification.context ?? observation.context ?? null,
      id,
      key: classification.key,
      label: classification.label,
      meetingId: observation.meetingId ?? null,
      observations: [observation],
      observedAt: observation.observedAt ?? null,
      personId: observation.personId ?? null,
      sources: [observation.source],
    });
  });

  return {
    activity,
    assertions: Array.from(assertions.values()),
    followUp,
    impact,
    narrative,
    unmapped,
  };
}

/* What a report may state: how many distinct results, and separately how much
   evidence supports them, broken down by who said it. The two numbers are
   deliberately different and must never be added together. */
export function fruitReportingTotals(observations: ReadonlyArray<FruitObservation>) {
  const built = buildFruitAssertions(observations);
  const supportingObservationsBySource: Record<FruitProvenanceSource, number> = {
    historical: 0,
    leader_observed: 0,
    recipient_reported: 0,
    system_evidenced: 0,
  };

  built.assertions.forEach((assertion) => {
    assertion.observations.forEach((observation: FruitObservation) => { supportingObservationsBySource[observation.source] += 1; });
  });

  const byKey: Record<string, number> = {};

  built.assertions.forEach((assertion) => { byKey[assertion.key] = (byKey[assertion.key] ?? 0) + 1; });

  return {
    activityCount: built.activity.length,
    assertionCount: built.assertions.length,
    assertionsByKey: byKey,
    /* Assertions backed by more than one provenance: the "another person's
       mouth" case, where the leader saw it and the person said it too. */
    corroboratedAssertionCount: built.assertions.filter((assertion) => assertion.sources.length > 1).length,
    impactCount: built.impact.length,
    supportingObservationCount: built.assertions.reduce((total, assertion) => total + assertion.observations.length, 0),
    supportingObservationsBySource,
  };
}

/* ---- What the Testimony fruit question accepts -------------------------- */

export const dosReviewOutcomeLegacyValues = [
  "Reconciliation",
  "New Believers",
  "Marriage Restoration",
  "Baptized",
  "Discipling",
  "Started Discipling Others",
  "Answered Prayer",
] as const;

export type DosReviewOutcomeValue = string;

/* Offered ∪ historical. Validation accepts every value DOS has ever written, so
   a testimony already submitted still renders and still re-validates; the form
   only ever OFFERS the canonical set. */
const dosReviewOutcomeValueSet = new Set<string>([
  ...canonicalFruitOptions.map((option) => option.label),
  ...dosReviewOutcomeLegacyValues,
]);

export function normalizeDosReviewOutcomeTags(value: unknown): DosReviewOutcomeValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value.filter((item): item is DosReviewOutcomeValue => (
      typeof item === "string" && dosReviewOutcomeValueSet.has(item)
    )),
  ));
}
