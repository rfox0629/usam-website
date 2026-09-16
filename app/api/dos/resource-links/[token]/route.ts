import { NextResponse } from "next/server";
import { saveDosResourceShareProgress, submitDosResourceShareAssessment } from "@/src/lib/dos/resource-share-links";
import { isValidDosResourceShareToken } from "@/src/lib/dos/resource-sharing";

/* USA-278: the recipient's own endpoint. No DOS account, no session -- the
   token is the whole of the access, and it reaches exactly one assignment.
   Nothing about the workspace, the contacts or any other assignment is
   readable or writable from here. */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!isValidDosResourceShareToken(token)) {
    return NextResponse.json({ error: "This link is not available." }, { status: 404 });
  }

  let payload: { intent?: unknown; responses?: unknown };

  try {
    payload = await request.json() as { intent?: unknown; responses?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const intent = typeof payload.intent === "string" ? payload.intent : "save";

  if (intent !== "save" && intent !== "submit") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const result = intent === "submit"
    ? await submitDosResourceShareAssessment(token, payload.responses)
    : await saveDosResourceShareProgress(token, payload.responses);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
