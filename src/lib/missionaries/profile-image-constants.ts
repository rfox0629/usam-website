export const MISSIONARY_IMAGES_BUCKET = "missionary-images";
export const MISSIONARY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const missionaryImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type MissionaryImageSlot = "directory" | "hero";

export function toMissionaryImageStorageSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
