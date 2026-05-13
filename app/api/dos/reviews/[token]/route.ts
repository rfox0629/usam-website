import { NextResponse } from "next/server";
import { normalizeQuickReviewSubmission, submitDosQuickReview } from "@/src/lib/dos/reviews";

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

  const submission = normalizeQuickReviewSubmission(payload);

  if (!submission) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  const result = await submitDosQuickReview(token, submission);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, ok: true });
}
