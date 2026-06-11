import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

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

export async function POST(request: Request) {
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

  const extension = extensionByMimeType[file.type] ?? "jpg";
  const originalName = safeFileName(file.name);
  const path = `pending/${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(applicationPhotoBucket)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.warn(`Join photo upload failed: ${uploadError.message}`);

    return NextResponse.json({ error: "Unable to upload that photo right now. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    photo: {
      bucket: applicationPhotoBucket,
      contentType: file.type,
      fileName: originalName,
      kind,
      path,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    },
  });
}
