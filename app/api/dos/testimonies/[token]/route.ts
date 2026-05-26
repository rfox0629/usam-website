import { NextResponse } from "next/server";
import { normalizeTestimonySubmission, submitDosTestimony } from "@/src/lib/dos/testimonies";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const submission = normalizeTestimonySubmission(payload);

  if (!submission) {
    return NextResponse.json({ error: "Story is required." }, { status: 400 });
  }

  const result = await submitDosTestimony(token, submission);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, ok: true });
}
