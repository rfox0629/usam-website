import type { EcosystemSection } from "./newsletter-ecosystem";

/**
 * The September 2026 issue as structured sections: the seed for the Operations
 * record, and the fixture the preview script renders.
 *
 * Three main sections and nothing else — the covering, the model in action, and
 * the tool being prepared. There is no separate website feature, no separate
 * men's feature, and no Covering/Model/Tool recap: the numbered sections say it
 * once, and the closing brings it back to one mission.
 *
 * Nothing here invents a name, story, location, quote, or photograph. The
 * featured testimony on `ktg-story` is absent: its sharing permission has not
 * been verified against the original Planning Center submission. See
 * docs/newsletter/september-2026/from-the-table-source.md.
 */
export const SEPTEMBER_SUBJECT = "There's a Lot We've Been Wanting to Share";

export const SEPTEMBER_PREHEADER =
  "Conversations with couples exploring the mission, what happened around a table, and the tool we are preparing.";

const PHOTO = "/images/email/september-2026";

export const septemberSections: EcosystemSection[] = [
  {
    body: "Three parts of one mission: the people we are gathering and preparing, what disciple making actually looks like around a table, and the tool being built to help it keep going.",
    brand: "usam",
    eyebrow: "Field Update // September 2026",
    heading: "There's a lot\nwe've been wanting\nto share",
    hidden: false,
    key: "header",
    position: 0,
    tagline: "Q2 / Q3 2026",
    type: "header",
  },
  {
    // `heading` is the greeting line; {{first_name}} is substituted per recipient.
    body: "There is a lot we have been wanting to share with you.\n\nOver these past months the Lord has been bringing real clarity to how this ministry fits together. We have been meeting people, gathering around tables, walking with men in discipleship, and building a tool to help that work continue.\n\nAll of it sits under one mission: USA Missionaries exists to locate, train, and deploy disciple makers across America. Here is what that looks like right now, and where we believe the Lord is leading next.",
    brand: "usam",
    heading: "Hi {{first_name}},",
    hidden: false,
    key: "opening",
    position: 1,
    type: "letter",
  },
  {
    body: "USA Missionaries is the home for all of this. It is where the people, the training, and the sending live.\n\nAs we have shared the vision, we have begun conversations with several couples who are exploring what it could look like to join us. We are listening, praying, and taking time to know each other well. Nothing is being announced yet, and we are not rushing it. We are simply encouraged by the people God keeps bringing into these conversations.\n\nWe also rebuilt the website so the mission explains itself: locating, training, and deploying disciple makers across America.",
    brand: "usam",
    cta: { label: "Explore USA Missionaries", url: "https://usamissionaries.org" },
    eyebrow: "The Covering",
    heading: "The mission is\ntaking shape.",
    hidden: false,
    index: "01",
    key: "usam-covering",
    position: 2,
    type: "pillar",
  },
  {
    body: "Kitchen Table Gospel is the model, and it is not complicated. Real homes. Real tables. A meal, an open Bible, honest conversation, and prayer out loud.\n\nWhat makes it discipleship is not the evening itself. It is what keeps going afterward.",
    brand: "ktg",
    eyebrow: "The Model in Action",
    heading: "What begins at a table\ncan keep growing.",
    hidden: false,
    image: {
      alt: "Four friends gathered around a wooden table with an open Bible and the USA Missionaries vision binder.",
      caption: "Kitchen Table Gospel // Minnesota",
      url: `${PHOTO}/kitchen-table-01.jpg`,
    },
    index: "02",
    key: "ktg-model",
    position: 3,
    type: "pillar",
  },
  {
    /**
     * The featured testimony.
     *
     * `body` is empty and `story` is absent on purpose: the sharing permission
     * selected on Planning Center form 1115723, submission 45980998 has not been
     * verified, and the export shows both permission statements without marking
     * the selection. The renderer draws nothing for this section until a
     * verified `story` is present, so it cannot ship by forgetting a check.
     */
    body: "",
    brand: "ktg",
    eyebrow: "From the Table",
    heading: "One evening,\nand what came after.",
    hidden: true,
    key: "ktg-story",
    position: 4,
    type: "story",
  },
  {
    body: "Two men's groups are also meeting consistently. They open Scripture together, pray, build real accountability, and keep walking through actual life with one another.\n\nIt is ordinary and it is working.",
    brand: "ktg",
    heading: "Men are gathering.",
    hidden: false,
    image: {
      alt: "Six men from the USA Missionaries men's discipleship group standing together outside, one holding a Bible.",
      caption: "Men's discipleship // Two groups meeting weekly",
      url: `${PHOTO}/group-prayer-01.jpg`,
    },
    key: "ktg-men",
    position: 5,
    tagline: "2three2 — Run. Pray. Pursue.",
    type: "feature",
  },
  {
    body: "Invite someone in. Open Scripture together. Pray out loud, even if it is short. Then follow up during the week.\n\nThat is the whole model, and it is the one thing we would ask you to try.",
    brand: "ktg",
    cta: { label: "Explore Kitchen Table Gospel", url: "https://kitchentablegospel.org" },
    heading: "Your table is enough.",
    hidden: false,
    key: "ktg-invitation",
    position: 6,
    tagline: "Gather. Learn. Confess. Encourage. Multiply.",
    type: "invitation",
  },
  {
    body: "We are getting close to a broader launch of the Discipleship Operating System. It has been in limited use while we build it, shaped by the very work you have just read about.\n\nIt is made to help disciple makers carry the people, the prayers, and the next steps they promised, so discipleship keeps going between the gatherings.\n\nTechnology cannot replace a conversation, a prayer, or a relationship. We only hope it makes it easier to keep showing up for someone, and to help them do the same for someone else.",
    brand: "dos",
    cta: { label: "Request Information", url: "https://discipleshipoperatingsystem.com" },
    eyebrow: "The Tool Being Prepared",
    heading: "Helping discipleship\ncontinue.",
    hidden: false,
    index: "03",
    key: "dos-tool",
    position: 7,
    type: "pillar",
  },
  {
    body: "Three parts, one mission. Gather and prepare people, show what disciple making actually looks like, and help it keep multiplying. That is all USA Missionaries is trying to do.\n\nThank you for praying for us, for encouraging us, and for partnering with this work. Would you pray for the couples we are talking with, for the people around these tables, for the two men's groups, and for the preparation ahead of a broader DOS launch?",
    brand: "usam",
    heading: "We believe this is only the beginning.",
    hidden: false,
    key: "closing",
    position: 8,
    tagline: "Ryan & Brooke",
    type: "closing",
  },
];
