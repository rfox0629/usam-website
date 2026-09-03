import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";

// Inherited by /prayer/join and /prayer/apply, which are the same invitation.
const card = {
  eyebrow: "Stand with the Mission",
  subtitle: "Join the prayer team and carry the field in prayer.",
  title: "Prayer",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
