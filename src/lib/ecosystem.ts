export type EcosystemItem = {
  body: string;
  ctaLabel: string;
  href: string;
  imageAlt: string;
  imagePath: string;
  label: string;
  relationship?: string;
  title: string;
};

export const ecosystemItems = [
  {
    body: "A simple, table-centered gospel framework for clear conversations and everyday disciple-making.",
    ctaLabel: "Visit KTG",
    href: "https://kitchentablegospel.org",
    imageAlt: "A Kitchen Table Gospel gathering around a table.",
    imagePath: "/images/vision/kitchen-table-01.jpg",
    label: "USA Missionaries initiative",
    title: "Kitchen Table Gospel",
  },
  {
    body: "A USA Missionaries product and initiative for people, tables, follow up, prayer, and approved fruit.",
    ctaLabel: "Visit DOS",
    href: "https://discipleshipoperatingsystem.com",
    imageAlt: "Discipleship Operating System meeting screen.",
    imagePath: "/images/vision/dos-meetings.jpg",
    label: "USA Missionaries product/initiative",
    title: "Discipleship Operating System",
  },
  {
    body: "An independent ministry connected as a strategic partner. This card points to MOR's current website.",
    ctaLabel: "Visit MOR",
    href: "https://mor-mn.com/",
    imageAlt: "USA Missionaries outline mark.",
    imagePath: "/usa-outline-clean.png",
    label: "Strategic Partner",
    relationship: "Category 1 strategic partner",
    title: "Ministry of Reconciliation (MOR)",
  },
] as const satisfies readonly EcosystemItem[];

export const usamEcosystemUrl = "https://usamissionaries.org/ecosystem";

export const usamNavHrefOverrides = {
  briefing: "https://usamissionaries.org/briefing",
  ecosystem: usamEcosystemUrl,
  mission: "https://usamissionaries.org/",
  prayer: "https://usamissionaries.org/prayer",
  support: "https://usamissionaries.org/support",
} as const;
