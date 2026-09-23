import { NextResponse } from "next/server";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadOperationsApplicationPhoto } from "@/src/lib/operations/onboarding";

export const dynamic = "force-dynamic";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * A /join applicant photo, for an authorized Operations reviewer only.
 *
 * The file is streamed rather than redirected to a signed URL, so no link to
 * the private bucket ever reaches the browser, and the response is marked
 * private and uncacheable. A reviewer without the missionaries module, or a
 * record or photo that does not exist, gets the same 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const [{ id, kind }, authorization] = await Promise.all([params, getOperationsAuthorization()]);

  if (authorization.status !== "authorized" || !canAccessOperationsModule(authorization, "missionaries")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const photo = await loadOperationsApplicationPhoto({ authorization, id, kind });

  if (!photo || !allowedImageTypes.has(photo.contentType)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const safeName = photo.fileName.replace(/[^A-Za-z0-9._-]+/g, "_");

  return new NextResponse(photo.body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Type": photo.contentType,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
