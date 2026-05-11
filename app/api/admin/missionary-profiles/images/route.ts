import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  MISSIONARY_IMAGE_MAX_BYTES,
  MISSIONARY_IMAGES_BUCKET,
  missionaryImageMimeTypes,
  toMissionaryImageStorageSlug,
  type MissionaryImageSlot,
} from "@/src/lib/missionaries/profile-image-constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isMissionaryImageSlot(value: string): value is MissionaryImageSlot {
  return value === "directory" || value === "hero";
}

function getImageExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function validateMissionaryImageFile(file: File) {
  if (!missionaryImageMimeTypes.includes(file.type as typeof missionaryImageMimeTypes[number])) {
    return "Use a JPG, PNG, or WebP image.";
  }

  if (file.size > MISSIONARY_IMAGE_MAX_BYTES) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}

export async function POST(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!canEditAdminContent(authorization)) {
    return NextResponse.json({ error: "You do not have permission to upload profile photos." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const householdId = asString(formData.get("householdId"));
  const slotValue = asString(formData.get("slot"));
  const requestedSlug = toMissionaryImageStorageSlug(asString(formData.get("slug")));
  const file = formData.get("file");

  if (!householdId || !requestedSlug || !isMissionaryImageSlot(slotValue)) {
    return NextResponse.json({ error: "Household, slug, and image slot are required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  const validationError = validateMissionaryImageFile(file);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: household, error: householdError } = await supabase
      .from("missionary_households")
      .select("id, slug")
      .eq("id", householdId)
      .maybeSingle();

    if (householdError) {
      throw new Error(householdError.message);
    }

    if (!household) {
      throw new Error("Missionary household was not found.");
    }

    const slug = toMissionaryImageStorageSlug(household.slug ?? requestedSlug);

    if (!slug) {
      return NextResponse.json({ error: "A profile slug is required before uploading images." }, { status: 400 });
    }

    const imageColumn = slotValue === "directory" ? "profile_image_url" : "hero_image_url";
    const storagePath = `households/${slug}/${slotValue}-${Date.now()}.${getImageExtension(file)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(MISSIONARY_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(MISSIONARY_IMAGES_BUCKET)
      .getPublicUrl(storagePath);
    const { data: updatedHousehold, error: updateError } = await supabase
      .from("missionary_households")
      .update({
        [imageColumn]: data.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", householdId)
      .select("id, profile_image_url, hero_image_url")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updatedHousehold) {
      throw new Error("Missionary household was not found.");
    }

    return NextResponse.json({
      imageColumn,
      path: storagePath,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to upload profile photo.",
    }, { status: 500 });
  }
}
