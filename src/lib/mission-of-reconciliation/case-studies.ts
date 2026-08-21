/**
 * Case studies: people living out the ministry of reconciliation where they are.
 *
 * Deliberately not limited to retired married couples. Future entries may be
 * grandparents, widows and widowers, mature single believers, younger families,
 * or anyone whose home has become a place people know they can come. Keep
 * `name`, `where`, and `cardSummary` free of language that assumes a couple.
 *
 * These are real people who have given permission to be featured. Never add a
 * placeholder, composite, or invented story here — the section renders whatever
 * this array contains, so an unapproved entry would publish straight to the
 * public page. To add a second or third study, append an entry below; the
 * section numbers them automatically and the layout already handles multiples.
 */

export type CaseStudyPhoto = {
  alt: string;
  caption: string;
  src: string;
};

export type CaseStudy = {
  /** Card blurb on the stories index. One sentence. */
  cardSummary: string;
  /** Anchor id, React key, and the URL segment for this story's page. */
  id: string;
  /** Closing line that lands the story. */
  closing: string;
  name: string;
  photos: readonly CaseStudyPhoto[];
  scripture?: {
    reference: string;
    text: string;
  };
  /** The essentials as short narrative paragraphs, not a checklist. */
  story: readonly string[];
  /** Pull-lead that opens the study. */
  summary: string;
  /** Where they serve, shown as a small dateline. */
  where: string;
};

/** Public URL for a story's own page. */
export function caseStudyHref(study: CaseStudy) {
  return `/mission-of-reconciliation/stories/${study.id}`;
}

export function getCaseStudy(slug: string) {
  return caseStudies.find((study) => study.id === slug);
}

const martyAndLauriFox: CaseStudy = {
  cardSummary:
    "Nearly thirty years of opening their home and coming alongside marriages and families.",
  closing: "For Marty and Lauri, this is not retirement. It is a life sold out to Christ.",
  id: "marty-and-lauri-fox",
  name: "Marty & Lauri Fox",
  photos: [
    {
      alt: "Marty and Lauri Fox early in their marriage",
      caption: "Early in their marriage",
      src: "/images/mission-of-reconciliation/marty-lauri-early.webp",
    },
    {
      alt: "Marty and Lauri Fox today",
      caption: "Today",
      src: "/images/mission-of-reconciliation/marty-lauri-today.webp",
    },
  ],
  scripture: {
    reference: "James 1:22",
    text: "Do not merely listen to the word, and so deceive yourselves. Do what it says.",
  },
  story: [
    "Marty and Lauri gave their lives to the Lord in their late twenties and were deeply discipled by faithful men and women of God. Those people showed them that following Jesus means being doers of the Word, not merely hearers of it. They built a family centered on fearing God and obeying His commands.",
    "For nearly thirty years they have come alongside marriages and families around kitchen tables, doing for others what was once done for them. Now, in the season when many people start counting down to retirement, they are still pouring into the people God puts in front of them.",
  ],
  summary: "Two ordinary people who simply made themselves available.",
  where: "Minnesota",
};

export const caseStudies: readonly CaseStudy[] = [martyAndLauriFox];

/** The landing page features a few; the index at /stories carries them all. */
export const featuredCaseStudies = caseStudies.slice(0, 3);
