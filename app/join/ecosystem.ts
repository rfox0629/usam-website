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
 * Deliberately uncategorised. An earlier pass labelled these Evangelism,
 * Platform, Restoration and Next; the founder direction is that we do not need
 * to classify them, and that a label turns a work into a product tile. The mark
 * and the sentence are enough.
 *
 * Held in its own module rather than in app/join/page.tsx on purpose. The
 * USA-167 release gate reads that route for markers of the DOS setup wizard,
 * and naming the Discipleship Operating System as a work of the movement is a
 * different thing from serving DOS onboarding to an applicant. Keeping the
 * names here leaves that gate reading exactly what it was written to read.
 */

export type EcosystemEntry = {
  /** One or more lines. Kitchen Table Gospel is set as three short ones. */
  lines: string[];
  mark: ProductMarkId;
  name: string;
  /** The entry that is deliberately unfinished. */
  open?: boolean;
};

export const ecosystemEntries: EcosystemEntry[] = [
  {
    lines: ["Ordinary homes.", "Ordinary conversations.", "Extraordinary eternity."],
    mark: "kitchenTable",
    name: "Kitchen Table Gospel",
  },
  {
    lines: ["The tools and training to help disciples make disciples on purpose."],
    mark: "discipleship",
    name: "Discipleship Operating System",
  },
  {
    lines: [
      "Restoration for families and households in crisis through the power of Christ.",
    ],
    mark: "reconciliation",
    name: "Mission of Reconciliation",
  },
  {
    lines: ["The next work is not on this list yet. It may be yours."],
    mark: "growing",
    name: "And growing.",
    open: true,
  },
];
