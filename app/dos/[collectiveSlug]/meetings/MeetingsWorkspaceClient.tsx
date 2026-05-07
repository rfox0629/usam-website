"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  dosMeetingMovementLabel,
  dosMeetingMovementOptions,
  dosMeetingTypeLabel,
  dosMeetingTypes,
  type DosMeetingFeedItem,
  type DosMeetingOption,
  type DosMeetingsWorkspaceData,
} from "@/src/lib/dos/meeting-options";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

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
        {meeting.followUpNeeded ? <Indicator>Follow up needed</Indicator> : null}
        {meeting.prayerRequested ? <Indicator>Prayer requested</Indicator> : null}
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

function CheckboxRow({
  checked,
  disabled = false,
  label,
  note,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  note?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 border border-stone-800 bg-[#050505] p-3">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-amber-400"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-semibold text-stone-100">{label}</span>
        {note ? <span className="mt-1 block text-xs leading-5 text-stone-500">{note}</span> : null}
      </span>
    </label>
  );
}

function toggleSelected(values: string[], value: string, checked: boolean) {
  if (checked) {
    return Array.from(new Set([...values, value]));
  }

  return values.filter((candidate) => candidate !== value);
}

function MeetingLoggerSheet({
  collectiveSlug,
  defaultMeetingAt,
  defaultMinisterId,
  fieldPeople,
  initialPersonId,
  ministers,
  onClose,
}: {
  collectiveSlug: string;
  defaultMeetingAt: string;
  defaultMinisterId: string;
  fieldPeople: DosMeetingOption[];
  initialPersonId?: string;
  ministers: DosMeetingOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMinisterIds, setSelectedMinisterIds] = useState<string[]>(
    defaultMinisterId ? [defaultMinisterId] : [],
  );
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>(
    initialPersonId && fieldPeople.some((person) => person.id === initialPersonId) ? [initialPersonId] : [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const meetingAtInput = String(formData.get("meeting_at") ?? "");
    const meetingDate = meetingAtInput.slice(0, 10);
    const parsedMeetingAt = meetingAtInput ? new Date(meetingAtInput) : new Date();

    try {
      const response = await fetch(`/api/dos/${collectiveSlug}/meetings`, {
        body: JSON.stringify({
          followUpNeeded: formData.get("follow_up_needed") === "on",
          meetingAt: parsedMeetingAt.toISOString(),
          meetingDate,
          ministerProfileIds: selectedMinisterIds,
          peopleIds: selectedPeopleIds,
          prayerRequested: formData.get("prayer_requested") === "on",
          relationshipMovement: String(formData.get("relationship_movement") ?? ""),
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

      form.reset();
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
                Capture the ministry moment quickly. Details can deepen later.
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
                  defaultValue={defaultMeetingAt}
                  name="meeting_at"
                  required
                  type="datetime-local"
                />
              </label>
            </div>

            <section>
              <FormLabel>People involved</FormLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ministers.map((minister) => (
                  <CheckboxRow
                    checked={selectedMinisterIds.includes(minister.id)}
                    key={minister.id}
                    label={minister.name}
                    note={minister.id === defaultMinisterId ? "Current field user" : "Collective member"}
                    onChange={(checked) => setSelectedMinisterIds((current) => toggleSelected(current, minister.id, checked))}
                  />
                ))}
                {fieldPeople.map((person) => (
                  <CheckboxRow
                    checked={selectedPeopleIds.includes(person.id)}
                    key={person.id}
                    label={person.name}
                    note={person.relationshipStage ?? "Person in your field"}
                    onChange={(checked) => setSelectedPeopleIds((current) => toggleSelected(current, person.id, checked))}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                TODO: Add a new person inline from this sheet after the base logging workflow is stable.
              </p>
            </section>

            <label className="block">
              <FormLabel>Short Summary</FormLabel>
              <textarea
                className="mt-2 min-h-24 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-base leading-7 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
                maxLength={600}
                name="summary_private"
                placeholder="Jordan opened up about fear and isolation."
                rows={3}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 border border-stone-800 bg-[#050505] p-4">
                <input className="h-4 w-4 accent-amber-400" name="prayer_requested" type="checkbox" />
                <span className="text-sm font-semibold text-stone-200">Prayer requested?</span>
              </label>
              <label className="flex items-center gap-3 border border-stone-800 bg-[#050505] p-4">
                <input className="h-4 w-4 accent-amber-400" name="follow_up_needed" type="checkbox" />
                <span className="text-sm font-semibold text-stone-200">Follow up needed?</span>
              </label>
            </div>

            <label className="block">
              <FormLabel>Movement</FormLabel>
              <select
                className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
                defaultValue=""
                name="relationship_movement"
              >
                <option value="">No movement marker</option>
                {dosMeetingMovementOptions.map((movement) => (
                  <option key={movement} value={movement}>
                    {dosMeetingMovementLabel(movement)}
                  </option>
                ))}
              </select>
            </label>

            {errorMessage ? (
              <div className="border border-red-500/35 bg-red-950/30 p-4 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-xs leading-5 text-stone-500">
                Meeting summaries and prayer context stay private to the owning organization.
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

export function MeetingsWorkspaceClient({
  collectiveSlug,
  data,
  defaultMeetingAt,
  initialPersonId,
}: {
  collectiveSlug: string;
  data: DosMeetingsWorkspaceData;
  defaultMeetingAt: string;
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
          defaultMeetingAt={defaultMeetingAt}
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
