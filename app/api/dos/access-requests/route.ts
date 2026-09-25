import { NextResponse } from "next/server";
import { isValidSubmissionKey } from "@/src/lib/dos/access-request-model";
import { createDosAccessRequest } from "@/src/lib/dos/access-requests";

/**
 * USA-289: public endpoint behind /dos/setup.
 *
 * Anonymous by design: a visitor does not need a DOS account to request one.
 * It records the request and nothing else. It never creates an account,
 * workspace, or membership; approval in Operations does that.
 */

const maxBodyBytes = 32 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "This request is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;

  try {
    const text = await request.text();

    if (text.length > maxBodyBytes) {
      return NextResponse.json({ error: "This request is too large." }, { status: 413 });
    }

    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, referenceCode: null, status: "submitted" });
  }

  if (!isValidSubmissionKey(body.submissionKey)) {
    return NextResponse.json({ error: "Refresh the page and try again." }, { status: 400 });
  }

  const result = await createDosAccessRequest({
    input: body.answers,
    referrer: request.headers.get("referer"),
    sourcePage: typeof body.sourcePage === "string" ? body.sourcePage : null,
    submissionKey: body.submissionKey,
    userAgent: request.headers.get("user-agent"),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.httpStatus });
  }

  if (result.outcome === "open_request_exists") {
    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      referenceCode: null,
      status: result.status,
    });
  }

  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    referenceCode: result.referenceCode,
    requestType: result.requestType,
    status: result.status,
    submittedAt: result.submittedAt,
  }, { status: result.outcome === "created" ? 201 : 200 });
}
