/**
 * USA-280 Person record actions: one order for the record and its plus menu.
 *
 * https://linear.app/usa-missionaries/issue/USA-280
 *
 * Note for anyone grepping: older `USA-280` markers elsewhere in this
 * repository refer to the Marriage Assessment report work and are unrelated to
 * this module. They were never Linear issues; this one is.
 *
 * The interaction model this exists to hold still:
 *
 *   The floating plus adds. An existing item's three-dot menu manages it.
 *
 * The plus menu used to be ordered "by how often the action is reached for",
 * which is a judgement nobody can check and which drifted away from the order
 * the sections actually appear in. A reader who has just scrolled past
 * Accountability and opens the plus expects to find Add accountability where
 * Accountability was. So the menu is generated from the same ordered list the
 * record renders, and the two cannot disagree: adding a section without giving
 * it a place here is a type error.
 */

/** Every section of a person record, in the order the record renders them. */
export const personRecordSectionOrder = [
  "meetings",
  "multiplication",
  "resources",
  "accountability",
  "groups",
  "prayer",
  "fruit",
  "feedback",
] as const;

export type PersonRecordSection = typeof personRecordSectionOrder[number];

export type PersonRecordActionKey =
  | "log-meeting"
  | "schedule-meeting"
  | "add-discipleship-connection"
  | "add-resource"
  | "add-accountability"
  | "add-prayer-request"
  | "request-feedback"
  | "add-reminder";

/* Where each action belongs. `section: null` means the action has no section
   on the record, so it sits in the separated final group rather than being
   wedged next to something it is not part of. */
export const personRecordActionPlacement: Readonly<Record<PersonRecordActionKey, {
  section: PersonRecordSection | null;
  /** Order within a section that offers more than one action. */
  rank: number;
}>> = {
  "log-meeting": { rank: 0, section: "meetings" },
  "schedule-meeting": { rank: 1, section: "meetings" },
  "add-discipleship-connection": { rank: 0, section: "multiplication" },
  "add-resource": { rank: 0, section: "resources" },
  "add-accountability": { rank: 0, section: "accountability" },
  "add-prayer-request": { rank: 0, section: "prayer" },
  "request-feedback": { rank: 0, section: "feedback" },
  "add-reminder": { rank: 0, section: null },
};

/* Sections that offer no creation action at all, recorded so the absence is a
   decision rather than an oversight:

   - groups: a person joins a group from the group, or by a join request they
     send themselves. The record shows the groups they are in and opens them.
     There is no "add this person to a group" action on this surface to move,
     and inventing one would be inventing a permission model with it.
   - fruit: Fruit carries provenance from a logged interaction, so its path is
     Log meeting -> Observed Fruit. A manual "Add fruit" would be a record with
     nothing behind it. */
export const personRecordSectionsWithoutCreation: ReadonlyArray<PersonRecordSection> = ["groups", "fruit"];

/** The rank a menu sorts by. Lower comes first; unsectioned actions come last. */
export function personRecordActionSortKey(key: PersonRecordActionKey) {
  const placement = personRecordActionPlacement[key];

  if (!placement.section) {
    return { group: "later", sectionIndex: personRecordSectionOrder.length, rank: placement.rank };
  }

  return {
    group: placement.section,
    rank: placement.rank,
    sectionIndex: personRecordSectionOrder.indexOf(placement.section),
  };
}

/**
 * Sorts whatever actions a record is actually offering into record order.
 *
 * Callers pass only the actions that are available for this person and this
 * viewer; nothing here decides whether an action is allowed. The `group` it
 * returns is the section name, which the menu renders dividers from, so the
 * separated final group falls out of the same pass.
 */
export function orderPersonRecordActions<T extends { key: PersonRecordActionKey }>(actions: readonly T[]) {
  return [...actions]
    .map((action) => ({ action, sort: personRecordActionSortKey(action.key) }))
    .sort((first, second) => (
      first.sort.sectionIndex - second.sort.sectionIndex
      || first.sort.rank - second.sort.rank
    ))
    .map(({ action, sort }) => ({ ...action, group: sort.group }));
}
