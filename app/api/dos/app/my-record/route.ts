import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization, type DosAuthorizedUser } from "@/src/lib/dos/auth";
import { isDosMyRecordV2Enabled, resolveDosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const journalTags = ["Prayer", "Scripture", "Worship", "Repentance", "Direction", "Thanksgiving"] as const;
const prayerStatuses = ["answered", "open", "watching"] as const;
const propheticWordStatuses = ["archived", "confirmed", "fulfilled", "received", "testing"] as const;
const externalAssessmentStatuses = ["completed", "draft", "not_started"] as const;
const assessmentReportBucket = "dos-my-record-assessments";
const learningStatuses = ["planned", "reading", "finished", "paused", "archived"] as const;
const learningHighlightBucket = "dos-my-record-learning";
const lifePlanBucket = "dos-my-record-life-plans";

type MyRecordPayload = {
  actionSteps?: unknown;
  answers?: unknown;
  answeredStatus?: unknown;
  assessmentName?: unknown;
  attachmentBucket?: unknown;
  attachmentContentType?: unknown;
  attachmentFileName?: unknown;
  attachmentPath?: unknown;
  attachmentUploadedAt?: unknown;
  assessmentSlug?: unknown;
  attachmentUrl?: unknown;
  author?: unknown;
  biblePassage?: unknown;
  bookId?: unknown;
  callingStatement?: unknown;
  category?: unknown;
  chapterLabel?: unknown;
  chapterNumber?: unknown;
  confirmations?: unknown;
  counselReceived?: unknown;
  context?: unknown;
  currentSeasonFocus?: unknown;
  date?: unknown;
  dateReceived?: unknown;
  dateTaken?: unknown;
  dailyReminder?: unknown;
  decisionFilters?: unknown;
  discussed?: unknown;
  displayName?: unknown;
  fieldPersonId?: unknown;
  followUpDate?: unknown;
  focusAllocation?: unknown;
  finalSummary?: unknown;
  finishedOn?: unknown;
  givenBy?: unknown;
  highlightImageBucket?: unknown;
  highlightImageContentType?: unknown;
  highlightImageFileName?: unknown;
  highlightImagePath?: unknown;
  highlightImageUploadedAt?: unknown;
  highlights?: unknown;
  kind?: unknown;
  entryId?: unknown;
  externalAssessmentResultId?: unknown;
  chapterNoteId?: unknown;
  lastReviewedDate?: unknown;
  legacyChurch?: unknown;
  legacyDiscipled?: unknown;
  legacyFamily?: unknown;
  legacyJesus?: unknown;
  legacyRememberedFor?: unknown;
  lifePlanId?: unknown;
  lordHighlight?: unknown;
  meetingRhythm?: unknown;
  mentorEmail?: unknown;
  mentorName?: unknown;
  mentorMeetingId?: unknown;
  mentorPhone?: unknown;
  minutesSpent?: unknown;
  notes?: unknown;
  officialAssessmentUrl?: unknown;
  originalDateWritten?: unknown;
  prayerFocus?: unknown;
  prayerResponse?: unknown;
  prayerLogId?: unknown;
  personalApplication?: unknown;
  nextReviewDate?: unknown;
  propheticWordId?: unknown;
  rarelyDo?: unknown;
  relationshipId?: unknown;
  relationshipLabel?: unknown;
  responsibilities?: unknown;
  resultType?: unknown;
  retakeReminderDate?: unknown;
  reviewHistory?: unknown;
  reviewRhythm?: unknown;
  shareEligible?: unknown;
  shortSummary?: unknown;
  scriptureReferences?: unknown;
  scoresDetails?: unknown;
  status?: unknown;
  startedOn?: unknown;
  tags?: unknown;
  title?: unknown;
  topPriorities?: unknown;
  topStrengths?: unknown;
  targetId?: unknown;
  targetKind?: unknown;
  wordText?: unknown;
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

function myRecordApiLogValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  if (value.length <= 160) {
    return value;
  }

  return `${value.slice(0, 160)}... (${value.length} chars)`;
}

function myRecordApiLogPayload(payload: MyRecordPayload | Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, Array.isArray(value) ? value.map(myRecordApiLogValue) : myRecordApiLogValue(value)]));
}

function myRecordApiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function myRecordDatabaseErrorResponse(context: string, error: { code?: string; details?: string; hint?: string; message: string }, payload?: MyRecordPayload) {
  console.error("[My Record API] Database error", {
    context,
    error,
    payload: payload ? myRecordApiLogPayload(payload) : undefined,
  });

  return NextResponse.json({
    code: error.code,
    details: error.details,
    error: `Database ${context} failed: ${error.message}`,
    hint: error.hint,
  }, { status: 500 });
}

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

function asOptionalHttpUrl(value: unknown, label: string, maxLength = 1000) {
  const text = asNullableText(value, maxLength);

  if (!text) {
    return { value: null };
  }

  try {
    const url = new URL(text);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return { value: url.toString() };
    }
  } catch {
    // Fall through to the validation response below.
  }

  return { response: NextResponse.json({ error: `${label} must be a valid http or https URL.` }, { status: 400 }) };
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

function asPropheticWordStatus(value: unknown) {
  const status = asString(value).toLowerCase();

  return propheticWordStatuses.includes(status as typeof propheticWordStatuses[number]) ? status : "received";
}

function asExternalAssessmentStatus(value: unknown) {
  const status = asString(value).toLowerCase();

  return externalAssessmentStatuses.includes(status as typeof externalAssessmentStatuses[number]) ? status : "completed";
}

function asLearningStatus(value: unknown) {
  const status = asString(value).toLowerCase();

  return learningStatuses.includes(status as typeof learningStatuses[number]) ? status : "reading";
}

function asBoolean(value: unknown) {
  return value === true || asString(value).toLowerCase() === "true" || asString(value) === "on";
}

function asAssessmentAttachment(payload: MyRecordPayload, workspaceId: string, userId: string) {
  const bucket = asString(payload.attachmentBucket);
  const path = asString(payload.attachmentPath);

  if (!bucket && !path) {
    return {
      attachmentBucket: null,
      attachmentContentType: null,
      attachmentFileName: null,
      attachmentPath: null,
      attachmentUploadedAt: null,
    };
  }

  const expectedPrefix = `workspaces/${workspaceId}/users/${userId}/assessments/`;

  if (bucket !== assessmentReportBucket || !path.startsWith(expectedPrefix)) {
    return { response: NextResponse.json({ error: "Invalid assessment report attachment." }, { status: 400 }) };
  }

  const uploadedAt = asString(payload.attachmentUploadedAt);
  const uploadedAtDate = uploadedAt ? new Date(uploadedAt) : null;

  return {
    attachmentBucket: bucket,
    attachmentContentType: asNullableText(payload.attachmentContentType, 160),
    attachmentFileName: asNullableText(payload.attachmentFileName, 240),
    attachmentPath: path,
    attachmentUploadedAt: uploadedAtDate && Number.isFinite(uploadedAtDate.getTime()) ? uploadedAtDate.toISOString() : new Date().toISOString(),
  };
}

function asLearningHighlightImage(payload: MyRecordPayload, workspaceId: string, userId: string) {
  const bucket = asString(payload.highlightImageBucket);
  const path = asString(payload.highlightImagePath);

  if (!bucket && !path) {
    return {
      highlightImageBucket: null,
      highlightImageContentType: null,
      highlightImageFileName: null,
      highlightImagePath: null,
      highlightImageUploadedAt: null,
    };
  }

  const expectedPrefix = `workspaces/${workspaceId}/users/${userId}/learning/`;

  if (bucket !== learningHighlightBucket || !path.startsWith(expectedPrefix)) {
    return { response: NextResponse.json({ error: "Invalid learning highlight image." }, { status: 400 }) };
  }

  const uploadedAt = asString(payload.highlightImageUploadedAt);
  const uploadedAtDate = uploadedAt ? new Date(uploadedAt) : null;

  return {
    highlightImageBucket: bucket,
    highlightImageContentType: asNullableText(payload.highlightImageContentType, 160),
    highlightImageFileName: asNullableText(payload.highlightImageFileName, 240),
    highlightImagePath: path,
    highlightImageUploadedAt: uploadedAtDate && Number.isFinite(uploadedAtDate.getTime()) ? uploadedAtDate.toISOString() : new Date().toISOString(),
  };
}

function asLifePlanAttachment(payload: MyRecordPayload, workspaceId: string, userId: string) {
  const bucket = asString(payload.attachmentBucket);
  const path = asString(payload.attachmentPath);

  if (!bucket && !path) {
    return {
      attachmentBucket: null,
      attachmentContentType: null,
      attachmentFileName: null,
      attachmentPath: null,
      attachmentUploadedAt: null,
    };
  }

  const expectedPrefix = `workspaces/${workspaceId}/users/${userId}/life-plan/`;

  if (bucket !== lifePlanBucket || !path.startsWith(expectedPrefix)) {
    return { response: NextResponse.json({ error: "Invalid Life Plan PDF attachment." }, { status: 400 }) };
  }

  const uploadedAt = asString(payload.attachmentUploadedAt);
  const uploadedAtDate = uploadedAt ? new Date(uploadedAt) : null;

  return {
    attachmentBucket: bucket,
    attachmentContentType: asNullableText(payload.attachmentContentType, 160),
    attachmentFileName: asNullableText(payload.attachmentFileName, 240),
    attachmentPath: path,
    attachmentUploadedAt: uploadedAtDate && Number.isFinite(uploadedAtDate.getTime()) ? uploadedAtDate.toISOString() : new Date().toISOString(),
  };
}

function asStringList(value: unknown, maxItems = 12) {
  const values = Array.isArray(value)
    ? value
    : asString(value)
      .split(/[\n,]/)
      .map((item) => item.trim());

  return Array.from(new Set(values.map((item) => asString(item)).filter(Boolean))).slice(0, maxItems);
}

function asLifePlanTopPriorities(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const priority = item && typeof item === "object" ? item as Record<string, unknown> : null;
      const label = asNullableText(priority?.label, 240);
      const allocationValue = typeof priority?.allocationPercent === "number"
        ? priority.allocationPercent
        : Number.parseInt(asString(priority?.allocationPercent), 10);

      if (!label) {
        return null;
      }

      return {
        allocationPercent: Number.isFinite(allocationValue) ? Math.max(0, Math.round(allocationValue)) : null,
        id: asNullableText(priority?.id, 80) || `priority-${index + 1}`,
        label,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function asLifePlanReviewHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const review = item && typeof item === "object" ? item as Record<string, unknown> : null;
      const date = asOptionalDateString(review?.date);
      const notes = asNullableText(review?.notes, 2000);

      return date || notes ? { date, notes } : null;
    })
    .filter(Boolean)
    .slice(0, 40);
}

function asOptionalInteger(value: unknown, min = 0, max = 9999) {
  const rawValue = asString(value);

  if (!rawValue) {
    return null;
  }

  const numericValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
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

function validateOptionalUuid(value: unknown, label: string) {
  const id = asString(value);

  if (!id) {
    return { id: "" };
  }

  return isUuid(id)
    ? { id }
    : { response: NextResponse.json({ error: `${label} is invalid.` }, { status: 400 }) };
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

async function handleMyRecordPost(request: Request) {
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

  const workspace = await resolveDosAppWorkspace(asString(payload.workspaceId) || asString(payload.workspace_id));
  const kind = asString(payload.kind);

  console.info("[My Record API] Request payload", myRecordApiLogPayload(payload));

  if (!workspace || !kind) {
    return NextResponse.json({ error: "Workspace and My Record action are required." }, { status: 400 });
  }

  const workspaceId = workspace.id;
  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  const myRecordV2Enabled = isDosMyRecordV2Enabled({
    userEmail: authResult.authorization.email,
    workspaceSlug: workspace.slug,
  });
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

  if (kind === "journal" || kind === "encounter") {
    const entryId = validateOptionalUuid(payload.entryId, "Journal entry");

    if ("response" in entryId) {
      return entryId.response;
    }

    const journalPayload = {
      bible_passage: asNullableText(payload.biblePassage, 500),
      entry_date: asDateString(payload.date),
      lord_highlight: asNullableText(payload.lordHighlight),
      minutes_spent: asMinutes(payload.minutesSpent),
      notes: asNullableText(payload.notes),
      prayer_response: asNullableText(payload.prayerResponse),
      tags: asJournalTags(payload.tags),
    };
    const result = entryId.id
      ? await supabase
        .from("dos_user_journal_entries")
        .update(journalPayload)
        .eq("id", entryId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_journal_entries")
        .insert({
          ...journalPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "prayer") {
    const prayerLogId = validateOptionalUuid(payload.prayerLogId, "Prayer log");

    if ("response" in prayerLogId) {
      return prayerLogId.response;
    }

    const fieldPersonId = asString(payload.fieldPersonId);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    const date = asDateString(payload.date);
    const answeredStatus = asPrayerStatus(payload.answeredStatus);
    const prayerPayload = {
      answered_at: answeredStatus === "answered" ? new Date().toISOString() : null,
      answered_status: answeredStatus,
      field_person_id: personValidation.person?.id ?? null,
      minutes_spent: asMinutes(payload.minutesSpent),
      notes: asNullableText(payload.notes),
      prayed_at: dateAtNoonUtc(date),
      prayer_focus: asNullableText(payload.prayerFocus, 500),
    };
    const result = prayerLogId.id
      ? await supabase
        .from("dos_user_prayer_logs")
        .update(prayerPayload)
        .eq("id", prayerLogId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_prayer_logs")
        .insert({
          ...prayerPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "mentor_relationship") {
    const relationshipId = validateOptionalUuid(payload.relationshipId, "Mentor relationship");

    if ("response" in relationshipId) {
      return relationshipId.response;
    }

    const fieldPersonId = asString(payload.fieldPersonId);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    const mentorName = asNullableText(payload.mentorName, 160) || personValidation.person?.name || "";
    const mentorEmail = asNullableText(payload.mentorEmail, 160);
    const mentorPhone = asNullableText(payload.mentorPhone, 80);
    const meetingRhythm = asNullableText(payload.meetingRhythm, 80);
    const relationshipLabel = asNullableText(payload.relationshipLabel, 160);
    const notes = asNullableText(payload.notes);

    if (!mentorName) {
      return NextResponse.json({ error: "Mentor name is required." }, { status: 400 });
    }

    if (relationshipId.id) {
      const { data, error } = await supabase
        .from("dos_user_mentor_relationships")
        .update({
          field_person_id: personValidation.person?.id ?? null,
          meeting_rhythm: meetingRhythm,
          mentor_email: mentorEmail,
          mentor_name: mentorName,
          mentor_phone: mentorPhone,
          notes,
          relationship_label: relationshipLabel,
        })
        .eq("id", relationshipId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ id: data.id });
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

    if (notes || relationshipLabel || mentorEmail || mentorPhone || meetingRhythm) {
      const { error } = await supabase
        .from("dos_user_mentor_relationships")
        .update({
          meeting_rhythm: meetingRhythm,
          mentor_email: mentorEmail,
          mentor_phone: mentorPhone,
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
    const mentorMeetingId = validateOptionalUuid(payload.mentorMeetingId, "Mentor meeting");

    if ("response" in mentorMeetingId) {
      return mentorMeetingId.response;
    }

    const fieldPersonId = asString(payload.fieldPersonId);
    const personValidation = await validateFieldPerson(supabase, workspaceId, fieldPersonId);

    if ("response" in personValidation) {
      return personValidation.response;
    }

    const selectedRelationshipId = asString(payload.relationshipId);
    const manualMentorName = asString(payload.mentorName);

    if (!selectedRelationshipId && !manualMentorName && !personValidation.person?.name) {
      return NextResponse.json({ error: "Mentor meeting requires a saved mentor or manual mentor name." }, { status: 400 });
    }

    const relationshipResult = await findOrCreateMentorRelationship({
      fieldPerson: personValidation.person,
      mentorName: manualMentorName,
      recordId,
      relationshipId: selectedRelationshipId,
      relationshipLabel: asNullableText(payload.relationshipLabel, 160),
      supabase,
      userId: authResult.authorization.userId,
      workspaceId,
    });

    if ("response" in relationshipResult) {
      return relationshipResult.response;
    }

    const relationship = relationshipResult.relationship;
    const mentorMeetingPayload = {
      action_steps: asNullableText(payload.actionSteps),
      counsel_received: asNullableText(payload.counselReceived),
      discussed: asNullableText(payload.discussed),
      duration_minutes: asMinutes(payload.minutesSpent),
      field_person_id: relationship.field_person_id ?? personValidation.person?.id ?? null,
      follow_up_date: asOptionalDateString(payload.followUpDate),
      meeting_date: asDateString(payload.date),
      mentor_name: relationship.mentor_name,
      notes: asNullableText(payload.notes),
      relationship_id: relationship.id,
    };
    const result = mentorMeetingId.id
      ? await supabase
        .from("dos_user_mentor_meetings")
        .update(mentorMeetingPayload)
        .eq("id", mentorMeetingId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_mentor_meetings")
        .insert({
          ...mentorMeetingPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return myRecordDatabaseErrorResponse(mentorMeetingId.id ? "mentor meeting update" : "mentor meeting insert", error, payload);
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "prophetic_word") {
    if (!myRecordV2Enabled) {
      return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
    }

    const propheticWordId = validateOptionalUuid(payload.propheticWordId, "Prophetic word");

    if ("response" in propheticWordId) {
      return propheticWordId.response;
    }

    const wordText = asNullableText(payload.wordText, 12000);

    if (!wordText) {
      return NextResponse.json({ error: "Prophetic word text is required." }, { status: 400 });
    }

    const propheticWordPayload = {
      confirmations: asNullableText(payload.confirmations, 4000),
      context: asNullableText(payload.context, 1000),
      date_received: asDateString(payload.dateReceived || payload.date),
      given_by: asNullableText(payload.givenBy, 240),
      notes: asNullableText(payload.notes, 4000),
      scripture_references: asStringList(payload.scriptureReferences, 20),
      status: asPropheticWordStatus(payload.status),
      tags: asStringList(payload.tags, 20),
      word_text: wordText,
    };
    const result = propheticWordId.id
      ? await supabase
        .from("dos_user_prophetic_words")
        .update(propheticWordPayload)
        .eq("id", propheticWordId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_prophetic_words")
        .insert({
          ...propheticWordPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "external_assessment_result") {
    if (!myRecordV2Enabled) {
      return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
    }

    const externalAssessmentResultId = validateOptionalUuid(payload.externalAssessmentResultId, "External assessment result");

    if ("response" in externalAssessmentResultId) {
      return externalAssessmentResultId.response;
    }

    const assessmentName = asNullableText(payload.assessmentName, 240);

    if (!assessmentName) {
      return NextResponse.json({ error: "Assessment name is required." }, { status: 400 });
    }

    const officialAssessmentUrl = asOptionalHttpUrl(payload.officialAssessmentUrl, "Official assessment link");

    if ("response" in officialAssessmentUrl) {
      return officialAssessmentUrl.response;
    }

    const attachmentUrl = asOptionalHttpUrl(payload.attachmentUrl, "Attachment link");

    if ("response" in attachmentUrl) {
      return attachmentUrl.response;
    }

    const attachment = asAssessmentAttachment(payload, workspaceId, authResult.authorization.userId);

    if ("response" in attachment) {
      return attachment.response;
    }

    const externalAssessmentPayload: Record<string, unknown> = {
      assessment_name: assessmentName,
      attachment_url: attachmentUrl.value,
      category: asNullableText(payload.category, 160),
      date_taken: asDateString(payload.dateTaken || payload.date),
      notes: asNullableText(payload.notes, 4000),
      official_assessment_url: officialAssessmentUrl.value,
      result_type: asNullableText(payload.resultType, 500),
      retake_reminder_date: asOptionalDateString(payload.retakeReminderDate),
      scores_details: asNullableText(payload.scoresDetails, 4000),
      share_eligible: asBoolean(payload.shareEligible),
      short_summary: asNullableText(payload.shortSummary, 1200),
      status: asExternalAssessmentStatus(payload.status),
      top_strengths: asStringList(payload.topStrengths, 20),
      visibility: "private",
    };

    if (!externalAssessmentResultId.id || attachment.attachmentPath) {
      externalAssessmentPayload.attachment_bucket = attachment.attachmentBucket;
      externalAssessmentPayload.attachment_content_type = attachment.attachmentContentType;
      externalAssessmentPayload.attachment_file_name = attachment.attachmentFileName;
      externalAssessmentPayload.attachment_path = attachment.attachmentPath;
      externalAssessmentPayload.attachment_uploaded_at = attachment.attachmentUploadedAt;
    }

    const result = externalAssessmentResultId.id
      ? await supabase
        .from("dos_user_external_assessment_results")
        .update(externalAssessmentPayload)
        .eq("id", externalAssessmentResultId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_external_assessment_results")
        .insert({
          ...externalAssessmentPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "learning_book") {
    if (!myRecordV2Enabled) {
      return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
    }

    const bookId = asString(payload.bookId);
    const title = asNullableText(payload.title, 240);

    if (bookId && !isUuid(bookId)) {
      return NextResponse.json({ error: "Selected book is invalid." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Book title is required." }, { status: 400 });
    }

    const bookPayload = {
      author: asNullableText(payload.author, 240),
      final_summary: asNullableText(payload.finalSummary, 5000),
      finished_on: asOptionalDateString(payload.finishedOn),
      personal_application: asNullableText(payload.personalApplication, 5000),
      share_eligible: asBoolean(payload.shareEligible),
      started_on: asOptionalDateString(payload.startedOn),
      status: asLearningStatus(payload.status),
      title,
      visibility: "private",
    };
    const result = bookId
      ? await supabase
        .from("dos_user_learning_books")
        .update(bookPayload)
        .eq("id", bookId)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_learning_books")
        .insert({
          ...bookPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "learning_chapter_note") {
    if (!myRecordV2Enabled) {
      return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
    }

    const chapterNoteId = validateOptionalUuid(payload.chapterNoteId, "Chapter note");

    if ("response" in chapterNoteId) {
      return chapterNoteId.response;
    }

    const bookId = asString(payload.bookId);
    const chapterLabel = asNullableText(payload.chapterLabel, 240);

    if (!isUuid(bookId)) {
      return NextResponse.json({ error: "Selected book is invalid." }, { status: 400 });
    }

    if (!chapterLabel) {
      return NextResponse.json({ error: "Chapter label is required." }, { status: 400 });
    }

    const { data: book, error: bookError } = await supabase
      .from("dos_user_learning_books")
      .select("id")
      .eq("id", bookId)
      .eq("record_id", recordId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", authResult.authorization.userId)
      .maybeSingle();

    if (bookError) {
      return NextResponse.json({ error: bookError.message }, { status: 500 });
    }

    if (!book) {
      return NextResponse.json({ error: "Learning book not found." }, { status: 404 });
    }

    const highlightImage = asLearningHighlightImage(payload, workspaceId, authResult.authorization.userId);

    if ("response" in highlightImage) {
      return highlightImage.response;
    }

    const chapterPayload: Record<string, unknown> = {
      book_id: bookId,
      chapter_label: chapterLabel,
      chapter_number: asOptionalInteger(payload.chapterNumber, 0, 9999),
      highlights: asNullableText(payload.highlights, 5000),
      notes: asNullableText(payload.notes, 5000),
      personal_application: asNullableText(payload.personalApplication, 5000),
    };

    if (!chapterNoteId.id || highlightImage.highlightImagePath) {
      chapterPayload.highlight_image_bucket = highlightImage.highlightImageBucket;
      chapterPayload.highlight_image_content_type = highlightImage.highlightImageContentType;
      chapterPayload.highlight_image_file_name = highlightImage.highlightImageFileName;
      chapterPayload.highlight_image_path = highlightImage.highlightImagePath;
      chapterPayload.highlight_image_uploaded_at = highlightImage.highlightImageUploadedAt;
    }

    const result = chapterNoteId.id
      ? await supabase
        .from("dos_user_learning_chapter_notes")
        .update(chapterPayload)
        .eq("id", chapterNoteId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_learning_chapter_notes")
        .insert({
          ...chapterPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  if (kind === "life_plan") {
    if (!myRecordV2Enabled) {
      return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
    }

    const lifePlanId = validateOptionalUuid(payload.lifePlanId, "Life Plan");

    if ("response" in lifePlanId) {
      return lifePlanId.response;
    }

    const attachment = asLifePlanAttachment(payload, workspaceId, authResult.authorization.userId);

    if ("response" in attachment) {
      return attachment.response;
    }

    const lifePlanPayload: Record<string, unknown> = {
      calling_statement: asNullableText(payload.callingStatement, 3000),
      daily_reminder: asNullableText(payload.dailyReminder, 1000),
      decision_filters: asStringList(payload.decisionFilters, 20),
      focus_allocation: asNullableText(payload.focusAllocation, 5000),
      last_reviewed_date: asOptionalDateString(payload.lastReviewedDate),
      legacy_church: asNullableText(payload.legacyChurch, 3000),
      legacy_discipled: asNullableText(payload.legacyDiscipled, 3000),
      legacy_family: asNullableText(payload.legacyFamily, 3000),
      legacy_jesus: asNullableText(payload.legacyJesus, 3000),
      legacy_remembered_for: asNullableText(payload.legacyRememberedFor, 3000),
      next_review_date: asOptionalDateString(payload.nextReviewDate),
      original_date_written: asOptionalDateString(payload.originalDateWritten),
      rarely_do: asNullableText(payload.rarelyDo, 5000),
      responsibilities: asNullableText(payload.responsibilities, 5000),
      review_history: asLifePlanReviewHistory(payload.reviewHistory),
      review_rhythm: asNullableText(payload.reviewRhythm, 1000),
      share_eligible: asBoolean(payload.shareEligible),
      top_priorities: asLifePlanTopPriorities(payload.topPriorities),
      visibility: "private",
    };

    if (!lifePlanId.id || attachment.attachmentPath) {
      lifePlanPayload.attachment_bucket = attachment.attachmentBucket;
      lifePlanPayload.attachment_content_type = attachment.attachmentContentType;
      lifePlanPayload.attachment_file_name = attachment.attachmentFileName;
      lifePlanPayload.attachment_path = attachment.attachmentPath;
      lifePlanPayload.attachment_uploaded_at = attachment.attachmentUploadedAt;
    }

    const result = lifePlanId.id
      ? await supabase
        .from("dos_user_life_plans")
        .update(lifePlanPayload)
        .eq("id", lifePlanId.id)
        .eq("record_id", recordId)
        .eq("workspace_id", workspaceId)
        .eq("user_id", authResult.authorization.userId)
        .select("id")
        .single()
      : await supabase
        .from("dos_user_life_plans")
        .upsert({
          ...lifePlanPayload,
          record_id: recordId,
          user_id: authResult.authorization.userId,
          workspace_id: workspaceId,
        }, { onConflict: "record_id" })
        .select("id")
        .single();
    const { data, error } = result;

    if (error) {
      return myRecordDatabaseErrorResponse(lifePlanId.id ? "Life Plan update" : "Life Plan upsert", error, payload);
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

  if (kind === "delete") {
    const targetId = validateOptionalUuid(payload.targetId, "My Record item");

    if ("response" in targetId) {
      return targetId.response;
    }

    if (!targetId.id) {
      return NextResponse.json({ error: "My Record item is required." }, { status: 400 });
    }

    const targetKind = asString(payload.targetKind);
    const deleteTargets = {
      assessment_result: { table: "dos_user_assessment_results", v2Only: false },
      external_assessment_result: { table: "dos_user_external_assessment_results", v2Only: true },
      encounter: { table: "dos_user_journal_entries", v2Only: false },
      journal: { table: "dos_user_journal_entries", v2Only: false },
      learning_book: { table: "dos_user_learning_books", v2Only: true },
      learning_chapter_note: { table: "dos_user_learning_chapter_notes", v2Only: true },
      life_plan: { table: "dos_user_life_plans", v2Only: true },
      mentor_meeting: { table: "dos_user_mentor_meetings", v2Only: false },
      mentor_relationship: { table: "dos_user_mentor_relationships", v2Only: false },
      prayer: { table: "dos_user_prayer_logs", v2Only: false },
      prophetic_word: { table: "dos_user_prophetic_words", v2Only: true },
    } as const;
    const target = deleteTargets[targetKind as keyof typeof deleteTargets];

    if (!target) {
      return NextResponse.json({ error: "Unsupported My Record delete target." }, { status: 400 });
    }

    if (target.v2Only && !myRecordV2Enabled) {
      return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from(target.table)
      .delete()
      .eq("id", targetId.id)
      .eq("record_id", recordId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", authResult.authorization.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "My Record item not found." }, { status: 404 });
    }

    return NextResponse.json({ id: data.id });
  }

  return NextResponse.json({ error: "Unsupported My Record action." }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    return await handleMyRecordPost(request);
  } catch (error) {
    console.error("[My Record API] Unexpected server error", {
      error,
      message: myRecordApiErrorMessage(error),
      url: request.url,
    });

    return NextResponse.json({
      error: `Unexpected server error: ${myRecordApiErrorMessage(error)}`,
    }, { status: 500 });
  }
}
