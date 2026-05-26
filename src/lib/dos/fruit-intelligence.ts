import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type FruitConfidenceLevel = "observed" | "confirmed" | "verified";
export type FruitSourceType = "leader_reflection" | "participant_review" | "testimony" | "manual" | "system";
export type FruitVisibility = "private" | "internal" | "public";

export type FruitEventInput = {
  confidenceLevel: FruitConfidenceLevel;
  debugContext?: Record<string, unknown>;
  description?: string | null;
  fruitType: string;
  generatedBy?: string;
  generationKey?: string | null;
  leaderId?: string | null;
  meetingId?: string | null;
  occurredAt?: string | null;
  personId?: string | null;
  sourceId?: string | null;
  sourceType: FruitSourceType;
  title?: string | null;
  visibility?: FruitVisibility;
};

export type ReflectionInferenceInput = {
  followUpNeeded?: boolean;
  id: string;
  leaderId?: string | null;
  meetingId: string;
  nextStep?: string | null;
  observedFruit?: string[];
  personId?: string | null;
  prayerNeeds?: string | null;
  privateNotes?: string | null;
  spiritualOpenness?: string | null;
  whatHappened?: string | null;
};

export type ReviewInferenceInput = {
  comments?: string | null;
  conversationHelpful?: string | null;
  feltCaredFor?: string | null;
  feltHeard?: string | null;
  id: string;
  leaderId?: string | null;
  meetingId: string;
  personId?: string | null;
  submittedAt?: string | null;
  wouldMeetAgain?: boolean | null;
};

export type TestimonyInferenceInput = {
  decisionMade?: string | null;
  id: string;
  leaderId?: string | null;
  meetingId: string;
  nextStep?: string | null;
  personId?: string | null;
  story: string;
  submittedAt?: string | null;
  whatChanged?: string | null;
};

export type EngagementInferenceInput = {
  leaderId?: string | null;
  personId: string;
  workspaceId: string;
};

type MeetingRow = {
  field_person_ids: string[] | null;
  id: string;
  table_date: string | null;
};

type PersonRow = {
  church: string | null;
  engagement_level: string | null;
  id: string;
  relationship_type: string | null;
  status: string | null;
};

type SupabaseQueryError = { message?: string } | null | undefined;

function normalizeText(...values: Array<string | null | undefined>) {
  return values.join(" ").toLowerCase();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function daysAgo(value: string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function isMissingWorkspaceScopeColumn(error: SupabaseQueryError) {
  return Boolean(error?.message?.includes("workspace_id"));
}

function eventKey(sourceType: FruitSourceType, sourceId: string | null | undefined, fruitType: string, personId: string | null | undefined) {
  return [sourceType, sourceId ?? "none", personId ?? "none", fruitType.toLowerCase().replace(/[^a-z0-9]+/g, "-")].join(":");
}

export async function createFruitEvent(input: FruitEventInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  const generationKey = input.generationKey ?? eventKey(input.sourceType, input.sourceId, input.fruitType, input.personId);
  const payload = {
    confidence_level: input.confidenceLevel,
    debug_context: input.debugContext ?? {},
    description: input.description ?? null,
    fruit_type: input.fruitType,
    generated_by: input.generatedBy ?? "manual",
    generation_key: generationKey,
    leader_id: input.leaderId ?? null,
    meeting_id: input.meetingId ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    person_id: input.personId ?? null,
    source_id: input.sourceId ?? null,
    source_type: input.sourceType,
    title: input.title ?? input.fruitType,
    visibility: input.visibility ?? "private",
  };

  const { data, error } = await supabase
    .from("fruit_events")
    .upsert(payload, { onConflict: "generation_key", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[Fruit Intelligence] Unable to create fruit event", error.message);
  }

  return data?.id ? String(data.id) : null;
}

export async function inferFruitEventsFromReflection(input: ReflectionInferenceInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  const text = normalizeText(input.whatHappened, input.prayerNeeds, input.privateNotes, input.nextStep, input.spiritualOpenness);
  const events: FruitEventInput[] = [];
  const add = (fruitType: string, description: string, matchedBy: string, title = fruitType) => {
    events.push({
      confidenceLevel: "observed",
      debugContext: { matchedBy, source: "Leader Reflection" },
      description,
      fruitType,
      generatedBy: "reflection_keywords",
      generationKey: eventKey("leader_reflection", input.id, fruitType, input.personId),
      leaderId: input.leaderId,
      meetingId: input.meetingId,
      personId: input.personId,
      sourceId: input.id,
      sourceType: "leader_reflection",
      title,
      visibility: "private",
    });
  };

  if (input.prayerNeeds || includesAny(text, ["prayer", "pray for", "prayed", "needs prayer"])) {
    add("Prayer Request", "Prayer needs were named in the Leader Reflection.", "prayer language", "Prayer Requested");
  }

  if (includesAny(text, ["gospel", "jesus", "salvation", "shared the gospel", "good news"])) {
    add("Gospel Conversation", "The Leader Reflection indicates a gospel-centered conversation.", "gospel language");
  }

  if (includesAny(text, ["accountability", "check in", "follow up weekly", "confess", "obedience"])) {
    add("Ongoing Accountability", "The Leader Reflection points to ongoing accountability.", "accountability language");
  }

  (input.observedFruit ?? []).forEach((fruitType) => {
    add(fruitType, `Leader observed ${fruitType}.`, "selected observed fruit");
  });

  await Promise.all(events.map((event) => createFruitEvent(event, supabase)));

  return events.length;
}

export async function inferFruitEventsFromReview(input: ReviewInferenceInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  await createFruitEvent({
    confidenceLevel: "confirmed",
    debugContext: {
      conversationHelpful: input.conversationHelpful,
      feltCaredFor: input.feltCaredFor,
      feltHeard: input.feltHeard,
      source: "Participant Review",
      wouldMeetAgain: input.wouldMeetAgain,
    },
    description: input.comments || "A participant submitted a Review after the meeting.",
    fruitType: "Follow Up Engagement",
    generatedBy: "review_submission",
    generationKey: eventKey("participant_review", input.id, "Follow Up Engagement", input.personId),
    leaderId: input.leaderId,
    meetingId: input.meetingId,
    occurredAt: input.submittedAt,
    personId: input.personId,
    sourceId: input.id,
    sourceType: "participant_review",
    title: "Follow Up Engagement",
    visibility: "private",
  }, supabase);

  return 1;
}

export async function inferFruitEventsFromTestimony(input: TestimonyInferenceInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  const text = normalizeText(input.story, input.whatChanged, input.decisionMade, input.nextStep);
  const events: FruitEventInput[] = [
    {
      confidenceLevel: "confirmed",
      debugContext: { matchedBy: "testimony submitted", source: "Testimony" },
      description: input.whatChanged || input.story,
      fruitType: "Shared Testimony",
      generatedBy: "testimony_keywords",
      generationKey: eventKey("testimony", input.id, "Shared Testimony", input.personId),
      leaderId: input.leaderId,
      meetingId: input.meetingId,
      occurredAt: input.submittedAt,
      personId: input.personId,
      sourceId: input.id,
      sourceType: "testimony",
      title: "Shared Testimony",
      visibility: "private",
    },
  ];
  const add = (fruitType: string, matchedBy: string) => {
    events.push({
      confidenceLevel: "confirmed",
      debugContext: { matchedBy, source: "Testimony" },
      description: input.whatChanged || input.story,
      fruitType,
      generatedBy: "testimony_keywords",
      generationKey: eventKey("testimony", input.id, fruitType, input.personId),
      leaderId: input.leaderId,
      meetingId: input.meetingId,
      occurredAt: input.submittedAt,
      personId: input.personId,
      sourceId: input.id,
      sourceType: "testimony",
      title: fruitType,
      visibility: "private",
    });
  };

  if (includesAny(text, ["saved", "salvation", "gave my life", "accepted jesus", "follow jesus", "born again"])) {
    add("Salvation", "salvation language");
  }

  if (includesAny(text, ["rededicated", "re-dedicated", "came back to god", "return to jesus", "renewed my faith"])) {
    add("Re Dedication", "re dedication language");
  }

  if (includesAny(text, ["church", "attended church", "joined church", "visited church", "small group"])) {
    add(includesAny(text, ["joined church", "member"]) ? "Joined Church" : "Church Visit", "church engagement language");
  }

  if (includesAny(text, ["discipleship", "disciple", "mentor", "being discipled", "study the bible", "bible study"])) {
    add("Joined Discipleship", "discipleship language");
  }

  await Promise.all(events.map((event) => createFruitEvent(event, supabase)));

  return events.length;
}

export async function inferFruitEventsFromEngagement(input: EngagementInferenceInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  const scopedMeetingsResult = await supabase
    .from("missionary_tables")
    .select("id, table_date, field_person_ids")
    .or(`workspace_id.eq.${input.workspaceId},household_id.eq.${input.workspaceId}`)
    .contains("field_person_ids", [input.personId])
    .order("table_date", { ascending: false })
    .limit(12);
  const meetingsResult = scopedMeetingsResult.error && isMissingWorkspaceScopeColumn(scopedMeetingsResult.error)
    ? await supabase
      .from("missionary_tables")
      .select("id, table_date, field_person_ids")
      .eq("household_id", input.workspaceId)
      .contains("field_person_ids", [input.personId])
      .order("table_date", { ascending: false })
      .limit(12)
    : scopedMeetingsResult;
  const [{ data: person }] = await Promise.all([
    supabase
      .from("missionary_field_people")
      .select("id, church, relationship_type, engagement_level, status")
      .eq("id", input.personId)
      .maybeSingle(),
  ]);

  const typedPerson = person as PersonRow | null;
  const typedMeetings = (meetingsResult.data ?? []) as MeetingRow[];
  const recentMeetings = typedMeetings.filter((meeting) => daysAgo(meeting.table_date) <= 45);
  const events: FruitEventInput[] = [];
  const latestMeetingId = typedMeetings[0]?.id ?? null;

  if (recentMeetings.length >= 3) {
    events.push({
      confidenceLevel: "verified",
      debugContext: { meetingCount: recentMeetings.length, windowDays: 45 },
      description: `${recentMeetings.length} meetings were logged within 45 days.`,
      fruitType: "Joined Discipleship",
      generatedBy: "engagement_pattern",
      generationKey: `engagement:${input.personId}:three-meetings-45-days`,
      leaderId: input.leaderId,
      meetingId: latestMeetingId,
      personId: input.personId,
      sourceType: "system",
      title: "Ongoing Discipleship",
      visibility: "private",
    });
  }

  if (typedPerson?.church || includesAny(normalizeText(typedPerson?.relationship_type, typedPerson?.engagement_level, typedPerson?.status), ["church", "attending", "member"])) {
    events.push({
      confidenceLevel: "verified",
      debugContext: { church: typedPerson?.church ?? null },
      description: typedPerson?.church ? `Church connected: ${typedPerson.church}.` : "Church engagement appears on the person profile.",
      fruitType: "Church Visit",
      generatedBy: "engagement_pattern",
      generationKey: `engagement:${input.personId}:church-engagement`,
      leaderId: input.leaderId,
      meetingId: latestMeetingId,
      personId: input.personId,
      sourceType: "system",
      title: "Church Engagement",
      visibility: "private",
    });
  }

  if (includesAny(normalizeText(typedPerson?.relationship_type, typedPerson?.engagement_level, typedPerson?.status), ["leader", "leading", "multiplying", "discipling others", "mentor"])) {
    events.push({
      confidenceLevel: "verified",
      debugContext: { relationshipType: typedPerson?.relationship_type, status: typedPerson?.status },
      description: "The person profile indicates they are leading or discipling others.",
      fruitType: "Started Discipling Others",
      generatedBy: "engagement_pattern",
      generationKey: `engagement:${input.personId}:started-discipling-others`,
      leaderId: input.leaderId,
      meetingId: latestMeetingId,
      personId: input.personId,
      sourceType: "system",
      title: "Started Discipling Others",
      visibility: "private",
    });
  }

  await Promise.all(events.map((event) => createFruitEvent(event, supabase)));

  return events.length;
}
