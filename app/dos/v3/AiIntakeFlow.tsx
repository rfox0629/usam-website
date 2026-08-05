"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDaysFromToday,
  formatPrototypeDate,
  intakeSourceLabels,
  meetingKindLabels,
  sampleSuggestion,
  sampleTranscript,
  type CommitmentOwner,
  type IntakeSource,
  type IntakeSuggestion,
  type MeetingKind,
  type Person,
} from "./prototype-data";
import { Button, Card, EmptyState, Field, Pill, SectionLabel, TextArea, TextInput, ToggleChips } from "./ui";

// Phase 3 — AI-assisted meeting and note intake.
//
// Deliberately a prototype: there is no transcription service, no model call,
// no recording storage, and no database write. `analyze()` returns a fixed
// suggestion after a simulated delay so the founder can evaluate the *workflow*.
// The contract this demonstrates is the part that matters:
//   1. the input is source-agnostic (recorder, transcript, paste, upload,
//      connected device) and the rest of the flow never knows which was used;
//   2. every suggested field arrives unapproved and individually editable;
//   3. nothing reaches DOS until the user presses Save at the end.

type Stage = "source" | "input" | "analyzing" | "review";

export type IntakeResult = {
  personIds: string[];
  newPeople: string[];
  kind: MeetingKind;
  minutes: number;
  notes: string;
  scripture: string;
  topics: string[];
  prayer: string[];
  commitments: Array<{ owner: CommitmentOwner; text: string; dueAt: string | null }>;
  nextStep: string;
  followUpAt: string;
  outcomes: string[];
};

type FieldKey =
  | "summary"
  | "people"
  | "prayer"
  | "commitments"
  | "nextStep"
  | "scripture"
  | "topics"
  | "outcomes"
  | "activity";

const reviewOrder: Array<{ key: FieldKey; label: string }> = [
  { key: "people", label: "People involved" },
  { key: "summary", label: "Meeting summary" },
  { key: "prayer", label: "Prayer needs" },
  { key: "commitments", label: "Commitments" },
  { key: "nextStep", label: "Next step & follow-up" },
  { key: "scripture", label: "Scripture & topics" },
  { key: "outcomes", label: "Fruit & outcomes" },
  { key: "activity", label: "Ministry activity" },
];

export function AiIntakeFlow({
  people,
  onCancel,
  onSave,
}: {
  people: Person[];
  onCancel: () => void;
  onSave: (result: IntakeResult) => void;
}) {
  const [stage, setStage] = useState<Stage>("source");
  const [source, setSource] = useState<IntakeSource>("paste");
  const [rawInput, setRawInput] = useState("");
  const [suggestion, setSuggestion] = useState<IntakeSuggestion | null>(null);

  // Editable review state — seeded from the suggestion, owned by the user.
  const [summary, setSummary] = useState("");
  const [kind, setKind] = useState<MeetingKind>("kitchen_table");
  const [minutes, setMinutes] = useState(60);
  const [scripture, setScripture] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [newPeople, setNewPeople] = useState<string[]>([]);
  const [rejectedNewPeople, setRejectedNewPeople] = useState<string[]>([]);
  const [prayer, setPrayer] = useState<string[]>([]);
  const [commitments, setCommitments] = useState<IntakeResult["commitments"]>([]);
  const [nextStep, setNextStep] = useState("");
  const [followUpAt, setFollowUpAt] = useState(addDaysFromToday(7));
  const [accepted, setAccepted] = useState<FieldKey[]>([]);

  useEffect(() => {
    if (stage !== "analyzing") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const next = sampleSuggestion;

      setSuggestion(next);
      setSummary(next.summary);
      setKind(next.kind);
      setMinutes(next.minutes);
      setScripture(next.scripture);
      setTopics([...next.topics]);
      setOutcomes([...next.outcomes]);
      setMatchedIds(next.peopleMatched.map((match) => match.personId));
      setNewPeople([...next.peopleNew]);
      setRejectedNewPeople([]);
      setPrayer([...next.prayer]);
      setCommitments(
        next.commitments.map((commitment) => ({
          owner: commitment.owner,
          text: commitment.text,
          dueAt: commitment.dueOffsetDays === null ? null : addDaysFromToday(commitment.dueOffsetDays),
        })),
      );
      setNextStep(next.nextStep);
      setFollowUpAt(addDaysFromToday(next.followUpOffsetDays));
      setAccepted([]);
      setStage("review");
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [stage]);

  const allAccepted = accepted.length === reviewOrder.length;

  function toggleAccepted(key: FieldKey) {
    setAccepted((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function save() {
    onSave({
      personIds: matchedIds,
      newPeople: newPeople.filter((name) => !rejectedNewPeople.includes(name)),
      kind,
      minutes,
      notes: summary,
      scripture,
      topics,
      prayer,
      commitments,
      nextStep,
      followUpAt,
      outcomes,
    });
  }

  if (stage === "source") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black tracking-[-0.02em] text-[#0F172A]">Where is this meeting coming from?</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#64748B]">
            DOS reads any of these the same way. You review everything before it saves.
          </p>
        </div>
        <div className="grid gap-2.5">
          {(Object.keys(intakeSourceLabels) as IntakeSource[]).map((key) => (
            <Card
              className="px-4 py-3.5"
              key={key}
              onClick={() => {
                setSource(key);
                setRawInput(key === "paste" ? "" : sampleTranscript);
                setStage("input");
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#0F172A]">{intakeSourceLabels[key].title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#64748B]">{intakeSourceLabels[key].detail}</p>
                </div>
                <span className="text-[#94A3B8]">›</span>
              </div>
            </Card>
          ))}
        </div>
        <p className="rounded-2xl bg-[#F8FBFF] px-3.5 py-3 text-xs leading-5 text-[#64748B]">
          Prototype: no audio is recorded or stored, and no transcription service is connected. Choosing a source
          loads a sample so you can evaluate the review step.
        </p>
        <Button className="w-full" onClick={onCancel} tone="secondary">
          Cancel
        </Button>
      </div>
    );
  }

  if (stage === "input") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Pill tone="blue">{intakeSourceLabels[source].title}</Pill>
          <button className="text-xs font-bold text-[#2563EB]" onClick={() => setStage("source")} type="button">
            Change
          </button>
        </div>
        <Field label="Meeting notes or transcript" hint="Paste anything. Rough notes work as well as a full transcript.">
          <TextArea
            onChange={setRawInput}
            placeholder="Paste your notes or transcript here..."
            rows={10}
            value={rawInput}
          />
        </Field>
        {!rawInput.trim() ? (
          <button
            className="w-full rounded-2xl border border-dashed border-[#DCEBFF] bg-[#F8FBFF] px-3.5 py-3 text-xs font-bold text-[#2563EB]"
            onClick={() => setRawInput(sampleTranscript)}
            type="button"
          >
            Load a sample meeting
          </button>
        ) : null}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onCancel} tone="secondary">
            Cancel
          </Button>
          <Button className="flex-1" disabled={!rawInput.trim()} onClick={() => setStage("analyzing")}>
            Review suggestions
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
        <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#DCEBFF] border-t-[#2563EB]" />
        <div>
          <p className="text-sm font-black text-[#0F172A]">Reading your meeting</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">Pulling out people, prayer, commitments, and next steps.</p>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return <EmptyState title="Nothing to review" detail="Go back and add notes or a transcript." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#92400E]">Nothing is saved yet</p>
        <p className="mt-1 text-xs leading-5 text-[#92400E]">
          Everything below is a suggestion. Edit anything, mark each section reviewed, then save.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-[#64748B]">
          {accepted.length} of {reviewOrder.length} sections reviewed
        </p>
        <button
          className="text-xs font-bold text-[#2563EB]"
          onClick={() => setAccepted(allAccepted ? [] : reviewOrder.map((item) => item.key))}
          type="button"
        >
          {allAccepted ? "Unmark all" : "Mark all reviewed"}
        </button>
      </div>

      <ReviewBlock accepted={accepted.includes("people")} label="People involved" onToggle={() => toggleAccepted("people")}>
        <div className="space-y-2.5">
          {suggestion.peopleMatched.map((match) => {
            const isOn = matchedIds.includes(match.personId);

            return (
              <label
                className="flex items-center gap-3 rounded-2xl border border-[#E8EFFA] bg-white px-3 py-2.5"
                key={match.personId}
              >
                <input
                  checked={isOn}
                  className="h-4 w-4 accent-[#2563EB]"
                  onChange={() =>
                    setMatchedIds((current) =>
                      isOn ? current.filter((id) => id !== match.personId) : [...current, match.personId],
                    )
                  }
                  type="checkbox"
                />
                <span className="min-w-0 flex-1 text-sm font-bold text-[#0F172A]">{match.name}</span>
                <Pill tone={match.confidence === "high" ? "green" : "amber"}>
                  {match.confidence === "high" ? "In your field" : "Likely match"}
                </Pill>
              </label>
            );
          })}
          {suggestion.peopleNew.map((name) => {
            const isRejected = rejectedNewPeople.includes(name);

            return (
              <div
                className="flex items-center gap-3 rounded-2xl border border-dashed border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2.5"
                key={name}
              >
                <span className={`min-w-0 flex-1 text-sm font-bold ${isRejected ? "text-[#94A3B8] line-through" : "text-[#0F172A]"}`}>
                  {name}
                </span>
                <Pill tone="blue">New name</Pill>
                <button
                  className="text-xs font-bold text-[#2563EB]"
                  onClick={() =>
                    setRejectedNewPeople((current) =>
                      isRejected ? current.filter((item) => item !== name) : [...current, name],
                    )
                  }
                  type="button"
                >
                  {isRejected ? "Add" : "Skip"}
                </button>
              </div>
            );
          })}
          <p className="text-xs leading-5 text-[#64748B]">
            {people.length} people already in your field. New names are added only if you keep them.
          </p>
        </div>
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("summary")} label="Meeting summary" onToggle={() => toggleAccepted("summary")}>
        <TextArea onChange={setSummary} rows={6} value={summary} />
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("prayer")} label="Prayer needs" onToggle={() => toggleAccepted("prayer")}>
        <EditableList
          addLabel="Add a prayer need"
          items={prayer}
          onChange={setPrayer}
          placeholder="What should you be praying for?"
        />
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("commitments")} label="Commitments" onToggle={() => toggleAccepted("commitments")}>
        <div className="space-y-2.5">
          {commitments.map((commitment, index) => (
            <div className="rounded-2xl border border-[#E8EFFA] bg-white p-3" key={`${commitment.text}-${index}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={`min-h-8 rounded-full px-3 text-[11px] font-bold transition ${
                    commitment.owner === "me" ? "bg-[#EBF2FF] text-[#1D4ED8]" : "bg-[#ECFDF5] text-[#047857]"
                  }`}
                  onClick={() =>
                    setCommitments((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, owner: item.owner === "me" ? "them" : "me" } : item,
                      ),
                    )
                  }
                  type="button"
                >
                  {commitment.owner === "me" ? "I will" : "They will"}
                </button>
                <span className="text-[11px] font-bold text-[#64748B]">
                  Due {commitment.dueAt ? formatPrototypeDate(commitment.dueAt) : "—"}
                </span>
                <button
                  className="ml-auto text-xs font-bold text-[#B91C1C]"
                  onClick={() => setCommitments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2">
                <TextInput
                  onChange={(value) =>
                    setCommitments((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, text: value } : item)),
                    )
                  }
                  value={commitment.text}
                />
              </div>
            </div>
          ))}
          <Button
            onClick={() => setCommitments((current) => [...current, { owner: "me", text: "", dueAt: addDaysFromToday(7) }])}
            size="sm"
            tone="secondary"
          >
            + Add commitment
          </Button>
        </div>
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("nextStep")} label="Next step & follow-up" onToggle={() => toggleAccepted("nextStep")}>
        <div className="space-y-3">
          <Field label="Next step">
            <TextInput onChange={setNextStep} value={nextStep} />
          </Field>
          <Field label="Follow up on">
            <TextInput onChange={setFollowUpAt} type="date" value={followUpAt} />
          </Field>
        </div>
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("scripture")} label="Scripture & topics" onToggle={() => toggleAccepted("scripture")}>
        <div className="space-y-3">
          <Field label="Scripture">
            <TextInput onChange={setScripture} placeholder="e.g. Luke 15" value={scripture} />
          </Field>
          <Field label="Topics">
            <EditableList addLabel="Add a topic" items={topics} onChange={setTopics} placeholder="Topic" />
          </Field>
        </div>
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("outcomes")} label="Fruit & outcomes" onToggle={() => toggleAccepted("outcomes")}>
        <ToggleChips
          onToggle={(value) =>
            setOutcomes((current) =>
              current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
            )
          }
          options={["Salvation", "Baptism", "Started discipleship", "Began multiplying", "Church connection", "Prayer answered"]}
          selected={outcomes}
        />
      </ReviewBlock>

      <ReviewBlock accepted={accepted.includes("activity")} label="Ministry activity" onToggle={() => toggleAccepted("activity")}>
        <div className="space-y-3">
          <Field label="Meeting type">
            <select
              className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-medium text-[#0F172A] outline-none focus:border-[#2563EB]"
              onChange={(event) => setKind(event.target.value as MeetingKind)}
              value={kind}
            >
              {(Object.keys(meetingKindLabels) as MeetingKind[]).map((option) => (
                <option key={option} value={option}>
                  {meetingKindLabels[option]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Minutes" hint="Rolls into your reporting automatically. You never type it twice.">
            <TextInput onChange={(value) => setMinutes(Number(value) || 0)} type="number" value={String(minutes)} />
          </Field>
        </div>
      </ReviewBlock>

      <div className="sticky bottom-0 -mx-4 border-t border-[#EEF2F7] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onCancel} tone="secondary">
            Discard
          </Button>
          <Button className="flex-[1.6]" disabled={!allAccepted} onClick={save}>
            {allAccepted ? "Save to DOS" : `Review ${reviewOrder.length - accepted.length} more`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewBlock({
  accepted,
  children,
  label,
  onToggle,
}: {
  accepted: boolean;
  children: React.ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Card className={`p-3.5 ${accepted ? "border-[#A7F3D0] bg-[#F7FEFB]" : ""}`}>
      <SectionLabel
        action={
          <button
            className={`min-h-8 rounded-full px-3 text-[11px] font-bold transition ${
              accepted ? "bg-[#ECFDF5] text-[#047857]" : "border border-[#DCEBFF] bg-white text-[#2563EB]"
            }`}
            onClick={onToggle}
            type="button"
          >
            {accepted ? "✓ Reviewed" : "Mark reviewed"}
          </button>
        }
      >
        {label}
      </SectionLabel>
      {children}
    </Card>
  );
}

function EditableList({
  addLabel,
  items,
  onChange,
  placeholder,
}: {
  addLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={index}>
          <div className="min-w-0 flex-1">
            <TextInput
              onChange={(value) => onChange(items.map((existing, itemIndex) => (itemIndex === index ? value : existing)))}
              placeholder={placeholder}
              value={item}
            />
          </div>
          <button
            aria-label="Remove"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#B91C1C] transition hover:bg-[#FEE2E2]"
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            type="button"
          >
            ✕
          </button>
        </div>
      ))}
      <Button onClick={() => onChange([...items, ""])} size="sm" tone="secondary">
        + {addLabel}
      </Button>
    </div>
  );
}

export function useIntakePeopleIndex(people: Person[]) {
  return useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
}
