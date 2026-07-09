import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireDosWorkspaceRouteAccess } from "@/src/lib/dos/api-auth";
import { canWriteDosActivity, getDosAuthorization } from "@/src/lib/dos/auth";
import { isDosMyRecordV2Enabled, resolveDosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const lifePlanBucket = "dos-my-record-life-plans";
const maxPdfSize = 10 * 1024 * 1024;

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^\w.\- ()]/g, "")
    .slice(0, 140) || "life-plan";
}

export async function POST(request: Request) {
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canWriteDosActivity(authorization)) {
    return NextResponse.json({ error: "DOS write access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const workspace = await resolveDosAppWorkspace(asString(formData.get("workspaceId")) || asString(formData.get("workspace_id")));

  if (!workspace) {
    return NextResponse.json({ error: "Missionary workspace not found." }, { status: 404 });
  }

  const workspaceAccess = await requireDosWorkspaceRouteAccess(authorization, workspace.id);

  if ("response" in workspaceAccess) {
    return workspaceAccess.response;
  }

  if (!isDosMyRecordV2Enabled({ userEmail: authorization.email, workspaceSlug: workspace.slug })) {
    return NextResponse.json({ error: "My Record V2 is not enabled for this workspace." }, { status: 403 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a Life Plan PDF to upload." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Use a PDF for Life Plan uploads." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > maxPdfSize) {
    return NextResponse.json({ error: "Use a Life Plan PDF smaller than 10 MB." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(lifePlanBucket);

  if (bucketError || !bucket) {
    return NextResponse.json({
      error: "Private Life Plan storage is not configured yet.",
      storageConfigured: false,
    }, { status: 503 });
  }

  const fileName = safeFileName(file.name);
  const uploadedAt = new Date().toISOString();
  const storagePath = `workspaces/${workspace.id}/users/${authorization.userId}/life-plan/${randomUUID()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(lifePlanBucket)
    .upload(storagePath, buffer, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({
    attachment: {
      bucket: lifePlanBucket,
      contentType: file.type,
      fileName,
      path: storagePath,
      size: file.size,
      uploadedAt,
    },
  });
}
