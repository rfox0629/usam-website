/* The canonical way DOS turns a person's name into its parts and back.
 *
 * A Person has one stored `name` (missionary_field_people.name). Every form
 * that creates or edits one -- the People form, the household sync and, since
 * USA-283, a group's Add person -- asks for First name (required) and Last
 * name (optional) and stores them joined with a single space. Nothing is
 * transliterated or re-cased: "José", "O'Brien", "Smith-Jones" and "van der
 * Berg" are kept exactly as typed.
 */

export function compactNamePart(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

/* Splits a stored name at its first space, which is how an existing name is
   shown in the two fields for editing. It is a display split for a name the
   leader then checks, never a silent rewrite of what is stored. */
export function splitNameParts(value: string | null | undefined) {
  const normalized = compactNamePart(value);

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName = "", ...lastNameParts] = normalized.split(" ");

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

export function joinNameParts(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [compactNamePart(firstName), compactNamePart(lastName)].filter(Boolean).join(" ");
}

/* True when a typed full name has more than two words, so which words are the
   last name is a guess ("Mary Ann Smith" or "Juan de la Cruz"). */
export function nameSplitIsAmbiguous(value: string | null | undefined) {
  return compactNamePart(value).split(" ").filter(Boolean).length > 2;
}
