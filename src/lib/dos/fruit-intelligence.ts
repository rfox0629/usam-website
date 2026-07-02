import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type FruitConfidenceLevel = "observed" | "confirmed" | "verified";
export type FruitSourceAction = "leader_review" | "quick_review" | "record_fruit" | "testimony_review";
export type FruitSourceType = "leader_reflection" | "participant_review" | "testimony" | "manual";
export type FruitVisibility = "private" | "internal" | "public";

export type FruitEventInput = {
  confidenceLevel: FruitConfidenceLevel;
  debugContext?: Record<string, unknown>;
  description?: string | null;
  fruitType: string;
  generatedBy: FruitSourceAction;
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

const explicitFruitSourceActions: readonly FruitSourceAction[] = ["leader_review", "quick_review", "record_fruit", "testimony_review"];

function eventKey(sourceType: FruitSourceType, sourceId: string | null | undefined, fruitType: string, personId: string | null | undefined) {
  return [sourceType, sourceId ?? "none", personId ?? "none", fruitType.toLowerCase().replace(/[^a-z0-9]+/g, "-")].join(":");
}

function fruitEventPayload(input: FruitEventInput) {
  const generationKey = input.generationKey ?? eventKey(input.sourceType, input.sourceId, input.fruitType, input.personId);

  return {
    confidence_level: input.confidenceLevel,
    debug_context: input.debugContext ?? {},
    description: input.description ?? null,
    fruit_type: input.fruitType,
    generated_by: input.generatedBy,
    generation_key: generationKey,
    leader_id: input.leaderId ?? null,
    meeting_id: input.meetingId ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    person_id: input.personId ?? null,
    source_id: input.sourceId ?? null,
    source_type: input.sourceType,
    status: "submitted",
    title: input.title ?? input.fruitType,
    visibility: input.visibility ?? "private",
  };
}

function reflectionFruitEvents(input: ReflectionInferenceInput) {
  const events: FruitEventInput[] = [];
  const add = (fruitType: string, description: string, matchedBy: string, title = fruitType) => {
    events.push({
      confidenceLevel: "observed",
      debugContext: { matchedBy, source: "Leader Reflection" },
      description,
      fruitType,
      generatedBy: "leader_review",
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

  (input.observedFruit ?? []).forEach((fruitType) => {
    add(fruitType, `${fruitType} was selected in the Leader Reflection.`, "selected observed fruit");
  });

  return events;
}

export async function createFruitEvent(input: FruitEventInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  if (!explicitFruitSourceActions.includes(input.generatedBy)) {
    console.warn("[Fruit Intelligence] Refused fruit event without explicit source action", input.generatedBy);
    return null;
  }

  const payload = fruitEventPayload(input);

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

export async function syncFruitEventsForReflection(input: ReflectionInferenceInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  const events = reflectionFruitEvents(input);
  const generationKeys = new Set(events.map((event) => event.generationKey).filter((key): key is string => Boolean(key)));
  const existingResult = await supabase
    .from("fruit_events")
    .select("id, generation_key")
    .eq("source_type", "leader_reflection")
    .eq("source_id", input.id)
    .eq("generated_by", "leader_review");

  if (existingResult.error) {
    console.warn("[Fruit Intelligence] Unable to load existing reflection fruit events", existingResult.error.message);
  } else {
    const staleEventIds = (existingResult.data ?? [])
      .filter((event) => !generationKeys.has(String(event.generation_key ?? "")))
      .map((event) => String(event.id));

    if (staleEventIds.length) {
      const deleteResult = await supabase
        .from("fruit_events")
        .delete()
        .in("id", staleEventIds);

      if (deleteResult.error) {
        console.warn("[Fruit Intelligence] Unable to delete stale reflection fruit events", deleteResult.error.message);
      }
    }
  }

  await Promise.all(events.map(async (event) => {
    const { error } = await supabase
      .from("fruit_events")
      .upsert(fruitEventPayload(event), { onConflict: "generation_key" });

    if (error) {
      console.warn("[Fruit Intelligence] Unable to sync reflection fruit event", error.message);
    }
  }));

  return events.length;
}

export async function inferFruitEventsFromReflection(input: ReflectionInferenceInput, supabase: SupabaseAdminClient = createSupabaseAdminClient()) {
  return syncFruitEventsForReflection(input, supabase);
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
    generatedBy: "quick_review",
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
