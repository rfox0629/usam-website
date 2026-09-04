import type { ProposedContent } from "./september-ecosystem";

/**
 * September content for the PROPOSED design, V2 refinement pass.
 *
 * Copy is condensed from the live September issue (src/lib/communications/
 * september-2026.ts); the voice, claims, and structure are unchanged. Nothing
 * here invents a name, story, location, quote, or photograph. The team section
 * is omitted entirely rather than shown as placeholder text, and the postal
 * address stays unset.
 */
export const septemberProposedContent: ProposedContent = {
  closing: {
    body: "God keeps opening doors. Many of those stories are personal, so we cannot share every detail here, but we are seeing relationships deepen and opportunities grow.\n\nThank you for praying, for encouraging us, and for giving. More stories are coming soon.",
    heading: "We believe this is only the beginning.",
    signoff: "Ryan & Brooke",
  },
  covering: "USA Missionaries locates, trains, supports, and deploys disciple-makers across America, and carries the ministry initiatives that grow out of that work.",
  dosBody: "Discipleship happens between the meetings. DOS helps disciple-makers carry the people, prayers, and next steps they promised, so discipleship keeps multiplying.",
  dosCtaLabel: "See How DOS Helps",
  edition: "Q2 / Q3 2026",
  fieldLabel: "Field Update // September 2026",
  frameworkSummary: "Three parts, one mission.",
  hero: {
    subhead: "Two quarters in one update. A new website, discipleship around real tables, men gathering, and new people joining the mission.",
    title: "There's a lot\nwe've been wanting\nto share",
  },
  intro: "It has been a little while since our last update, and it has not been quiet.\n\nOver the last several months, Brooke and I have watched God open doors, bring incredible people into our lives, and clarify what USA Missionaries is becoming.\n\nSome of that happened around kitchen tables. Some through the men's groups we walk with. Some behind a computer, building tools for disciple-making. Some through new relationships carrying USA Missionaries beyond Minnesota.\n\nOne of the biggest things we have been working on is simply making the vision clearer.",
  ktgBody: "Real people. Real homes. Real conversations. Table-shaped discipleship anyone can practice and then hand on to someone else.",
  mens: {
    body: "Two men's groups are meeting consistently, opening Scripture, praying, building real accountability, and walking through actual life together.\n\nIt is ordinary and it is working.",
    heading: "Men are gathering.",
    teaser: "2three2 — Run. Pray. Pursue.",
  },
  slug: "q2-q3-2026-field-update",
  subject: "There's a Lot We've Been Wanting to Share",
  tables: "This is what disciple making looks like on the ground. We gather around ordinary tables, open Scripture, pray, and help people learn to do the same with someone else.",
  /**
   * Reserved. Omitted from the render until a real announcement exists: the
   * section only renders when this is present, so nothing placeholder ships.
   */
  team: null,
  website: {
    body: "We rebuilt the website to tell this story far better than one email can. Go see the mission, the field, and what God is doing.",
    heading: "The mission is becoming clearer.",
  },
};
