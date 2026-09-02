// Pure Planning Center people transform. No imports, so the regression script
// can execute it directly.
//
// Identity is keyed strictly by the stable Planning Center person id. Nothing
// here matches, scores, or merges on a name.

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type NormalizedPerson = {
  display_name: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  pco_person_id: string;
  pco_updated_at: string | null;
  raw_payload: JsonRecord;
};

export function normalizePerson(person: JsonRecord): NormalizedPerson | null {
  const id = cleanText(person.id);

  if (!id) {
    return null;
  }

  const attributes = asRecord(person.attributes);
  const first = cleanText(attributes.first_name);
  const last = cleanText(attributes.last_name);
  const assembled = [first, last].filter(Boolean).join(" ").trim() || null;

  return {
    // Planning Center may not expose a name for every giving person; when it
    // does not, the donor stays unnamed rather than being invented.
    display_name: assembled,
    email: cleanText(attributes.email_address) ?? cleanText(attributes.email),
    first_name: first,
    last_name: last,
    pco_person_id: id,
    pco_updated_at: cleanText(attributes.updated_at),
    raw_payload: { attributes },
  };
}

/**
 * Resolves the label a Finance row shows for a gift.
 *
 * A gift with no person relationship is genuinely anonymous and says so. A gift
 * that has a person id we have not cached yet is unknown, not anonymous — the
 * two are different facts and the UI should not blur them.
 */
export function donorLabel({
  cachedDisplayName,
  personId,
  recordFallback,
}: {
  cachedDisplayName?: string | null;
  personId?: string | null;
  recordFallback?: string | null;
}) {
  if (cachedDisplayName && cachedDisplayName.trim()) {
    return cachedDisplayName.trim();
  }

  if (recordFallback && recordFallback.trim()) {
    return recordFallback.trim();
  }

  return personId ? "Unknown donor" : "Anonymous";
}
