/**
 * USA-191: repeating answers (household members, references, prayer partners).
 *
 * These questions used to be one free-text box asking an applicant to list
 * several people inside it. They are now edited as rows with an add button.
 *
 * The stored answer stays a plain string on purpose. Operations, the review
 * step, the submission payload and the notification emails all read these
 * fields as text, so keeping one readable line per person means the whole
 * backend keeps working untouched and an existing draft written as prose still
 * loads. One line is one person; cells are separated by a pipe because it is
 * the one character that does not appear in a name, a relationship or an email.
 */
const CELL = " | ";

export function parseListValue(value: string, columnCount: number): string[][] {
  const rows = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());

      return Array.from({ length: columnCount }, (_unused, index) => cells[index] ?? "");
    });

  return rows.length > 0 ? rows : [Array.from({ length: columnCount }, () => "")];
}

export function serializeListValue(rows: string[][]): string {
  return rows
    .map((row) => {
      // Trailing empties are dropped so a half-filled row reads as what was
      // actually entered rather than as a name followed by empty separators.
      const cells = [...row];

      while (cells.length > 0 && !cells[cells.length - 1].trim()) {
        cells.pop();
      }

      // A pipe typed inside a cell would read back as a cell boundary and
      // shift everything after it into the wrong column, so it is stored as a
      // slash.
      return cells.map((cell) => cell.trim().replace(/\|/g, "/")).join(CELL);
    })
    .filter(Boolean)
    .join("\n");
}

/** How many people the applicant has actually named. */
export function listRowCount(value: string) {
  return value.split("\n").filter((line) => line.trim()).length;
}

/** The id of one cell of a repeating answer, so Review can point at it. */
export function listCellId(fieldId: string, rowIndex: number, cellIndex: number) {
  return rowIndex === 0 && cellIndex === 0 ? fieldId : `${fieldId}-row${rowIndex + 1}-cell${cellIndex + 1}`;
}

/**
 * A reference Operations could not act on: a row with something in it but no
 * name, or a name and no way to reach them. Each is named with what it lacks,
 * so Review can say which reference and what is missing instead of a general
 * "each reference needs a name and a way to reach them".
 */
export function incompleteReferences(value: string | undefined) {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    return [];
  }

  return parseListValue(trimmed, 3).flatMap(([name, relationship, contact], rowIndex) => {
    const hasName = Boolean(name.trim());
    const hasContact = Boolean(contact.trim());

    if (hasName && hasContact) {
      return [];
    }

    if (!hasName && !relationship.trim() && !hasContact) {
      return [];
    }

    const who = hasName ? `Reference ${rowIndex + 1} (${name.trim()})` : `Reference ${rowIndex + 1}`;
    const needs = [!hasName ? "a name" : "", !hasContact ? "a phone or email" : ""].filter(Boolean).join(" and ");

    return [{ cellIndex: hasName ? 2 : 0, label: `${who}: add ${needs}`, rowIndex }];
  });
}

/** Which cells of a reference row are missing: the name, the contact, or both. */
export function referenceRowGaps(row: string[]) {
  const [name = "", relationship = "", contact = ""] = row;

  if (!name.trim() && !relationship.trim() && !contact.trim()) {
    return [];
  }

  return [!name.trim() ? 0 : -1, !contact.trim() ? 2 : -1].filter((cell) => cell >= 0);
}
