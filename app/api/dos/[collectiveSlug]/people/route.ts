import { NextResponse } from "next/server";
import { createDosPerson } from "@/src/lib/dos/people";

type CreatePersonPayload = {
  email?: unknown;
  engagementLevel?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  notesPrivate?: unknown;
  phone?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collectiveSlug: string }> },
) {
  let body: CreatePersonPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { collectiveSlug } = await context.params;
  const result = await createDosPerson(collectiveSlug, {
    email: asString(body.email),
    engagementLevel: asString(body.engagementLevel),
    firstName: asString(body.firstName),
    lastName: asString(body.lastName),
    notesPrivate: asString(body.notesPrivate),
    phone: asString(body.phone),
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Collective not found." }, { status: 404 });
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, personId: result.data.personId });
}
