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

      return cells.map((cell) => cell.trim()).join(CELL);
    })
    .filter(Boolean)
    .join("\n");
}

/** How many people the applicant has actually named. */
export function listRowCount(value: string) {
  return value.split("\n").filter((line) => line.trim()).length;
}
