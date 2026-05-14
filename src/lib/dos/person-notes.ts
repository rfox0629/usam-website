export type DosPersonNote = {
  body: string;
  createdAt: string | null;
  id: string;
};

const additionalInfoMarker = "\n\nAdditional information:\n";
const additionalInfoPrefix = "Additional information:\n";
const noteStartPrefix = "<!-- DOS_NOTE ";
const noteEndMarker = "<!-- /DOS_NOTE -->";
const notePattern = /<!-- DOS_NOTE ([^>]+) -->\n([\s\S]*?)\n<!-- \/DOS_NOTE -->/g;

export function splitPersonNotesValue(value: string | null | undefined) {
  const rawValue = value?.trim() ?? "";

  if (rawValue.startsWith(additionalInfoPrefix)) {
    return {
      additional: rawValue.slice(additionalInfoPrefix.length).trim(),
      notes: "",
    };
  }

  if (!rawValue.includes(additionalInfoMarker)) {
    return { additional: "", notes: rawValue };
  }

  const [notes = "", additional = ""] = rawValue.split(additionalInfoMarker);

  return {
    additional: additional.trim(),
    notes: notes.trim(),
  };
}

export function joinPersonNotesValue(notes: string | null | undefined, additional: string | null | undefined) {
  return [notes?.trim() ?? "", additional?.trim() ? `Additional information:\n${additional.trim()}` : ""]
    .filter(Boolean)
    .join("\n\n") || null;
}

function noteId(body: string, createdAt: string | null, index: number) {
  return `${createdAt ?? "legacy"}-${index}-${body.slice(0, 18)}`;
}

export function parsePersonNotes(value: string | null | undefined, fallbackCreatedAt?: string | null): DosPersonNote[] {
  const { notes } = splitPersonNotesValue(value);

  if (!notes) {
    return [];
  }

  const parsedNotes: DosPersonNote[] = [];
  let match: RegExpExecArray | null;
  let matchedText = "";

  notePattern.lastIndex = 0;
  while ((match = notePattern.exec(notes)) !== null) {
    const createdAt = match[1]?.trim() || null;
    const body = match[2]?.trim() ?? "";

    matchedText += match[0];

    if (body) {
      parsedNotes.push({
        body,
        createdAt,
        id: noteId(body, createdAt, parsedNotes.length),
      });
    }
  }

  notePattern.lastIndex = 0;
  const legacyText = notes
    .replace(notePattern, "")
    .trim();
  notePattern.lastIndex = 0;

  if (legacyText) {
    parsedNotes.push({
      body: legacyText,
      createdAt: fallbackCreatedAt ?? null,
      id: noteId(legacyText, fallbackCreatedAt ?? null, parsedNotes.length),
    });
  }

  if (!parsedNotes.length && matchedText.trim()) {
    return [];
  }

  return parsedNotes.sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;

    return secondTime - firstTime;
  });
}

export function personNotesToPlainText(value: string | null | undefined) {
  return parsePersonNotes(value)
    .map((note) => note.body)
    .join("\n\n");
}

export function appendPersonNoteToValue(value: string | null | undefined, body: string, createdAt = new Date().toISOString()) {
  const noteBody = body.trim();

  if (!noteBody) {
    return value?.trim() || null;
  }

  const { additional, notes } = splitPersonNotesValue(value);
  const nextNote = `${noteStartPrefix}${createdAt} -->\n${noteBody}\n${noteEndMarker}`;

  return joinPersonNotesValue([nextNote, notes].filter(Boolean).join("\n\n"), additional);
}
