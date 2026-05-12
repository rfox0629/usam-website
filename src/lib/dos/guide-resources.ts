export type DosGuideResource = {
  description: string;
  href: string;
  title: string;
};

export const dosGuideResources = [
  {
    description: "A simple guide for presenting the Gospel around the table.",
    href: "/guides/kitchen-table-gospel.pdf",
    title: "Kitchen Table Gospel",
  },
  {
    description: "Gather, worship, and be formed in the body of Christ.",
    href: "/guides/commands-of-jesus/usam_attending_church_guide.pdf",
    title: "Attending Church",
  },
  {
    description: "Build a steady rhythm of Scripture, obedience, and fruit.",
    href: "/guides/commands-of-jesus/usam_daily_bible_reading_guide.pdf",
    title: "Daily Bible Reading",
  },
  {
    description: "Take the public step of repentance, obedience, and new life.",
    href: "/guides/commands-of-jesus/usam_baptism_guide.pdf",
    title: "Baptism",
  },
  {
    description: "Practice stewardship, generosity, and kingdom support.",
    href: "/guides/commands-of-jesus/usam_biblical_giving_guide.pdf",
    title: "Biblical Giving",
  },
  {
    description: "Follow Jesus and multiply obedient disciples.",
    href: "/guides/commands-of-jesus/usam_discipleship_guide.pdf",
    title: "Discipleship",
  },
  {
    description: "Share the Gospel with clarity, boldness, and love.",
    href: "/guides/commands-of-jesus/usam_evangelism_guide.pdf",
    title: "Evangelism",
  },
  {
    description: "Grow in dependence, spiritual hunger, and breakthrough.",
    href: "/guides/commands-of-jesus/usam_prayer_and_fasting_guide.pdf",
    title: "Prayer and Fasting",
  },
  {
    description: "Practice holy rest, worship, and trust in God.",
    href: "/guides/commands-of-jesus/usam_sabbath_guide.pdf",
    title: "Sabbath",
  },
  {
    description: "Serve the body through the power of the Holy Spirit.",
    href: "/guides/commands-of-jesus/usam_spiritual_gifts_guide.pdf",
    title: "Spiritual Gifts",
  },
] as const satisfies readonly DosGuideResource[];

function normalizeGuideTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getDosGuideResourceByTitle(title: string | null | undefined) {
  const normalizedTitle = normalizeGuideTitle(title ?? "");

  return dosGuideResources.find((resource) => normalizeGuideTitle(resource.title) === normalizedTitle) ?? null;
}
