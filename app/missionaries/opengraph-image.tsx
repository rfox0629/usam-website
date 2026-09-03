import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";


const card = {
  eyebrow: "Sent and Serving",
  subtitle: "Meet the USA Missionaries team serving across America.",
  title: "Missionary Team",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
