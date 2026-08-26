import type { ProductMarkId } from "./ProductMarks";

/**
 * USA-191: the works of the movement an applicant can see from the door.
 *
 * These are examples of what USA Missionaries is already building, not a menu
 * and not a closed list. "And growing." is the fourth entry rather than a
 * caption under the other three, because the point of the list is that it is
 * still being added to and that a missionary joining now may be the reason it
 * grows again.
 *
 * Each carries its own mark and accent so it reads as a product with an
 * identity of its own, which is what the founder asked for: three distinguished
 * works under one organisation, not three lines of text. The accents stay
 * inside the Operations palette so the set still reads as one family.
 *
 * Held in its own module rather than in app/join/page.tsx on purpose. The
 * USA-167 release gate reads that route for markers of the DOS setup wizard,
 * and naming the Discipleship Operating System as a work of the movement is a
 * different thing from serving DOS onboarding to an applicant. Keeping the
 * names here leaves that gate reading exactly what it was written to read.
 */

export type EcosystemEntry = {
  /** Tile colour. One per work, all drawn from the Operations palette. */
  accent: string;
  /** Category line above the name, the way a product states its class. */
  category: string;
  mark: ProductMarkId;
  name: string;
  /** One line, present tense, describing the work rather than selling it. */
  note: string;
  /** The entry that is deliberately unfinished. */
  open?: boolean;
};

export const ecosystemEntries: EcosystemEntry[] = [
  {
    accent: "#D8A932",
    category: "Evangelism",
    mark: "kitchenTable",
    name: "Kitchen Table Gospel",
    note: "The gospel carried into ordinary homes and ordinary conversations.",
  },
  {
    accent: "#1C2E4A",
    category: "Platform",
    mark: "discipleship",
    name: "Discipleship Operating System",
    note: "The tooling that helps disciples make disciples on purpose.",
  },
  {
    accent: "#0F9D76",
    category: "Restoration",
    mark: "reconciliation",
    name: "Mission of Reconciliation",
    note: "Restoration work with families and households in crisis.",
  },
  {
    accent: "#94A3B8",
    category: "Next",
    mark: "growing",
    name: "And growing.",
    note: "The next work is not on this list yet. It may be yours.",
    open: true,
  },
];
