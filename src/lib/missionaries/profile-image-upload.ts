"use client";

import {
  MISSIONARY_IMAGE_MAX_BYTES,
  MISSIONARY_IMAGES_BUCKET,
  missionaryImageMimeTypes,
  type MissionaryImageSlot,
} from "./profile-image-constants";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

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

  const formData = new FormData();
  formData.set("file", file);
  formData.set("householdId", householdId);
  formData.set("slot", slot);
  formData.set("slug", slug);

  const response = await fetch("/api/admin/missionary-profiles/images", {
    body: formData,
    method: "POST",
  });
  const result = await response.json().catch(() => ({})) as {
    error?: string;
    imageColumn?: "profile_image_url" | "hero_image_url";
    path?: string;
    publicUrl?: string;
  };

  if (!response.ok || !result.publicUrl || !result.imageColumn || !result.path) {
    throw new Error(result.error || "Unable to upload profile photo.");
  }

  return {
    imageColumn: result.imageColumn,
    path: result.path,
    publicUrl: result.publicUrl,
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
