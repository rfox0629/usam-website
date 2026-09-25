import { NextResponse } from "next/server";
import { findLiveJoinDraft } from "@/src/lib/join/drafts";
import { requireJoinPreviewAccess } from "@/src/lib/join/request-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const applicationPhotoBucket = "usam-application-photos";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * USA-285: the applicant's own photo, so the Photos step can show what was
 * uploaded after a refresh or a resume link.
 *
 * The bucket stays private. The resume token travels in the body, not the URL,
 * so it is never written to a request log. It must belong to a draft that is
 * still in progress: a submitted or expired link gets nothing. Only a photo the
 * draft itself lists, at a path /join's upload route wrote, is ever read.
 */
export async function POST(request: Request) {
  if (!(await requireJoinPreviewAccess(request)) || !isSupabaseAdminConfigured()) {
    return new NextResponse(null, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as { kind?: unknown; resumeToken?: unknown } | null;
  const kind = payload?.kind === "profile" || payload?.kind === "family" ? payload.kind : null;
  const resumeToken = typeof payload?.resumeToken === "string" ? payload.resumeToken : "";

  if (!kind || !resumeToken) {
    return new NextResponse(null, { status: 404 });
  }

  const draft = await findLiveJoinDraft(resumeToken);
  const photo = draft?.draft.photos.find((candidate) => candidate.kind === kind);

  if (
    !photo
    || typeof photo.path !== "string"
    || !photo.path.startsWith("pending/")
    || photo.path.includes("..")
    || (photo.bucket && photo.bucket !== applicationPhotoBucket)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const download = await createSupabaseAdminClient().storage.from(applicationPhotoBucket).download(photo.path);
  const contentType = photo.contentType || download.data?.type || "";

  if (download.error || !download.data || !allowedImageTypes.has(contentType)) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(download.data, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
