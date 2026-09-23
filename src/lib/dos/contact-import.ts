/* USA-283: bring people in from the leader's own phone contacts.
 *
 * Two routes, both ending in the same review step before anything is saved:
 *
 *   1. A vCard (.vcf) file. The iPhone Contacts app exports one contact, a
 *      selection, or a whole list as a single .vcf (Share Contact / Export ->
 *      Save to Files, AirDrop or Mail), and iCloud.com exports the same. This
 *      is the route that works on iPhone today, in Safari and in the installed
 *      home-screen app.
 *   2. The browser Contact Picker (navigator.contacts.select). Offered only
 *      where the browser exposes it without experimental settings (Chrome on
 *      Android). WebKit still ships it behind a feature flag (webkit.org bug
 *      204132), so an iPhone never sees this option.
 *
 * Nothing here talks to the server. It turns what the leader chose into
 * editable drafts; saving goes through the canonical group-member write path
 * one reviewed person at a time. No address book is ever uploaded whole.
 */

export type ImportedContactValue = {
  label: string | null;
  preferred: boolean;
  value: string;
};

export type ImportedContactNameSource = "structured" | "formatted" | "organization" | "none";

export type ImportedContact = {
  /* Stable within one import, for list keys and selection. */
  key: string;
  displayName: string;
  emails: ImportedContactValue[];
  firstName: string;
  lastName: string;
  /* Where the name came from. Only "structured" (the vCard N property, which
     says which part is the given name) is trusted as a first/last split. */
  nameSource: ImportedContactNameSource;
  /* True when the leader should look at the name before saving: no name at
     all, a company card, or a full name with more than two words that we could
     only split by guessing. */
  nameNeedsReview: boolean;
  organization: string | null;
  phones: ImportedContactValue[];
};

export type VCardParseResult = {
  contacts: ImportedContact[];
  /* vCards that carried nothing usable (no name, phone or email). */
  skipped: number;
};

/* A generous ceiling for one file. A whole-address-book export is still
   allowed (the leader then picks who to add); this only stops a runaway file
   from freezing the page. */
export const contactImportMaxFileBytes = 15 * 1024 * 1024;
export const contactImportMaxContacts = 5000;

function compactSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/* RFC 6350 §3.2 / RFC 2425: a line that begins with a space or tab continues
   the previous one. Apple folds long PHOTO lines this way. */
function unfoldLines(text: string) {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

/* Backslash escapes inside a text value: \n, \, \; and \\. */
function unescapeText(value: string) {
  return value.replace(/\\([nN,;\\])/g, (_match, char: string) => (char === "n" || char === "N" ? " " : char));
}

/* Split on unescaped semicolons only (N and ADR are structured). */
function splitStructured(value: string) {
  const parts: string[] = [];
  let current = "";

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char === "\\" && index + 1 < value.length) {
      current += char + value[index + 1];
      index += 1;
      continue;
    }

    if (char === ";") {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current);

  return parts.map((part) => compactSpaces(unescapeText(part)));
}

function decodeQuotedPrintable(value: string) {
  const bytes: number[] = [];
  const cleaned = value.replace(/=\n/g, "");

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (char === "=" && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(index + 1, index + 3))) {
      bytes.push(parseInt(cleaned.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(char.charCodeAt(0) & 0xff);
    }
  }

  try {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch {
    return cleaned;
  }
}

type ParsedProperty = {
  name: string;
  params: Map<string, string[]>;
  value: string;
};

function parsePropertyLine(line: string): ParsedProperty | null {
  /* The value starts after the first colon that is not inside a quoted
     parameter value. */
  let inQuotes = false;
  let colonIndex = -1;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === ":" && !inQuotes) {
      colonIndex = index;
      break;
    }
  }

  if (colonIndex <= 0) {
    return null;
  }

  const head = line.slice(0, colonIndex);
  const [rawName, ...rawParams] = head.split(";");
  /* Apple groups related lines as `item1.TEL`, `item1.X-ABLabel`. */
  const name = rawName.includes(".") ? rawName.slice(rawName.lastIndexOf(".") + 1) : rawName;
  const params = new Map<string, string[]>();

  rawParams.forEach((param) => {
    const equalsIndex = param.indexOf("=");
    const key = (equalsIndex >= 0 ? param.slice(0, equalsIndex) : "TYPE").trim().toUpperCase();
    const rawValue = equalsIndex >= 0 ? param.slice(equalsIndex + 1) : param;
    const values = rawValue
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, "").toLowerCase())
      .filter(Boolean);

    params.set(key, [...(params.get(key) ?? []), ...values]);
  });

  let value = line.slice(colonIndex + 1);

  if ((params.get("ENCODING") ?? []).includes("quoted-printable")) {
    value = decodeQuotedPrintable(value);
  }

  return { name: name.trim().toUpperCase(), params, value };
}

const valueLabelMap: Record<string, string> = {
  cell: "Mobile",
  home: "Home",
  iphone: "iPhone",
  main: "Main",
  mobile: "Mobile",
  other: "Other",
  work: "Work",
};

function valueLabel(types: readonly string[]) {
  for (const type of types) {
    if (valueLabelMap[type]) {
      return valueLabelMap[type];
    }
  }

  return null;
}

function addValue(list: ImportedContactValue[], value: string, types: readonly string[]) {
  const cleaned = compactSpaces(unescapeText(value)).replace(/^tel:/i, "").replace(/^mailto:/i, "");

  if (!cleaned || list.some((item) => item.value.toLowerCase() === cleaned.toLowerCase())) {
    return;
  }

  list.push({ label: valueLabel(types), preferred: types.includes("pref"), value: cleaned });
}

/* Preferred values first, then document order. */
function orderValues(list: ImportedContactValue[]) {
  return list
    .map((item, index) => ({ index, item }))
    .sort((a, b) => Number(b.item.preferred) - Number(a.item.preferred) || a.index - b.index)
    .map(({ item }) => item);
}

/* Split a single full-name string. One word is a first name. Two words split
   the obvious way. Three or more are split at the first space and flagged,
   because "Mary Ann Smith" and "Juan de la Cruz" cannot be told apart. */
export function splitFullNameForReview(fullName: string) {
  const normalized = compactSpaces(fullName);

  if (!normalized) {
    return { firstName: "", lastName: "", needsReview: true };
  }

  const words = normalized.split(" ");

  if (words.length === 1) {
    return { firstName: words[0], lastName: "", needsReview: false };
  }

  return {
    firstName: words[0],
    lastName: words.slice(1).join(" "),
    needsReview: words.length > 2,
  };
}

function buildContact(
  index: number,
  fields: {
    emails: ImportedContactValue[];
    formattedName: string;
    organization: string;
    phones: ImportedContactValue[];
    structured: { family: string; given: string; middle: string; prefix: string; suffix: string } | null;
  },
): ImportedContact | null {
  const phones = orderValues(fields.phones);
  const emails = orderValues(fields.emails);
  const organization = fields.organization || null;
  let firstName = "";
  let lastName = "";
  let nameSource: ImportedContactNameSource = "none";
  let nameNeedsReview = true;

  if (fields.structured && (fields.structured.given || fields.structured.family)) {
    /* N gives the parts outright. A middle name stays with the first name
       (as the People form would show "Mary Ann"), a suffix with the last. */
    firstName = compactSpaces([fields.structured.given, fields.structured.middle].filter(Boolean).join(" "));
    lastName = compactSpaces([fields.structured.family, fields.structured.suffix].filter(Boolean).join(" "));
    nameSource = "structured";
    /* A family name with no given name still needs a first name to save. */
    nameNeedsReview = !firstName;

    if (!firstName && lastName) {
      firstName = lastName;
      lastName = "";
    }
  } else if (fields.formattedName) {
    const split = splitFullNameForReview(fields.formattedName);

    firstName = split.firstName;
    lastName = split.lastName;
    nameSource = "formatted";
    nameNeedsReview = split.needsReview;
  } else if (organization) {
    /* A company card. Offer the company as the name, but the leader decides. */
    firstName = organization;
    nameSource = "organization";
    nameNeedsReview = true;
  }

  const displayName = compactSpaces([firstName, lastName].join(" ")) || fields.formattedName || organization || phones[0]?.value || emails[0]?.value || "";

  if (!displayName && !phones.length && !emails.length) {
    return null;
  }

  return {
    displayName: displayName || "No name",
    emails,
    firstName,
    key: `contact-${index}`,
    lastName,
    nameNeedsReview,
    nameSource,
    organization,
    phones,
  };
}

export function parseVCardText(text: string): VCardParseResult {
  const lines = unfoldLines(text.replace(/^﻿/, ""));
  const contacts: ImportedContact[] = [];
  let skipped = 0;
  let inCard = false;
  let current: Parameters<typeof buildContact>[1] | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const upper = line.trim().toUpperCase();

    if (upper === "BEGIN:VCARD") {
      inCard = true;
      current = { emails: [], formattedName: "", organization: "", phones: [], structured: null };
      continue;
    }

    if (upper === "END:VCARD") {
      if (inCard && current) {
        const contact = buildContact(contacts.length, current);

        if (contact) {
          contacts.push(contact);
        } else {
          skipped += 1;
        }
      }

      inCard = false;
      current = null;

      if (contacts.length >= contactImportMaxContacts) {
        break;
      }

      continue;
    }

    if (!inCard || !current) {
      continue;
    }

    const property = parsePropertyLine(line);

    if (!property) {
      continue;
    }

    const types = property.params.get("TYPE") ?? [];

    switch (property.name) {
      case "N": {
        const [family = "", given = "", middle = "", prefix = "", suffix = ""] = splitStructured(property.value);

        current.structured = { family, given, middle, prefix, suffix };
        break;
      }
      case "FN":
        current.formattedName = compactSpaces(unescapeText(property.value));
        break;
      case "ORG":
        current.organization = splitStructured(property.value).filter(Boolean).join(", ");
        break;
      case "TEL":
        addValue(current.phones, property.value, types);
        break;
      case "EMAIL":
        addValue(current.emails, property.value, types);
        break;
      default:
        break;
    }
  }

  return { contacts, skipped };
}

/* The Contact Picker returns arrays of strings: name is a list of full names,
   with no given/family split, so every multi-word name is a guess. */
export type ContactPickerResult = {
  email?: string[];
  name?: string[];
  tel?: string[];
};

export function contactsFromPickerResults(results: readonly ContactPickerResult[]): ImportedContact[] {
  return results
    .map((result, index) => buildContact(index, {
      emails: (result.email ?? []).reduce<ImportedContactValue[]>((list, value) => {
        addValue(list, value, []);
        return list;
      }, []),
      formattedName: compactSpaces(result.name?.[0] ?? ""),
      organization: "",
      phones: (result.tel ?? []).reduce<ImportedContactValue[]>((list, value) => {
        addValue(list, value, []);
        return list;
      }, []),
      structured: null,
    }))
    .filter((contact): contact is ImportedContact => Boolean(contact));
}

type ContactsManagerLike = {
  getProperties?: () => Promise<string[]>;
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactPickerResult[]>;
};

/* Direct picking is offered only when the browser really exposes it. On
   iPhone this is false unless someone has turned on an experimental Safari
   setting, which we do not ask anyone to do. */
export function contactPickerAvailable(scope: unknown = typeof window === "undefined" ? undefined : window): boolean {
  const candidate = scope as { ContactsManager?: unknown; navigator?: { contacts?: Partial<ContactsManagerLike> } } | undefined;

  return Boolean(
    candidate
    && candidate.ContactsManager
    && candidate.navigator?.contacts
    && typeof candidate.navigator.contacts.select === "function",
  );
}

export async function pickContactsFromDevice(): Promise<ImportedContact[]> {
  const contacts = (navigator as Navigator & { contacts?: ContactsManagerLike }).contacts;

  if (!contacts) {
    return [];
  }

  const supported = contacts.getProperties ? await contacts.getProperties() : ["name", "email", "tel"];
  const properties = ["name", "email", "tel"].filter((property) => supported.includes(property));
  const results = await contacts.select(properties, { multiple: true });

  return contactsFromPickerResults(results);
}

export function isLikelyVCardFile(file: { name: string; type: string }) {
  const name = file.name.toLowerCase();

  return name.endsWith(".vcf") || name.endsWith(".vcard") || /vcard/i.test(file.type);
}
