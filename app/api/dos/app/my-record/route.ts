import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization, type DosAuthorizedUser } from "@/src/lib/dos/auth";
import { resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const journalTags = ["Prayer", "Scripture", "Worship", "Repentance", "Direction", "Thanksgiving"] as const;
const prayerStatuses = ["answered", "open", "watching"] as const;

type MyRecordPayload = {
  actionSteps?: unknown;
  answers?: unknown;
  answeredStatus?: unknown;
  assessmentSlug?: unknown;
  biblePassage?: unknown;
  counselReceived?: unknown;
  currentSeasonFocus?: unknown;
  date?: unknown;
  discussed?: unknown;
  displayName?: unknown;
  fieldPersonId?: unknown;
  followUpDate?: unknown;
  kind?: unknown;
  lordHighlight?: unknown;
  mentorName?: unknown;
  minutesSpent?: unknown;
  notes?: unknown;
  prayerFocus?: unknown;
  prayerResponse?: unknown;
  relationshipId?: unknown;
  relationshipLabel?: unknown;
  tags?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
};

type RecordRow = {
  id: string;
};

type FieldPersonRow = {
  id: string;
  name: string;
};

type MentorRelationshipRow = {
  field_person_id: string | null;
  id: string;
  mentor_name: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown, maxLength = 4000) {
  const text = asString(value).slice(0, maxLength);

  return text ? text : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asDateString(value: unknown) {
  const nextValue = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : new Date().toISOString().slice(0, 10);
}

function asOptionalDateString(value: unknown) {
  const nextValue = asString(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(nextValue) ? nextValue : null;
}

function asMinutes(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number.parseInt(asString(value), 10);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(1440, Math.max(0, Math.round(numericValue)));
}

function asJournalTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => asString(item)).filter((tag): tag is typeof journalTags[number] => (
    journalTags.includes(tag as typeof journalTags[number])
  ))));
}

function asPrayerStatus(value: unknown) {
  const status = asString(value);

  return prayerStatuses.includes(status as typeof prayerStatuses[number]) ? status : "open";
}

function asAssessmentScore(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number.parseInt(asString(value), 10);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.min(10, Math.max(0, Math.round(numericValue)));
}

function asAssessmentAnswers(value: unknown, questionIds: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const rawAnswers = value as Record<string, unknown>;
  const answers: Record<string, number> = {};

  for (const questionId of questionIds) {
    const score = asAssessmentScore(rawAnswers[questionId]);

    if (score === null) {
      return null;
    }

    answers[questionId] = score;
  }

  return answers;
}

function calculateAssessmentResult(payload: MyRecordPayload) {
  const assessmentSlug = asString(payload.assessmentSlug);
  const assessment = getDosResourceBySlug(assessmentSlug);
  const assessmentDefinition = assessment?.content?.assessment;

  if (!assessment || assessment.type !== "assessment" || !assessmentDefinition) {
    return { response: NextResponse.json({ error: "Assessment not found." }, { status: 404 }) };
  }

  const questionIds = assessmentDefinition.questions.map((question) => question.id);
  const answers = asAssessmentAnswers(payload.answers, questionIds);

  if (!answers) {
    return { response: NextResponse.json({ error: "All assessment questions must be answered." }, { status: 400 }) };
  }

  const categoryScores = assessmentDefinition.questions.map((question) => {
    const score = answers[question.id] ?? 0;

    return {
      id: question.id,
      maxScore: 10,
      percentage: score * 10,
      score,
      title: question.prompt,
    };
  });
  const overallScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
  const maxScore = Math.max(assessmentDefinition.maxScore, questionIds.length * 10);
  const percentage = maxScore ? Math.round((overallScore / maxScore) * 10000) / 100 : 0;

  return {
    result: {
      answers,
      assessmentName: assessment.title,
      assessmentResourceId: assessment.id,
      assessmentSlug: assessment.slug,
      categoryScores,
      maxScore,
      overallScore,
      percentage,
    },
  };
}

function dateAtNoonUtc(date: string) {
  return `${date}T12:00:00.000Z`;
}

async function authorizeWrite() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return { response: NextResponse.json({ error: "DOS write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function validateFieldPerson(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  fieldPersonId: string,
) {
  if (!fieldPersonId) {
    return { person: null };
  }

  if (!isUuid(fieldPersonId)) {
    return { response: NextResponse.json({ error: "Selected person is invalid." }, { status: 400 }) };
  }

  const { data, error } = await supabase
    .from("missionary_field_people")
    .select("id, name")
    .eq("id", fieldPersonId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  if (!data) {
    return { response: NextResponse.json({ error: "Selected person does not belong to this workspace." }, { status: 400 }) };
  }

  return { person: data as FieldPersonRow };
}

async function ensureMyRecord(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  authorization: DosAuthorizedUser,
  displayName?: string | null,
) {
  const { data, error } = await supabase
    .from("dos_user_records")
    .upsert({
      display_name: displayName || authorization.email,
      user_id: authorization.userId,
      workspace_id: workspaceId,
    }, { onConflict: "workspace_id,user_id" })
    .select("id")
    .single();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  return { record: data as RecordRow };
}

async function findOrCreateMentorRelationship({
  fieldPerson,
  mentorName,
  recordId,
  relationshipId,
  relationshipLabel,
  supabase,
  userId,
  workspaceId,
}: {
  fieldPerson: FieldPersonRow | null;
  mentorName: string;
  recordId: string;
  relationshipId: string;
  relationshipLabel?: string | null;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  workspaceId: string;
}) {
  if (relationshipId) {
    if (!isUuid(relationshipId)) {
      return { response: NextResponse.json({ error: "Selected mentor is invalid." }, { status: 400 }) };
    }

    const { data, error } = await supabase
      .from("dos_user_mentor_relationships")
      .select("id, field_person_id, mentor_name")
      .eq("id", relationshipId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
    }

    if (!data) {
      return { response: NextResponse.json({ error: "Mentor relationship not found." }, { status: 404 }) };
    }

    return { relationship: data as MentorRelationshipRow };
  }

  const resolvedName = mentorName || fieldPerson?.name || "";

  if (!resolvedName) {
    return { response: NextResponse.json({ error: "Mentor name is required." }, { status: 400 }) };
  }

  const existingQuery = supabase
    .from("dos_user_mentor_relationships")
    .select("id, field_person_id, mentor_name")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  const existingResult = fieldPerson
    ? await existingQuery.eq("field_person_id", fieldPerson.id).maybeSingle()
    : await existingQuery.eq("mentor_name", resolvedName).maybeSingle();

  if (existingResult.error) {
    return { response: NextResponse.json({ error: existingResult.error.message }, { status: 500 }) };
  }

  if (existingResult.data) {
    return { relationship: existingResult.data as MentorRelationshipRow };
  }

  const { data, error } = await supabase
    .from("dos_user_mentor_relationships")
    .insert({
      field_person_id: fieldPerson?.id ?? null,
      mentor_name: resolvedName,
      record_id: recordId,
      relationship_label: relationshipLabel,
      status: "active",
      user_id: userId,
      workspace_id: workspaceId,
    })
    .select("id, field_person_id, mentor_name")
    .single();

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  return { relationship: data as MentorRelationshipRow };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: MyRecordPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId) || asString(payload.workspace_id));
  const kind = asString(payload.kind);

  if (!workspaceId || !kind) {
    return NextResponse.json({ error: "Workspace and My Record action are required." }, { status: 400 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const supabase = createSupabaseAdminClient();
  const displayName = asNullableText(payload.displayName, 160);
  const recordResult = await ensureMyRecord(supabase, workspaceId, authResult.authorization, displayName);

  if ("response" in recordResult) {
    return recordResult.response;
  }

  const recordId = recordResult.record.id;

  if (kind === "record") {
    const { data, error } = await supabase
      .from("dos_user_records")
      .update({
        current_season_focus: asNullableText(payload.currentSeasonFocus, 500),
        display_name: displayName || authResult.authorization.email,
      })
      .eq("id", recordId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", authResult.authorization.userId)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "journal") {
    const { data, error } = await supabase
      .from("dos_user_journal_entries")
      .insert({
        bible_passage: asNullableText(payload.biblePassage, 500),
        entry_date: asDateString(payload.date),
        lord_highlight: asNullableText(payload.lordHighlight),
        minutes_spent: asMinutes(payload.minutesSpent),
        notes: asNullableText(payload.notes),
        prayer_response: asNullableText(payload.prayerResponse),
        record_id: recordId,
        tags: asJournalTags(payload.tags),
        user_id: authResult.authorization.userId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "prayer") {
    const fieldPersonId = asString(payload.fieldPersonId);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    const date = asDateString(payload.date);
    const answeredStatus = asPrayerStatus(payload.answeredStatus);
    const { data, error } = await supabase
      .from("dos_user_prayer_logs")
      .insert({
        answered_at: answeredStatus === "answered" ? new Date().toISOString() : null,
        answered_status: answeredStatus,
        field_person_id: personValidation.person?.id ?? null,
        minutes_spent: asMinutes(payload.minutesSpent),
        notes: asNullableText(payload.notes),
        prayed_at: dateAtNoonUtc(date),
        prayer_focus: asNullableText(payload.prayerFocus, 500),
        record_id: recordId,
        user_id: authResult.authorization.userId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "mentor_relationship") {
    const fieldPersonId = asString(payload.fieldPersonId);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    const mentorName = asNullableText(payload.mentorName, 160) || personValidation.person?.name || "";
    const relationshipLabel = asNullableText(payload.relationshipLabel, 160);
    const notes = asNullableText(payload.notes);

    if (!mentorName) {
      return NextResponse.json({ error: "Mentor name is required." }, { status: 400 });
    }

    const relationshipResult = await findOrCreateMentorRelationship({
      fieldPerson: personValidation.person,
      mentorName,
      recordId,
      relationshipId: "",
      relationshipLabel,
      supabase,
      userId: authResult.authorization.userId,
      workspaceId,
    });

    if ("response" in relationshipResult) {
      return relationshipResult.response;
    }

    if (notes || relationshipLabel) {
      const { error } = await supabase
        .from("dos_user_mentor_relationships")
        .update({
          notes,
          relationship_label: relationshipLabel,
        })
        .eq("id", relationshipResult.relationship.id)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ id: relationshipResult.relationship.id });
  }

  if (kind === "mentor_meeting") {
    const fieldPersonId = asString(payload.fieldPersonId);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    const relationshipResult = await findOrCreateMentorRelationship({
      fieldPerson: personValidation.person,
      mentorName: asString(payload.mentorName),
      recordId,
      relationshipId: asString(payload.relationshipId),
      relationshipLabel: asNullableText(payload.relationshipLabel, 160),
      supabase,
      userId: authResult.authorization.userId,
      workspaceId,
    });

    if ("response" in relationshipResult) {
      return relationshipResult.response;
    }

    const relationship = relationshipResult.relationship;
    const { data, error } = await supabase
      .from("dos_user_mentor_meetings")
      .insert({
        action_steps: asNullableText(payload.actionSteps),
        counsel_received: asNullableText(payload.counselReceived),
        discussed: asNullableText(payload.discussed),
        duration_minutes: asMinutes(payload.minutesSpent),
        field_person_id: relationship.field_person_id ?? personValidation.person?.id ?? null,
        follow_up_date: asOptionalDateString(payload.followUpDate),
        meeting_date: asDateString(payload.date),
        mentor_name: relationship.mentor_name,
        notes: asNullableText(payload.notes),
        record_id: recordId,
        relationship_id: relationship.id,
        user_id: authResult.authorization.userId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "assessment_result") {
    const assessmentResult = calculateAssessmentResult(payload);

    if ("response" in assessmentResult) {
      return assessmentResult.response;
    }

    const { result } = assessmentResult;
    const { data, error } = await supabase
      .from("dos_user_assessment_results")
      .insert({
        answers: result.answers,
        assessment_name: result.assessmentName,
        assessment_resource_id: result.assessmentResourceId,
        assessment_slug: result.assessmentSlug,
        category_scores: result.categoryScores,
        completed_at: new Date().toISOString(),
        max_score: result.maxScore,
        overall_score: result.overallScore,
        percentage: result.percentage,
        record_id: recordId,
        user_id: authResult.authorization.userId,
        visibility: "private",
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  return NextResponse.json({ error: "Unsupported My Record action." }, { status: 400 });
}
