import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/src/lib/share/share-image";
import { assignmentArticle } from "../assignments";

// The article's own title and excerpt, so the card and the page say one thing.
const card = {
  eyebrow: "Assignments Completed",
  subtitle: assignmentArticle.excerpt,
  title: assignmentArticle.title,
};

export const alt = shareImageAlt(card);
export const contentType = shareImageContentType;
export const runtime = "nodejs";
export const size = shareImageSize;

export default createShareImage(card);
