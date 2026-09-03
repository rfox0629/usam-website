import {
  createShareImage,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";

/* A feedback link is usually texted to one person, so its unfurl should say
   what it is and nothing else. The generic DOS card that used to appear here
   led with the product pitch, which tells the recipient nothing about why they
   were sent a link. This card carries the DOS emblem and one line. */
const card = {
  brand: "discipleship-operating-system" as const,
  eyebrow: null,
  subtitle: "A quick review of your conversation.",
  title: "Share your feedback",
};

/* Written out rather than built by shareImageAlt, which joins with an em dash. */
export const alt = "Share your feedback. Discipleship Operating System.";
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
