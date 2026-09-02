import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";

// The hero's own words, the same ones the page opens with.
const card = {
  eyebrow: "Serve with USA Missionaries",
  subtitle: "Tell us your story, your calling, and the ministry you believe God is asking you to begin.",
  title: "Welcome to the Team",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
