"use client";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import {
  MISSIONARY_IMAGE_MAX_BYTES,
  MISSIONARY_IMAGES_BUCKET,
  missionaryImageMimeTypes,
  toMissionaryImageStorageSlug,
  type MissionaryImageSlot,
} from "./profile-image-constants";

export {
  MISSIONARY_IMAGE_MAX_BYTES,
  MISSIONARY_IMAGES_BUCKET,
  missionaryImageMimeTypes,
  type MissionaryImageSlot,
};

type UploadMissionaryProfileImageArgs = {
  file: File;
  householdId: string;
  slot: MissionaryImageSlot;
  slug: string;
};

type SaveGeneratedMissionaryHeroImageArgs = {
  householdId: string;
  publicUrl: string;
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
  const storageSlug = toMissionaryImageStorageSlug(slug);

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

export async function saveGeneratedMissionaryHeroImage({
  householdId,
  publicUrl,
}: SaveGeneratedMissionaryHeroImageArgs) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("missionary_households")
    .update({
      hero_image_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", householdId);

  if (error) {
    throw new Error(error.message);
  }
}
