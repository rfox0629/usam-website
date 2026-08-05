"use client";

import { useMemo, useState } from "react";
import { AiIntakeFlow, type IntakeResult } from "./AiIntakeFlow";
import {
  addDaysFromToday,
  circleLabels,
  formatPrototypeDate,
  isOverdue,
  meetingKindLabels,
  nextStepOptions,
  outcomeOptions,
  relativeDayLabel,
  seedCommitments,
  seedDraftMeeting,
  seedFruit,
  seedMeetings,
  seedPeople,
  seedPrayer,
  type Circle,
  type Commitment,
  type FruitItem,
  type Meeting,
  type MeetingKind,
  type Person,
  type PrayerNeed,
} from "./prototype-data";
import {
  Avatar,
  Button,
  Card,
  ChoiceRow,
  EmptyState,
  Field,
  Pill,
  SectionLabel,
  Sheet,
  TextArea,
  TextInput,
  ToggleChips,
} from "./ui";

type View = "today" | "people" | "capture" | "followups" | "fruit";

const navItems: Array<{ key: View; label: string; icon: string }> = [
  { key: "today", label: "Today", icon: "◎" },
  { key: "people", label: "People", icon: "☰" },
  { key: "followups", label: "Follow-ups", icon: "✓" },
  { key: "fruit", label: "Fruit", icon: "❋" },
];

type CaptureDraft = {
  meetingId: string | null;
  personIds: string[];
  // People named in the notes who were not in the meeting. They join your field
  // as contacts but must be promoted explicitly to count as attendees, so a
  // next step written about the person you met never lands on someone who was
  // only mentioned.
  mentionedIds: string[];
  kind: MeetingKind;
  minutes: number;
  notes: string;
  scripture: string;
  topics: string[];
  prayer: string[];
  commitments: Array<{ owner: "me" | "them"; text: string; dueAt: string | null }>;
  nextStep: string;
  followUpAt: string;
  outcomes: string[];
};

function emptyDraft(): CaptureDraft {
  return {
    meetingId: null,
    personIds: [],
    mentionedIds: [],
    kind: "kitchen_table",
    minutes: 60,
    notes: "",
    scripture: "",
    topics: [],
    prayer: [],
    commitments: [],
    nextStep: "",
    followUpAt: addDaysFromToday(7),
    outcomes: [],
  };
}

export function DosV3PrototypeClient() {
  const [view, setView] = useState<View>("today");
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const [meetings, setMeetings] = useState<Meeting[]>(seedMeetings);
  const [prayer, setPrayer] = useState<PrayerNeed[]>(seedPrayer);
  const [commitments, setCommitments] = useState<Commitment[]>(seedCommitments);
  const [fruit, setFruit] = useState<FruitItem[]>(seedFruit);
  const [draftMeeting, setDraftMeeting] = useState<Meeting | null>(seedDraftMeeting);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureDraft>(emptyDraft);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const selectedPerson = selectedPersonId ? peopleById.get(selectedPersonId) ?? null : null;

  const openCommitments = useMemo(() => commitments.filter((item) => item.state === "open"), [commitments]);
  const dueToday = useMemo(
    () => people.filter((person) => person.nextStepDueAt && relativeDayLabel(person.nextStepDueAt) === "Today"),
    [people],
  );
  const overdue = useMemo(() => people.filter((person) => isOverdue(person.nextStepDueAt)), [people]);
  const overdueCommitments = useMemo(() => openCommitments.filter((item) => isOverdue(item.dueAt)), [openCommitments]);
  const upcomingMeetings = useMemo(() => meetings.filter((meeting) => meeting.status === "scheduled"), [meetings]);
  const loggedMeetings = useMemo(() => meetings.filter((meeting) => meeting.status === "logged"), [meetings]);
  const attentionCount = overdue.length + dueToday.length + overdueCommitments.length + (draftMeeting ? 1 : 0);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function startCapture(personId?: string) {
    setCapture({ ...emptyDraft(), personIds: personId ? [personId] : [] });
    setSaveState("idle");
    setView("capture");
  }

  function resumeDraft() {
    if (!draftMeeting) {
      return;
    }

    setCapture({
      ...emptyDraft(),
      meetingId: draftMeeting.id,
      personIds: [...draftMeeting.personIds],
      kind: draftMeeting.kind,
      minutes: draftMeeting.minutes,
      notes: draftMeeting.notes,
    });
    setSaveState("idle");
    setView("capture");
  }

  function applyIntake(result: IntakeResult) {
    const createdIds: string[] = [];

    if (result.newPeople.length) {
      const created = result.newPeople.map((name, index) => ({
        id: `p-new-${Date.now()}-${index}`,
        name,
        circle: "field" as Circle,
        role: "New contact",
        phone: "",
        lastMetAt: null,
        nextStep: null,
        nextStepDueAt: null,
      }));

      created.forEach((person) => createdIds.push(person.id));
      setPeople((current) => [...current, ...created]);
    }

    setCapture({
      meetingId: null,
      personIds: [...result.personIds],
      mentionedIds: createdIds,
      kind: result.kind,
      minutes: result.minutes,
      notes: result.notes,
      scripture: result.scripture,
      topics: result.topics,
      prayer: result.prayer.filter(Boolean),
      commitments: result.commitments.filter((item) => item.text.trim()),
      nextStep: result.nextStep,
      followUpAt: result.followUpAt,
      outcomes: result.outcomes,
    });
    setIsIntakeOpen(false);
    setSaveState("idle");
    setView("capture");
    notify("Suggestions loaded. Nothing saved yet — review and save.");
  }

  function saveCapture() {
    if (!capture.personIds.length) {
      notify("Add at least one person first.");
      return;
    }

    const meetingId = `m-${Date.now()}`;
    const today = addDaysFromToday(0);

    setMeetings((current) => [
      {
        id: meetingId,
        personIds: capture.personIds,
        kind: capture.kind,
        at: today,
        notes: capture.notes,
        scripture: capture.scripture || null,
        topics: capture.topics,
        outcomes: capture.outcomes,
        minutes: capture.minutes,
        status: "logged",
      },
      ...current,
    ]);

    if (capture.prayer.filter(Boolean).length) {
      setPrayer((current) => [
        ...capture.prayer
          .filter(Boolean)
          .map((text, index) => ({
            id: `pr-${Date.now()}-${index}`,
            personId: capture.personIds[0] ?? null,
            text,
            answered: false,
            raisedAt: today,
          })),
        ...current,
      ]);
    }

    if (capture.commitments.length) {
      setCommitments((current) => [
        ...capture.commitments
          .filter((item) => item.text.trim())
          .map((item, index) => ({
            id: `c-${Date.now()}-${index}`,
            personId: capture.personIds[0] ?? "",
            meetingId,
            owner: item.owner,
            text: item.text,
            dueAt: item.dueAt,
            state: "open" as const,
          })),
        ...current,
      ]);
    }

    if (capture.outcomes.length) {
      setFruit((current) => [
        ...capture.outcomes.map((outcome, index) => ({
          id: `f-${Date.now()}-${index}`,
          personId: capture.personIds[0] ?? "",
          meetingId,
          outcome,
          summary: capture.notes.slice(0, 120),
          at: today,
        })),
        ...current,
      ]);
    }

    // Everyone present gets a new "last met". The next step belongs to the
    // person the meeting was about, not to every attendee.
    const nextStepOwnerId = capture.personIds[0] ?? null;

    setPeople((current) =>
      current.map((person) => {
        if (!capture.personIds.includes(person.id)) {
          return person;
        }

        if (person.id !== nextStepOwnerId || !capture.nextStep) {
          return { ...person, lastMetAt: today };
        }

        return {
          ...person,
          lastMetAt: today,
          nextStep: capture.nextStep,
          nextStepDueAt: capture.followUpAt,
        };
      }),
    );

    if (capture.meetingId && draftMeeting?.id === capture.meetingId) {
      setDraftMeeting(null);
    }

    setSaveState("saved");
    notify("Meeting saved. Reporting updated.");
    window.setTimeout(() => {
      setSelectedPersonId(capture.personIds[0] ?? null);
      setView("people");
      setCapture(emptyDraft());
      setSaveState("idle");
    }, 900);
  }

  const totalMinutes = loggedMeetings.reduce((sum, meeting) => sum + meeting.minutes, 0);

  return (
    <div className="dos-v3-route min-h-[100dvh] bg-[#F8FBFF] text-[#0F172A]">
      <V3Styles />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px]">
        <DesktopRail
          attentionCount={attentionCount}
          onCapture={() => startCapture()}
          onIntake={() => setIsIntakeOpen(true)}
          onSelect={(next) => {
            setSelectedPersonId(null);
            setView(next);
          }}
          view={view}
        />

        <main className="min-w-0 flex-1 pb-28 md:pb-10">
          <div className="mx-auto w-full max-w-[860px] px-4 pt-5 md:px-8 md:pt-8 xl:max-w-[1000px]">
            {view === "today" ? (
              <TodayScreen
                draftMeeting={draftMeeting}
                dueToday={dueToday}
                onCapture={() => startCapture()}
                onIntake={() => setIsIntakeOpen(true)}
                onOpenPerson={(id) => {
                  setSelectedPersonId(id);
                  setView("people");
                }}
                onResumeDraft={resumeDraft}
                onViewFollowUps={() => setView("followups")}
                overdue={overdue}
                overdueCommitments={overdueCommitments}
                peopleById={peopleById}
                prayer={prayer}
                upcomingMeetings={upcomingMeetings}
              />
            ) : null}

            {view === "people" ? (
              selectedPerson ? (
                <PersonScreen
                  commitments={commitments.filter((item) => item.personId === selectedPerson.id)}
                  fruit={fruit.filter((item) => item.personId === selectedPerson.id)}
                  meetings={meetings.filter((meeting) => meeting.personIds.includes(selectedPerson.id))}
                  onBack={() => setSelectedPersonId(null)}
                  onLogMeeting={() => startCapture(selectedPerson.id)}
                  onToggleCommitment={(id) =>
                    setCommitments((current) =>
                      current.map((item) =>
                        item.id === id ? { ...item, state: item.state === "open" ? "done" : "open" } : item,
                      ),
                    )
                  }
                  person={selectedPerson}
                  prayer={prayer.filter((item) => item.personId === selectedPerson.id)}
                />
              ) : (
                <PeopleScreen
                  onAddPerson={() => setIsAddPersonOpen(true)}
                  onSelect={setSelectedPersonId}
                  people={people}
                />
              )
            ) : null}

            {view === "capture" ? (
              <CaptureScreen
                capture={capture}
                onCancel={() => {
                  setCapture(emptyDraft());
                  setView("today");
                }}
                onChange={setCapture}
                onIntake={() => setIsIntakeOpen(true)}
                onSave={saveCapture}
                people={people}
                saveState={saveState}
              />
            ) : null}

            {view === "followups" ? (
              <FollowUpsScreen
                commitments={openCommitments}
                onCompleteCommitment={(id) =>
                  setCommitments((current) =>
                    current.map((item) => (item.id === id ? { ...item, state: "done" } : item)),
                  )
                }
                onOpenPerson={(id) => {
                  setSelectedPersonId(id);
                  setView("people");
                }}
                onSnoozeCommitment={(id) =>
                  setCommitments((current) =>
                    current.map((item) => (item.id === id ? { ...item, dueAt: addDaysFromToday(3) } : item)),
                  )
                }
                onSnoozePerson={(id) =>
                  setPeople((current) =>
                    current.map((person) =>
                      person.id === id ? { ...person, nextStepDueAt: addDaysFromToday(3) } : person,
                    ),
                  )
                }
                onCompletePerson={(id) =>
                  setPeople((current) =>
                    current.map((person) =>
                      person.id === id ? { ...person, nextStep: null, nextStepDueAt: null } : person,
                    ),
                  )
                }
                peopleById={peopleById}
                peopleWithSteps={people.filter((person) => Boolean(person.nextStep))}
              />
            ) : null}

            {view === "fruit" ? (
              <FruitScreen
                fruit={fruit}
                loggedMeetings={loggedMeetings}
                peopleById={peopleById}
                peopleCount={people.length}
                totalMinutes={totalMinutes}
              />
            ) : null}
          </div>
        </main>
      </div>

      <MobileNav
        attentionCount={attentionCount}
        onCapture={() => startCapture()}
        onSelect={(next) => {
          setSelectedPersonId(null);
          setView(next);
        }}
        view={view}
      />

      {isIntakeOpen ? (
        <Sheet onClose={() => setIsIntakeOpen(false)} title="AI-assisted intake">
          <AiIntakeFlow onCancel={() => setIsIntakeOpen(false)} onSave={applyIntake} people={people} />
        </Sheet>
      ) : null}

      {isAddPersonOpen ? (
        <AddPersonSheet
          onClose={() => setIsAddPersonOpen(false)}
          onCreate={(person) => {
            setPeople((current) => [...current, person]);
            setIsAddPersonOpen(false);
            setSelectedPersonId(person.id);
            notify(`${person.name} added to your field.`);
          }}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
          <p className="rounded-full bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white shadow-[0_12px_30px_rgba(15,23,42,0.28)]">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- navigation */

function DesktopRail({
  attentionCount,
  onCapture,
  onIntake,
  onSelect,
  view,
}: {
  attentionCount: number;
  onCapture: () => void;
  onIntake: () => void;
  onSelect: (view: View) => void;
  view: View;
}) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col border-r border-[#E8EFFA] bg-white px-4 py-6 md:flex">
      <div className="px-2">
        <p className="text-lg font-black tracking-[-0.03em] text-[#1D4ED8]">DOS</p>
        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">V3 Prototype</p>
      </div>

      <div className="mt-6 grid gap-2">
        <Button className="w-full" onClick={onCapture} size="lg">
          Log a meeting
        </Button>
        <Button className="w-full" onClick={onIntake} size="md" tone="secondary">
          AI intake
        </Button>
      </div>

      <nav className="mt-7 grid gap-1">
        {navItems.map((item) => (
          <button
            className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition ${
              view === item.key ? "bg-[#EBF2FF] text-[#1D4ED8]" : "text-[#475569] hover:bg-[#F8FAFC]"
            }`}
            key={item.key}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <span aria-hidden="true" className="text-base">
              {item.icon}
            </span>
            {item.label}
            {item.key === "today" && attentionCount ? (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[10px] font-black text-white">
                {attentionCount}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <p className="mt-auto rounded-2xl bg-[#F8FBFF] px-3 py-3 text-[11px] leading-5 text-[#64748B]">
        Prototype with sample data. Nothing here reads or writes real records.
      </p>
    </aside>
  );
}

function MobileNav({
  attentionCount,
  onCapture,
  onSelect,
  view,
}: {
  attentionCount: number;
  onCapture: () => void;
  onSelect: (view: View) => void;
  view: View;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8EFFA] bg-white/96 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {navItems.slice(0, 2).map((item) => (
          <NavButton
            badge={item.key === "today" ? attentionCount : 0}
            icon={item.icon}
            isActive={view === item.key}
            key={item.key}
            label={item.label}
            onClick={() => onSelect(item.key)}
          />
        ))}

        <div className="flex justify-center">
          <button
            aria-label="Log a meeting"
            className="-mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-2xl font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.4)] transition active:scale-95"
            onClick={onCapture}
            type="button"
          >
            +
          </button>
        </div>

        {navItems.slice(2).map((item) => (
          <NavButton
            badge={0}
            icon={item.icon}
            isActive={view === item.key}
            key={item.key}
            label={item.label}
            onClick={() => onSelect(item.key)}
          />
        ))}
      </div>
    </div>
  );
}

function NavButton({
  badge,
  icon,
  isActive,
  label,
  onClick,
}: {
  badge: number;
  icon: string;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-bold transition ${
        isActive ? "text-[#1D4ED8]" : "text-[#94A3B8]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {icon}
      </span>
      {label}
      {badge ? (
        <span className="absolute right-2 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[9px] font-black text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/* -------------------------------------------------------------------- today */

function TodayScreen({
  draftMeeting,
  dueToday,
  onCapture,
  onIntake,
  onOpenPerson,
  onResumeDraft,
  onViewFollowUps,
  overdue,
  overdueCommitments,
  peopleById,
  prayer,
  upcomingMeetings,
}: {
  draftMeeting: Meeting | null;
  dueToday: Person[];
  onCapture: () => void;
  onIntake: () => void;
  onOpenPerson: (id: string) => void;
  onResumeDraft: () => void;
  onViewFollowUps: () => void;
  overdue: Person[];
  overdueCommitments: Commitment[];
  peopleById: Map<string, Person>;
  prayer: PrayerNeed[];
  upcomingMeetings: Meeting[];
}) {
  const activePrayer = prayer.filter((item) => !item.answered);
  const nothingPending = !overdue.length && !dueToday.length && !overdueCommitments.length && !draftMeeting;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-4xl">Today</h1>
        <p className="mt-1.5 text-sm text-[#64748B]">
          {nothingPending ? "Nothing is waiting on you." : "What needs you first."}
        </p>
      </header>

      <div className="grid gap-2.5 md:hidden">
        <Button className="w-full" onClick={onCapture} size="lg">
          Log a meeting
        </Button>
        <Button className="w-full" onClick={onIntake} size="md" tone="secondary">
          AI intake — record, transcript, or notes
        </Button>
      </div>

      {draftMeeting ? (
        <Card className="border-[#FDE68A] bg-[#FFFBEB] p-4">
          <SectionLabel>Unfinished</SectionLabel>
          <p className="text-sm font-bold text-[#0F172A]">
            {draftMeeting.personIds.map((id) => peopleById.get(id)?.name ?? "Someone").join(", ")} ·{" "}
            {meetingKindLabels[draftMeeting.kind]}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#92400E]">“{draftMeeting.notes}”</p>
          <Button className="mt-3" onClick={onResumeDraft} size="sm">
            Finish this
          </Button>
        </Card>
      ) : null}

      {overdue.length || dueToday.length || overdueCommitments.length ? (
        <section>
          <SectionLabel
            action={
              <button className="text-xs font-bold text-[#2563EB]" onClick={onViewFollowUps} type="button">
                See all
              </button>
            }
          >
            Needs attention
          </SectionLabel>
          <div className="grid gap-2">
            {overdue.map((person) => (
              <AttentionRow
                key={`o-${person.id}`}
                onClick={() => onOpenPerson(person.id)}
                subtitle={person.nextStep ?? "Follow up"}
                title={person.name}
                tone="red"
                when={relativeDayLabel(person.nextStepDueAt) ?? ""}
              />
            ))}
            {dueToday.map((person) => (
              <AttentionRow
                key={`t-${person.id}`}
                onClick={() => onOpenPerson(person.id)}
                subtitle={person.nextStep ?? "Follow up"}
                title={person.name}
                tone="blue"
                when="Today"
              />
            ))}
            {overdueCommitments.map((commitment) => (
              <AttentionRow
                key={`c-${commitment.id}`}
                onClick={() => onOpenPerson(commitment.personId)}
                subtitle={`${commitment.owner === "me" ? "You said you would" : "They said they would"}: ${commitment.text}`}
                title={peopleById.get(commitment.personId)?.name ?? "Commitment"}
                tone="amber"
                when={relativeDayLabel(commitment.dueAt) ?? ""}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          action={<Button onClick={onCapture}>Log a meeting</Button>}
          detail="No overdue follow-ups or commitments."
          title="You're caught up"
        />
      )}

      {upcomingMeetings.length ? (
        <section>
          <SectionLabel>Coming up</SectionLabel>
          <div className="grid gap-2">
            {upcomingMeetings.map((meeting) => (
              <Card className="flex items-center gap-3 p-3.5" key={meeting.id}>
                <Avatar name={peopleById.get(meeting.personIds[0])?.name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#0F172A]">
                    {meeting.personIds.map((id) => peopleById.get(id)?.name ?? "Someone").join(", ")}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {meetingKindLabels[meeting.kind]} · {relativeDayLabel(meeting.at)}
                  </p>
                </div>
                <Pill tone="blue">{formatPrototypeDate(meeting.at)}</Pill>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {activePrayer.length ? (
        <section>
          <SectionLabel>Pray today</SectionLabel>
          <Card className="divide-y divide-[#F1F5F9]">
            {activePrayer.slice(0, 5).map((item) => (
              <div className="flex items-start gap-3 px-3.5 py-3" key={item.id}>
                <span aria-hidden="true" className="mt-0.5 text-[#2563EB]">
                  ✚
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-[#0F172A]">{item.text}</p>
                  {item.personId ? (
                    <p className="mt-0.5 text-xs text-[#64748B]">{peopleById.get(item.personId)?.name}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function AttentionRow({
  onClick,
  subtitle,
  title,
  tone,
  when,
}: {
  onClick: () => void;
  subtitle: string;
  title: string;
  tone: "red" | "blue" | "amber";
  when: string;
}) {
  return (
    <Card className="p-3.5" onClick={onClick}>
      <div className="flex items-start gap-3">
        <Avatar name={title} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-[#0F172A]">{title}</p>
            <Pill tone={tone}>{when}</Pill>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#64748B]">{subtitle}</p>
        </div>
        <span aria-hidden="true" className="text-[#CBD5E1]">
          ›
        </span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- people */

function PeopleScreen({
  onAddPerson,
  onSelect,
  people,
}: {
  onAddPerson: () => void;
  onSelect: (id: string) => void;
  people: Person[];
}) {
  const [query, setQuery] = useState("");
  const [circle, setCircle] = useState<Circle | "all">("all");

  const filtered = people.filter((person) => {
    const matchesQuery = person.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCircle = circle === "all" || person.circle === circle;

    return matchesQuery && matchesCircle;
  });

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-4xl">People</h1>
          <p className="mt-1.5 text-sm text-[#64748B]">{people.length} in your field</p>
        </div>
        <Button onClick={onAddPerson} size="md">
          + Add
        </Button>
      </header>

      <TextInput onChange={setQuery} placeholder="Search by name" value={query} />

      <ChoiceRow
        onChange={setCircle}
        options={[
          { label: "All", value: "all" as const },
          { label: circleLabels.three, value: "three" as const },
          { label: circleLabels.twelve, value: "twelve" as const },
          { label: circleLabels.seventy, value: "seventy" as const },
          { label: circleLabels.field, value: "field" as const },
        ]}
        value={circle}
      />

      {filtered.length ? (
        <div className="grid gap-2 xl:grid-cols-2">
          {filtered.map((person) => (
            <Card className="p-3.5" key={person.id} onClick={() => onSelect(person.id)}>
              <div className="flex items-center gap-3">
                <Avatar name={person.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-[#0F172A]">{person.name}</p>
                    <Pill tone={person.circle === "three" ? "blue" : "neutral"}>{circleLabels[person.circle]}</Pill>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#64748B]">
                    {person.role} · Last met {person.lastMetAt ? relativeDayLabel(person.lastMetAt) : "never"}
                  </p>
                </div>
                {isOverdue(person.nextStepDueAt) ? <Pill tone="red">Overdue</Pill> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          action={<Button onClick={onAddPerson}>Add {query.trim() ? `“${query.trim()}”` : "someone"}</Button>}
          detail="No one in your field matches that yet."
          title="No matches"
        />
      )}
    </div>
  );
}

function PersonScreen({
  commitments,
  fruit,
  meetings,
  onBack,
  onLogMeeting,
  onToggleCommitment,
  person,
  prayer,
}: {
  commitments: Commitment[];
  fruit: FruitItem[];
  meetings: Meeting[];
  onBack: () => void;
  onLogMeeting: () => void;
  onToggleCommitment: (id: string) => void;
  person: Person;
  prayer: PrayerNeed[];
}) {
  const logged = meetings.filter((meeting) => meeting.status === "logged");

  return (
    <div className="space-y-5">
      <button className="text-sm font-bold text-[#2563EB]" onClick={onBack} type="button">
        ‹ People
      </button>

      <header className="flex flex-wrap items-center gap-3">
        <Avatar name={person.name} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black tracking-[-0.02em] text-[#0F172A]">{person.name}</h1>
          <p className="text-xs text-[#64748B]">
            {person.role} · {circleLabels[person.circle]} · {logged.length} meetings
          </p>
        </div>
        <Button onClick={onLogMeeting}>Log meeting</Button>
      </header>

      {person.nextStep ? (
        <Card className={`p-4 ${isOverdue(person.nextStepDueAt) ? "border-[#FECACA] bg-[#FEF2F2]" : "bg-[#F8FBFF]"}`}>
          <SectionLabel>Next step</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#0F172A]">{person.nextStep}</p>
            <Pill tone={isOverdue(person.nextStepDueAt) ? "red" : "blue"}>
              {relativeDayLabel(person.nextStepDueAt) ?? "No date"}
            </Pill>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section>
          <SectionLabel>Commitments</SectionLabel>
          {commitments.length ? (
            <Card className="divide-y divide-[#F1F5F9]">
              {commitments.map((commitment) => (
                <label className="flex items-start gap-3 px-3.5 py-3" key={commitment.id}>
                  <input
                    checked={commitment.state === "done"}
                    className="mt-0.5 h-4 w-4 accent-[#2563EB]"
                    onChange={() => onToggleCommitment(commitment.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-semibold leading-5 ${
                        commitment.state === "done" ? "text-[#94A3B8] line-through" : "text-[#0F172A]"
                      }`}
                    >
                      {commitment.text}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#64748B]">
                      {commitment.owner === "me" ? "You" : person.name} · due {formatPrototypeDate(commitment.dueAt)}
                    </span>
                  </span>
                </label>
              ))}
            </Card>
          ) : (
            <EmptyState title="No commitments yet" />
          )}
        </section>

        <section>
          <SectionLabel>Prayer</SectionLabel>
          {prayer.length ? (
            <Card className="divide-y divide-[#F1F5F9]">
              {prayer.map((item) => (
                <div className="flex items-start gap-3 px-3.5 py-3" key={item.id}>
                  <span aria-hidden="true" className={item.answered ? "text-[#047857]" : "text-[#2563EB]"}>
                    {item.answered ? "✓" : "✚"}
                  </span>
                  <p className={`min-w-0 flex-1 text-sm leading-5 ${item.answered ? "text-[#64748B]" : "text-[#0F172A]"}`}>
                    {item.text}
                  </p>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState title="No prayer needs yet" />
          )}
        </section>
      </div>

      <section>
        <SectionLabel>Meetings</SectionLabel>
        {logged.length ? (
          <div className="grid gap-2">
            {logged.map((meeting) => (
              <Card className="p-3.5" key={meeting.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="neutral">{meetingKindLabels[meeting.kind]}</Pill>
                  <span className="text-xs font-bold text-[#64748B]">{formatPrototypeDate(meeting.at)}</span>
                  {meeting.scripture ? <Pill tone="blue">{meeting.scripture}</Pill> : null}
                  <span className="ml-auto text-xs text-[#94A3B8]">{meeting.minutes}m</span>
                </div>
                {meeting.notes ? (
                  <p className="mt-2 text-sm leading-6 text-[#475569]">{meeting.notes}</p>
                ) : null}
                {meeting.outcomes.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {meeting.outcomes.map((outcome) => (
                      <Pill key={outcome} tone="green">
                        {outcome}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState action={<Button onClick={onLogMeeting}>Log the first one</Button>} title="No meetings logged" />
        )}
      </section>

      {fruit.length ? (
        <section>
          <SectionLabel>Fruit</SectionLabel>
          <div className="grid gap-2">
            {fruit.map((item) => (
              <Card className="flex items-center gap-3 p-3.5" key={item.id}>
                <Pill tone="green">{item.outcome}</Pill>
                <p className="min-w-0 flex-1 truncate text-xs text-[#64748B]">{item.summary}</p>
                <span className="text-xs text-[#94A3B8]">{formatPrototypeDate(item.at)}</span>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ capture */

function CaptureScreen({
  capture,
  onCancel,
  onChange,
  onIntake,
  onSave,
  people,
  saveState,
}: {
  capture: CaptureDraft;
  onCancel: () => void;
  onChange: (draft: CaptureDraft) => void;
  onIntake: () => void;
  onSave: () => void;
  people: Person[];
  saveState: "idle" | "saved";
}) {
  const [query, setQuery] = useState("");

  const selected = capture.personIds
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is Person => Boolean(person));
  const mentioned = capture.mentionedIds
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is Person => Boolean(person));
  const suggestions = people
    .filter((person) => !capture.personIds.includes(person.id))
    .filter((person) => person.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, query.trim() ? 6 : 4);

  function patch(next: Partial<CaptureDraft>) {
    onChange({ ...capture, ...next });
  }

  return (
    <div className="space-y-5 pb-24">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-4xl">
            Log a meeting
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B]">Capture it once. Everything else updates from this.</p>
        </div>
        <Button onClick={onIntake} size="sm" tone="secondary">
          AI intake
        </Button>
      </header>

      <Card className="p-4">
        <SectionLabel>Who was there</SectionLabel>
        {selected.length ? (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {selected.map((person) => (
              <button
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8]"
                key={person.id}
                onClick={() => patch({ personIds: capture.personIds.filter((id) => id !== person.id) })}
                type="button"
              >
                {person.name} ✕
              </button>
            ))}
          </div>
        ) : null}
        <TextInput onChange={setQuery} placeholder="Search your field" value={query} />
        <div className="mt-2.5 flex flex-wrap gap-2">
          {suggestions.map((person) => (
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-bold text-[#475569] transition hover:border-[#2563EB] hover:text-[#2563EB]"
              key={person.id}
              onClick={() => {
                patch({ personIds: [...capture.personIds, person.id] });
                setQuery("");
              }}
              type="button"
            >
              + {person.name}
            </button>
          ))}
          {!suggestions.length && query.trim() ? (
            <p className="text-xs text-[#94A3B8]">No match in your field.</p>
          ) : null}
        </div>

        {mentioned.length ? (
          <div className="mt-3.5 rounded-2xl border border-dashed border-[#DCEBFF] bg-[#F8FBFF] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Also mentioned</p>
            <p className="mt-1 text-xs leading-5 text-[#64748B]">
              Added to your field, but not counted as attending. Add them only if they were actually there.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mentioned.map((person) => (
                <button
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#475569] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                  key={person.id}
                  onClick={() =>
                    patch({
                      personIds: [...capture.personIds, person.id],
                      mentionedIds: capture.mentionedIds.filter((id) => id !== person.id),
                    })
                  }
                  type="button"
                >
                  + {person.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3.5 p-4">
        <SectionLabel>What happened</SectionLabel>
        <TextArea
          onChange={(value) => patch({ notes: value })}
          placeholder="What did you talk about? What did they say?"
          rows={6}
          value={capture.notes}
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Meeting type">
            <ChoiceRow
              onChange={(value) => patch({ kind: value })}
              options={(Object.keys(meetingKindLabels) as MeetingKind[]).map((key) => ({
                label: meetingKindLabels[key],
                value: key,
              }))}
              value={capture.kind}
            />
          </Field>
          <Field
            label="How long"
            hint={`${capture.minutes} minutes · feeds your time reporting automatically.`}
          >
            <ChoiceRow
              onChange={(value) => patch({ minutes: Number(value) })}
              options={[
                { label: "15m", value: "15" },
                { label: "30m", value: "30" },
                { label: "45m", value: "45" },
                { label: "1h", value: "60" },
                { label: "1h30", value: "90" },
                { label: "2h", value: "120" },
              ]}
              value={String(capture.minutes)}
            />
          </Field>
        </div>
        <Field label="Scripture">
          <TextInput onChange={(value) => patch({ scripture: value })} placeholder="e.g. Luke 15" value={capture.scripture} />
        </Field>
      </Card>

      <Card className="p-4">
        <SectionLabel>Prayer needs</SectionLabel>
        <QuickList
          items={capture.prayer}
          onChange={(items) => patch({ prayer: items })}
          placeholder="What are they asking prayer for?"
        />
      </Card>

      <Card className="p-4">
        <SectionLabel>Commitments</SectionLabel>
        <div className="space-y-2">
          {capture.commitments.map((commitment, index) => (
            <div className="flex items-center gap-2" key={index}>
              <button
                className={`min-h-10 shrink-0 rounded-full px-3 text-[11px] font-bold ${
                  commitment.owner === "me" ? "bg-[#EBF2FF] text-[#1D4ED8]" : "bg-[#ECFDF5] text-[#047857]"
                }`}
                onClick={() =>
                  patch({
                    commitments: capture.commitments.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, owner: item.owner === "me" ? "them" : "me" } : item,
                    ),
                  })
                }
                type="button"
              >
                {commitment.owner === "me" ? "I will" : "They will"}
              </button>
              <div className="min-w-0 flex-1">
                <TextInput
                  onChange={(value) =>
                    patch({
                      commitments: capture.commitments.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, text: value } : item,
                      ),
                    })
                  }
                  placeholder="What was promised?"
                  value={commitment.text}
                />
              </div>
              <button
                aria-label="Remove"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#B91C1C]"
                onClick={() => patch({ commitments: capture.commitments.filter((_, i) => i !== index) })}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
          <Button
            onClick={() =>
              patch({ commitments: [...capture.commitments, { owner: "me", text: "", dueAt: addDaysFromToday(7) }] })
            }
            size="sm"
            tone="secondary"
          >
            + Add commitment
          </Button>
        </div>
      </Card>

      <Card className="space-y-3.5 p-4">
        <SectionLabel>Next step</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {nextStepOptions.map((option) => (
            <button
              className={`min-h-10 rounded-full px-3.5 text-xs font-bold transition ${
                capture.nextStep === option
                  ? "bg-[#2563EB] text-white"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2563EB]"
              }`}
              key={option}
              onClick={() => patch({ nextStep: option })}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <TextInput
          onChange={(value) => patch({ nextStep: value })}
          placeholder="Or write your own"
          value={capture.nextStep}
        />
        <Field label="Follow up on">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Tomorrow", days: 1 },
              { label: "3 days", days: 3 },
              { label: "Next week", days: 7 },
              { label: "2 weeks", days: 14 },
            ].map((option) => (
              <button
                className={`min-h-10 rounded-full px-3.5 text-xs font-bold transition ${
                  capture.followUpAt === addDaysFromToday(option.days)
                    ? "bg-[#2563EB] text-white"
                    : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2563EB]"
                }`}
                key={option.label}
                onClick={() => patch({ followUpAt: addDaysFromToday(option.days) })}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <TextInput onChange={(value) => patch({ followUpAt: value })} type="date" value={capture.followUpAt} />
          </div>
        </Field>
      </Card>

      <Card className="p-4">
        <SectionLabel>Fruit</SectionLabel>
        <ToggleChips
          onToggle={(value) =>
            patch({
              outcomes: capture.outcomes.includes(value)
                ? capture.outcomes.filter((item) => item !== value)
                : [...capture.outcomes, value],
            })
          }
          options={outcomeOptions}
          selected={capture.outcomes}
        />
      </Card>

      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-[#E8EFFA] bg-white/97 px-4 py-3 backdrop-blur md:sticky md:bottom-0 md:mx-0 md:rounded-2xl md:border">
        <div className="mx-auto flex max-w-[860px] items-center gap-3">
          <span className="text-xs font-bold text-[#64748B]">
            {saveState === "saved" ? "✓ Saved" : capture.personIds.length ? "Ready to save" : "Add a person"}
          </span>
          <div className="ml-auto flex gap-2">
            <Button onClick={onCancel} size="md" tone="secondary">
              Cancel
            </Button>
            <Button disabled={!capture.personIds.length} onClick={onSave} size="md">
              Save meeting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickList({
  items,
  onChange,
  placeholder,
}: {
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
              onChange={(value) => onChange(items.map((existing, i) => (i === index ? value : existing)))}
              placeholder={placeholder}
              value={item}
            />
          </div>
          <button
            aria-label="Remove"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#B91C1C]"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            type="button"
          >
            ✕
          </button>
        </div>
      ))}
      <Button onClick={() => onChange([...items, ""])} size="sm" tone="secondary">
        + Add
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- follow-ups */

function FollowUpsScreen({
  commitments,
  onCompleteCommitment,
  onCompletePerson,
  onOpenPerson,
  onSnoozeCommitment,
  onSnoozePerson,
  peopleById,
  peopleWithSteps,
}: {
  commitments: Commitment[];
  onCompleteCommitment: (id: string) => void;
  onCompletePerson: (id: string) => void;
  onOpenPerson: (id: string) => void;
  onSnoozeCommitment: (id: string) => void;
  onSnoozePerson: (id: string) => void;
  peopleById: Map<string, Person>;
  peopleWithSteps: Person[];
}) {
  const empty = !peopleWithSteps.length && !commitments.length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-4xl">Follow-ups</h1>
        <p className="mt-1.5 text-sm text-[#64748B]">Next steps and open commitments in one place.</p>
      </header>

      {empty ? <EmptyState detail="Nothing is waiting on you." title="All clear" /> : null}

      {peopleWithSteps.length ? (
        <section>
          <SectionLabel>Next steps</SectionLabel>
          <div className="grid gap-2">
            {peopleWithSteps.map((person) => (
              <Card className="p-3.5" key={person.id}>
                <div className="flex items-start gap-3">
                  <Avatar name={person.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="text-sm font-bold text-[#0F172A] hover:text-[#2563EB]"
                        onClick={() => onOpenPerson(person.id)}
                        type="button"
                      >
                        {person.name}
                      </button>
                      <Pill tone={isOverdue(person.nextStepDueAt) ? "red" : "blue"}>
                        {relativeDayLabel(person.nextStepDueAt) ?? "No date"}
                      </Pill>
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-[#64748B]">{person.nextStep}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button onClick={() => onCompletePerson(person.id)} size="sm" tone="secondary">
                    Done
                  </Button>
                  <Button onClick={() => onSnoozePerson(person.id)} size="sm" tone="quiet">
                    Snooze 3 days
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {commitments.length ? (
        <section>
          <SectionLabel>Open commitments</SectionLabel>
          <div className="grid gap-2">
            {commitments.map((commitment) => (
              <Card className="p-3.5" key={commitment.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={commitment.owner === "me" ? "blue" : "green"}>
                    {commitment.owner === "me" ? "I will" : "They will"}
                  </Pill>
                  <button
                    className="text-xs font-bold text-[#0F172A] hover:text-[#2563EB]"
                    onClick={() => onOpenPerson(commitment.personId)}
                    type="button"
                  >
                    {peopleById.get(commitment.personId)?.name}
                  </button>
                  <Pill tone={isOverdue(commitment.dueAt) ? "red" : "neutral"}>
                    {relativeDayLabel(commitment.dueAt) ?? "No date"}
                  </Pill>
                </div>
                <p className="mt-1.5 text-sm leading-5 text-[#0F172A]">{commitment.text}</p>
                <div className="mt-2.5 flex gap-2">
                  <Button onClick={() => onCompleteCommitment(commitment.id)} size="sm" tone="secondary">
                    Mark done
                  </Button>
                  <Button onClick={() => onSnoozeCommitment(commitment.id)} size="sm" tone="quiet">
                    Snooze 3 days
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- fruit */

function FruitScreen({
  fruit,
  loggedMeetings,
  peopleById,
  peopleCount,
  totalMinutes,
}: {
  fruit: FruitItem[];
  loggedMeetings: Meeting[];
  peopleById: Map<string, Person>;
  peopleCount: number;
  totalMinutes: number;
}) {
  const byOutcome = fruit.reduce<Record<string, number>>((acc, item) => {
    acc[item.outcome] = (acc[item.outcome] ?? 0) + 1;

    return acc;
  }, {});
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#0F172A] md:text-4xl">Fruit</h1>
        <p className="mt-1.5 text-sm text-[#64748B]">
          Every number here comes from meetings you already logged. Nothing is entered twice.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <MetricCard label="Meetings" value={String(loggedMeetings.length)} />
        <MetricCard label="Time invested" value={hours ? `${hours}h ${minutes}m` : `${minutes}m`} />
        <MetricCard label="People" value={String(peopleCount)} />
        <MetricCard label="Fruit recorded" value={String(fruit.length)} />
      </div>

      {Object.keys(byOutcome).length ? (
        <section>
          <SectionLabel>By outcome</SectionLabel>
          <Card className="divide-y divide-[#F1F5F9]">
            {Object.entries(byOutcome)
              .sort((first, second) => second[1] - first[1])
              .map(([outcome, count]) => (
                <div className="flex items-center gap-3 px-3.5 py-3" key={outcome}>
                  <Pill tone="green">{outcome}</Pill>
                  <span className="ml-auto text-sm font-black text-[#0F172A]">{count}</span>
                </div>
              ))}
          </Card>
        </section>
      ) : null}

      <section>
        <SectionLabel>Recent</SectionLabel>
        {fruit.length ? (
          <div className="grid gap-2">
            {fruit.map((item) => (
              <Card className="p-3.5" key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="green">{item.outcome}</Pill>
                  <span className="text-sm font-bold text-[#0F172A]">{peopleById.get(item.personId)?.name}</span>
                  <span className="ml-auto text-xs text-[#94A3B8]">{formatPrototypeDate(item.at)}</span>
                </div>
                {item.summary ? <p className="mt-1.5 text-xs leading-5 text-[#64748B]">{item.summary}</p> : null}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState detail="Log a meeting and mark what God did." title="No fruit recorded yet" />
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-1.5 text-2xl font-black tracking-[-0.02em] text-[#0F172A]">{value}</p>
    </Card>
  );
}

/* --------------------------------------------------------------- add person */

function AddPersonSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (person: Person) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [circle, setCircle] = useState<Circle>("field");

  return (
    <Sheet onClose={onClose} title="Add a person">
      <div className="space-y-4">
        <Field label="Name">
          <TextInput autoFocus onChange={setName} placeholder="First and last name" value={name} />
        </Field>
        <Field label="Phone" hint="Optional. You can fill the rest in later.">
          <TextInput onChange={setPhone} placeholder="555-0100" type="tel" value={phone} />
        </Field>
        <Field label="Circle">
          <ChoiceRow
            onChange={setCircle}
            options={[
              { label: circleLabels.three, value: "three" as const },
              { label: circleLabels.twelve, value: "twelve" as const },
              { label: circleLabels.seventy, value: "seventy" as const },
              { label: circleLabels.field, value: "field" as const },
            ]}
            value={circle}
          />
        </Field>
        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() =>
            onCreate({
              id: `p-${Date.now()}`,
              name: name.trim(),
              circle,
              role: "New contact",
              phone,
              lastMetAt: null,
              nextStep: null,
              nextStepDueAt: null,
            })
          }
          size="lg"
        >
          Add to my field
        </Button>
      </div>
    </Sheet>
  );
}

function V3Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          body:has(.dos-v3-route) {
            background: #F8FBFF !important;
            color: #0F172A;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            overflow-x: hidden;
          }

          .dos-v3-route,
          .dos-v3-route * {
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .dos-v3-route :where(button, a, input, textarea, select):focus {
            outline: none;
          }

          body:has(.dos-v3-route) > footer {
            display: none !important;
          }

          body:has(.dos-v3-route) nextjs-portal {
            display: none !important;
          }
        `,
      }}
    />
  );
}
