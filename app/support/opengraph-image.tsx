import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";


const card = {
  eyebrow: "Partner with the Field",
  subtitle: "Help fuel disciple making across American cities.",
  title: "Support the Mission",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
