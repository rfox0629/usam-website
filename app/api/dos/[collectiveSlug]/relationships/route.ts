import { NextResponse } from "next/server";
import { createDosRelationship, type DosPersonKind } from "@/src/lib/dos/people";

type CreateRelationshipPayload = {
  discipleId?: unknown;
  discipleKind?: unknown;
  disciplerProfileId?: unknown;
  status?: unknown;
  strength?: unknown;
  style?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPersonKind(value: unknown): DosPersonKind | null {
  return value === "person" || value === "profile" ? value : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collectiveSlug: string }> },
) {
  let body: CreateRelationshipPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const discipleKind = asPersonKind(body.discipleKind);

  if (!discipleKind) {
    return NextResponse.json({ error: "Choose a valid person." }, { status: 400 });
  }

  const { collectiveSlug } = await context.params;
  const result = await createDosRelationship(collectiveSlug, {
    discipleId: asString(body.discipleId),
    discipleKind,
    disciplerProfileId: asString(body.disciplerProfileId),
    status: asString(body.status),
    strength: asString(body.strength),
    style: asString(body.style),
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Collective not found." }, { status: 404 });
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, relationshipId: result.data.relationshipId });
}
