/**
 * Design-phase fixtures for the newsletter presentation layer (USA-46).
 *
 * These are illustrative placeholders only — no real subscriber or issue data.
 * USA-45 owns the actual data model; once it lands, replace this module with
 * real Supabase queries and delete the fixture arrays. Field names here are a
 * best guess at the eventual shape and should be reconciled against USA-45's
 * findings before USA-47 wires up persistence.
 */

export type NewsletterIssueBlock = {
  body: string;
  heading?: string;
};

export type NewsletterIssue = {
  /** Plain-language summary shown in the archive card and used as the email preheader. */
  excerpt: string;
  issueNumber: number;
  publishedAt: string;
  readingBlocks: readonly NewsletterIssueBlock[];
  slug: string;
  title: string;
  topics: readonly string[];
};

export type NewsletterPreferenceTopic = {
  defaultChecked: boolean;
  description: string;
  id: string;
  label: string;
};

export type NewsletterFrequencyOption = {
  description: string;
  id: string;
  label: string;
};

export const newsletterPreferenceTopics: readonly NewsletterPreferenceTopic[] = [
  {
    defaultChecked: true,
    description: "Field stories, new missionary launches, and kingdom fruit from the past month.",
    id: "ministry-updates",
    label: "Ministry Updates",
  },
  {
    defaultChecked: true,
    description: "Specific, timely requests from missionaries and the teams supporting them.",
    id: "prayer-requests",
    label: "Prayer Requests",
  },
  {
    defaultChecked: false,
    description: "Giving milestones, financial freedom stories, and support-team openings.",
    id: "giving-updates",
    label: "Giving & Support Updates",
  },
  {
    defaultChecked: false,
    description: "Kitchen Table gatherings, briefings, and training opportunities near you.",
    id: "events",
    label: "Events & Gatherings",
  },
] as const;

export const newsletterFrequencyOptions: readonly NewsletterFrequencyOption[] = [
  { description: "One issue as soon as it publishes.", id: "weekly", label: "Weekly" },
  { description: "A single roundup issue each month.", id: "monthly", label: "Monthly (recommended)" },
  { description: "Only major updates — a few times a year.", id: "quarterly", label: "Quarterly" },
] as const;

export const newsletterIssues: readonly NewsletterIssue[] = [
  {
    excerpt:
      "Three new households started meeting at the table this month, and the Fox family shares what changed after their first Discipleship Assessment.",
    issueNumber: 12,
    publishedAt: "2026-07-01",
    readingBlocks: [
      {
        body: "This month, three new households said yes to a first conversation at the kitchen table. Two of those conversations turned into a second meeting before the month closed.",
        heading: "Three New Tables, Three New Yeses",
      },
      {
        body: "“We stopped waiting for people to come to church and started going to their kitchens instead. It changed everything about how fast trust builds.” — Ryan & Brooke Fox",
        heading: "From the Field",
      },
      {
        body: "Pray for the Ramirez family as they take their first Discipleship Assessment next week, and for continued open doors in the Fox family's neighborhood.",
        heading: "Pray With Us",
      },
    ],
    slug: "2026-07-three-new-tables",
    title: "Three New Tables, Three New Yeses",
    topics: ["Ministry Updates", "Prayer Requests"],
  },
  {
    excerpt:
      "A look at how monthly giving unlocked two new missionary families this quarter, plus an invitation to the fall Kitchen Table training.",
    issueNumber: 11,
    publishedAt: "2026-06-01",
    readingBlocks: [
      {
        body: "Because of monthly partners, two new families finished onboarding and are now fully in the field. Thank you for making that possible.",
        heading: "Two Families, Fully Funded",
      },
      {
        body: "Save the date: our fall Kitchen Table training equips new missionaries to run their first table in a weekend, not a semester.",
        heading: "Upcoming: Fall Training",
      },
    ],
    slug: "2026-06-two-families-fully-funded",
    title: "Two Families, Fully Funded",
    topics: ["Giving & Support Updates", "Events & Gatherings"],
  },
  {
    excerpt:
      "How one missionary family used the Discipleship Assessment to turn a stalled relationship into a weekly rhythm of prayer and Scripture.",
    issueNumber: 10,
    publishedAt: "2026-05-01",
    readingBlocks: [
      {
        body: "A relationship that had gone quiet for months found new life after one honest conversation at the table — read the full story from the field.",
        heading: "When a Table Goes Quiet, Then Doesn't",
      },
    ],
    slug: "2026-05-when-a-table-goes-quiet",
    title: "When a Table Goes Quiet, Then Doesn't",
    topics: ["Ministry Updates"],
  },
] as const;

export function getNewsletterIssueBySlug(slug: string): NewsletterIssue | undefined {
  return newsletterIssues.find((issue) => issue.slug === slug);
}

export function latestNewsletterIssue(): NewsletterIssue | undefined {
  return newsletterIssues[0];
}

/**
 * Entirely fabricated sample rows for the admin subscriber-list UX mockup
 * (app/newsletter/preview/admin). Never populate this with real subscriber
 * data — the mockup exists to illustrate layout/interaction, not to preview
 * real records. USA-47 replaces this with a real admin query.
 */
export type NewsletterAdminSubscriberSample = {
  email: string;
  frequency: string;
  joinedAt: string;
  name: string;
  status: "bounced" | "subscribed" | "unsubscribed";
  topics: readonly string[];
};

export const newsletterAdminSubscriberSamples: readonly NewsletterAdminSubscriberSample[] = [
  {
    email: "sample.subscriber1@example.com",
    frequency: "Monthly",
    joinedAt: "2026-06-14",
    name: "Sample Subscriber One",
    status: "subscribed",
    topics: ["Ministry Updates", "Prayer Requests"],
  },
  {
    email: "sample.subscriber2@example.com",
    frequency: "Weekly",
    joinedAt: "2026-05-02",
    name: "Sample Subscriber Two",
    status: "subscribed",
    topics: ["Ministry Updates", "Events & Gatherings"],
  },
  {
    email: "sample.subscriber3@example.com",
    frequency: "Quarterly",
    joinedAt: "2026-03-21",
    name: "Sample Subscriber Three",
    status: "unsubscribed",
    topics: ["Giving & Support Updates"],
  },
  {
    email: "sample.subscriber4@example.com",
    frequency: "Monthly",
    joinedAt: "2026-07-08",
    name: "Sample Subscriber Four",
    status: "bounced",
    topics: ["Ministry Updates"],
  },
] as const;
