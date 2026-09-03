export const phase1NewsletterRecipients = [
  {
    email: "ryan@usamissionaries.org",
    label: "Ryan Fox",
  },
  {
    email: "brooke.r.fox@gmail.com",
    label: "Brooke Fox",
  },
] as const;

/**
 * Slug of the Q2/Q3 2026 field update. The renderer registry in
 * newsletter-template.ts keys off this, so the designed issue template and the
 * generic one share every other part of the pipeline.
 */
export const q3FieldUpdateSlug = "q2-q3-2026-field-update";

/**
 * Destinations for the Q2/Q3 issue. Every one of these was verified live
 * against the canonical hosts before it went in here, and
 * scripts/newsletter-q3-2026-regression.mjs re-checks the shapes. Nothing in
 * this file is a guess: /mission and /missionary-team are 308s, and there is no
 * /stories or /testimony route, so field reports point at /briefing.
 */
export const q3FieldUpdateLinks = {
  briefingUrl: "https://usamissionaries.org/briefing",
  dosUrl: "https://discipleshipoperatingsystem.com",
  groupUrl: "https://usamissionaries.org/groups/2three2",
  kitchenTableUrl: "https://kitchentablegospel.org",
  missionariesUrl: "https://usamissionaries.org/missionaries",
  siteUrl: "https://usamissionaries.org",
} as const;

/**
 * Where the issue's images are served from. They ship in the repo under
 * public/images/email/q3-2026, so once this branch is deployed the default is
 * correct. NEWSLETTER_ASSET_BASE_URL exists for the window before that deploy,
 * when a review send still has to show real photographs.
 */
export function q3FieldUpdateAssetBaseUrl() {
  return process.env.NEWSLETTER_ASSET_BASE_URL
    || `${q3FieldUpdateLinks.siteUrl}/images/email/q3-2026`;
}

export const communicationTopics = [
  {
    description: "Field stories, table updates, and ministry progress.",
    label: "Field Updates",
    value: "field_updates",
  },
  {
    description: "Prayer needs and answered prayer from the field.",
    label: "Prayer Updates",
    value: "prayer_updates",
  },
  {
    description: "Support, stewardship, and giving-related updates.",
    label: "Support Updates",
    value: "support_updates",
  },
] as const;

export type CommunicationTopic = typeof communicationTopics[number]["value"];

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhase1NewsletterRecipient(email: string) {
  const normalizedEmail = normalizeEmail(email);

  return phase1NewsletterRecipients.some((recipient) => recipient.email === normalizedEmail);
}

export function newsletterFromEmail() {
  return process.env.NEWSLETTER_EMAIL_FROM
    || process.env.RESEND_NEWSLETTER_FROM
    || process.env.EMAIL_FROM
    || "USA Missionaries <onboarding@resend.dev>";
}

export function topicLabel(topic: string) {
  return communicationTopics.find((item) => item.value === topic)?.label ?? topic;
}
