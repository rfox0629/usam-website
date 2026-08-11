import { NextResponse } from "next/server";
import {
  asNullableString,
  asString,
  authorizeDosCommitmentsWrite,
  firstDefined,
  isUuid,
  loadWorkspacePerson,
  readCommitmentsPayload,
  requireCommitmentsFeature,
  resolveAuthorizedCommitmentsWorkspace,
} from "@/src/lib/dos/commitments-accountability-api";
import { getDosResourceBySlug, type DosGuidedResourceSession, type DosResource } from "@/src/lib/dos/resource-catalog";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const progressSelect = "id, workspace_id, resource_slug, session_id, person_id, assignment_id, completed_at, reflection, action_step, prayer_focus, created_by_user_id, created_at, updated_at";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type SupabaseQueryError = { message?: string } | null | undefined;

function isMissingGuidedResourceProgressSchema(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("dos_guided_resource_progress")
    || message.includes("guided resource")
    || (message.includes("schema cache") && message.includes("session_id"));
}

function guidedResourceProgressSetupResponse() {
  return NextResponse.json({ error: "Guided resource progress is not ready yet." }, { status: 500 });
}

function guidedResourceProgressErrorResponse(error: SupabaseQueryError) {
  if (isMissingGuidedResourceProgressSchema(error)) {
    return guidedResourceProgressSetupResponse();
  }

  return NextResponse.json({ error: error?.message ?? "Unable to save guided resource progress." }, { status: 500 });
}

function isMissingIdentityLinkSchema(error: SupabaseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";

  return message.includes("dos_identity_links")
    || (message.includes("schema cache") && message.includes("verification_status"));
}

function normalizedEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function canWritePrivateGuidedProgress({
  personId,
  supabase,
  userEmail,
  userId,
  workspaceId,
}: {
  personId: string;
  supabase: SupabaseAdminClient;
  userEmail: string;
  userId: string;
  workspaceId: string;
}) {
  const identityResult = await supabase
    .from("dos_identity_links")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .eq("user_id", userId)
    .eq("verification_status", "verified")
    .limit(1)
    .maybeSingle();

  if (identityResult.error && !isMissingIdentityLinkSchema(identityResult.error)) {
    return { allowed: false, error: identityResult.error };
  }

  if (identityResult.data) {
    return { allowed: true, error: null };
  }

  const personResult = await supabase
    .from("missionary_field_people")
    .select("created_by, email")
    .eq("id", personId)
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (personResult.error) {
    return { allowed: false, error: personResult.error };
  }

  const person = personResult.data as { created_by?: string | null; email?: string | null } | null;
  const personEmail = normalizedEmail(person?.email);

  return {
    allowed: Boolean((personEmail && personEmail === userEmail) || (person?.created_by && person.created_by === userId)),
    error: null,
  };
}

function asLimitedText(value: unknown, maxLength: number) {
  const text = asNullableString(value);

  return text ? text.slice(0, maxLength) : null;
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function learningNotesForSession({
  actionStep,
  prayerFocus,
  reflection,
}: {
  actionStep: string | null;
  prayerFocus: string | null;
  reflection: string | null;
}) {
  return [
    reflection ? `Reflect Personally:\n${reflection}` : null,
    actionStep ? `Walk It Out:\n${actionStep}` : null,
    prayerFocus ? `Pray:\n${prayerFocus}` : null,
  ].filter(Boolean).join("\n\n").slice(0, 5000) || null;
}

function learningHighlightsForSession(session: DosGuidedResourceSession) {
  return [
    `Reading Assignment: ${session.assignment}`,
    session.bigIdea ? `Main Idea: ${session.bigIdea}` : null,
    session.chapterQuestion ? `Chapter Question: ${session.chapterQuestion}` : null,
    session.keyScriptures?.length ? `Search the Scriptures: ${session.keyScriptures.join(", ")}` : null,
    session.multiply ? `Multiply: ${session.multiply}` : null,
  ].filter(Boolean).join("\n\n").slice(0, 5000);
}

async function isGuidedResourceComplete({
  personId,
  resource,
  supabase,
  workspaceId,
}: {
  personId: string;
  resource: DosResource;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const sessions = resource.content?.guidedResource?.sessions ?? [];

  if (!sessions.length) {
    return false;
  }

  const { data, error } = await supabase
    .from("dos_guided_resource_progress")
    .select("session_id")
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .eq("resource_slug", resource.slug)
    .not("completed_at", "is", null);

  if (error) {
    return false;
  }

  const completedIds = new Set((data ?? []).map((item) => String(item.session_id)));

  return sessions.every((session) => completedIds.has(session.id));
}

async function syncGuidedResourceToMyRecordLearning({
  actionStep,
  isComplete,
  prayerFocus,
  reflection,
  resource,
  session,
  supabase,
  userEmail,
  userId,
  workspaceId,
}: {
  actionStep: string | null;
  isComplete: boolean;
  prayerFocus: string | null;
  reflection: string | null;
  resource: DosResource;
  session: DosGuidedResourceSession;
  supabase: SupabaseAdminClient;
  userEmail: string;
  userId: string;
  workspaceId: string;
}) {
  const notes = learningNotesForSession({ actionStep, prayerFocus, reflection });

  if (!notes && !isComplete) {
    return { saved: false };
  }

  const recordResult = await supabase
    .from("dos_user_records")
    .upsert({
      display_name: userEmail,
      user_id: userId,
      workspace_id: workspaceId,
    }, { onConflict: "workspace_id,user_id" })
    .select("id")
    .single();

  if (recordResult.error) {
    return { error: recordResult.error, saved: false };
  }

  const recordId = String(recordResult.data.id);
  const bookResult = await supabase
    .from("dos_user_learning_books")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("record_id", recordId)
    .eq("title", resource.title)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bookResult.error) {
    return { error: bookResult.error, saved: false };
  }

  const bookPayload = {
    author: resource.author ?? null,
    share_eligible: false,
    started_on: todayDateKey(),
    status: isComplete ? "finished" : "reading",
    title: resource.title,
    visibility: "private",
  };
  const savedBookResult = bookResult.data?.id
    ? await supabase
      .from("dos_user_learning_books")
      .update({
        author: bookPayload.author,
        status: bookPayload.status,
      })
      .eq("id", String(bookResult.data.id))
      .eq("record_id", recordId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .select("id")
      .single()
    : await supabase
      .from("dos_user_learning_books")
      .insert({
        ...bookPayload,
        record_id: recordId,
        user_id: userId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

  if (savedBookResult.error) {
    return { error: savedBookResult.error, saved: false };
  }

  const bookId = String(savedBookResult.data.id);
  const chapterLabel = `${session.order}. ${session.title}`;
  const existingNoteResult = await supabase
    .from("dos_user_learning_chapter_notes")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("record_id", recordId)
    .eq("book_id", bookId)
    .eq("chapter_label", chapterLabel)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingNoteResult.error) {
    return { error: existingNoteResult.error, saved: false };
  }

  const notePayload = {
    chapter_label: chapterLabel,
    chapter_number: session.order,
    highlights: learningHighlightsForSession(session),
    notes,
    personal_application: actionStep,
  };
  const savedNoteResult = existingNoteResult.data?.id
    ? await supabase
      .from("dos_user_learning_chapter_notes")
      .update(notePayload)
      .eq("id", String(existingNoteResult.data.id))
      .eq("record_id", recordId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .select("id")
      .single()
    : await supabase
      .from("dos_user_learning_chapter_notes")
      .insert({
        ...notePayload,
        book_id: bookId,
        record_id: recordId,
        user_id: userId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

  if (savedNoteResult.error) {
    return { error: savedNoteResult.error, saved: false };
  }

  return { bookId, noteId: savedNoteResult.data.id, saved: true };
}

function mapGuidedResourceProgressRow(row: Record<string, unknown>) {
  return {
    actionStep: row.action_step ? String(row.action_step) : null,
    assignmentId: row.assignment_id ? String(row.assignment_id) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    id: String(row.id),
    personId: String(row.person_id),
    prayerFocus: row.prayer_focus ? String(row.prayer_focus) : null,
    reflection: row.reflection ? String(row.reflection) : null,
    resourceSlug: String(row.resource_slug),
    sessionId: String(row.session_id),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    workspaceId: String(row.workspace_id),
  };
}

export async function POST(request: Request) {
  const authResult = await authorizeDosCommitmentsWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readCommitmentsPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceResult = await resolveAuthorizedCommitmentsWorkspace(
    authResult.authorization,
    firstDefined(payload.workspaceId, payload.workspace_id),
  );

  if ("response" in workspaceResult) {
    return workspaceResult.response;
  }

  const resourceSlug = asString(firstDefined(payload.resourceSlug, payload.resource_slug));
  const resource = getDosResourceBySlug(resourceSlug);
  const guidedResource = resource?.content?.guidedResource ?? null;

  // Reading plans (e.g. "14 Days Through the New Testament") use the same session-based
  // progress model as guided_resource journeys, and the in-app UI routes both types
  // through this endpoint - only guided_resource/reading_plan resources with sessions
  // are valid here.
  if (!resource || (resource.type !== "guided_resource" && resource.type !== "reading_plan") || !guidedResource) {
    return NextResponse.json({ error: "Choose a guided Library resource." }, { status: 400 });
  }

  const sessionId = asString(firstDefined(payload.sessionId, payload.session_id));
  const session = guidedResource.sessions.find((item) => item.id === sessionId) ?? null;

  if (!session) {
    return NextResponse.json({ error: "Choose a valid guided resource session." }, { status: 400 });
  }

  const personId = asString(firstDefined(payload.personId, payload.person_id));

  if (!isUuid(personId)) {
    return NextResponse.json({ error: "Person is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const feature = await requireCommitmentsFeature(supabase, workspaceResult.workspaceId);

  if ("response" in feature) {
    return feature.response;
  }

  let person: { id: string; name: string } | null = null;

  try {
    person = await loadWorkspacePerson({ personId, supabase, workspaceId: workspaceResult.workspaceId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load person." }, { status: 500 });
  }

  if (!person) {
    return NextResponse.json({ error: "Person not found in this workspace." }, { status: 404 });
  }

  const privateWriteAccess = await canWritePrivateGuidedProgress({
    personId: person.id,
    supabase,
    userEmail: authResult.authorization.email,
    userId: authResult.authorization.userId,
    workspaceId: workspaceResult.workspaceId,
  });

  if (privateWriteAccess.error) {
    return guidedResourceProgressErrorResponse(privateWriteAccess.error);
  }

  if (!privateWriteAccess.allowed) {
    return NextResponse.json({ error: `Only ${person.name}'s linked participant identity can save private journey progress.` }, { status: 403 });
  }

  const assignmentId = asString(firstDefined(payload.assignmentId, payload.assignment_id));
  let scopedAssignmentId: string | null = null;

  if (assignmentId) {
    if (!isUuid(assignmentId)) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const assignmentResult = await supabase
      .from("dos_resource_assignments")
      .select("id")
      .eq("id", assignmentId)
      .eq("workspace_id", workspaceResult.workspaceId)
      .eq("person_id", person.id)
      .eq("resource_slug", resource.slug)
      .maybeSingle();

    if (assignmentResult.error) {
      return guidedResourceProgressErrorResponse(assignmentResult.error);
    }

    if (!assignmentResult.data) {
      return NextResponse.json({ error: "Assignment not found in this workspace." }, { status: 404 });
    }

    scopedAssignmentId = assignmentId;
  }

  const completedProvided = typeof payload.completed === "boolean";
  const createdByUserId = authResult.authorization.status === "authorized" ? authResult.authorization.userId : null;
  const existingResult = await supabase
    .from("dos_guided_resource_progress")
    .select(progressSelect)
    .eq("workspace_id", workspaceResult.workspaceId)
    .eq("person_id", person.id)
    .eq("resource_slug", resource.slug)
    .eq("session_id", session.id)
    .maybeSingle();

  if (existingResult.error) {
    return guidedResourceProgressErrorResponse(existingResult.error);
  }

  const actionStep = asLimitedText(firstDefined(payload.actionStep, payload.action_step), 2000);
  const prayerFocus = asLimitedText(firstDefined(payload.prayerFocus, payload.prayer_focus), 2000);
  const reflection = asLimitedText(payload.reflection, 6000);
  const progressPatch: Record<string, unknown> = {
    action_step: actionStep,
    prayer_focus: prayerFocus,
    reflection,
  };

  if (scopedAssignmentId) {
    progressPatch.assignment_id = scopedAssignmentId;
  }

  if (completedProvided) {
    progressPatch.completed_at = payload.completed ? new Date().toISOString() : null;
  }

  const progressResult = existingResult.data
    ? await supabase
      .from("dos_guided_resource_progress")
      .update(progressPatch)
      .eq("id", String(existingResult.data.id))
      .eq("workspace_id", workspaceResult.workspaceId)
      .select(progressSelect)
      .single()
    : await supabase
      .from("dos_guided_resource_progress")
      .insert({
        ...progressPatch,
        assignment_id: scopedAssignmentId,
        completed_at: completedProvided ? progressPatch.completed_at : null,
        created_by_user_id: createdByUserId,
        person_id: person.id,
        resource_slug: resource.slug,
        session_id: session.id,
        workspace_id: workspaceResult.workspaceId,
      })
      .select(progressSelect)
      .single();

  if (progressResult.error) {
    return guidedResourceProgressErrorResponse(progressResult.error);
  }

  const resourceComplete = await isGuidedResourceComplete({
    personId: person.id,
    resource,
    supabase,
    workspaceId: workspaceResult.workspaceId,
  });
  const learningResult = await syncGuidedResourceToMyRecordLearning({
    actionStep,
    isComplete: resourceComplete,
    prayerFocus,
    reflection,
    resource,
    session,
    supabase,
    userEmail: authResult.authorization.email,
    userId: authResult.authorization.userId,
    workspaceId: workspaceResult.workspaceId,
  });

  if (learningResult.error) {
    return NextResponse.json({
      error: `Progress saved, but My Record Learning could not be updated: ${learningResult.error.message}`,
    }, { status: 500 });
  }

  return NextResponse.json({
    learningSaved: learningResult.saved,
    ok: true,
    progress: mapGuidedResourceProgressRow(progressResult.data as Record<string, unknown>),
  });
}
