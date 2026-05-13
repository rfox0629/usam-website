export type DosMeetingDisplayPerson = {
  id: string;
  name: string;
};

export function normalizeDosParticipantNames(names: readonly string[]) {
  const seen = new Set<string>();

  return names.reduce<string[]>((cleanNames, name) => {
    const cleanName = name.trim();
    const key = cleanName.toLowerCase();

    if (!cleanName || seen.has(key)) {
      return cleanNames;
    }

    seen.add(key);
    cleanNames.push(cleanName);

    return cleanNames;
  }, []);
}

export function resolveDosMeetingParticipantNames({
  fieldPersonIds,
  participantNames,
  people,
}: {
  fieldPersonIds?: readonly string[] | null;
  participantNames?: readonly string[] | null;
  people?: readonly DosMeetingDisplayPerson[] | null;
}) {
  const peopleById = new Map((people ?? []).map((person) => [person.id, person.name]));
  const linkedNames = normalizeDosParticipantNames(
    (fieldPersonIds ?? [])
      .map((personId) => peopleById.get(personId) ?? "")
      .filter(Boolean),
  );
  const quickNames = normalizeDosParticipantNames(participantNames ?? []).filter(
    (name) => !linkedNames.some((linkedName) => linkedName.toLowerCase() === name.toLowerCase()),
  );

  return [...linkedNames, ...quickNames];
}

export function formatDosParticipantTitle(names: readonly string[], fallback = "Private meeting") {
  const cleanNames = normalizeDosParticipantNames(names);

  if (cleanNames.length === 0) {
    return fallback;
  }

  if (cleanNames.length === 1) {
    return cleanNames[0];
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} + ${cleanNames[1]}`;
  }

  return `${cleanNames[0]} + ${cleanNames.length - 1} others`;
}

export function formatDosParticipantList(names: readonly string[], fallback = "Private meeting") {
  const cleanNames = normalizeDosParticipantNames(names);

  return cleanNames.length ? cleanNames.join(" + ") : fallback;
}

export function formatDosMeetingSecondary(contextLabel: string, dateLabel: string) {
  return [contextLabel, dateLabel].filter(Boolean).join(" • ");
}
