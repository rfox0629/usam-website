/* USA-246 booking write path: Person resolution for a public booking.
 *
 * This is DOS's duplicate detection (the same email / phone / name keys the
 * People import uses) applied to one guest, with the founder's rule on top:
 * link automatically only on a single unambiguous exact email or phone
 * match; otherwise preserve the guest details and flag the booking for
 * review; create a new Person only when nothing credible matches.
 *
 * Dependency-free on purpose so the regression script can import it. */

export type BookingPersonCandidate = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

export type BookingPersonMatchReason = "email_exact" | "name_exact" | "phone_exact";

export type BookingPersonMatchCandidate = {
  name: string;
  personId: string;
  reasons: BookingPersonMatchReason[];
};

export type BookingPersonMatch =
  | { candidates: BookingPersonMatchCandidate[]; personId: string; status: "linked" }
  | { candidates: BookingPersonMatchCandidate[]; reason: "ambiguous" | "possible"; status: "review" }
  | { candidates: []; status: "create" };

function cleanText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeBookingEmail(value: string | null | undefined) {
  const email = cleanText(value).toLowerCase();

  return email.includes("@") ? email : null;
}

/* Digits only. A leading US country code is dropped so "+1 (555) 010-0001"
   and "555-010-0001" are the same number. Fewer than seven digits is not a
   phone number we would match on. */
export function normalizeBookingPhone(value: string | null | undefined) {
  let digits = cleanText(value).replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return digits.length >= 7 ? digits : null;
}

export function normalizeBookingName(value: string | null | undefined) {
  const name = cleanText(value).toLowerCase();

  return name ? name : null;
}

export function matchBookingPerson(
  guest: { email: string | null | undefined; name: string | null | undefined; phone: string | null | undefined },
  people: BookingPersonCandidate[],
): BookingPersonMatch {
  const email = normalizeBookingEmail(guest.email);
  const phone = normalizeBookingPhone(guest.phone);
  const name = normalizeBookingName(guest.name);
  const strong = new Map<string, BookingPersonMatchCandidate>();
  const add = (person: BookingPersonCandidate, reason: BookingPersonMatchReason) => {
    const current = strong.get(person.id);

    if (current) {
      if (!current.reasons.includes(reason)) {
        current.reasons.push(reason);
      }

      return;
    }

    strong.set(person.id, { name: person.name, personId: person.id, reasons: [reason] });
  };

  for (const person of people) {
    if (email && normalizeBookingEmail(person.email) === email) {
      add(person, "email_exact");
    }

    if (phone && normalizeBookingPhone(person.phone) === phone) {
      add(person, "phone_exact");
    }
  }

  const strongCandidates = Array.from(strong.values());

  if (strongCandidates.length === 1) {
    return { candidates: strongCandidates, personId: strongCandidates[0].personId, status: "linked" };
  }

  if (strongCandidates.length > 1) {
    return { candidates: strongCandidates, reason: "ambiguous", status: "review" };
  }

  const nameCandidates = name
    ? people
      .filter((person) => normalizeBookingName(person.name) === name)
      .map((person): BookingPersonMatchCandidate => ({ name: person.name, personId: person.id, reasons: ["name_exact"] }))
    : [];

  if (nameCandidates.length) {
    return { candidates: nameCandidates, reason: "possible", status: "review" };
  }

  return { candidates: [], status: "create" };
}
