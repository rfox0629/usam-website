/* The rule this module exists to enforce:
 *
 *   An accidental tap must never destroy meaningful user-entered work.
 *
 * DOS had one overlay primitive with one dismissal behaviour: the backdrop
 * closed it on mousedown, unconditionally, for all 61 sheets. That is right
 * for a record you are only looking at and wrong for a form you are halfway
 * through -- and Edit Person was the second kind wearing the first kind's
 * clothes. A misplaced thumb on the blurred area destroyed the entry.
 *
 * So a surface declares what it is, and the rules follow from that:
 *
 *   inspection  a record you are reading. Backdrop, Escape and X all close it,
 *               because closing costs nothing.
 *
 *   editable    a form holding user input. The backdrop is inert as a
 *               dismissal mechanism -- it may still dim and blur, it simply
 *               stops being a way to lose work. Every deliberate exit (X,
 *               Back, Cancel, Escape, browser Back) is allowed, but is routed
 *               through a confirmation FIRST if there is anything to lose.
 *
 * "Anything to lose" is the other half. Confirming on an untouched form trains
 * people to dismiss the dialog, which is how the dialog stops protecting
 * anything, so a clean form exits silently.
 *
 * Kept pure and free of React so the rules can be tested directly rather than
 * inferred from a rendered tree.
 */

export type DosSurfaceKind = "editable" | "inspection";

export type DiscardConfirmationCopy = {
  cancel: string;
  confirm: string;
  description: string;
  title: string;
};

/* Founder wording (2026-09-11): the dialog names what is actually at risk.
   Anything a surface has already saved is safe, and it says so, so nobody
   fears that leaving undoes a save that already happened. */
export const discardConfirmationCopy: DiscardConfirmationCopy = {
  cancel: "Keep editing",
  confirm: "Leave without saving",
  description: "Your unsaved changes will be lost. Anything already saved will stay.",
  title: "Leave without saving?",
};

/* Controls that only change what a surface SHOWS (a search box, a filter,
   an expander) are never unsaved work. A surface marks such a control, or a
   container of them, with this attribute and the snapshot reader skips it.
   Search inputs are skipped by type as well, so the common case needs no
   marking. */
export const unsavedWorkIgnoreAttribute = "data-unsaved";
export const unsavedWorkIgnoreValue = "ignore";

export function isViewingControl(element: {
  closest?: (selector: string) => unknown;
  getAttribute: (name: string) => string | null;
  tagName?: string;
}) {
  if (element.closest?.(`[${unsavedWorkIgnoreAttribute}="${unsavedWorkIgnoreValue}"]`)) {
    return true;
  }

  const type = (element.getAttribute("type") ?? "").toLowerCase();
  const role = (element.getAttribute("role") ?? "").toLowerCase();
  const placeholder = element.getAttribute("placeholder") ?? "";

  return type === "search" || role === "searchbox" || /^search\b/i.test(placeholder);
}

/* For a screen that saves in batches and keeps what it has already saved
   (Manage circles): leaving drops only the pending edits, and the dialog
   says so, so nobody fears losing a placement they confirmed a minute ago. */
export const leaveWithoutSavingCopy: DiscardConfirmationCopy = {
  cancel: "Keep editing",
  confirm: "Leave without saving",
  description: "Only your unsaved changes will be lost. Saved placements will stay.",
  title: "Leave without saving?",
};

/* Can a tap on the backdrop close this surface?
 *
 * For an editable surface the answer is no, and deliberately not "yes, with a
 * confirmation": a stray thumb should not be able to raise a modal either. The
 * backdrop simply is not a control. Note this does not consult dirtiness -- an
 * editable surface's backdrop is inert from the moment it opens, so the
 * behaviour never changes under the user mid-form. */
export function backdropMayDismiss(kind: DosSurfaceKind) {
  return kind === "inspection";
}

/* Same question for a downward swipe, and the same answer for the same
   reason: it is too easy to do by accident while scrolling a long form. */
export function swipeMayDismiss(kind: DosSurfaceKind) {
  return kind === "inspection";
}

/* Every other exit -- X, Back, Cancel, Escape, browser Back, a route change.
 * These are deliberate, so they are always permitted; the only question is
 * whether to confirm first.
 *
 * Returns true when the caller must show the discard confirmation instead of
 * leaving immediately. */
export function exitNeedsConfirmation({
  isDirty,
  kind,
}: {
  isDirty: boolean;
  kind: DosSurfaceKind;
}) {
  return kind === "editable" && isDirty;
}

/* A successful save has already persisted the work, so the form is no longer
   holding anything unsaved and must leave without a warning. A failed save has
   persisted nothing, so the values are still precious and the surface stays
   put. This is the whole of the save contract. */
export function exitAfterSaveNeedsConfirmation(saveSucceeded: boolean) {
  return !saveSucceeded;
}

/* Has the user actually entered something worth protecting?
 *
 * Compared against the values the form opened with, so re-selecting the option
 * that was already chosen, or typing a word and deleting it, leaves the form
 * clean. Whitespace-only text is not work: a stray space must not be enough to
 * raise a confirmation.
 *
 * Values are compared after normalisation rather than by identity, because a
 * controlled form rebuilds its state objects on every keystroke and reference
 * equality would report every form as dirty forever. */
export function formIsDirty(
  initial: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined,
) {
  const normalize = (value: unknown) => {
    if (typeof value === "string") {
      return value.trim();
    }

    return value === null || value === undefined ? "" : value;
  };

  const keys = Array.from(new Set([...Object.keys(initial ?? {}), ...Object.keys(current ?? {})]));

  for (const key of keys) {
    const before = normalize((initial ?? {})[key]);
    const after = normalize((current ?? {})[key]);

    if (typeof before === "object" || typeof after === "object") {
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        return true;
      }

      continue;
    }

    if (before !== after) {
      return true;
    }
  }

  return false;
}
