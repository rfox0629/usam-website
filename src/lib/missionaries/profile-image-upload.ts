"use client";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

export const MISSIONARY_IMAGES_BUCKET = "missionary-images";
export const MISSIONARY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const missionaryImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type MissionaryImageSlot = "directory" | "hero";

type UploadMissionaryProfileImageArgs = {
  file: File;
  householdId: string;
  slot: MissionaryImageSlot;
  slug: string;
};

export function validateMissionaryImageFile(file: File) {
  if (!missionaryImageMimeTypes.includes(file.type as typeof missionaryImageMimeTypes[number])) {
    return "Use a JPG, PNG, or WebP image.";
  }

  if (file.size > MISSIONARY_IMAGE_MAX_BYTES) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}

function toStorageSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export function getMissionaryImagePath(slug: string, slot: MissionaryImageSlot, file: File) {
  const storageSlug = toStorageSlug(slug);

  if (!storageSlug) {
    throw new Error("A profile slug is required before uploading images.");
  }

  return `households/${storageSlug}/${slot}-${Date.now()}.${getImageExtension(file)}`;
}

export async function uploadMissionaryProfileImage({
  file,
  householdId,
  slot,
  slug,
}: UploadMissionaryProfileImageArgs) {
  const validationError = validateMissionaryImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createSupabaseBrowserClient();
  const path = getMissionaryImagePath(slug, slot, file);
  const { error: uploadError } = await supabase.storage
    .from(MISSIONARY_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from(MISSIONARY_IMAGES_BUCKET)
    .getPublicUrl(path);
  const imageColumn = slot === "directory" ? "profile_image_url" : "hero_image_url";
  const { error: updateError } = await supabase
    .from("missionary_households")
    .update({
      [imageColumn]: data.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", householdId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    imageColumn,
    path,
    publicUrl: data.publicUrl,
  };
}
