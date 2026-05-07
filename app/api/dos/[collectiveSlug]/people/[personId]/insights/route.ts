import { NextResponse } from "next/server";
import { updateDosPersonInsights } from "@/src/lib/dos/people";

type UpdateInsightsPayload = {
  commitmentLevel?: unknown;
  notesPrivate?: unknown;
  relationshipDepth?: unknown;
};

function asNullableString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return typeof value === "string" ? Number(value) : Number.NaN;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ collectiveSlug: string; personId: string }> },
) {
  let body: UpdateInsightsPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { collectiveSlug, personId } = await context.params;
  const result = await updateDosPersonInsights(collectiveSlug, personId, {
    commitmentLevel: asNullableNumber(body.commitmentLevel),
    notesPrivate: asNullableString(body.notesPrivate),
    relationshipDepth: asNullableString(body.relationshipDepth),
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Collective not found." }, { status: 404 });
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, personId: result.data.personId });
}
