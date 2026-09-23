/* USA-283: who does "add this person to the group" refer to?
 *
 * The group Add-person route either links an existing Person or creates one.
 * Before this, any existing person whose email or phone matched was linked
 * silently, whatever their name. A family that shares one email (or a phone
 * number passed between people) could therefore add Jane when the leader typed
 * John, and "This is a different person" did not stop it, because that answer
 * only skipped the name check.
 *
 * The rule now:
 *
 *   same contact + same name  -> the same person; link it.
 *   same contact + other name -> ask. Link only if the leader picks that
 *                                person; create a new one only if they say
 *                                it is someone else.
 *   same name, no shared contact -> ask (name alone never merges).
 *   nothing matches           -> create.
 *
 * Pure so it can be tested without a database; the route supplies the rows.
 */

export type GroupMemberMatchCandidate = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status?: string | null;
};

export type GroupMemberMatchInput = {
  /* The leader has already seen the possible matches and said this is a
     different person. */
  confirmNearDuplicate: boolean;
  email: string;
  name: string;
  phone: string;
};

export type GroupMemberMatchDecision =
  | { kind: "link"; person: GroupMemberMatchCandidate }
  | { kind: "review"; person: GroupMemberMatchCandidate; reason: "same_name" | "shared_contact" }
  | { kind: "create" };

export function normalizePersonNameForMatch(value: string | null | undefined) {
  return (value ?? "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizePhoneForMatch(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  /* A leading US country code is the same number. */
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  return national.length >= 7 ? national : null;
}

export function normalizeEmailForMatch(value: string | null | undefined) {
  const email = (value ?? "").trim().toLowerCase();

  return email.includes("@") ? email : null;
}

function isArchived(candidate: GroupMemberMatchCandidate) {
  return candidate.status === "archived";
}

export function decideGroupMemberPerson(
  input: GroupMemberMatchInput,
  candidates: readonly GroupMemberMatchCandidate[],
): GroupMemberMatchDecision {
  const name = normalizePersonNameForMatch(input.name);
  const email = normalizeEmailForMatch(input.email);
  const phone = normalizePhoneForMatch(input.phone);
  const sharesContact = (candidate: GroupMemberMatchCandidate) => Boolean(
    (email && normalizeEmailForMatch(candidate.email) === email)
    || (phone && normalizePhoneForMatch(candidate.phone) === phone),
  );
  const contactMatches = candidates.filter(sharesContact);
  const sameNameContact = contactMatches.find((candidate) => name && normalizePersonNameForMatch(candidate.name) === name);

  if (sameNameContact) {
    return { kind: "link", person: sameNameContact };
  }

  if (input.confirmNearDuplicate) {
    return { kind: "create" };
  }

  const otherNameContact = contactMatches.find((candidate) => !isArchived(candidate)) ?? contactMatches[0];

  if (otherNameContact) {
    return { kind: "review", person: otherNameContact, reason: "shared_contact" };
  }

  const sameName = name
    ? candidates.find((candidate) => !isArchived(candidate) && normalizePersonNameForMatch(candidate.name) === name)
    : undefined;

  if (sameName) {
    return { kind: "review", person: sameName, reason: "same_name" };
  }

  return { kind: "create" };
}
