import type { EditorialNewsletter } from "./newsletter-editorial";

/**
 * September 2026 field update content.
 *
 * Copy follows the founder's structure and voice. Nothing here invents a name,
 * story, location, quote, or photograph: the team section is a reserved
 * placeholder, and the postal address is left null until it is verified from a
 * canonical record.
 */
export function septemberNewsletter({
  imageBase,
  postalAddress = null,
}: {
  /** Origin serving the September photographs. */
  imageBase: string;
  postalAddress?: string | null;
}): EditorialNewsletter {
  const img = (file: string) => `${imageBase}/images/vision/${file}`;

  return {
    closing: {
      body: "God continues to open doors with individuals, couples, families, churches, and leaders. Many of those stories are personal, so we cannot share every detail publicly. What we can say is that we are seeing God move, relationships deepen, and opportunities keep growing.\n\nThank you for praying for us, for encouraging us, for giving, and for standing with this mission. There is still a lot of work ahead, and we are grateful you are in it with us.\n\nMore stories are coming soon.",
      heading: "We believe this is only the beginning.",
      signoff: "Ryan & Brooke",
    },
    edition: "Q2 / Q3 2026",
    editionMeta: "Field update. September 2026.",
    hero: {
      subhead: "Two quarters in one update. New tables, new men gathering, a new website, and new people joining the mission.",
      title: "There's a Lot We've Been Wanting to Share",
    },
    intro: "It has been a little while since our last update, but that certainly does not mean things have been quiet.\n\nOver the last several months, Brooke and I have watched God open doors, bring incredible people into our lives, deepen discipleship relationships, and give us a lot more clarity about what USA Missionaries is becoming.\n\nSome of that happened around kitchen tables. Some of it happened through the men's groups we are walking with. Some of it happened behind a computer, building tools we believe help people make disciples on purpose. And some of it happened through new relationships that are starting to carry USA Missionaries beyond Minnesota.\n\nOne of the biggest things we have been working on is simply making the vision clearer.",
    kicker: "The website",
    mens: {
      body: "Two men's discipleship groups are meeting consistently. They open Scripture together, pray together, build real accountability, and walk through actual life with one another.\n\nIt is ordinary and it is working.",
      heading: "Men gathering, week after week.",
      image: {
        alt: "Six men from the USA Missionaries men's discipleship group standing together outside, one holding a Bible.",
        url: img("group-prayer-01.jpg"),
      },
      teaser: "2three2 — Run. Pray. Pursue.",
    },
    pillars: {
      heading: "So, what exactly is USA Missionaries?",
      items: [
        {
          body: "USA Missionaries exists to locate, train, support, and deploy disciple-makers across America.",
          index: "01",
          subtitle: "The Covering",
          title: "USA Missionaries",
        },
        {
          body: "Real people. Real homes. Real conversations.\nGather. Learn. Confess. Encourage. Multiply.",
          index: "02",
          subtitle: "The Model",
          title: "Kitchen Table Gospel",
        },
        {
          body: "DOS helps missionaries and disciple-makers follow through, pray intentionally, lead groups, build accountability, track next steps, and help discipleship multiply.",
          index: "03",
          subtitle: "The Tool",
          title: "Discipleship Operating System",
        },
      ],
      summary: "Three parts, one mission. Here is how they fit together.",
      tagline: "The covering. The model. The tool.",
    },
    postalAddress,
    preheader: "Two quarters in one update. New tables, new men gathering, a new website, and new people joining the mission.",
    slug: "q2-q3-2026-field-update",
    subject: "There's a Lot We've Been Wanting to Share",
    tables: {
      body: "This is what disciple making looks like on the ground. We gather around ordinary tables, open Scripture, pray together, practice obedience to Jesus, walk through real life, and help people learn to do the same with someone else.",
      heading: "Real tables. Real people. Real relationships.",
      image: {
        alt: "Four friends gathered around a wooden table with an open Bible and the USA Missionaries vision binder.",
        url: img("kitchen-table-01.jpg"),
      },
    },
    team: {
      // Reserved. Final names, photos, and stories drop in here without any
      // layout change; nothing about the people is asserted yet.
      body: "We expect to introduce new missionaries joining USA Missionaries before this update reaches you. We are keeping it short here on purpose, so you can go meet them.",
      heading: "The team is growing.",
      label: "Coming next",
    },
    website: {
      body: "We rebuilt the USA Missionaries website to tell this story much better than we can in an email. It gives a clearer picture of the mission, why America is a mission field, what disciple making can look like, what we are building, and stories of what God is doing.",
      ctaLabel: "Explore USA Missionaries",
      ctaUrl: "https://usamissionaries.org",
      heading: "Come see what we've been building.",
      mock: {
        eyebrow: "Active Deployment",
        headline: "The Mission Is Active",
        sub: "USA Missionaries exists to locate, train, and deploy disciple makers across America.",
      },
    },
  };
}
