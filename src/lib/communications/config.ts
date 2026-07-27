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
