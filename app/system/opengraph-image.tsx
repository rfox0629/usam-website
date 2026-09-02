import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";


const card = {
  eyebrow: "How the Mission Works",
  subtitle: "Training, equipping, and sending ordinary Christians to obey Jesus and make disciples.",
  title: "The System",
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
