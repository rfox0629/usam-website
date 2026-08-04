"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  Circle,
  ClipboardList,
  FileText,
  Flame,
  Home,
  ListChecks,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  type EngagementLevel,
  type MeetingType,
  type MovementStep,
  type OutcomeTag,
  type ProtoPerson,
  type PrototypeState,
  daysFromToday,
  formatProtoDate,
  isDueToday,
  isOverdue,
  meetingTypes,
  movementSteps,
  outcomeTags,
  relativeDayLabel,
  seedPrototypeState,
} from "./prototype-data";

type TabId = "today" | "meeting" | "people" | "intake" | "reports";

const tabs: Array<{ icon: typeof Home; id: TabId; label: string }> = [
  { icon: Home, id: "today", label: "Today" },
  { icon: Plus, id: "meeting", label: "Meet" },
  { icon: Users, id: "people", label: "People" },
  { icon: Sparkles, id: "intake", label: "Intake" },
  { icon: ClipboardList, id: "reports", label: "Reports" },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function DosV3PrototypeClient() {
  const [state, setState] = useState<PrototypeState>(() => seedPrototypeState());
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2600);
  }

  function startMeetingWithPerson(personId: string) {
    setFocusPersonId(personId);
    setActiveTab("meeting");
  }

  return (
    <div className="dosv3-root min-h-screen bg-[#F8FAFC] text-[#0F172A]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PrototypeStyles />
      <TopBar />

      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        <SideNav activeTab={activeTab} onSelect={setActiveTab} />

        <main className="min-w-0 flex-1">
          {activeTab === "today" ? (
            <TodayView
              onOpenPerson={(id) => {
                setFocusPersonId(id);
                setActiveTab("people");
              }}
              onStartMeeting={() => {
                setFocusPersonId(null);
                setActiveTab("meeting");
              }}
              onStartMeetingWithPerson={startMeetingWithPerson}
              onToggleCommitment={(id) =>
                setState((current) => ({
                  ...current,
                  commitments: current.commitments.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
                }))
              }
              onToggleNextStep={(id) =>
                setState((current) => ({
                  ...current,
                  nextSteps: current.nextSteps.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
                }))
              }
              state={state}
            />
          ) : null}

          {activeTab === "meeting" ? (
            <MeetingFlow
              initialPersonId={focusPersonId}
              onDone={(summary) => {
                showToast(summary);
                setActiveTab("today");
                setFocusPersonId(null);
              }}
              setState={setState}
              state={state}
            />
          ) : null}

          {activeTab === "people" ? (
            <PeopleView
              focusPersonId={focusPersonId}
              onFocusPerson={setFocusPersonId}
              onStartMeetingWithPerson={startMeetingWithPerson}
              state={state}
            />
          ) : null}

          {activeTab === "intake" ? (
            <IntakeView
              onApproved={(summary) => {
                showToast(summary);
                setActiveTab("today");
              }}
              setState={setState}
              state={state}
            />
          ) : null}

          {activeTab === "reports" ? <ReportsView state={state} /> : null}
        </main>
      </div>

      <BottomTabBar activeTab={activeTab} onSelect={setActiveTab} />

      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0F172A] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.28)] lg:bottom-6">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B] transition hover:text-[#2563EB]" href="/dos">
            DOS
          </Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-sm font-bold tracking-[-0.01em] text-[#0F172A]">V3 Prototype</span>
        </div>
        <span className="rounded-full bg-[#EBF2FF] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]">
          Founder Preview
        </span>
      </div>
    </header>
  );
}

function PrototypeStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          body:has(.dosv3-root) { background: #F8FAFC !important; }
          body:has(.dosv3-root) > footer { display: none !important; }
        `,
      }}
    />
  );
}

function SideNav({ activeTab, onSelect }: { activeTab: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-24 flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-sm font-bold transition ${
                active ? "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]" : "text-[#475569] hover:bg-white"
              }`}
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BottomTabBar({ activeTab, onSelect }: { activeTab: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E8F0] bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              className="flex min-h-14 flex-col items-center justify-center gap-1 py-1.5"
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              type="button"
            >
              <Icon aria-hidden="true" className="h-5 w-5" color={active ? "#2563EB" : "#94A3B8"} strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[9px] font-bold uppercase tracking-[0.08em] ${active ? "text-[#2563EB]" : "text-[#94A3B8]"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SectionHeader({ action, subtitle, title }: { action?: React.ReactNode; subtitle?: string; title: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#0F172A]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm leading-5 text-[#64748B]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function personName(state: PrototypeState, personId: string) {
  return state.people.find((person) => person.id === personId)?.name ?? "Unknown";
}

/* ----------------------------- Today view ----------------------------- */

function TodayView({
  onOpenPerson,
  onStartMeeting,
  onStartMeetingWithPerson,
  onToggleCommitment,
  onToggleNextStep,
  state,
}: {
  onOpenPerson: (personId: string) => void;
  onStartMeeting: () => void;
  onStartMeetingWithPerson: (personId: string) => void;
  onToggleCommitment: (id: string) => void;
  onToggleNextStep: (id: string) => void;
  state: PrototypeState;
}) {
  const openCommitments = state.commitments.filter((item) => !item.done).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const openNextSteps = state.nextSteps.filter((item) => !item.done).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const dueOrOverdue = [...openCommitments.map((item) => ({ ...item, kind: "commitment" as const })), ...openNextSteps.map((item) => ({ ...item, kind: "next-step" as const }))]
    .filter((item) => isOverdue(item.dueDate) || isDueToday(item.dueDate))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const upcoming = [...openCommitments.map((item) => ({ ...item, kind: "commitment" as const })), ...openNextSteps.map((item) => ({ ...item, kind: "next-step" as const }))]
    .filter((item) => !isOverdue(item.dueDate) && !isDueToday(item.dueDate))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 4);

  const meetingsThisWeek = state.meetings.filter((meeting) => meeting.date >= daysFromToday(-7)).length;
  const activePeople = state.people.filter((person) => person.lastMeetingAt && person.lastMeetingAt >= daysFromToday(-14)).length;

  return (
    <div className="space-y-5">
      <SectionHeader subtitle="What needs your attention right now." title="Today" />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatPill label="Meetings this week" value={String(meetingsThisWeek)} />
        <StatPill label="Active people" value={String(activePeople)} />
        <StatPill label="Open follow-ups" value={String(openCommitments.length + openNextSteps.length)} />
        <StatPill label="Fruit this month" value={String(state.fruit.length)} />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
          onClick={onStartMeeting}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          Log a Meeting
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-5 text-sm font-bold text-[#0F172A] transition hover:border-[#2563EB]"
          onClick={() => onOpenPerson("")}
          type="button"
        >
          <Search aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
          Find / Add Person
        </button>
      </div>

      <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#0F172A]">Due now</h2>
        {dueOrOverdue.length ? (
          <div className="mt-3 space-y-2">
            {dueOrOverdue.map((item) => (
              <FollowUpRow
                item={item}
                key={item.id}
                onOpenPerson={onOpenPerson}
                onStartMeeting={onStartMeetingWithPerson}
                onToggle={item.kind === "commitment" ? onToggleCommitment : onToggleNextStep}
                personName={personName(state, item.personId)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#64748B]">Nothing overdue. You&rsquo;re caught up.</p>
        )}
      </section>

      {upcoming.length ? (
        <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#0F172A]">Coming up</h2>
          <div className="mt-3 space-y-2">
            {upcoming.map((item) => (
              <FollowUpRow
                item={item}
                key={item.id}
                onOpenPerson={onOpenPerson}
                onStartMeeting={onStartMeetingWithPerson}
                onToggle={item.kind === "commitment" ? onToggleCommitment : onToggleNextStep}
                personName={personName(state, item.personId)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-3.5 py-3">
      <p className="text-xl font-bold tracking-[-0.02em] text-[#0F172A]">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#64748B]">{label}</p>
    </div>
  );
}

function FollowUpRow({
  item,
  onOpenPerson,
  onStartMeeting,
  onToggle,
  personName: name,
}: {
  item: { dueDate: string; id: string; kind: "commitment" | "next-step"; personId: string; text: string };
  onOpenPerson: (personId: string) => void;
  onStartMeeting: (personId: string) => void;
  onToggle: (id: string) => void;
  personName: string;
}) {
  const overdue = isOverdue(item.dueDate);
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3">
      <button className="mt-0.5 shrink-0" onClick={() => onToggle(item.id)} type="button">
        <Circle aria-hidden="true" className="h-5 w-5 text-[#CBD5E1] transition hover:text-[#2563EB]" strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-[#0F172A]">{item.text}</p>
        <button className="mt-1 text-xs font-bold text-[#2563EB] hover:underline" onClick={() => onOpenPerson(item.personId)} type="button">
          {name}
        </button>
        <span className={`ml-2 text-xs font-semibold ${overdue ? "text-[#B91C1C]" : "text-[#64748B]"}`}>
          {overdue ? "Overdue" : relativeDayLabel(item.dueDate)}
        </span>
      </div>
      <button
        className="shrink-0 rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-bold text-[#475569] transition hover:border-[#2563EB] hover:text-[#2563EB]"
        onClick={() => onStartMeeting(item.personId)}
        type="button"
      >
        Log
      </button>
    </div>
  );
}

/* ---------------------------- Meeting flow ----------------------------- */

type MeetingStep = "person" | "capture" | "confirm";

function MeetingFlow({
  initialPersonId,
  onDone,
  setState,
  state,
}: {
  initialPersonId: string | null;
  onDone: (summary: string) => void;
  setState: React.Dispatch<React.SetStateAction<PrototypeState>>;
  state: PrototypeState;
}) {
  const [step, setStep] = useState<MeetingStep>(initialPersonId ? "capture" : "person");
  const [personIds, setPersonIds] = useState<string[]>(initialPersonId ? [initialPersonId] : []);
  const [meetingType, setMeetingType] = useState<MeetingType>("Coffee");
  const [notes, setNotes] = useState("");
  const [prayerText, setPrayerText] = useState("");
  const [commitmentText, setCommitmentText] = useState("");
  const [nextStepText, setNextStepText] = useState("");
  const [followUpDate, setFollowUpDate] = useState(daysFromToday(3));
  const [movementStep, setMovementStep] = useState<MovementStep>("Continue meeting");
  const [personQuery, setPersonQuery] = useState("");

  const filteredPeople = state.people.filter((person) => person.name.toLowerCase().includes(personQuery.toLowerCase()));

  function addNewPerson(name: string) {
    const newPerson: ProtoPerson = {
      engagementLevel: "New Contact",
      id: uid("p"),
      lastMeetingAt: null,
      name,
      phone: "",
      relationshipType: "Other",
    };
    setState((current) => ({ ...current, people: [...current.people, newPerson] }));
    setPersonIds((current) => [...current, newPerson.id]);
  }

  function togglePerson(id: string) {
    setPersonIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function saveMeeting() {
    const meetingId = uid("m");
    const today = daysFromToday(0);

    setState((current) => {
      const commitments = commitmentText.trim()
        ? personIds.map((personId) => ({
            createdAt: today,
            done: false,
            dueDate: followUpDate,
            id: uid("c"),
            personId,
            text: commitmentText.trim(),
          }))
        : [];
      const nextSteps = nextStepText.trim()
        ? personIds.map((personId) => ({
            createdAt: today,
            done: false,
            dueDate: followUpDate,
            id: uid("n"),
            personId,
            text: nextStepText.trim(),
          }))
        : [];
      const prayerNeeds = prayerText.trim()
        ? personIds.map((personId) => ({
            answered: false,
            createdAt: today,
            id: uid("pr"),
            personId,
            text: prayerText.trim(),
          }))
        : [];

      return {
        ...current,
        commitments: [...current.commitments, ...commitments],
        meetings: [
          ...current.meetings,
          {
            createdAt: today,
            date: today,
            followUpDate,
            id: meetingId,
            movementStep,
            notes,
            personIds,
            type: meetingType,
          },
        ],
        nextSteps: [...current.nextSteps, ...nextSteps],
        people: current.people.map((person) => (personIds.includes(person.id) ? { ...person, lastMeetingAt: today } : person)),
        prayerNeeds: [...current.prayerNeeds, ...prayerNeeds],
      };
    });

    const names = personIds.map((id) => personName(state, id)).join(", ");
    onDone(`Meeting saved with ${names || "your notes"}.`);
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        action={
          step !== "person" ? (
            <button
              className="inline-flex items-center gap-1 text-xs font-bold text-[#64748B] hover:text-[#2563EB]"
              onClick={() => setStep(step === "confirm" ? "capture" : "person")}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
              Back
            </button>
          ) : undefined
        }
        subtitle="Meet → capture → follow up, in one flow."
        title="Log a Meeting"
      />

      <StepDots active={step} />

      {step === "person" ? (
        <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <p className="text-sm font-bold text-[#0F172A]">Who did you meet with?</p>
          <div className="relative mt-3">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" strokeWidth={2} />
            <input
              className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:bg-white"
              onChange={(event) => setPersonQuery(event.target.value)}
              placeholder="Search people"
              value={personQuery}
            />
          </div>

          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            {filteredPeople.map((person) => {
              const selected = personIds.includes(person.id);
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition ${
                    selected ? "border-[#2563EB] bg-[#EBF2FF]" : "border-[#F1F5F9] bg-[#FAFBFD] hover:border-[#BFDBFE]"
                  }`}
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0F172A]">{person.name}</p>
                    <p className="text-xs text-[#64748B]">{person.relationshipType} · {person.engagementLevel}</p>
                  </div>
                  {selected ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#2563EB]" strokeWidth={2} /> : null}
                </button>
              );
            })}

            {personQuery.trim() && !filteredPeople.some((person) => person.name.toLowerCase() === personQuery.trim().toLowerCase()) ? (
              <button
                className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F8FBFF] px-3.5 py-2.5 text-left text-sm font-bold text-[#2563EB] transition hover:bg-[#EBF2FF]"
                onClick={() => {
                  addNewPerson(personQuery.trim());
                  setPersonQuery("");
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                Add &ldquo;{personQuery.trim()}&rdquo; as a new person
              </button>
            ) : null}
          </div>

          <button
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!personIds.length}
            onClick={() => setStep("capture")}
            type="button"
          >
            Continue{personIds.length ? ` with ${personIds.length}` : ""}
          </button>
        </section>
      ) : null}

      {step === "capture" ? (
        <section className="space-y-3.5 rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Meeting type</p>
            <div className="flex flex-wrap gap-1.5">
              {meetingTypes.map((type) => (
                <button
                  className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    meetingType === type ? "bg-[#2563EB] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]"
                  }`}
                  key={type}
                  onClick={() => setMeetingType(type)}
                  type="button"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <LabeledTextarea label="Notes" onChange={setNotes} placeholder="What happened? What did you talk about?" value={notes} />
          <LabeledTextarea label="Prayer need" onChange={setPrayerText} placeholder="Anything to pray about" rows={2} value={prayerText} />
          <LabeledTextarea label="Commitment" onChange={setCommitmentText} placeholder="What did they commit to?" rows={2} value={commitmentText} />
          <LabeledTextarea label="Next step" onChange={setNextStepText} placeholder="What happens next?" rows={2} value={nextStepText} />

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Follow-up date</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Tomorrow", value: daysFromToday(1) },
                { label: "This week", value: daysFromToday(5) },
                { label: "Next week", value: daysFromToday(9) },
              ].map((preset) => (
                <button
                  className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    followUpDate === preset.value ? "bg-[#2563EB] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]"
                  }`}
                  key={preset.label}
                  onClick={() => setFollowUpDate(preset.value)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
              <input
                className="min-h-9 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-bold text-[#0F172A] outline-none focus:border-[#2563EB]"
                onChange={(event) => setFollowUpDate(event.target.value)}
                type="date"
                value={followUpDate}
              />
            </div>
          </div>

          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
            onClick={() => setStep("confirm")}
            type="button"
          >
            Continue
          </button>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section className="space-y-4 rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Movement step</p>
            <div className="flex flex-wrap gap-1.5">
              {movementSteps.map((option) => (
                <button
                  className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    movementStep === option ? "bg-[#2563EB] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]"
                  }`}
                  key={option}
                  onClick={() => setMovementStep(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3.5 text-sm leading-6 text-[#475569]">
            <p><strong className="text-[#0F172A]">People:</strong> {personIds.map((id) => personName(state, id)).join(", ") || "—"}</p>
            <p><strong className="text-[#0F172A]">Type:</strong> {meetingType}</p>
            <p><strong className="text-[#0F172A]">Follow up:</strong> {relativeDayLabel(followUpDate)}</p>
          </div>

          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
            onClick={saveMeeting}
            type="button"
          >
            Save Meeting
          </button>
        </section>
      ) : null}
    </div>
  );
}

function StepDots({ active }: { active: MeetingStep }) {
  const steps: MeetingStep[] = ["person", "capture", "confirm"];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step) => (
        <span
          className={`h-1.5 flex-1 rounded-full transition ${
            steps.indexOf(step) <= steps.indexOf(active) ? "bg-[#2563EB]" : "bg-[#E2E8F0]"
          }`}
          key={step}
        />
      ))}
    </div>
  );
}

function LabeledTextarea({
  label,
  onChange,
  placeholder,
  rows = 3,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">{label}</span>
      <textarea
        className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

/* ----------------------------- People view ------------------------------ */

function PeopleView({
  focusPersonId,
  onFocusPerson,
  onStartMeetingWithPerson,
  state,
}: {
  focusPersonId: string | null;
  onFocusPerson: (id: string | null) => void;
  onStartMeetingWithPerson: (personId: string) => void;
  state: PrototypeState;
}) {
  const [query, setQuery] = useState("");
  const filtered = state.people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()));
  const selected = state.people.find((person) => person.id === focusPersonId) ?? null;

  if (selected) {
    return <PersonDetail onBack={() => onFocusPerson(null)} onStartMeeting={onStartMeetingWithPerson} person={selected} state={state} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader subtitle="Find, add, and move between people fast." title="People" />

      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" strokeWidth={2} />
        <input
          className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-white pl-10 pr-4 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB]"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people"
          value={query}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((person) => (
          <button
            className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-3.5 text-left transition hover:border-[#BFDBFE]"
            key={person.id}
            onClick={() => onFocusPerson(person.id)}
            type="button"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#0F172A]">{person.name}</p>
              <p className="text-xs text-[#64748B]">
                {person.relationshipType} · {person.engagementLevel} · {person.lastMeetingAt ? `Last met ${relativeDayLabel(person.lastMeetingAt)}` : "No meetings yet"}
              </p>
            </div>
            <EngagementPill level={person.engagementLevel} />
          </button>
        ))}
        {!filtered.length ? <p className="text-sm text-[#64748B]">No people match &ldquo;{query}&rdquo;.</p> : null}
      </div>
    </div>
  );
}

function EngagementPill({ level }: { level: EngagementLevel }) {
  const styles: Record<EngagementLevel, string> = {
    "Building Trust": "bg-[#FEF3C7] text-[#92400E]",
    Disciple: "bg-[#DCFCE7] text-[#166534]",
    Leader: "bg-[#EDE9FE] text-[#5B21B6]",
    "New Contact": "bg-[#E2E8F0] text-[#475569]",
    Open: "bg-[#DCEBFF] text-[#1D4ED8]",
  };
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[level]}`}>{level}</span>;
}

function PersonDetail({
  onBack,
  onStartMeeting,
  person,
  state,
}: {
  onBack: () => void;
  onStartMeeting: (personId: string) => void;
  person: ProtoPerson;
  state: PrototypeState;
}) {
  const meetings = state.meetings.filter((meeting) => meeting.personIds.includes(person.id)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const commitments = state.commitments.filter((item) => item.personId === person.id);
  const prayerNeeds = state.prayerNeeds.filter((item) => item.personId === person.id);
  const fruit = state.fruit.filter((item) => item.personId === person.id);

  return (
    <div className="space-y-4">
      <button className="inline-flex items-center gap-1 text-xs font-bold text-[#64748B] hover:text-[#2563EB]" onClick={onBack} type="button">
        <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
        All People
      </button>

      <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-[#0F172A]">{person.name}</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">{person.relationshipType}{person.church ? ` · ${person.church}` : ""}{person.phone ? ` · ${person.phone}` : ""}</p>
          </div>
          <EngagementPill level={person.engagementLevel} />
        </div>
        <button
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
          onClick={() => onStartMeeting(person.id)}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          Log Meeting
        </button>
      </section>

      {fruit.length ? (
        <DetailSection icon={<Flame aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />} title="Fruit">
          {fruit.map((item) => (
            <div className="rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3" key={item.id}>
              <p className="text-sm font-semibold text-[#0F172A]">{item.summary}</p>
              <p className="mt-1 text-xs font-bold text-[#166534]">{item.outcomeTag} · {formatProtoDate(item.date)}</p>
            </div>
          ))}
        </DetailSection>
      ) : null}

      <DetailSection icon={<CalendarCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />} title="Meeting History">
        {meetings.length ? (
          meetings.map((meeting) => (
            <div className="rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3" key={meeting.id}>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">{meeting.type} · {formatProtoDate(meeting.date)}</p>
              <p className="mt-1 text-sm leading-5 text-[#0F172A]">{meeting.notes}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#64748B]">No meetings logged yet.</p>
        )}
      </DetailSection>

      <DetailSection icon={<ListChecks aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />} title="Commitments">
        {commitments.length ? (
          commitments.map((item) => (
            <div className="flex items-center justify-between rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3" key={item.id}>
              <p className={`text-sm ${item.done ? "text-[#94A3B8] line-through" : "text-[#0F172A]"}`}>{item.text}</p>
              <span className="text-xs font-semibold text-[#64748B]">{relativeDayLabel(item.dueDate)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#64748B]">No commitments yet.</p>
        )}
      </DetailSection>

      <DetailSection icon={<Sparkles aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />} title="Prayer Needs">
        {prayerNeeds.length ? (
          prayerNeeds.map((item) => (
            <div className="flex items-center justify-between rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3" key={item.id}>
              <p className="text-sm text-[#0F172A]">{item.text}</p>
              {item.answered ? <span className="text-xs font-bold text-[#166534]">Answered</span> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-[#64748B]">No prayer needs recorded.</p>
        )}
      </DetailSection>
    </div>
  );
}

function DetailSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[#0F172A]">
        {icon}
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/* ------------------------------ Intake view ------------------------------ */

type IntakeSource = "DOS Recording" | "Plaud" | "Pasted Notes" | "Document" | "Other";
const intakeSources: IntakeSource[] = ["DOS Recording", "Plaud", "Pasted Notes", "Document", "Other"];

type IntakeSuggestion = {
  commitments: string[];
  followUpDate: string;
  matchedPersonIds: string[];
  movementStep: MovementStep;
  newPersonNames: string[];
  nextSteps: string[];
  prayerNeeds: string[];
  scripture: string[];
  summary: string;
};

function mockExtract(text: string, people: ProtoPerson[]): IntakeSuggestion {
  const sentences = text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const matchedPersonIds = people.filter((person) => lower.includes(person.name.toLowerCase().split(" ")[0].toLowerCase())).map((person) => person.id);

  const capitalizedNamePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  const capitalizedNames = Array.from(new Set(text.match(capitalizedNamePattern) ?? []));
  const newPersonNames = capitalizedNames.filter(
    (name) => !people.some((person) => person.name.toLowerCase() === name.toLowerCase()),
  );

  const prayerNeeds = sentences.filter((sentence) => /pray|healing|comfort|peace about/i.test(sentence));
  const commitments = sentences.filter((sentence) => !prayerNeeds.includes(sentence) && /will |going to|committed to|agreed to/i.test(sentence));
  const nextSteps = sentences.filter(
    (sentence) => !prayerNeeds.includes(sentence) && !commitments.includes(sentence) && /next (step|time)|follow up|follow-up|reach out/i.test(sentence),
  );
  const scripture = Array.from(new Set(text.match(/\b(?:[1-3]\s)?[A-Z][a-z]+\s\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?\b/g) ?? []));

  let movementStep: MovementStep = "Continue meeting";
  if (/baptis/i.test(text)) movementStep = "Begin discipleship";
  else if (/group|table/i.test(text)) movementStep = "Invite to group";
  else if (/church/i.test(text)) movementStep = "Connect to church";
  else if (/pray and wait|not ready/i.test(text)) movementStep = "Pray and wait";

  const summary = sentences.slice(0, 2).join(" ") || text.slice(0, 160);

  return {
    commitments: commitments.length ? commitments : [],
    followUpDate: daysFromToday(5),
    matchedPersonIds,
    movementStep,
    newPersonNames,
    nextSteps: nextSteps.length ? nextSteps : [],
    prayerNeeds: prayerNeeds.length ? prayerNeeds : [],
    scripture,
    summary,
  };
}

function IntakeView({
  onApproved,
  setState,
  state,
}: {
  onApproved: (summary: string) => void;
  setState: React.Dispatch<React.SetStateAction<PrototypeState>>;
  state: PrototypeState;
}) {
  const [source, setSource] = useState<IntakeSource>("Pasted Notes");
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<IntakeSuggestion | null>(null);
  const [editableSummary, setEditableSummary] = useState("");
  const [editablePrayer, setEditablePrayer] = useState("");
  const [editableCommitment, setEditableCommitment] = useState("");
  const [editableNextStep, setEditableNextStep] = useState("");

  const sampleText =
    "Met with Priya for coffee. She's been asking real questions about faith since her mom's diagnosis. She said she will read the book of John before we meet again. We should follow up next week and pray for healing for her mother. She mentioned wanting to visit a church sometime.";

  function analyze() {
    if (!text.trim()) return;
    setAnalyzing(true);
    setSuggestion(null);
    window.setTimeout(() => {
      const result = mockExtract(text, state.people);
      setSuggestion(result);
      setEditableSummary(result.summary);
      setEditablePrayer(result.prayerNeeds.join(" "));
      setEditableCommitment(result.commitments.join(" "));
      setEditableNextStep(result.nextSteps.join(" "));
      setAnalyzing(false);
    }, 900);
  }

  function approve() {
    if (!suggestion) return;
    const personId = suggestion.matchedPersonIds[0] ?? null;
    const today = daysFromToday(0);

    setState((current) => {
      let people = current.people;
      let resolvedPersonId = personId;

      if (!resolvedPersonId && suggestion.newPersonNames[0]) {
        const newPerson: ProtoPerson = {
          engagementLevel: "New Contact",
          id: uid("p"),
          lastMeetingAt: today,
          name: suggestion.newPersonNames[0],
          phone: "",
          relationshipType: "Other",
        };
        people = [...people, newPerson];
        resolvedPersonId = newPerson.id;
      }

      if (!resolvedPersonId) return current;

      const meeting = {
        createdAt: today,
        date: today,
        followUpDate: suggestion.followUpDate,
        id: uid("m"),
        movementStep: suggestion.movementStep,
        notes: editableSummary,
        personIds: [resolvedPersonId],
        type: "Other" as MeetingType,
      };

      const prayerNeeds = editablePrayer.trim()
        ? [{ answered: false, createdAt: today, id: uid("pr"), personId: resolvedPersonId, text: editablePrayer.trim() }]
        : [];
      const commitments = editableCommitment.trim()
        ? [{ createdAt: today, done: false, dueDate: suggestion.followUpDate, id: uid("c"), personId: resolvedPersonId, text: editableCommitment.trim() }]
        : [];
      const nextSteps = editableNextStep.trim()
        ? [{ createdAt: today, done: false, dueDate: suggestion.followUpDate, id: uid("n"), personId: resolvedPersonId, text: editableNextStep.trim() }]
        : [];

      return {
        ...current,
        commitments: [...current.commitments, ...commitments],
        meetings: [...current.meetings, meeting],
        nextSteps: [...current.nextSteps, ...nextSteps],
        people: people.map((person) => (person.id === resolvedPersonId ? { ...person, lastMeetingAt: today } : person)),
        prayerNeeds: [...current.prayerNeeds, ...prayerNeeds],
      };
    });

    onApproved("Intake approved and added to DOS.");
    setText("");
    setSuggestion(null);
  }

  return (
    <div className="space-y-4">
      <SectionHeader subtitle="Paste a transcript or notes from any source. Nothing saves until you approve it." title="AI-Assisted Intake" />

      <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Source</p>
        <div className="flex flex-wrap gap-1.5">
          {intakeSources.map((option) => (
            <button
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                source === option ? "bg-[#2563EB] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]"
              }`}
              key={option}
              onClick={() => setSource(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
            <span>Paste transcript, recording summary, or notes</span>
            <button className="text-[#2563EB] normal-case tracking-normal" onClick={() => setText(sampleText)} type="button">
              Use sample
            </button>
          </span>
          <textarea
            className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:bg-white"
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste a DOS recording transcript, Plaud summary, or your own notes…"
            rows={6}
            value={text}
          />
        </label>

        <button
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!text.trim() || analyzing}
          onClick={analyze}
          type="button"
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </section>

      {suggestion ? (
        <section className="space-y-3.5 rounded-[24px] border border-[#BFDBFE] bg-[#F8FBFF] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#0F172A]">Review before saving</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2563EB]">Nothing saved yet</span>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">People</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestion.matchedPersonIds.map((id) => (
                <span className="rounded-full bg-[#DCFCE7] px-3 py-1.5 text-xs font-bold text-[#166534]" key={id}>
                  {personName(state, id)} · matched
                </span>
              ))}
              {suggestion.newPersonNames.map((name) => (
                <span className="rounded-full bg-[#FEF3C7] px-3 py-1.5 text-xs font-bold text-[#92400E]" key={name}>
                  {name} · new person
                </span>
              ))}
              {!suggestion.matchedPersonIds.length && !suggestion.newPersonNames.length ? (
                <span className="text-xs text-[#64748B]">No people detected — add manually below.</span>
              ) : null}
            </div>
          </div>

          <LabeledTextarea label="Summary" onChange={setEditableSummary} placeholder="Meeting summary" rows={2} value={editableSummary} />
          <LabeledTextarea label="Prayer need" onChange={setEditablePrayer} placeholder="Prayer request" rows={2} value={editablePrayer} />
          <LabeledTextarea label="Commitment" onChange={setEditableCommitment} placeholder="Commitment made" rows={2} value={editableCommitment} />
          <LabeledTextarea label="Next step" onChange={setEditableNextStep} placeholder="Next step" rows={2} value={editableNextStep} />

          {suggestion.scripture.length ? (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Scripture / Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.scripture.map((ref) => (
                  <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#475569]" key={ref}>
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Suggested movement step</p>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#2563EB]">{suggestion.movementStep}</span>
          </div>

          <div className="flex gap-2.5">
            <button
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
              onClick={approve}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
              Approve &amp; Save
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-5 text-sm font-bold text-[#475569] transition hover:border-[#B91C1C] hover:text-[#B91C1C]"
              onClick={() => setSuggestion(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
              Discard
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------ Reports view ------------------------------ */

function ReportsView({ state }: { state: PrototypeState }) {
  const openCommitments = state.commitments.filter((item) => !item.done).length;
  const closedCommitments = state.commitments.filter((item) => item.done).length;
  const outcomeCounts = outcomeTags
    .map((tag) => ({ count: state.fruit.filter((item) => item.outcomeTag === tag).length, tag }))
    .filter((entry) => entry.count > 0);

  return (
    <div className="space-y-5">
      <SectionHeader subtitle="Rolls up automatically from meetings you already logged. No duplicate entry." title="Reporting" />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatPill label="Meetings logged" value={String(state.meetings.length)} />
        <StatPill label="People engaged" value={String(state.people.filter((person) => person.lastMeetingAt).length)} />
        <StatPill label="Commitments open" value={String(openCommitments)} />
        <StatPill label="Commitments closed" value={String(closedCommitments)} />
      </div>

      <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#0F172A]">Fruit by outcome</h2>
        {outcomeCounts.length ? (
          <div className="mt-3 space-y-2">
            {outcomeCounts.map((entry) => (
              <div className="flex items-center justify-between rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] px-3.5 py-2.5" key={entry.tag}>
                <span className="text-sm font-semibold text-[#0F172A]">{entry.tag}</span>
                <span className="text-sm font-bold text-[#2563EB]">{entry.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#64748B]">No fruit recorded yet.</p>
        )}
      </section>

      <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[#0F172A]">
          <FileText aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          Recent Meetings
        </h2>
        <div className="mt-3 space-y-2">
          {state.meetings
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 5)
            .map((meeting) => (
              <div className="rounded-2xl border border-[#F1F5F9] bg-[#FAFBFD] p-3" key={meeting.id}>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">
                  {formatProtoDate(meeting.date)} · {meeting.type} · {meeting.movementStep}
                </p>
                <p className="mt-1 text-sm text-[#0F172A]">{meeting.personIds.map((id) => personName(state, id)).join(", ")}</p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
