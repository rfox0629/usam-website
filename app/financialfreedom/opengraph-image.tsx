import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";


const card = {
  eyebrow: "For Missionaries",
  subtitle: "A voluntary path out of debt, so support raising is never driven by pressure.",
  title: "Financial Freedom",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
