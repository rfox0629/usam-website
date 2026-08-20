import { dontWasteYourLife } from "./brand";

/**
 * Case studies for the "Reconciliation lived out" section.
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

export type CaseStudyVideo = {
  embedUrl: string;
  /** Short line explaining why this video belongs to this story. */
  note: string;
  title: string;
  watchUrl: string;
};

export type CaseStudy = {
  /** Anchor id and React key. */
  id: string;
  /** Closing line that lands the story. */
  closing: string;
  name: string;
  photos: readonly CaseStudyPhoto[];
  /** The essentials, one short line each. */
  points: readonly string[];
  scripture?: {
    reference: string;
    text: string;
  };
  /** One-sentence orientation before the points. */
  summary: string;
  video?: CaseStudyVideo;
  /** Where they serve, shown as a small dateline. */
  where: string;
};

const martyAndLauriFox: CaseStudy = {
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
  points: [
    "Gave their lives to the Lord in their late twenties.",
    "Were deeply discipled by faithful men and women of God.",
    "Learned to be doers of the Word, not merely hearers.",
    "Raised a family centered on fearing God and obeying His commands.",
    "Have spent nearly 30 years coming alongside marriages and families around kitchen tables.",
    "Keep pouring into others rather than treating retirement as the finish line.",
  ],
  scripture: {
    reference: "James 1:22",
    text: "Do not merely listen to the word, and so deceive yourselves. Do what it says.",
  },
  summary:
    "Two ordinary people who made themselves available, and have spent decades doing for others what faithful men and women once did for them.",
  video: {
    embedUrl: dontWasteYourLife.embedUrl,
    note: "The question shaping this season of their lives.",
    title: dontWasteYourLife.title,
    watchUrl: dontWasteYourLife.watchUrl,
  },
  where: "Minnesota",
};

export const caseStudies: readonly CaseStudy[] = [martyAndLauriFox];
