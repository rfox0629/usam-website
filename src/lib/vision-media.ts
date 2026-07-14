import "server-only";
import { existsSync } from "fs";
import path from "path";

const CANDIDATE_EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;
const ASSET_DIR = path.join(process.cwd(), "public", "images", "vision");

/**
 * Looks for a real asset dropped in public/images/vision/<id>.<ext>.
 * Returns its public src if found, otherwise null so the caller can render
 * a placeholder. Lets Ryan add real photos/screenshots later without any
 * code changes.
 */
export function resolveVisionImage(id: string): string | null {
  for (const ext of CANDIDATE_EXTENSIONS) {
    const filePath = path.join(ASSET_DIR, `${id}.${ext}`);

    if (existsSync(filePath)) {
      return `/images/vision/${id}.${ext}`;
    }
  }

  return null;
}
