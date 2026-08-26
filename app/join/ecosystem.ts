/**
 * USA-191: the part of the movement an applicant can see from the door.
 *
 * These are examples of what USA Missionaries is already building, not a menu
 * and not a closed list. "And growing." is the fourth entry rather than a
 * caption under the other three, because the point of the list is that it is
 * still being added to and that a missionary joining now may be the reason it
 * grows again.
 *
 * Held in its own module rather than in app/join/page.tsx on purpose. The
 * USA-167 release gate reads that route for markers of the DOS setup wizard,
 * and naming the Discipleship Operating System as a work of the movement is a
 * different thing from serving DOS onboarding to an applicant. Keeping the
 * names here leaves that gate reading exactly what it was written to read.
 */

export type EcosystemEntry = {
  name: string;
  /** One line, present tense, describing the work rather than selling it. */
  note: string;
  /** The entry that is deliberately unfinished. */
  open?: boolean;
};

export const ecosystemEntries: EcosystemEntry[] = [
  {
    name: "Kitchen Table Gospel",
    note: "The gospel carried into ordinary homes and ordinary conversations.",
  },
  {
    name: "Discipleship Operating System",
    note: "The tooling that helps disciples make disciples on purpose.",
  },
  {
    name: "Mission of Reconciliation",
    note: "Restoration work with families and households in crisis.",
  },
  {
    name: "And growing.",
    note: "The next work is not on this list yet. It may be yours.",
    open: true,
  },
];
