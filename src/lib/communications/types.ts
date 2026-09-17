/**
 * Section types the ecosystem renderer knows how to draw. A record carries its
 * whole layout as data, so Operations can edit, reorder, and hide sections
 * without a deploy.
 */
export const newsletterSectionTypes = [
  "header",
  "letter",
  "story",
  "invitation",
  "pillar",
  "feature",
  "closing",
] as const;

export type CommunicationNewsletterSectionType = typeof newsletterSectionTypes[number];

/** Which identity a section is drawn in: ground, accent, and CTA colour. */
export const newsletterSectionBrands = ["usam", "ktg", "dos"] as const;

export type CommunicationNewsletterBrand = typeof newsletterSectionBrands[number];

/**
 * A participant's account, carried only with a permission that was verified
 * against the original submission.
 *
 * `permission` mirrors the wording of the Kitchen Table Reflection form
 * exactly. There is deliberately no "private" member and no default: a story
 * with no verified permission cannot be represented here at all, so it cannot
 * be rendered by forgetting a check.
 */
export const newsletterStoryPermissions = ["anonymous", "with_name"] as const;

export type NewsletterStoryPermission = typeof newsletterStoryPermissions[number];

export type CommunicationNewsletterStory = {
  /** Shown only under `with_name`. Must be null under `anonymous`. */
  attribution: string | null;
  permission: NewsletterStoryPermission;
  /** A short quotation, approved verbatim. Optional. */
  pullQuote?: string;
  /**
   * Where the permission was read from, so the decision stays auditable and so
   * a story cannot be marked permitted without someone naming what they read.
   * Required: a story missing it is dropped by the normalizer.
   */
  source: { formId: string; submissionId: string; verifiedAt: string; verifiedBy: string };
  text: string;
};

export type CommunicationNewsletterSection = {
  body: string;
  brand: CommunicationNewsletterBrand;
  cta?: { label: string; url: string };
  /** Small tracked label above the heading. */
  eyebrow?: string;
  heading: string;
  hidden: boolean;
  /** Optional photograph. Dropped unless it has both a URL and alt text. */
  image?: { alt: string; caption?: string; url: string };
  /** Numbering for `pillar` sections: "01", "02", "03". */
  index?: string;
  /** Stable identifier, so reordering and editing address the same section. */
  key: string;
  position: number;
  /** A participant's account. Only ever present on a `story` section. */
  story?: CommunicationNewsletterStory;
  /** A single emphasised line under the body: a tagline, teaser, or signoff. */
  tagline?: string;
  type: CommunicationNewsletterSectionType;
};

export type CommunicationNewsletter = {
  body_markdown: string;
  cta_label: string | null;
  cta_url: string | null;
  id: string;
  /** CAN-SPAM physical address. Null renders nothing and blocks sending. */
  postal_address: string | null;
  preheader: string | null;
  published_at: string | null;
  sections: CommunicationNewsletterSection[];
  slug: string;
  status: string;
  subject: string;
  summary: string | null;
  /** Which renderer draws this issue. */
  template: string | null;
  title: string;
};

export type CommunicationPreference = {
  enabled: boolean;
  topic: string;
};

export type CommunicationSubscriber = {
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  status: string;
};
