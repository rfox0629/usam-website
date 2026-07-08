import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { isMissingWorkspaceScopeColumn, resolveDosAppWorkspaceId } from "@/src/lib/dos/missionary-app";
import { asString, isUuid } from "@/src/lib/dos/review-requests";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type AssessmentResultPayload = {
  answers?: unknown;
  assessmentTitle?: unknown;
  assessmentType?: unknown;
  categoryScores?: unknown;
  completedAt?: unknown;
  maxScore?: unknown;
  overallScore?: unknown;
  percentage?: unknown;
  personId?: unknown;
  resultId?: unknown;
  secondaryPersonId?: unknown;
  source?: unknown;
  workspaceId?: unknown;
};

type SupabaseError = { message?: string } | null | undefined;

function asInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function asJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isMissingAssessmentTable(error: SupabaseError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("dos_assessment_results")
    && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

function normalizedAssessmentType(value: unknown) {
  const text = asString(value).toLowerCase();

  return /^[a-z0-9][a-z0-9_-]{1,80}$/.test(text) ? text : "";
}

function normalizedSource(value: unknown) {
  const text = asString(value);

  return text === "sent_link" || text === "missionary" ? text : "self";
}

function normalizedCompletedAt(value: unknown) {
  const text = asString(value);
  const date = text ? new Date(text) : new Date();

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizedCategoryScores(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 40).map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }

    const record = item as Record<string, unknown>;
    const name = asString(record.name);
    const score = asInteger(record.score);
    const maxScore = asInteger(record.maxScore);
    const percentage = asInteger(record.percentage);

    if (!name || score === null || maxScore === null || percentage === null) {
      return null;
    }

    return {
      husbandScore: asInteger(record.husbandScore),
      maxScore,
      name,
      percentage,
      score,
      wifeScore: asInteger(record.wifeScore),
    };
  }).filter(Boolean);
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
    return { response: NextResponse.json({ error: "DOS field app write access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function personBelongsToWorkspace(personId: string, workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const scopedResult = await supabase
    .from("missionary_field_people")
    .select("id")
    .eq("id", personId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();
  const result = scopedResult.error && isMissingWorkspaceScopeColumn(scopedResult.error)
    ? await supabase
      .from("missionary_field_people")
      .select("id")
      .eq("id", personId)
      .eq("household_id", workspaceId)
      .maybeSingle()
    : scopedResult;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Boolean(result.data?.id);
}

async function existingResultBelongsToPerson(resultId: string, workspaceId: string, personId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dos_assessment_results")
    .select("id")
    .eq("id", resultId)
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .maybeSingle();

  if (error) {
    if (isMissingAssessmentTable(error)) {
      return { error: "Assessment persistence is not installed yet.", status: 503 };
    }

    throw new Error(error.message);
  }

  return data?.id ? { ok: true } : { error: "Assessment result not found.", status: 404 };
}

export async function POST(request: Request) {
  const authResult = await authorizeWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: AssessmentResultPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = await resolveDosAppWorkspaceId(asString(payload.workspaceId));
  const personId = asString(payload.personId);
  const secondaryPersonId = asString(payload.secondaryPersonId);
  const resultId = asString(payload.resultId);
  const assessmentType = normalizedAssessmentType(payload.assessmentType);
  const assessmentTitle = asString(payload.assessmentTitle);
  const overallScore = asInteger(payload.overallScore);
  const maxScore = asInteger(payload.maxScore);
  const scorePercentage = asInteger(payload.percentage);

  if (!workspaceId) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authResult.authorization, workspaceId);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  if (!isUuid(personId)) {
    return NextResponse.json({ error: "A valid person is required to save an assessment." }, { status: 400 });
  }

  if (secondaryPersonId && !isUuid(secondaryPersonId)) {
    return NextResponse.json({ error: "Secondary person is invalid." }, { status: 400 });
  }

  if (!assessmentType || !assessmentTitle || overallScore === null || maxScore === null || scorePercentage === null) {
    return NextResponse.json({ error: "Assessment score is incomplete." }, { status: 400 });
  }

  if (maxScore <= 0 || overallScore < 0 || overallScore > maxScore || scorePercentage < 0 || scorePercentage > 100) {
    return NextResponse.json({ error: "Assessment score is outside the expected range." }, { status: 400 });
  }

  try {
    const [personAllowed, secondaryPersonAllowed] = await Promise.all([
      personBelongsToWorkspace(personId, workspaceId),
      secondaryPersonId ? personBelongsToWorkspace(secondaryPersonId, workspaceId) : Promise.resolve(true),
    ]);

    if (!personAllowed || !secondaryPersonAllowed) {
      return NextResponse.json({ error: "Assessment person is not in this workspace." }, { status: 403 });
    }

    if (resultId) {
      if (!isUuid(resultId)) {
        return NextResponse.json({ error: "Assessment result is invalid." }, { status: 400 });
      }

      const existingResult = await existingResultBelongsToPerson(resultId, workspaceId, personId);

      if (!("ok" in existingResult)) {
        return NextResponse.json({ error: existingResult.error }, { status: existingResult.status });
      }
    }

    const record = {
      answers: asJsonObject(payload.answers),
      assessment_title: assessmentTitle,
      assessment_type: assessmentType,
      category_scores: normalizedCategoryScores(payload.categoryScores),
      completed_at: normalizedCompletedAt(payload.completedAt),
      completed_by_email: null,
      completed_by_name: null,
      created_by_user_id: authResult.authorization.userId,
      max_score: maxScore,
      overall_score: overallScore,
      percentage: scorePercentage,
      person_id: personId,
      secondary_person_id: secondaryPersonId || null,
      source: normalizedSource(payload.source),
      workspace_id: workspaceId,
    };
    const supabase = createSupabaseAdminClient();
    const mutation = resultId
      ? supabase
        .from("dos_assessment_results")
        .update(record)
        .eq("id", resultId)
        .eq("workspace_id", workspaceId)
        .eq("person_id", personId)
        .select("id")
        .single()
      : supabase
        .from("dos_assessment_results")
        .insert(record)
        .select("id")
        .single();
    const { data, error } = await mutation;

    if (error) {
      if (isMissingAssessmentTable(error)) {
        return NextResponse.json({ error: "Assessment persistence is not installed yet." }, { status: 503 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, ok: true, saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save assessment." }, { status: 500 });
  }
}
