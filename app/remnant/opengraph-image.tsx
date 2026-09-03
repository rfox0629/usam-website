import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";
import { remnantCollection } from "@/src/lib/remnant/content";

// Copy comes from the collection itself, so the card cannot drift from the page.
const card = {
  eyebrow: "Curated Teaching",
  subtitle: remnantCollection.tagline,
  title: remnantCollection.title,
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
