/**
 * Turns the stored layout into sections the renderers can draw.
 *
 * No imports beyond a type, so scripts and regression tests can exercise it
 * directly without the app's path aliases.
 */
import type { CommunicationNewsletterSection } from "./types";

const SECTION_TYPES = new Set([
  "header", "letter", "story", "invitation", "pillar", "feature", "closing",
]);
const SECTION_BRANDS = new Set(["usam", "ktg", "dos"]);
const STORY_PERMISSIONS = new Set(["anonymous", "with_name"]);

function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes the stored layout into sections the renderers can draw.
 *
 * Tolerant by design, because the column predates the richer shape: a legacy
 * `{ heading, body }` entry is still valid and becomes a plain `feature` in the
 * USAM identity, at its array position, visible. Two things stay strict — an
 * image is dropped unless it has both a URL and real alt text, and a story is
 * dropped unless its sharing permission is one of the two values that permit
 * publication and its attribution matches that permission's scope.
 */
export function normalizeNewsletterSections(value: unknown): CommunicationNewsletterSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): CommunicationNewsletterSection | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const section = item as Record<string, unknown>;
      const heading = trimmed(section.heading);
      const body = trimmed(section.body);
      const type = SECTION_TYPES.has(String(section.type))
        ? String(section.type) as CommunicationNewsletterSection["type"]
        : "feature";

      // A section has to say something. A story is the exception: it is a
      // container whose copy may legitimately be withheld.
      if (!heading && !body && type !== "story") {
        return null;
      }

      const image = section.image && typeof section.image === "object"
        ? section.image as Record<string, unknown>
        : null;
      const imageUrl = trimmed(image?.url);
      const imageAlt = trimmed(image?.alt);
      const imageCaption = trimmed(image?.caption);

      const cta = section.cta && typeof section.cta === "object"
        ? section.cta as Record<string, unknown>
        : null;
      const ctaLabel = trimmed(cta?.label);
      const ctaUrl = trimmed(cta?.url);

      const story = section.story && typeof section.story === "object"
        ? section.story as Record<string, unknown>
        : null;
      const storyText = trimmed(story?.text);
      const storyPermission = String(story?.permission ?? "");
      const storyAttribution = trimmed(story?.attribution) || null;
      const storyPullQuote = trimmed(story?.pullQuote);
      const storySource = story?.source && typeof story.source === "object"
        ? story.source as Record<string, unknown>
        : null;
      const sourceFormId = trimmed(storySource?.formId);
      const sourceSubmissionId = trimmed(storySource?.submissionId);
      const sourceVerifiedAt = trimmed(storySource?.verifiedAt);
      const sourceVerifiedBy = trimmed(storySource?.verifiedBy);
      // Anonymous carries no attribution; a named permission requires one.
      // Anything else is a contradiction, and the story is dropped rather than
      // reconciled.
      // Every clause has to hold: real text, a permission that allows
      // publication, an attribution matching that permission's scope, and a
      // recorded source for the verification. Anything short of that and the
      // story is dropped.
      const storyUsable = Boolean(storyText)
        && STORY_PERMISSIONS.has(storyPermission)
        && (storyPermission === "anonymous" ? !storyAttribution : Boolean(storyAttribution))
        && Boolean(sourceFormId && sourceSubmissionId && sourceVerifiedAt && sourceVerifiedBy);

      const position = Number.isFinite(Number(section.position)) ? Number(section.position) : index;

      return {
        body,
        brand: SECTION_BRANDS.has(String(section.brand))
          ? String(section.brand) as CommunicationNewsletterSection["brand"]
          : "usam",
        heading,
        hidden: section.hidden === true,
        key: trimmed(section.key) || `section-${index}`,
        position,
        type,
        ...(imageUrl && imageAlt
          ? { image: { alt: imageAlt, ...(imageCaption ? { caption: imageCaption } : {}), url: imageUrl } }
          : {}),
        ...(ctaLabel && ctaUrl ? { cta: { label: ctaLabel, url: ctaUrl } } : {}),
        ...(trimmed(section.eyebrow) ? { eyebrow: trimmed(section.eyebrow) } : {}),
        ...(trimmed(section.index) ? { index: trimmed(section.index) } : {}),
        ...(trimmed(section.tagline) ? { tagline: trimmed(section.tagline) } : {}),
        ...(storyUsable
          ? {
            story: {
              attribution: storyAttribution,
              permission: storyPermission as "anonymous" | "with_name",
              ...(storyPullQuote ? { pullQuote: storyPullQuote } : {}),
              source: {
                formId: sourceFormId,
                submissionId: sourceSubmissionId,
                verifiedAt: sourceVerifiedAt,
                verifiedBy: sourceVerifiedBy,
              },
              text: storyText,
            },
          }
          : {}),
      };
    })
    .filter((item): item is CommunicationNewsletterSection => Boolean(item));
}
