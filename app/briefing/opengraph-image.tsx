import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";


const card = {
  eyebrow: "Field Report",
  subtitle: "Where the mission stands, and what is being asked of us next.",
  title: "Briefing",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
