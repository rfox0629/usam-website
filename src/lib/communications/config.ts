// Ported from the USA-47 Resend subscriber platform (rescue branch), with the
// sender fallback corrected: this must never fall back to onboarding@resend.dev,
// which would send donor mail from an unverified Resend sandbox address.

export const phase1NewsletterRecipients = [
  { email: "ryan@usamissionaries.org", label: "Ryan Fox" },
  { email: "brooke.r.fox@gmail.com", label: "Brooke Fox" },
] as const;

/** Test sends go only here for now. */
export const TEST_SEND_RECIPIENT = "ryan@usamissionaries.org";

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
  const normalized = normalizeEmail(email);

  return phase1NewsletterRecipients.some((recipient) => recipient.email === normalized);
}

/**
 * The verified sending identity. Returns null rather than a sandbox fallback so
 * an unconfigured environment reports "not configured" instead of quietly
 * sending from a domain USA Missionaries does not own.
 */
export function newsletterFromEmail(): string | null {
  const configured = process.env.NEWSLETTER_EMAIL_FROM?.trim()
    || process.env.RESEND_NEWSLETTER_FROM?.trim()
    || process.env.JOIN_EMAIL_FROM?.trim();

  if (!configured || /onboarding@resend\.dev/i.test(configured)) {
    return null;
  }

  return configured;
}

export function topicLabel(topic: string) {
  return communicationTopics.find((item) => item.value === topic)?.label ?? topic;
}
