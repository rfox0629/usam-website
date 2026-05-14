const additionalInfoMarker = "\n\nAdditional information:\n";
const additionalInfoPrefix = "Additional information:\n";
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

export function personNotesToPlainText(value: string | null | undefined) {
  const { notes } = splitPersonNotesValue(value);

  if (!notes) {
    return "";
  }

  const noteBodies: string[] = [];
  let match: RegExpExecArray | null;

  notePattern.lastIndex = 0;
  while ((match = notePattern.exec(notes)) !== null) {
    const body = match[2]?.trim() ?? "";

    if (body) {
      noteBodies.push(body);
    }
  }

  notePattern.lastIndex = 0;
  const legacyText = notes
    .replace(notePattern, "")
    .trim();
  notePattern.lastIndex = 0;

  if (legacyText) {
    noteBodies.push(legacyText);
  }

  return noteBodies.join("\n\n");
}
