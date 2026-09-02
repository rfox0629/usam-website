import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { requireJoinPreviewAccess } from "@/src/lib/join/request-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const applicationPhotoBucket = "usam-application-photos";
const maxPhotoSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^\w.\- ()]/g, "")
    .slice(0, 120) || "photo";
}

function photoKind(value: FormDataEntryValue | null) {
  return value === "family" ? "family" : value === "profile" ? "profile" : "";
}

/**
 * USA-167: verifies the bytes are actually the image type they claim to be.
 *
 * file.type is supplied by the browser, so on its own it proves nothing: a
 * script renamed to .jpg with a forged Content-Type passes a MIME check and
 * lands in the bucket. Reading the magic bytes is what makes the type real.
 */
function sniffImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8
    && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(request: Request) {
  // Same gate as the page and the draft API. An open upload endpoint behind a
  // protected page would let anyone write into the application photo bucket.
  if (!(await requireJoinPreviewAccess(request))) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Photo storage is not configured yet." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Invalid photo upload." }, { status: 400 });
  }

  const kind = photoKind(formData.get("kind"));
  const file = formData.get("file");

  if (!kind) {
    return NextResponse.json({ error: "Choose which photo you are uploading." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > maxPhotoSize) {
    return NextResponse.json({ error: "Use an image smaller than 5 MB." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(applicationPhotoBucket);

  if (bucketError || !bucket) {
    return NextResponse.json({
      error: "Private photo storage is not configured yet. Please contact USA Missionaries before submitting photos.",
      storageConfigured: false,
    }, { status: 503 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffedType = sniffImageType(buffer);

  if (!sniffedType || sniffedType !== file.type) {
    return NextResponse.json({ error: "That file is not a valid JPG, PNG, or WebP image." }, { status: 400 });
  }

  const extension = extensionByMimeType[sniffedType] ?? "jpg";
  const originalName = safeFileName(file.name);
  const path = `pending/${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(applicationPhotoBucket)
    .upload(path, buffer, {
      contentType: sniffedType,
      upsert: false,
    });

  if (uploadError) {
    console.warn(`Join photo upload failed: ${uploadError.message}`);

    return NextResponse.json({ error: "Unable to upload that photo right now. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    photo: {
      bucket: applicationPhotoBucket,
      contentType: sniffedType,
      fileName: originalName,
      kind,
      path,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    },
  });
}
