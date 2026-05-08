"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  dosDiscussionGuideLabel,
  dosDiscussionGuideOptions,
  dosMeetingMovementLabel,
  dosMeetingMovementOptions,
  dosMeetingOutcomeLabel,
  dosMeetingOutcomeOptions,
  dosMeetingTypeLabel,
  dosMeetingTypes,
  type DosMeetingFeedItem,
  type DosMeetingOption,
  type DosMeetingsWorkspaceData,
} from "@/src/lib/dos/meeting-options";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const relationshipStageOptions = [
  "New",
  "Exploring",
  "Walking With",
  "Discipling",
  "Multiplying",
  "Inactive",
] as const;

function formatMeetingDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function formatLocalDateTimeInput(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function splitSearchName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function participantNames(meeting: DosMeetingFeedItem) {
  const names = [...meeting.ministers, ...meeting.people].map((person) => person.name);

  return names.length ? names.join(" + ") : "No people attached";
}

function MeetingCard({
  collectiveSlug,
  meeting,
}: {
  collectiveSlug: string;
  meeting: DosMeetingFeedItem;
}) {
  return (
    <Link
      className="group block border border-stone-800 bg-[#080808] p-4 transition-colors hover:border-amber-500/45 sm:p-5"
      href={`/dos/${collectiveSlug}/meetings/${meeting.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400"
            style={{ fontFamily: font.rajdhani }}
          >
            {dosMeetingTypeLabel(meeting.type)}
          </p>
          <h2 className="mt-3 text-2xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {participantNames(meeting)}
          </h2>
        </div>
        <p className="text-sm leading-6 text-stone-500">{formatMeetingDate(meeting.meetingAt)}</p>
      </div>

      {meeting.summaryPrivate ? (
        <p className="mt-4 text-sm leading-6 text-stone-300">{meeting.summaryPrivate}</p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-500">No summary added yet.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {meeting.discussionGuideKey ? <Indicator>{dosDiscussionGuideLabel(meeting.discussionGuideKey)}</Indicator> : null}
        {meeting.outcomeMarkers.slice(0, 4).map((marker) => (
          <Indicator key={marker}>{dosMeetingOutcomeLabel(marker)}</Indicator>
        ))}
        {meeting.followUpNeeded && !meeting.outcomeMarkers.includes("follow_up_needed") ? (
          <Indicator>Follow up needed</Indicator>
        ) : null}
        {meeting.prayerRequested && !meeting.outcomeMarkers.includes("prayer_requested") ? (
          <Indicator>Prayer requested</Indicator>
        ) : null}
        {meeting.relationshipMovement ? <Indicator>{dosMeetingMovementLabel(meeting.relationshipMovement)}</Indicator> : null}
      </div>
    </Link>
  );
}

function Indicator({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="border border-amber-500/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </span>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </span>
  );
}

function ParticipantChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 border border-stone-700 bg-[#050505] px-3 text-sm text-stone-100">
      {children}
      {onRemove ? (
        <button
          aria-label="Remove person"
          className="text-lg leading-none text-stone-500 transition-colors hover:text-amber-300"
          onClick={onRemove}
          type="button"
        >
          &times;
        </button>
      ) : null}
    </span>
  );
}

function AddPersonInline({
  collectiveSlug,
  defaultFirstName,
  defaultLastName,
  onCreated,
}: {
  collectiveSlug: string;
  defaultFirstName: string;
  defaultLastName: string;
  onCreated: (person: DosMeetingOption) => void;
}) {
  const [errorMessage, setErrorMessage] = useState("");
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [isAdding, setIsAdding] = useState(false);
  const [lastName, setLastName] = useState(defaultLastName);
  const [relationshipStage, setRelationshipStage] = useState("Walking With");

  async function handleAddPerson() {
    setErrorMessage("");
    setIsAdding(true);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedRelationshipStage = relationshipStage.trim();

    try {
      const response = await fetch(`/api/dos/${collectiveSlug}/people`, {
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          relationshipStage: trimmedRelationshipStage,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to add this person.");
      }

      onCreated({
        id: String(result.personId),
        kind: "person",
        name: [trimmedFirstName, trimmedLastName].filter(Boolean).join(" "),
        relationshipStage: trimmedRelationshipStage,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add this person.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="mt-3 border border-stone-800 bg-[#050505] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <FormLabel>First Name</FormLabel>
          <input
            className="mt-2 min-h-11 w-full border border-stone-700 bg-[#030303] px-3 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
            name="first_name"
            onChange={(event) => setFirstName(event.target.value)}
            required
            type="text"
            value={firstName}
          />
        </label>
        <label className="block">
          <FormLabel>Last Name</FormLabel>
          <input
            className="mt-2 min-h-11 w-full border border-stone-700 bg-[#030303] px-3 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
            name="last_name"
            onChange={(event) => setLastName(event.target.value)}
            required
            type="text"
            value={lastName}
          />
        </label>
      </div>
      <label className="mt-3 block">
        <FormLabel>Relationship Stage</FormLabel>
        <select
          className="mt-2 min-h-11 w-full border border-stone-700 bg-[#030303] px-3 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
          name="relationship_stage"
          onChange={(event) => setRelationshipStage(event.target.value)}
          value={relationshipStage}
        >
          {relationshipStageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </label>
      {errorMessage ? <p className="mt-3 text-sm leading-6 text-red-200">{errorMessage}</p> : null}
      <button
        className="mt-4 min-h-11 w-full border border-amber-500/50 bg-[#101010] px-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300 transition-colors hover:border-amber-300 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isAdding}
        onClick={handleAddPerson}
        style={{ fontFamily: font.rajdhani }}
        type="button"
      >
        {isAdding ? "Adding..." : "Add and Attach"}
      </button>
    </div>
  );
}

function MeetingLoggerSheet({
  collectiveSlug,
  defaultMinisterId,
  fieldPeople,
  initialPersonId,
  ministers,
  onClose,
}: {
  collectiveSlug: string;
  defaultMinisterId: string;
  fieldPeople: DosMeetingOption[];
  initialPersonId?: string;
  ministers: DosMeetingOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const defaultMinister = ministers.find((minister) => minister.id === defaultMinisterId);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingAtValue, setMeetingAtValue] = useState("");
  const [peopleOptions, setPeopleOptions] = useState(fieldPeople);
  const [searchValue, setSearchValue] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<DosMeetingOption[]>(
    initialPersonId
      ? fieldPeople.filter((person) => person.id === initialPersonId)
      : [],
  );
  const searchName = splitSearchName(searchValue);
  const selectableMinisters = useMemo(
    () => ministers.filter((minister) => minister.id !== defaultMinisterId),
    [defaultMinisterId, ministers],
  );
  const searchResults = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (query.length < 2) {
      return [];
    }

    const selectedKeys = new Set(selectedParticipants.map((person) => `${person.kind}:${person.id}`));

    return [...peopleOptions, ...selectableMinisters]
      .filter((person) => !selectedKeys.has(`${person.kind}:${person.id}`))
      .filter((person) => person.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [peopleOptions, searchValue, selectableMinisters, selectedParticipants]);

  useEffect(() => {
    setMeetingAtValue(formatLocalDateTimeInput(new Date()));
  }, []);

  function addParticipant(person: DosMeetingOption) {
    setSelectedParticipants((current) => {
      if (current.some((candidate) => candidate.id === person.id && candidate.kind === person.kind)) {
        return current;
      }

      return [...current, person];
    });
    setSearchValue("");
    setShowAddPerson(false);
  }

  function removeParticipant(person: DosMeetingOption) {
    setSelectedParticipants((current) =>
      current.filter((candidate) => candidate.id !== person.id || candidate.kind !== person.kind),
    );
  }

  function toggleOutcome(marker: string) {
    setSelectedOutcomes((current) =>
      current.includes(marker)
        ? current.filter((candidate) => candidate !== marker)
        : [...current, marker],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const meetingAtInput = meetingAtValue;
    const meetingDate = meetingAtInput.slice(0, 10);
    const parsedMeetingAt = meetingAtInput ? new Date(meetingAtInput) : new Date();

    try {
      const response = await fetch(`/api/dos/${collectiveSlug}/meetings`, {
        body: JSON.stringify({
          followUpNeeded: selectedOutcomes.includes("follow_up_needed"),
          discussionGuideKey: String(formData.get("discussion_guide_key") ?? "none"),
          meetingAt: parsedMeetingAt.toISOString(),
          meetingDate,
          ministerProfileIds: selectedParticipants
            .filter((person) => person.kind === "profile")
            .map((person) => person.id),
          outcomeMarkers: selectedOutcomes,
          outcomeNotesPrivate: String(formData.get("outcome_notes_private") ?? ""),
          peopleIds: selectedParticipants
            .filter((person) => person.kind === "person")
            .map((person) => person.id),
          prayerRequested: selectedOutcomes.includes("prayer_requested"),
          relationshipMovement: String(formData.get("relationship_movement") ?? "no_change"),
          summaryPrivate: String(formData.get("summary_private") ?? ""),
          type: String(formData.get("type") ?? "kitchen_table"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to log this meeting.");
      }

      onClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to log this meeting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <div
          aria-labelledby="log-meeting-title"
          aria-modal="true"
          className="w-full max-w-2xl border border-stone-800 bg-[#080808] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-7"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400"
                style={{ fontFamily: font.rajdhani }}
              >
                Field Note
              </p>
              <h2
                className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100"
                id="log-meeting-title"
                style={{ fontFamily: font.oswald }}
              >
                Log Meeting
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                Capture ministry movement quickly. Ryan is attached as lead for this field workspace.
              </p>
            </div>
            <button
              aria-label="Close meeting form"
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone-700 text-xl leading-none text-stone-300 transition-colors hover:border-amber-400 hover:text-amber-300"
              onClick={onClose}
              type="button"
            >
              &times;
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FormLabel>Meeting Type</FormLabel>
                <select
                  className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
                  defaultValue="kitchen_table"
                  name="type"
                >
                  {dosMeetingTypes.map((type) => (
                    <option key={type} value={type}>
                      {dosMeetingTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FormLabel>Date / Time</FormLabel>
                <input
                  className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
                  name="meeting_at"
                  onChange={(event) => setMeetingAtValue(event.target.value)}
                  required
                  type="datetime-local"
                  value={meetingAtValue}
                />
              </label>
            </div>

            <section>
              <FormLabel>People involved</FormLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                <ParticipantChip>
                  {defaultMinister?.name ?? "Current field user"} <span className="text-amber-300">(Lead)</span>
                </ParticipantChip>
                {selectedParticipants.map((person) => (
                  <ParticipantChip key={`${person.kind}-${person.id}`} onRemove={() => removeParticipant(person)}>
                    {person.name}
                  </ParticipantChip>
                ))}
              </div>

              <label className="mt-3 block">
                <span className="sr-only">Search people involved</span>
                <input
                  className="min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setShowAddPerson(false);
                  }}
                  placeholder="Search people involved..."
                  type="search"
                  value={searchValue}
                />
              </label>

              {searchValue.trim().length >= 2 ? (
                <div className="mt-3 border border-stone-800 bg-[#050505]">
                  {searchResults.length ? (
                    <div className="divide-y divide-stone-900">
                      {searchResults.map((person) => (
                        <button
                          className="flex min-h-12 w-full items-center justify-between gap-4 px-4 text-left text-sm text-stone-200 transition-colors hover:bg-stone-900/70"
                          key={`${person.kind}-${person.id}`}
                          onClick={() => addParticipant(person)}
                          type="button"
                        >
                          <span>{person.name}</span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500"
                            style={{ fontFamily: font.rajdhani }}
                          >
                            {person.kind === "profile" ? "Collective" : person.relationshipStage ?? "Field"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <button
                        className="min-h-11 w-full border border-amber-500/45 bg-[#101010] px-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300 transition-colors hover:border-amber-300 hover:text-amber-100"
                        onClick={() => setShowAddPerson(true)}
                        style={{ fontFamily: font.rajdhani }}
                        type="button"
                      >
                        + Add New Person
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {showAddPerson ? (
                <AddPersonInline
                  collectiveSlug={collectiveSlug}
                  defaultFirstName={searchName.firstName}
                  defaultLastName={searchName.lastName}
                  onCreated={(person) => {
                    setPeopleOptions((current) => [...current, person]);
                    addParticipant(person);
                  }}
                />
              ) : null}
            </section>

            {/* TODO: Replace this selector with guide templates, per-person guide answers,
                yes/no questions, relationship with Jesus ratings, and guide completion tracking. */}
            <label className="block">
              <FormLabel>What did you discuss?</FormLabel>
              <select
                className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
                defaultValue="none"
                name="discussion_guide_key"
              >
                {dosDiscussionGuideOptions.map((guide) => (
                  <option key={guide} value={guide}>
                    {dosDiscussionGuideLabel(guide)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                Future guides will capture responses separately for each person involved.
              </p>
            </label>

            <label className="block">
              <FormLabel>What happened?</FormLabel>
              <textarea
                className="mt-2 min-h-20 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-base leading-7 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
                maxLength={600}
                name="summary_private"
                placeholder="Briefly capture what happened in the conversation."
                rows={2}
              />
            </label>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <FormLabel>What changed?</FormLabel>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    Fruit / Outcome captures what shifted during or after the conversation.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {dosMeetingOutcomeOptions.map((marker) => {
                  const isSelected = selectedOutcomes.includes(marker);

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`min-h-11 border px-3 text-left text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                        isSelected
                          ? "border-amber-400 bg-amber-400 text-stone-950"
                          : "border-stone-700 bg-[#050505] text-stone-300 hover:border-amber-500/50 hover:text-amber-300"
                      }`}
                      key={marker}
                      onClick={() => toggleOutcome(marker)}
                      style={{ fontFamily: font.rajdhani }}
                      type="button"
                    >
                      {dosMeetingOutcomeLabel(marker)}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-[1fr_0.85fr]">
              <label className="block">
                <FormLabel>Outcome Notes</FormLabel>
                <textarea
                  className="mt-2 min-h-16 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
                  maxLength={500}
                  name="outcome_notes_private"
                  placeholder="Small note about what changed."
                  rows={2}
                />
              </label>

              <label className="block">
                <FormLabel>Did their commitment level change?</FormLabel>
                <select
                  className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
                  defaultValue="no_change"
                  name="relationship_movement"
                >
                  {dosMeetingMovementOptions.map((movement) => (
                    <option key={movement} value={movement}>
                      {dosMeetingMovementLabel(movement)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {errorMessage ? (
              <div className="border border-red-500/35 bg-red-950/30 p-4 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-xs leading-5 text-stone-500">
                Meeting summaries, outcomes, and prayer context stay private to the owning organization.
              </p>
              <button
                className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                style={{ fontFamily: font.rajdhani }}
                type="submit"
              >
                {isSubmitting ? "Logging..." : "Log Meeting"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function MeetingsWorkspaceClient({
  collectiveSlug,
  data,
  initialPersonId,
}: {
  collectiveSlug: string;
  data: DosMeetingsWorkspaceData;
  initialPersonId?: string;
}) {
  const [isLoggerOpen, setIsLoggerOpen] = useState(Boolean(initialPersonId));
  const feedHeading = useMemo(() => {
    const count = data.meetings.length;

    return count === 1 ? "1 meeting logged" : `${count} meetings logged`;
  }, [data.meetings.length]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm leading-6 text-stone-400">{feedHeading}</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Recent ministry interactions, prayer context, and follow up markers.
          </p>
        </div>
        <button
          className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300"
          onClick={() => setIsLoggerOpen(true)}
          style={{ fontFamily: font.rajdhani }}
          type="button"
        >
          Log Meeting
        </button>
      </div>

      <div className="mt-6">
        {data.meetings.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.meetings.map((meeting) => (
              <MeetingCard collectiveSlug={collectiveSlug} key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-stone-800 bg-[#080808] p-6 text-sm leading-7 text-stone-400">
            <p className="text-stone-200">No meetings logged yet.</p>
            <p className="mt-2 text-stone-500">Start with the next real ministry interaction.</p>
          </div>
        )}
      </div>

      {isLoggerOpen ? (
        <MeetingLoggerSheet
          collectiveSlug={collectiveSlug}
          defaultMinisterId={data.defaultMinisterId}
          fieldPeople={data.fieldPeople}
          initialPersonId={initialPersonId}
          ministers={data.ministers}
          onClose={() => setIsLoggerOpen(false)}
        />
      ) : null}
    </>
  );
}
