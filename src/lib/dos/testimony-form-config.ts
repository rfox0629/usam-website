/* USA-243 — the Testimony form, which asks for fruit in the ONE canonical
   vocabulary.
 *
 * Split out of `review-form-config.ts` so that module can stay dependency-free
 * for the regression scripts while this one imports the shared vocabulary.
 * Everything a recipient records here is RECIPIENT-REPORTED evidence: their own
 * testimony about their own life, kept distinct from a leader's observation so
 * reporting can always say who said it. */
import { canonicalFruitOptions } from "@/src/lib/dos/fruit-vocabulary";

export { dosReviewOutcomeLegacyValues, normalizeDosReviewOutcomeTags, type DosReviewOutcomeValue } from "@/src/lib/dos/fruit-vocabulary";
import { dosReviewSharePermissionOptions } from "@/src/lib/dos/review-form-config";

/* USA-243: "What fruit did you notice?" now offers the one canonical
   vocabulary, so a recipient and a leader describing the same result choose the
   same words and reporting never has to reconcile two lists. The stored value
   is the canonical label itself, and what a recipient chooses is kept as
   RECIPIENT-REPORTED evidence — their testimony about their own life, not the
   leader's observation.

   `Discipling` and `Marriage Restoration` are deliberately absent: the first is
   ministry activity rather than fruit, and the second is Reconciliation with a
   context of "Marriage". Both remain valid stored values (see
   `dosReviewOutcomeAcceptedValues`) so every testimony already submitted still
   renders exactly the words it was answered in. */
export const dosReviewOutcomeOptions = canonicalFruitOptions.map((option) => ({ label: option.label, value: option.label }));

/* Historical: every value the testimony fruit question has ever written. Kept
   so a stored tag never becomes unrenderable and never fails validation on a
   re-submission. Not offered as a new choice. */
export const dosTestimonyReviewFormDefinition = {
  description: "A deeper story form someone completes after a saved meeting.",
  title: "Testimony Review",
  sections: [
    {
      copy: "The secure link already identifies who is sharing and which meeting it is about, so the form never asks for a name or email.",
      label: "Who is sharing",
      type: "notice",
    },
    {
      fieldType: "textarea",
      label: "What happened?",
      placeholder: "Share what happened in your own words.",
      required: true,
      type: "field",
    },
    {
      fieldType: "textarea",
      label: "What changed?",
      placeholder: "What feels different now?",
      type: "field",
    },
    {
      fieldType: "text",
      label: "Did you take a next step?",
      placeholder: "Optional",
      type: "field",
    },
    {
      choiceType: "checkbox",
      label: "What fruit did you notice?",
      options: dosReviewOutcomeOptions.map((option) => option.label),
      type: "choice",
    },
    {
      copy: "Stories are reviewed before anything is shared publicly.",
      label: "Privacy",
      type: "notice",
    },
    {
      choiceType: "radio",
      label: "May we share this testimony?",
      options: dosReviewSharePermissionOptions.map((option) => option.label),
      type: "choice",
    },
  ],
} as const;
