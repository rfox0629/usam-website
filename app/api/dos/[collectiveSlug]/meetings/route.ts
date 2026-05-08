import { NextResponse } from "next/server";
import { createDosMeeting } from "@/src/lib/dos/meetings";

type CreateMeetingPayload = {
  discussionGuideKey?: unknown;
  followUpNeeded?: unknown;
  meetingAt?: unknown;
  meetingDate?: unknown;
  ministerProfileIds?: unknown;
  outcomeMarkers?: unknown;
  outcomeNotesPrivate?: unknown;
  peopleIds?: unknown;
  prayerRequested?: unknown;
  relationshipMovement?: unknown;
  spiritualOpennessMovement?: unknown;
  summaryPrivate?: unknown;
  type?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collectiveSlug: string }> },
) {
  let body: CreateMeetingPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { collectiveSlug } = await context.params;
  const result = await createDosMeeting(collectiveSlug, {
    discussionGuideKey: asString(body.discussionGuideKey),
    followUpNeeded: asBoolean(body.followUpNeeded),
    meetingAt: asString(body.meetingAt),
    meetingDate: asString(body.meetingDate),
    ministerProfileIds: asStringArray(body.ministerProfileIds),
    outcomeMarkers: asStringArray(body.outcomeMarkers),
    outcomeNotesPrivate: asString(body.outcomeNotesPrivate),
    peopleIds: asStringArray(body.peopleIds),
    prayerRequested: asBoolean(body.prayerRequested),
    relationshipMovement: asString(body.relationshipMovement),
    spiritualOpennessMovement: asString(body.spiritualOpennessMovement),
    summaryPrivate: asString(body.summaryPrivate),
    type: asString(body.type),
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Collective not found." }, { status: 404 });
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ meetingId: result.data.meetingId, ok: true });
}
