import type { ProposedContent } from "./september-ecosystem";

/**
 * September content for the PROPOSED design, V3 pass.
 *
 * V3 makes the table the lead ministry story rather than one rung of the
 * framework ladder, removes the speculative team announcement, and strips the
 * repetition the V2 review flagged.
 *
 * Nothing here invents a name, story, location, quote, or photograph. The one
 * personal narrative this issue is meant to carry lives in `table.story`, and
 * it is deliberately `null`: see docs/newsletter/september-2026/from-the-table-source.md.
 * The section renders without it, so nothing unverified can ship by accident.
 */
export const septemberProposedContent: ProposedContent = {
  closing: {
    body: "God keeps opening doors. Many of those stories are personal, so we cannot share every detail here, but relationships are deepening and opportunities keep growing.\n\nThank you for praying, for encouraging us, and for giving. More stories are coming.",
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
    subhead: "Two quarters in one update. What has been happening at our table, the men who keep gathering, and a new website that finally tells the story.",
    title: "There's a lot\nwe've been wanting\nto share",
  },
  intro: "It has been a little while since our last update, and it has not been quiet.\n\nOver the last several months, Brooke and I have watched God open doors, bring people into our lives, and make it much clearer what USA Missionaries is becoming.\n\nAlmost none of it happened on a stage. Most of it happened at a table.",
  ktgBody: "The model behind that story. Real people, real homes, real conversations — simple enough that anyone can practice it and then hand it to someone else.",
  mens: {
    body: "Two men's groups are meeting consistently, opening Scripture, praying, building real accountability, and walking through actual life together.\n\nIt is ordinary and it is working.",
    heading: "Men are\ngathering.",
    teaser: "2three2 — Run. Pray. Pursue.",
  },
  slug: "q2-q3-2026-field-update",
  subject: "There's a Lot We've Been Wanting to Share",
  table: {
    frame: "This is what disciple making looks like on the ground. An ordinary home, an ordinary evening, a few chairs pulled in close. We eat, we open the Scriptures, we pray out loud, and we tell the truth about our lives.\n\nAnd then the night ends, and the quieter work starts.",
    heading: "It happens\nat a table.",
    invitation: {
      body: "You do not need a building, a budget, or a title. You need a table and one person.\n\nInvite someone in. Open the Scriptures together, even a few verses. Pray out loud, even if it is short and awkward. Then follow up during the week — a text, a call, a chair saved for next month.\n\nThat is the whole model, and it is the one thing we would ask you to try.",
      heading: "Your table is enough.",
    },
    label: "From the Table",
    /**
     * RESERVED. The one gathering this issue is built around, and how we kept
     * caring for the person afterward.
     *
     * Held at null until BOTH are true:
     *   1. The source document ("Kitchen Table Reflection - People.pdf") is in
     *      hand. It did not reach this session.
     *   2. The sharing permission on the original Planning Center submission is
     *      verified as allowing publication. The only reflection imported into
     *      this database carries share_permission = "private".
     *
     * No name, photograph, or specific disclosure goes here until the founder
     * confirms permission covers it.
     */
    story: null,
  },
  website: {
    body: "We rebuilt the website to tell this story better than one email can. Go see the mission, the field, and what God is doing.",
    heading: "The mission is\nbecoming clearer.",
  },
};
