"use client";

import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock,
  FileText,
  Heart,
  Home,
  Mic,
  MoreHorizontal,
  Send,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  NOW_ISO,
  accountabilityCheckIns as fixtureCheckIns,
  accountabilityTopics as fixtureTopics,
  fruit as fixtureFruit,
  groups as fixtureGroups,
  journeyAssignments as fixtureJourneys,
  meetings as fixtureMeetings,
  nextSteps as fixtureNextSteps,
  people as fixturePeople,
  prayers as fixturePrayers,
} from "@/src/components/dos/v2/fixtureData";
import type {
  AccountabilityState,
  HistoryEvent,
  ProtoAccountabilityCheckIn,
  ProtoAccountabilityTopic,
  ProtoFruit,
  ProtoGroup,
  ProtoJourneyAssignment,
  ProtoMeeting,
  ProtoNextStep,
  ProtoPerson,
  ProtoPrayer,
  Sphere,
} from "@/src/components/dos/v2/types";

type View = "home" | "meetings" | "more" | "person" | "schedule" | "meeting" | "history" | "add-person" | "report";
type PrimaryNav = "home" | "meetings" | "more";

type PrototypeState = {
  accountabilityTopics: ProtoAccountabilityTopic[];
  checkIns: ProtoAccountabilityCheckIn[];
  fruit: ProtoFruit[];
  groups: ProtoGroup[];
  journeys: ProtoJourneyAssignment[];
  meetings: ProtoMeeting[];
  nextSteps: ProtoNextStep[];
  people: ProtoPerson[];
  prayers: ProtoPrayer[];
};

type Toast = {
  title: string;
  detail: string;
};

const sphereOrder: Sphere[] = ["three", "twelve", "seventy", "onetwenty"];
const sphereCopy: Record<Sphere, { label: string; short: string; intent: string }> = {
  three: {
    label: "Closest 3",
    short: "3",
    intent: "Deepest investment",
  },
  twelve: {
    label: "Core 12",
    short: "12",
    intent: "Active discipleship",
  },
  seventy: {
    label: "Broader 70",
    short: "70",
    intent: "Regular engagement",
  },
  onetwenty: {
    label: "Open 120",
    short: "120",
    intent: "Prayerful field",
  },
};

const outcomeCopy: Record<AccountabilityState, string> = {
  discussed: "Discussed",
  going_well: "Going well",
  reset: "Reset",
  struggling: "Struggling",
};

function cloneInitialState(): PrototypeState {
  return {
    accountabilityTopics: fixtureTopics.map((item) => ({ ...item })),
    checkIns: fixtureCheckIns.map((item) => ({ ...item })),
    fruit: fixtureFruit.map((item) => ({ ...item })),
    groups: fixtureGroups.map((group) => ({
      ...group,
      gatherings: group.gatherings.map((gathering) => ({ ...gathering })),
      memberPersonIds: [...group.memberPersonIds],
    })),
    journeys: fixtureJourneys.map((item) => ({ ...item })),
    meetings: fixtureMeetings.map((item) => ({ ...item, personIds: [...item.personIds] })),
    nextSteps: fixtureNextSteps.map((item) => ({ ...item })),
    people: fixturePeople.map((item) => ({ ...item })),
    prayers: fixturePrayers.map((item) => ({ ...item })),
  };
}

function fullName(person: ProtoPerson) {
  return `${person.firstName} ${person.lastName}`;
}

function initials(person: ProtoPerson) {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function dayDiff(value: string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((new Date(NOW_ISO).getTime() - new Date(value).getTime()) / 86_400_000);
}

function relativeDate(value: string | null | undefined) {
  const diff = dayDiff(value);

  if (!Number.isFinite(diff)) {
    return "Not yet";
  }

  if (diff === 0) {
    return "Today";
  }

  if (diff === 1) {
    return "Yesterday";
  }

  if (diff > 1) {
    return `${diff} days ago`;
  }

  if (diff === -1) {
    return "Tomorrow";
  }

  return `In ${Math.abs(diff)} days`;
}

function byNewestDate(first: { date: string }, second: { date: string }) {
  return new Date(second.date).getTime() - new Date(first.date).getTime();
}

function peopleById(people: ProtoPerson[]) {
  return new Map(people.map((person) => [person.id, person]));
}

function personMeetings(state: PrototypeState, personId: string) {
  return state.meetings
    .filter((meeting) => meeting.personIds.includes(personId))
    .sort((first, second) => new Date(second.scheduledAt).getTime() - new Date(first.scheduledAt).getTime());
}

function loggedMeetings(state: PrototypeState, personId: string) {
  return personMeetings(state, personId).filter((meeting) => meeting.status === "logged");
}

function scheduledMeetings(state: PrototypeState, personId: string) {
  return personMeetings(state, personId)
    .filter((meeting) => meeting.status === "scheduled")
    .sort((first, second) => new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime());
}

function personTopics(state: PrototypeState, personId: string) {
  return state.accountabilityTopics.filter((topic) => topic.personId === personId);
}

function personJourneys(state: PrototypeState, personId: string) {
  return state.journeys.filter((journey) => journey.personId === personId);
}

function personPrayers(state: PrototypeState, personId: string) {
  return state.prayers.filter((prayer) => prayer.personId === personId);
}

function personGroups(state: PrototypeState, personId: string) {
  return state.groups.filter((group) => group.memberPersonIds.includes(personId));
}

function personNextSteps(state: PrototypeState, personId: string) {
  return state.nextSteps
    .filter((step) => step.personId === personId)
    .sort((first, second) => new Date(first.dueAt ?? first.createdAt).getTime() - new Date(second.dueAt ?? second.createdAt).getTime());
}

function statusTone(status: AccountabilityState) {
  if (status === "going_well") {
    return "border-[#CFE8D8] bg-[#EDF7F1] text-[#1F7A4D]";
  }

  if (status === "struggling") {
    return "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]";
  }

  return "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]";
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function buildHistory(state: PrototypeState, personId: string): HistoryEvent[] {
  const topics = new Map(state.accountabilityTopics.map((topic) => [topic.id, topic]));
  const groups = personGroups(state, personId);

  const meetingEvents: HistoryEvent[] = state.meetings
    .filter((meeting) => meeting.personIds.includes(personId))
    .map((meeting) => ({
      date: meeting.loggedAt ?? meeting.scheduledAt,
      detail: meeting.notes,
      id: `history-${meeting.id}`,
      personId,
      title: meeting.status === "logged" ? `${meeting.context ?? "Meeting"} logged` : `${meeting.context ?? "Meeting"} scheduled`,
      type: meeting.status === "logged" ? "meeting_logged" : "meeting_scheduled",
    }));

  const topicEvents: HistoryEvent[] = state.accountabilityTopics
    .filter((topic) => topic.personId === personId)
    .map((topic) => ({
      date: topic.createdAt,
      detail: topic.cadence,
      id: `history-topic-${topic.id}`,
      personId,
      title: `${topic.topic} accountability started`,
      type: "accountability_started",
    }));

  const checkInEvents: HistoryEvent[] = state.checkIns
    .filter((checkIn) => checkIn.personId === personId)
    .map((checkIn) => ({
      date: checkIn.createdAt,
      detail: checkIn.note,
      id: `history-checkin-${checkIn.id}`,
      personId,
      title: `${topics.get(checkIn.topicId)?.topic ?? "Accountability"} check-in: ${outcomeCopy[checkIn.outcome]}`,
      type: "accountability_checkin",
    }));

  const journeyEvents: HistoryEvent[] = state.journeys
    .filter((journey) => journey.personId === personId)
    .flatMap((journey) => [
      {
        date: journey.startedAt,
        detail: journey.context === "group" ? `From ${groups.find((group) => group.id === journey.groupId)?.name ?? "Group"}` : "Direct assignment",
        id: `history-journey-start-${journey.id}`,
        personId,
        title: `${journey.resourceTitle} assigned`,
        type: "journey_assigned" as const,
      },
      ...(journey.lastActivityAt
        ? [{
            date: journey.lastActivityAt,
            detail: `${journey.completedUnits}/${journey.totalUnits} ${journey.unitLabel.toLowerCase()}s complete`,
            id: `history-journey-progress-${journey.id}`,
            personId,
            title: `${journey.resourceTitle} progress`,
            type: "journey_progress" as const,
          }]
        : []),
    ]);

  const prayerEvents: HistoryEvent[] = state.prayers
    .filter((prayer) => prayer.personId === personId)
    .flatMap((prayer) => [
      {
        date: prayer.createdAt,
        detail: prayer.request,
        id: `history-prayer-${prayer.id}`,
        personId,
        title: "Prayer added",
        type: "prayer_added" as const,
      },
      ...(prayer.status === "answered" && prayer.answeredAt
        ? [{
            date: prayer.answeredAt,
            detail: prayer.answerNote,
            id: `history-prayer-answered-${prayer.id}`,
            personId,
            title: "Prayer answered",
            type: "prayer_answered" as const,
          }]
        : []),
    ]);

  const nextStepEvents: HistoryEvent[] = state.nextSteps
    .filter((step) => step.personId === personId)
    .map((step) => ({
      date: step.completedAt ?? step.createdAt,
      detail: step.dueAt ? `Due ${formatDate(step.dueAt)}` : null,
      id: `history-next-${step.id}`,
      personId,
      title: step.description,
      type: step.status === "done" ? "next_step_completed" : "next_step_added",
    }));

  const groupEvents: HistoryEvent[] = groups.flatMap((group) => group.gatherings
    .filter((gathering) => gathering.attendedPersonIds.includes(personId))
    .map((gathering) => ({
      date: gathering.startsAt,
      detail: group.name,
      id: `history-gathering-${gathering.id}`,
      personId,
      title: "Group gathering attended",
      type: "group_gathering" as const,
    })));

  const fruitEvents: HistoryEvent[] = state.fruit
    .filter((item) => item.personId === personId)
    .map((item) => ({
      date: item.createdAt,
      detail: item.summary,
      id: `history-fruit-${item.id}`,
      personId,
      title: "Fruit recorded",
      type: "fruit",
    }));

  return [
    ...meetingEvents,
    ...topicEvents,
    ...checkInEvents,
    ...journeyEvents,
    ...prayerEvents,
    ...nextStepEvents,
    ...groupEvents,
    ...fruitEvents,
  ].sort(byNewestDate);
}

function reportMetrics(state: PrototypeState, person: ProtoPerson) {
  const meetings = loggedMeetings(state, person.id);
  const groups = personGroups(state, person.id);
  const groupGatherings = groups.flatMap((group) => group.gatherings.filter((gathering) => gathering.attendedPersonIds.includes(person.id)));
  const minutes = meetings.reduce((sum, meeting) => sum + meeting.durationMinutes, 0) + groupGatherings.length * 60;
  const activeAccountability = personTopics(state, person.id).length;
  const activeJourneys = personJourneys(state, person.id).filter((journey) => journey.status !== "completed");
  const recentFruit = state.fruit.filter((item) => item.personId === person.id);
  const lastMeeting = meetings[0] ?? null;
  const nextMeeting = scheduledMeetings(state, person.id)[0] ?? null;
  const openStep = personNextSteps(state, person.id).find((step) => step.status === "open") ?? null;

  return {
    activeAccountability,
    activeJourneys,
    groupCount: groups.length,
    lastMeeting,
    meetings: meetings.length + groupGatherings.length,
    minutes,
    nextMeeting,
    openStep,
    recentFruit,
  };
}

function toScheduledIso(date: string, time: string) {
  return `${date}T${time}:00-05:00`;
}

export function PeopleHomeV2Prototype() {
  const [state, setState] = useState<PrototypeState>(() => cloneInitialState());
  const [view, setView] = useState<View>("home");
  const [selectedPersonId, setSelectedPersonId] = useState("lyf-nimmo");
  const [meetingPersonId, setMeetingPersonId] = useState("lyf-nimmo");
  const [meetingSourceId, setMeetingSourceId] = useState<string | null>(null);
  const [activeSphere, setActiveSphere] = useState<Sphere>("twelve");
  const [quickCheckInTopicId, setQuickCheckInTopicId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const personMap = useMemo(() => peopleById(state.people), [state.people]);
  const selectedPerson = personMap.get(selectedPersonId) ?? state.people[0];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, selectedPersonId]);

  function goToPerson(personId: string) {
    setSelectedPersonId(personId);
    setView("person");
  }

  function startMeeting(personId: string, meetingId: string | null = null) {
    setMeetingPersonId(personId);
    setMeetingSourceId(meetingId);
    setView("meeting");
  }

  function scheduleMeeting(personId: string) {
    setSelectedPersonId(personId);
    setView("schedule");
  }

  function showToast(title: string, detail: string) {
    setToast({ detail, title });
    window.setTimeout(() => setToast(null), 4800);
  }

  function saveScheduledMeeting(input: { calendarSynced: boolean; date: string; durationMinutes: number; time: string }) {
    const person = personMap.get(selectedPersonId);

    if (!person) {
      return;
    }

    const meeting: ProtoMeeting = {
      calendarSynced: input.calendarSynced,
      context: "Coffee",
      durationMinutes: input.durationMinutes,
      id: makeId("meeting-scheduled"),
      loggedAt: null,
      notes: null,
      personIds: [person.id],
      scheduledAt: toScheduledIso(input.date, input.time),
      status: "scheduled",
    };

    setState((current) => ({
      ...current,
      meetings: [...current.meetings, meeting],
    }));
    setSelectedPersonId(person.id);
    setView("person");
    showToast("Meeting scheduled", `${fullName(person)} now has a visible Start Meeting action.`);
  }

  function saveQuickCheckIn(topicId: string, outcome: AccountabilityState, note: string | null) {
    const topic = state.accountabilityTopics.find((item) => item.id === topicId);

    if (!topic) {
      return;
    }

    const checkIn: ProtoAccountabilityCheckIn = {
      createdAt: NOW_ISO,
      id: makeId("quick-checkin"),
      meetingId: null,
      note,
      outcome,
      personId: topic.personId,
      topicId: topic.id,
    };

    setState((current) => ({
      ...current,
      accountabilityTopics: current.accountabilityTopics.map((item) => item.id === topic.id
        ? { ...item, lastCheckInAt: NOW_ISO, status: outcome }
        : item),
      checkIns: [checkIn, ...current.checkIns],
    }));
    setQuickCheckInTopicId(null);
    setSelectedPersonId(topic.personId);
    showToast("Check-in saved", `${topic.topic} was added to the unified History.`);
  }

  function saveMeeting(input: MeetingSaveInput) {
    const person = personMap.get(input.personId);

    if (!person) {
      return;
    }

    const loggedMeetingId = input.sourceMeetingId ?? makeId("meeting-logged");
    const loggedMeeting: ProtoMeeting = {
      calendarSynced: true,
      context: "Coffee",
      durationMinutes: 45,
      id: loggedMeetingId,
      loggedAt: NOW_ISO,
      notes: input.notes,
      personIds: [person.id],
      scheduledAt: input.sourceMeetingId
        ? state.meetings.find((meeting) => meeting.id === input.sourceMeetingId)?.scheduledAt ?? NOW_ISO
        : NOW_ISO,
      status: "logged",
    };

    const quietTimeTopic = state.accountabilityTopics.find((topic) => topic.personId === person.id && topic.topic === "Quiet Time With God");
    const purityAlreadyExists = state.accountabilityTopics.some((topic) => topic.personId === person.id && topic.topic === "Purity");
    const purityTopicId = purityAlreadyExists
      ? state.accountabilityTopics.find((topic) => topic.personId === person.id && topic.topic === "Purity")?.id ?? "acct-lyf-purity"
      : makeId("acct-purity");

    const nextCheckIns: ProtoAccountabilityCheckIn[] = [];
    if (quietTimeTopic) {
      nextCheckIns.push({
        createdAt: NOW_ISO,
        id: makeId("meeting-checkin-qt"),
        meetingId: loggedMeetingId,
        note: input.quietTimeNote,
        outcome: input.quietTimeOutcome,
        personId: person.id,
        topicId: quietTimeTopic.id,
      });
    }

    if (input.addPurity) {
      nextCheckIns.push({
        createdAt: NOW_ISO,
        id: makeId("meeting-checkin-purity"),
        meetingId: loggedMeetingId,
        note: "Started a weekly Purity accountability rhythm from today's conversation.",
        outcome: "discussed",
        personId: person.id,
        topicId: purityTopicId,
      });
    }

    const maybeNewJourney: ProtoJourneyAssignment[] = input.assignCommandsJourney
      ? [{
          completedUnits: 0,
          context: "direct",
          groupId: null,
          id: makeId("journey-commands"),
          lastActivityAt: null,
          personId: person.id,
          resourceTitle: "Commands of Jesus",
          resourceType: "Reading Plan",
          startedAt: NOW_ISO,
          status: "not_started",
          totalUnits: 7,
          unitLabel: "Day",
        }]
      : [];

    setState((current) => {
      const updatedMeetings = input.sourceMeetingId
        ? current.meetings.map((meeting) => meeting.id === input.sourceMeetingId ? loggedMeeting : meeting)
        : [loggedMeeting, ...current.meetings];

      const updatedTopics = current.accountabilityTopics.map((topic) => topic.id === quietTimeTopic?.id
        ? { ...topic, lastCheckInAt: NOW_ISO, status: input.quietTimeOutcome }
        : topic);

      const topicsWithPurity = input.addPurity && !purityAlreadyExists
        ? [
            ...updatedTopics,
            {
              cadence: "Weekly" as const,
              createdAt: NOW_ISO,
              id: purityTopicId,
              lastCheckInAt: NOW_ISO,
              personId: person.id,
              status: "discussed" as const,
              topic: "Purity",
            },
          ]
        : updatedTopics;

      const existingPrayer = current.prayers.find((prayer) => prayer.personId === person.id && prayer.status === "active");
      const prayers = input.prayer.trim()
        ? existingPrayer
          ? current.prayers.map((prayer) => prayer.id === existingPrayer.id ? { ...prayer, request: input.prayer.trim() } : prayer)
          : [
              ...current.prayers,
              {
                answerNote: null,
                answeredAt: null,
                createdAt: NOW_ISO,
                id: makeId("prayer"),
                personId: person.id,
                request: input.prayer.trim(),
                status: "active" as const,
              },
            ]
        : current.prayers;

      const nextSteps = input.nextStep.trim()
        ? [
            ...current.nextSteps,
            {
              completedAt: null,
              createdAt: NOW_ISO,
              description: input.nextStep.trim(),
              dueAt: input.nextStepDue ? toScheduledIso(input.nextStepDue, "09:00") : null,
              id: makeId("nextstep"),
              meetingId: loggedMeetingId,
              personId: person.id,
              status: "open" as const,
            },
          ]
        : current.nextSteps;

      return {
        ...current,
        accountabilityTopics: topicsWithPurity,
        checkIns: [...nextCheckIns, ...current.checkIns],
        journeys: [...current.journeys, ...maybeNewJourney],
        meetings: updatedMeetings,
        nextSteps,
        prayers,
      };
    });

    setSelectedPersonId(person.id);
    setView("person");
    showToast("Meeting saved", `${person.firstName}'s profile, accountability, prayer, next step, and History now reflect the conversation.`);
  }

  function saveNewPerson(input: AddPersonInput) {
    const person: ProtoPerson = {
      address: null,
      anniversary: null,
      birthday: null,
      childrenNames: null,
      church: null,
      createdAt: NOW_ISO,
      email: input.email || null,
      engagementLevel: 0,
      firstName: input.firstName.trim(),
      householdNotes: null,
      howKnown: input.howKnown || null,
      id: makeId("person"),
      lastName: input.lastName.trim(),
      occupation: null,
      phone: input.phone || null,
      relationshipLabel: input.howKnown ? "New relationship" : "New contact",
      sphere: "onetwenty",
      spouseName: null,
    };

    setState((current) => ({ ...current, people: [...current.people, person] }));
    setSelectedPersonId(person.id);
    setView("person");
    showToast("Person added", "Only the essentials were captured. Details can be filled in later.");
  }

  const quickCheckInTopic = quickCheckInTopicId
    ? state.accountabilityTopics.find((topic) => topic.id === quickCheckInTopicId) ?? null
    : null;
  const activePrimaryNav: PrimaryNav = view === "meetings" ? "meetings" : view === "more" ? "more" : "home";

  return (
    <div className="dos-v2-prototype min-h-screen bg-[#F8FBFF] text-[#0F172A]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#DCEBFF] bg-white/92 px-5 py-6 lg:block">
          <p className="text-[20px] font-black leading-none text-[#1D4ED8]">DOS</p>
          <h1 className="mt-4 text-[24px] font-black leading-tight text-[#0F172A]">Ryan's Field</h1>
          <nav className="mt-8 grid gap-6" aria-label="DOS navigation">
            <div className="grid gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">Primary</p>
              <NavButton active={activePrimaryNav === "home"} icon={<Home />} label="Home" onClick={() => setView("home")} />
              <NavButton active={activePrimaryNav === "meetings"} icon={<CalendarDays />} label="Meetings" onClick={() => setView("meetings")} />
            </div>
            <div className="grid gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">More</p>
              <NavButton active={view === "more"} icon={<Users />} label="Groups" onClick={() => setView("more")} />
              <NavButton active={false} icon={<BookOpen />} label="Library / Journeys" onClick={() => setView("more")} />
              <NavButton active={view === "report"} icon={<BarChart3 />} label="Reports" onClick={() => setView("report")} />
              <NavButton active={false} icon={<Settings />} label="Settings" onClick={() => setView("more")} />
            </div>
          </nav>
        </aside>

        <main className="min-w-0 pb-24 lg:pb-0">
          {view === "home" ? (
            <HomeScreen
              activeSphere={activeSphere}
              onAddPerson={() => setView("add-person")}
              onOpenPerson={goToPerson}
              onOpenReport={(sphere) => {
                setActiveSphere(sphere);
                setView("report");
              }}
              onQuickCheckIn={setQuickCheckInTopicId}
              onSchedule={scheduleMeeting}
              onStartMeeting={startMeeting}
              peopleById={personMap}
              setActiveSphere={setActiveSphere}
              state={state}
            />
          ) : null}

          {view === "meetings" ? (
            <MeetingsScreen
              onOpenPerson={goToPerson}
              onSchedule={scheduleMeeting}
              onStartMeeting={startMeeting}
              peopleById={personMap}
              state={state}
            />
          ) : null}

          {view === "more" ? (
            <MoreScreen
              onAddPerson={() => setView("add-person")}
              onOpenReport={() => setView("report")}
            />
          ) : null}

          {view === "person" && selectedPerson ? (
            <PersonScreen
              onBack={() => setView("home")}
              onHistory={() => setView("history")}
              onQuickCheckIn={setQuickCheckInTopicId}
              onSchedule={() => scheduleMeeting(selectedPerson.id)}
              onStartMeeting={startMeeting}
              person={selectedPerson}
              state={state}
            />
          ) : null}

          {view === "schedule" && selectedPerson ? (
            <ScheduleScreen
              onBack={() => setView("person")}
              onSave={saveScheduledMeeting}
              person={selectedPerson}
            />
          ) : null}

          {view === "meeting" ? (
            <MeetingScreen
              onBack={() => {
                setSelectedPersonId(meetingPersonId);
                setView("person");
              }}
              onSave={saveMeeting}
              person={personMap.get(meetingPersonId) ?? selectedPerson}
              sourceMeetingId={meetingSourceId}
              state={state}
            />
          ) : null}

          {view === "history" && selectedPerson ? (
            <HistoryScreen
              onBack={() => setView("person")}
              person={selectedPerson}
              state={state}
            />
          ) : null}

          {view === "add-person" ? (
            <AddPersonScreen
              onBack={() => setView("home")}
              onSave={saveNewPerson}
            />
          ) : null}

          {view === "report" ? (
            <ReportScreen
              activeSphere={activeSphere}
              onBack={() => setView("home")}
              onOpenPerson={goToPerson}
              setActiveSphere={setActiveSphere}
              state={state}
            />
          ) : null}
        </main>
      </div>

      <MobileNav
        active={activePrimaryNav}
        onHome={() => setView("home")}
        onMeetings={() => setView("meetings")}
        onMore={() => setView("more")}
      />

      {quickCheckInTopic ? (
        <QuickCheckInSheet
          onClose={() => setQuickCheckInTopicId(null)}
          onSave={saveQuickCheckIn}
          person={personMap.get(quickCheckInTopic.personId) ?? null}
          topic={quickCheckInTopic}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-[8px] border border-[#CFE8D8] bg-white p-3 shadow-[0_18px_44px_rgba(15,21,32,0.16)] lg:bottom-6">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F7A4D]" aria-hidden="true" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F1520]">{toast.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-[#3D4654]">{toast.detail}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageShell({
  action,
  children,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563EB]">{eyebrow}</p>
          <h2 className="mt-2 text-[30px] font-bold leading-tight text-[#0F1520] sm:text-[38px]">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function HomeHeaderActions({ onAddPerson }: { onAddPerson: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Add Person"
        className="hidden min-h-10 items-center gap-2 rounded-full bg-[#2563EB] px-3 text-xs font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] sm:inline-flex"
        onClick={onAddPerson}
        type="button"
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        Add Person
      </button>
      <IconButton label="Notifications"><Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>
      <button
        aria-label="Open profile"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-xs font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
        type="button"
      >
        RF
      </button>
    </div>
  );
}

function CircleTarget({
  activeSphere,
  onSelectSphere,
  people,
}: {
  activeSphere?: Sphere;
  onSelectSphere: (sphere: Sphere) => void;
  people: ProtoPerson[];
}) {
  const [focusedSphere, setFocusedSphere] = useState<Sphere | null>(null);
  const visibleSphere = focusedSphere ?? activeSphere ?? null;
  const counts = sphereCounts(people);
  const isMy3Focused = visibleSphere === "three";
  const isMy12Focused = visibleSphere === "twelve";
  const isMy70Focused = visibleSphere === "seventy";
  const isMy120Focused = visibleSphere === "onetwenty";

  return (
    <div
      aria-label="Discipleship circle target"
      className="relative mx-auto h-[236px] w-[236px] rounded-full max-[350px]:h-[220px] max-[350px]:w-[220px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusedSphere(null);
        }
      }}
      onMouseLeave={() => setFocusedSphere(null)}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-full border bg-white transition-all duration-200 ${
          isMy120Focused
            ? "border-[#2563EB]/55 shadow-[0_0_0_5px_rgba(37,99,235,0.055),0_18px_42px_rgba(37,99,235,0.08)]"
            : "border-[#DCEBFF] shadow-[0_16px_34px_rgba(37,99,235,0.045)]"
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 h-[184px] w-[184px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#F8FBFF] transition-all duration-200 max-[350px]:h-[172px] max-[350px]:w-[172px] ${
          isMy70Focused
            ? "border-[#2563EB]/60 shadow-[0_0_0_5px_rgba(37,99,235,0.06),inset_0_8px_26px_rgba(255,255,255,0.82),0_14px_30px_rgba(37,99,235,0.10)]"
            : "border-[#CFE0FF]/90 shadow-[inset_0_6px_26px_rgba(255,255,255,0.82)]"
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 h-[126px] w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#EBF2FF]/78 transition-all duration-200 max-[350px]:h-[118px] max-[350px]:w-[118px] ${
          isMy12Focused
            ? "border-[#2563EB]/60 shadow-[0_0_0_4px_rgba(37,99,235,0.075),inset_0_8px_24px_rgba(255,255,255,0.78)]"
            : "border-[#CFE0FF]/85 shadow-[inset_0_8px_24px_rgba(255,255,255,0.68)]"
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#BFDBFE] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] transition-all duration-200 max-[350px]:h-[62px] max-[350px]:w-[62px] ${
          isMy3Focused
            ? "scale-[1.03] shadow-[0_14px_28px_rgba(37,99,235,0.36),inset_0_5px_14px_rgba(255,255,255,0.28)]"
            : "shadow-[0_12px_24px_rgba(37,99,235,0.30),inset_0_5px_14px_rgba(255,255,255,0.22)]"
        }`}
      />
      <svg aria-hidden="true" className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 236 236">
        <circle className="cursor-pointer" cx="118" cy="118" fill="none" onClick={() => onSelectSphere("onetwenty")} onMouseEnter={() => setFocusedSphere("onetwenty")} pointerEvents="stroke" r="108" stroke="transparent" strokeWidth="24" />
        <circle className="cursor-pointer" cx="118" cy="118" fill="none" onClick={() => onSelectSphere("seventy")} onMouseEnter={() => setFocusedSphere("seventy")} pointerEvents="stroke" r="83" stroke="transparent" strokeWidth="30" />
        <circle className="cursor-pointer" cx="118" cy="118" fill="none" onClick={() => onSelectSphere("twelve")} onMouseEnter={() => setFocusedSphere("twelve")} pointerEvents="stroke" r="55" stroke="transparent" strokeWidth="34" />
        <circle className="cursor-pointer" cx="118" cy="118" fill="transparent" onClick={() => onSelectSphere("three")} onMouseEnter={() => setFocusedSphere("three")} r="33" />
      </svg>
      <CircleTargetButton count={counts.onetwenty} label="120" onClick={() => onSelectSphere("onetwenty")} onFocus={() => setFocusedSphere("onetwenty")} topClassName="top-[5px] max-[350px]:top-[4px]" tone="text-[#60A5FA]" />
      <CircleTargetButton count={counts.seventy} label="70" onClick={() => onSelectSphere("seventy")} onFocus={() => setFocusedSphere("seventy")} topClassName="top-[31px] max-[350px]:top-[28px]" tone="text-[#3B82F6]" />
      <CircleTargetButton count={counts.twelve} label="12" onClick={() => onSelectSphere("twelve")} onFocus={() => setFocusedSphere("twelve")} topClassName="top-[61px] max-[350px]:top-[54px]" tone="text-[#2563EB]" />
      <button
        aria-label={`Open Closest 3, ${counts.three} people`}
        className="absolute left-1/2 top-1/2 z-30 flex h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center transition-colors duration-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 max-[350px]:h-[62px] max-[350px]:w-[62px]"
        onClick={(event) => {
          event.stopPropagation();
          onSelectSphere("three");
        }}
        onFocus={() => setFocusedSphere("three")}
        onMouseEnter={() => setFocusedSphere("three")}
        type="button"
      >
        <span className="text-[17px] font-extrabold leading-none text-white max-[350px]:text-[16px]">3</span>
      </button>
    </div>
  );
}

function CircleTargetButton({
  count,
  label,
  onClick,
  onFocus,
  tone,
  topClassName,
}: {
  count: number;
  label: string;
  onClick: () => void;
  onFocus: () => void;
  tone: string;
  topClassName: string;
}) {
  return (
    <button
      aria-label={`Open ${label}, ${count} people`}
      className={`absolute left-1/2 z-20 flex h-5 min-w-11 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[14px] font-extrabold leading-none transition-all duration-200 hover:bg-[#EFF6FF] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 max-[350px]:text-[13px] ${topClassName} ${tone}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      type="button"
    >
      {label}
    </button>
  );
}

function sphereCounts(people: ProtoPerson[]) {
  return sphereOrder.reduce<Record<Sphere, number>>((counts, sphere) => {
    counts[sphere] = people.filter((person) => person.sphere === sphere).length;
    return counts;
  }, { onetwenty: 0, seventy: 0, three: 0, twelve: 0 });
}

function CircleCountRail({ people }: { people: ProtoPerson[] }) {
  const counts = sphereCounts(people);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sphereOrder.map((sphere) => (
        <span className="rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]" key={sphere}>
          {sphereCopy[sphere].short}: {counts[sphere]}
        </span>
      ))}
    </div>
  );
}

function HomeScreen({
  activeSphere,
  onAddPerson,
  onOpenPerson,
  onOpenReport,
  onQuickCheckIn,
  onSchedule,
  onStartMeeting,
  peopleById: personMap,
  setActiveSphere,
  state,
}: {
  activeSphere: Sphere;
  onAddPerson: () => void;
  onOpenPerson: (personId: string) => void;
  onOpenReport: (sphere: Sphere) => void;
  onQuickCheckIn: (topicId: string) => void;
  onSchedule: (personId: string) => void;
  onStartMeeting: (personId: string, meetingId?: string | null) => void;
  peopleById: Map<string, ProtoPerson>;
  setActiveSphere: (sphere: Sphere) => void;
  state: PrototypeState;
}) {
  const needs = buildAttentionItems(state, personMap);
  const lyf = personMap.get("lyf-nimmo") ?? state.people[0];

  return (
    <PageShell
      action={<HomeHeaderActions onAddPerson={onAddPerson} />}
      eyebrow="DOS"
      title="Discipleship on the go."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-5">
          <section className="order-2 mt-48 overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_46px_rgba(37,99,235,0.07)] sm:p-6 md:order-1 md:mt-0">
            <div className="grid items-center gap-5 md:grid-cols-[270px_minmax(0,1fr)]">
              <div>
                <CircleTarget
                  activeSphere={activeSphere}
                  people={state.people}
                  onSelectSphere={(sphere) => {
                    setActiveSphere(sphere);
                    onOpenReport(sphere);
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Your field</p>
                <h3 className="mt-2 text-2xl font-black text-[#0F172A]">3 / 12 / 70 / 120</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#475569]">Tap a circle to see who is receiving time, where the relationship sits, and what needs follow-up.</p>
                <CircleCountRail people={state.people} />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <PrimaryButton icon={<Mic />} onClick={() => onStartMeeting(lyf.id)}>Meet</PrimaryButton>
                  <SecondaryButton icon={<CalendarDays />} onClick={() => onSchedule(lyf.id)}>Schedule</SecondaryButton>
                  <SecondaryButton icon={<UserPlus />} onClick={onAddPerson}>Add</SecondaryButton>
                </div>
              </div>
            </div>
          </section>

          <div className="order-1 md:order-2">
            <Panel
              eyebrow="Needs Attention"
              title="Today"
            >
              <div className="divide-y divide-[#EDEFF2]">
                {needs.map((item) => (
                  <AttentionRow
                    item={item}
                    key={item.id}
                    onOpenPerson={onOpenPerson}
                    onQuickCheckIn={onQuickCheckIn}
                    onStartMeeting={onStartMeeting}
                  />
                ))}
              </div>
            </Panel>
          </div>

          <div className="order-3">
            <Panel eyebrow="People" title="Who to engage next">
              <div className="divide-y divide-[#EDEFF2]">
                {state.people.slice(0, 5).map((person) => (
                  <PersonListRow
                    key={person.id}
                    metrics={reportMetrics(state, person)}
                    onClick={() => onOpenPerson(person.id)}
                    person={person}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <aside className="grid content-start gap-5">
          <Panel eyebrow="Ready next" title={fullName(lyf)}>
            <div className="grid gap-3">
              <button className="flex items-center justify-between gap-3 py-2 text-left" onClick={() => onOpenPerson("lyf-nimmo")} type="button">
                <span className="min-w-0">
                  <span className="block text-base font-bold text-[#0F1520]">Open person record</span>
                  <span className="mt-1 block text-sm leading-5 text-[#64748B]">Last meeting, accountability, Journey, prayer, groups.</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
              </button>
              <div className="grid grid-cols-2 gap-2">
                <SecondaryButton icon={<ClipboardCheck />} onClick={() => onQuickCheckIn("acct-lyf-qt")}>Check in</SecondaryButton>
                <SecondaryButton icon={<BarChart3 />} onClick={() => onOpenReport("twelve")}>Core 12</SecondaryButton>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Connected" title="DOS ecosystem">
            <div className="divide-y divide-[#EDEFF2]">
              <SummaryRow icon={<CalendarDays />} label="Meetings" text="Scheduled and completed conversations stay connected to people." />
              <SummaryRow icon={<BookOpen />} label="Library / Journeys" text="Journey assignments remain canonical whether direct or from a group." />
              <SummaryRow icon={<Users />} label="Groups" text="Group membership and gatherings appear inside the person record." />
            </div>
          </Panel>
        </aside>
      </div>
    </PageShell>
  );
}

type AttentionItem = {
  action: "checkin" | "meeting" | "person";
  detail: string;
  id: string;
  personId: string;
  topicId?: string;
  meetingId?: string;
  title: string;
  type: string;
};

function buildAttentionItems(state: PrototypeState, personMap: Map<string, ProtoPerson>): AttentionItem[] {
  const overdueAccountability = state.accountabilityTopics
    .filter((topic) => dayDiff(topic.lastCheckInAt) >= 6)
    .map((topic) => ({
      action: "checkin" as const,
      detail: `${personMap.get(topic.personId)?.firstName ?? "Person"} last checked in ${relativeDate(topic.lastCheckInAt)}`,
      id: `attention-${topic.id}`,
      personId: topic.personId,
      title: topic.topic,
      topicId: topic.id,
      type: "Accountability",
    }));

  const scheduled = state.meetings
    .filter((meeting) => meeting.status === "scheduled")
    .slice(0, 2)
    .map((meeting) => ({
      action: "meeting" as const,
      detail: `${formatDateTime(meeting.scheduledAt)} - ${meeting.durationMinutes} min`,
      id: `attention-${meeting.id}`,
      meetingId: meeting.id,
      personId: meeting.personIds[0],
      title: `Meeting with ${personMap.get(meeting.personIds[0])?.firstName ?? "person"}`,
      type: "Scheduled",
    }));

  const nextSteps = state.nextSteps
    .filter((step) => step.status === "open")
    .slice(0, 2)
    .map((step) => ({
      action: "person" as const,
      detail: step.dueAt ? `Due ${relativeDate(step.dueAt)}` : "No date",
      id: `attention-${step.id}`,
      personId: step.personId,
      title: step.description,
      type: "Next Step",
    }));

  const journeys = state.journeys
    .filter((journey) => journey.status === "in_progress" && dayDiff(journey.lastActivityAt) >= 7)
    .slice(0, 1)
    .map((journey) => ({
      action: "person" as const,
      detail: `${journey.completedUnits}/${journey.totalUnits} complete - ${personMap.get(journey.personId)?.firstName ?? "Person"}`,
      id: `attention-${journey.id}`,
      personId: journey.personId,
      title: journey.resourceTitle,
      type: "Journey",
    }));

  return [...scheduled, ...overdueAccountability, ...nextSteps, ...journeys].slice(0, 5);
}

function AttentionRow({
  item,
  onOpenPerson,
  onQuickCheckIn,
  onStartMeeting,
}: {
  item: AttentionItem;
  onOpenPerson: (personId: string) => void;
  onQuickCheckIn: (topicId: string) => void;
  onStartMeeting: (personId: string, meetingId?: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
        {item.action === "checkin" ? <ClipboardCheck className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /> : null}
        {item.action === "meeting" ? <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /> : null}
        {item.action === "person" ? <CircleDot className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /> : null}
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={() => onOpenPerson(item.personId)} type="button">
        <span className="block text-sm font-bold text-[#0F1520]">{item.title}</span>
        <span className="mt-0.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[#9AA4B2]">{item.type}</span>
        <span className="mt-1 block text-sm leading-5 text-[#3D4654]">{item.detail}</span>
      </button>
      {item.action === "checkin" && item.topicId ? (
        <SmallActionButton onClick={() => onQuickCheckIn(item.topicId ?? "")}>Check</SmallActionButton>
      ) : null}
      {item.action === "meeting" ? (
        <SmallActionButton onClick={() => onStartMeeting(item.personId, item.meetingId)}>Start</SmallActionButton>
      ) : null}
      {item.action === "person" ? (
        <IconButton label="Open" onClick={() => onOpenPerson(item.personId)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </IconButton>
      ) : null}
    </div>
  );
}

function MeetingsScreen({
  onOpenPerson,
  onSchedule,
  onStartMeeting,
  peopleById: personMap,
  state,
}: {
  onOpenPerson: (personId: string) => void;
  onSchedule: (personId: string) => void;
  onStartMeeting: (personId: string, meetingId?: string | null) => void;
  peopleById: Map<string, ProtoPerson>;
  state: PrototypeState;
}) {
  const scheduled = state.meetings
    .filter((meeting) => meeting.status === "scheduled")
    .sort((first, second) => new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime());
  const logged = state.meetings
    .filter((meeting) => meeting.status === "logged")
    .sort((first, second) => new Date(second.loggedAt ?? second.scheduledAt).getTime() - new Date(first.loggedAt ?? first.scheduledAt).getTime());

  return (
    <PageShell
      action={<IconButton label="Notifications"><Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Meetings"
      title="Conversations"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel eyebrow="Upcoming" title="Ready to start">
          <div className="divide-y divide-[#EDEFF2]">
            {scheduled.map((meeting) => {
              const person = personMap.get(meeting.personIds[0]);

              return (
                <MeetingListRow
                  action={<SmallActionButton onClick={() => onStartMeeting(meeting.personIds[0], meeting.id)}>Start</SmallActionButton>}
                  key={meeting.id}
                  meeting={meeting}
                  onOpenPerson={() => person ? onOpenPerson(person.id) : undefined}
                  person={person}
                />
              );
            })}
            {!scheduled.length ? <p className="py-4 text-sm leading-6 text-[#64748B]">No upcoming meetings.</p> : null}
          </div>
        </Panel>

        <aside className="grid content-start gap-5">
          <Panel eyebrow="Fast action" title="Schedule">
            <div className="divide-y divide-[#EDEFF2]">
              {state.people.slice(0, 4).map((person) => (
                <button className="flex w-full items-center justify-between gap-3 py-3 text-left" key={person.id} onClick={() => onSchedule(person.id)} type="button">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#0F172A]">{fullName(person)}</span>
                    <span className="mt-1 block text-sm leading-5 text-[#64748B]">{person.relationshipLabel}</span>
                  </span>
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
                </button>
              ))}
            </div>
          </Panel>
        </aside>

        <section className="xl:col-span-2">
          <Panel eyebrow="Recent" title="History">
            <div className="divide-y divide-[#EDEFF2]">
              {logged.map((meeting) => {
                const person = personMap.get(meeting.personIds[0]);

                return (
                  <MeetingListRow
                    key={meeting.id}
                    meeting={meeting}
                    onOpenPerson={() => person ? onOpenPerson(person.id) : undefined}
                    person={person}
                  />
                );
              })}
            </div>
          </Panel>
        </section>
      </div>
    </PageShell>
  );
}

function MeetingListRow({
  action,
  meeting,
  onOpenPerson,
  person,
}: {
  action?: ReactNode;
  meeting: ProtoMeeting;
  onOpenPerson: () => void;
  person?: ProtoPerson | null;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
        <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={onOpenPerson} type="button">
        <span className="block text-sm font-bold text-[#0F172A]">{person ? fullName(person) : "Meeting"}</span>
        <span className="mt-1 block text-sm leading-5 text-[#64748B]">{meeting.context ?? "Meeting"} - {formatDateTime(meeting.scheduledAt)}</span>
        {meeting.notes ? <span className="mt-1 block line-clamp-2 text-sm leading-5 text-[#475569]">{meeting.notes}</span> : null}
      </button>
      {action}
    </div>
  );
}

type MoreDestination = "groups" | "library" | "reports" | "settings";

function MoreScreen({ onAddPerson, onOpenReport }: { onAddPerson: () => void; onOpenReport: () => void }) {
  const [selected, setSelected] = useState<MoreDestination>("groups");

  return (
    <PageShell
      action={<IconButton label="Settings"><Settings className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="More"
      title="DOS"
    >
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel eyebrow="Apps" title="Connected surfaces">
          <div className="divide-y divide-[#EDEFF2]">
            <MoreDestinationRow active={selected === "groups"} icon={<Users />} label="Groups / Community" onClick={() => setSelected("groups")} text="Membership, gatherings, and group context." />
            <MoreDestinationRow active={selected === "library"} icon={<BookOpen />} label="Library / Journeys" onClick={() => setSelected("library")} text="Canonical resources and assignments." />
            <MoreDestinationRow active={selected === "reports"} icon={<BarChart3 />} label="Reports" onClick={() => setSelected("reports")} text="Relationship investment and fruit." />
            <MoreDestinationRow active={selected === "settings"} icon={<Settings />} label="Settings" onClick={() => setSelected("settings")} text="Profile and workspace controls." />
          </div>
        </Panel>

        <Panel eyebrow={moreDestinationCopy[selected].eyebrow} title={moreDestinationCopy[selected].title}>
          {selected === "groups" ? (
            <div className="grid gap-3">
              <SummaryRow icon={<Users />} label="Wednesday Men's Group" text="Lyf and Marcus are members. Group Journey progress points back to the same Library resource." />
              <SummaryRow icon={<CalendarDays />} label="Next gathering" text="Aug 19, 6:00 PM" />
            </div>
          ) : null}
          {selected === "library" ? (
            <div className="grid gap-3">
              <SummaryRow icon={<BookOpen />} label="Discipleship" text="Assigned through Wednesday Men's Group." />
              <SummaryRow icon={<BookOpen />} label="14 Days Through the New Testament" text="Direct Journey assigned to Lyf." />
            </div>
          ) : null}
          {selected === "reports" ? (
            <div className="grid gap-4">
              <SummaryRow icon={<BarChart3 />} label="Relationship report" text="Open from Home target or existing Reports." />
              <PrimaryButton icon={<BarChart3 />} onClick={onOpenReport}>Open Report</PrimaryButton>
            </div>
          ) : null}
          {selected === "settings" ? (
            <div className="grid gap-4">
              <SummaryRow icon={<Settings />} label="Workspace" text="Ryan Fox" />
              <SecondaryButton icon={<UserPlus />} onClick={onAddPerson}>Add Person</SecondaryButton>
            </div>
          ) : null}
        </Panel>
      </div>
    </PageShell>
  );
}

const moreDestinationCopy: Record<MoreDestination, { eyebrow: string; title: string }> = {
  groups: { eyebrow: "Groups", title: "Community context" },
  library: { eyebrow: "Library / Journeys", title: "Formation resources" },
  reports: { eyebrow: "Reports", title: "Relationship report" },
  settings: { eyebrow: "Settings", title: "Workspace" },
};

function MoreDestinationRow({
  active,
  icon,
  label,
  onClick,
  text,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  text: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 py-3 text-left" onClick={onClick} type="button">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 [&>svg]:h-4 [&>svg]:w-4 ${active ? "bg-[#2563EB] text-white ring-[#2563EB]" : "bg-[#EBF2FF] text-[#2563EB] ring-[#DCEBFF]"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#0F172A]">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-[#64748B]">{text}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
    </button>
  );
}

function PersonScreen({
  onBack,
  onHistory,
  onQuickCheckIn,
  onSchedule,
  onStartMeeting,
  person,
  state,
}: {
  onBack: () => void;
  onHistory: () => void;
  onQuickCheckIn: (topicId: string) => void;
  onSchedule: () => void;
  onStartMeeting: (personId: string, meetingId?: string | null) => void;
  person: ProtoPerson;
  state: PrototypeState;
}) {
  const meetings = loggedMeetings(state, person.id);
  const scheduled = scheduledMeetings(state, person.id);
  const topics = personTopics(state, person.id);
  const journeys = personJourneys(state, person.id);
  const prayers = personPrayers(state, person.id).filter((prayer) => prayer.status === "active");
  const groups = personGroups(state, person.id);
  const nextSteps = personNextSteps(state, person.id).filter((step) => step.status === "open");
  const lastMeeting = meetings[0] ?? null;
  const nextMeeting = scheduled[0] ?? null;
  const metrics = reportMetrics(state, person);

  return (
    <PageShell
      action={<IconButton label="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Person"
      title={fullName(person)}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <section className="rounded-[8px] border border-[#EDEFF2] bg-white p-4 shadow-[0_18px_42px_rgba(15,21,32,0.05)] sm:p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0F1520] text-base font-bold text-white">
                {initials(person)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Pill>{person.relationshipLabel}</Pill>
                  <Pill>{sphereCopy[person.sphere].label}</Pill>
                  <Pill>Engagement {person.engagementLevel > 0 ? `+${person.engagementLevel}` : person.engagementLevel}</Pill>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#3D4654]">{person.howKnown ?? "Relationship context can be added later."}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <PrimaryButton icon={<CalendarDays />} onClick={onSchedule}>Schedule</PrimaryButton>
              <SecondaryButton icon={<Mic />} onClick={() => onStartMeeting(person.id, nextMeeting?.id ?? null)}>Start</SecondaryButton>
              <SecondaryButton icon={<FileText />} onClick={onHistory}>History</SecondaryButton>
            </div>
          </section>

          <Panel eyebrow="Relationship" title="Now">
            <div className="divide-y divide-[#EDEFF2]">
              <SummaryRow
                icon={<CalendarDays />}
                label="Next meeting"
                text={nextMeeting ? `${formatDateTime(nextMeeting.scheduledAt)} - ${nextMeeting.durationMinutes} min` : "Not scheduled"}
                action={nextMeeting ? <SmallActionButton onClick={() => onStartMeeting(person.id, nextMeeting.id)}>Start</SmallActionButton> : <SmallActionButton onClick={onSchedule}>Schedule</SmallActionButton>}
              />
              <SummaryRow
                icon={<Clock />}
                label="Last meeting"
                text={lastMeeting ? `${relativeDate(lastMeeting.loggedAt ?? lastMeeting.scheduledAt)} - ${lastMeeting.notes ?? "No notes"}` : "No logged meeting yet"}
              />
            </div>
          </Panel>

          <Panel eyebrow="Accountability" title="Active rhythms">
            <div className="divide-y divide-[#EDEFF2]">
              {topics.map((topic) => (
                <AccountabilityRow
                  key={topic.id}
                  onCheckIn={() => onQuickCheckIn(topic.id)}
                  topic={topic}
                />
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Journey" title="Current formation">
            <div className="divide-y divide-[#EDEFF2]">
              {journeys.map((journey) => (
                <JourneyRow
                  group={journey.groupId ? groups.find((item) => item.id === journey.groupId) ?? null : null}
                  journey={journey}
                  key={journey.id}
                />
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Prayer" title="Praying now">
            <div className="divide-y divide-[#EDEFF2]">
              {prayers.map((prayer) => (
                <SummaryRow
                  icon={<Heart />}
                  key={prayer.id}
                  label={relativeDate(prayer.createdAt)}
                  text={prayer.request}
                />
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Groups" title="Membership">
            <div className="divide-y divide-[#EDEFF2]">
              {groups.map((group) => (
                <SummaryRow
                  icon={<Users />}
                  key={group.id}
                  label="Member"
                  text={`${group.name} - ${group.rhythmLabel}`}
                />
              ))}
            </div>
          </Panel>
        </div>

        <aside className="grid content-start gap-5">
          <Panel eyebrow="Next Steps" title="Follow-up">
            <div className="divide-y divide-[#EDEFF2]">
              {nextSteps.length ? nextSteps.map((step) => (
                <SummaryRow
                  icon={<Send />}
                  key={step.id}
                  label={step.dueAt ? relativeDate(step.dueAt) : "No due date"}
                  text={step.description}
                />
              )) : (
                <p className="py-3 text-sm leading-6 text-[#6B7686]">No open follow-up.</p>
              )}
            </div>
          </Panel>

          <Panel eyebrow="Report Snapshot" title={`${Math.round(metrics.minutes / 60)}h invested`}>
            <div className="grid gap-3 text-sm leading-6 text-[#3D4654]">
              <p className="text-[#3D4654]">{metrics.meetings} meetings or gatherings</p>
              <p className="text-[#3D4654]">{metrics.activeAccountability} accountability topic{metrics.activeAccountability === 1 ? "" : "s"}</p>
              <p className="text-[#3D4654]">{metrics.activeJourneys.length} active Journey assignment{metrics.activeJourneys.length === 1 ? "" : "s"}</p>
              <p className="text-[#3D4654]">{metrics.recentFruit.length} fruit milestone{metrics.recentFruit.length === 1 ? "" : "s"}</p>
            </div>
          </Panel>

          <details className="rounded-[8px] border border-[#EDEFF2] bg-white p-4">
            <summary className="cursor-pointer text-sm font-bold text-[#0F1520]">Details</summary>
            <dl className="mt-4 grid gap-3 text-sm leading-6 text-[#3D4654]">
              <DetailTerm label="Phone" value={person.phone ?? "Not set"} />
              <DetailTerm label="Email" value={person.email ?? "Not set"} />
              <DetailTerm label="Church" value={person.church ?? "Not set"} />
              <DetailTerm label="Household" value={[person.spouseName, person.childrenNames].filter(Boolean).join(" - ") || "Not set"} />
            </dl>
          </details>
        </aside>
      </div>
    </PageShell>
  );
}

function AccountabilityRow({ onCheckIn, topic }: { onCheckIn: () => void; topic: ProtoAccountabilityTopic }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <ClipboardCheck className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-[#0F1520]">{topic.topic}</p>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusTone(topic.status)}`}>{outcomeCopy[topic.status]}</span>
        </div>
        <p className="mt-1 text-sm leading-5 text-[#6B7686]">{topic.cadence} - last {relativeDate(topic.lastCheckInAt)}</p>
      </div>
      <SmallActionButton onClick={onCheckIn}>Check</SmallActionButton>
    </div>
  );
}

function JourneyRow({ group, journey }: { group: ProtoGroup | null; journey: ProtoJourneyAssignment }) {
  const percent = journey.totalUnits ? Math.round((journey.completedUnits / journey.totalUnits) * 100) : 0;

  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#2450C8]" aria-hidden="true" strokeWidth={1.9} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F1520]">{journey.resourceTitle}</p>
          <p className="mt-1 text-sm leading-5 text-[#6B7686]">
            {journey.resourceType} - {journey.completedUnits}/{journey.totalUnits} {journey.unitLabel.toLowerCase()}s - {group ? `From ${group.name}` : "Direct"}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7E9ED]">
            <div className="h-full rounded-full bg-[#2450C8]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleScreen({ onBack, onSave, person }: { onBack: () => void; onSave: (input: { calendarSynced: boolean; date: string; durationMinutes: number; time: string }) => void; person: ProtoPerson }) {
  const [date, setDate] = useState("2026-08-13");
  const [time, setTime] = useState("14:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [calendarSynced, setCalendarSynced] = useState(true);

  return (
    <PageShell
      action={<IconButton label="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Schedule"
      title={`Meet with ${person.firstName}`}
    >
      <div className="mx-auto max-w-2xl">
        <Panel eyebrow="Fast default" title={fullName(person)}>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSave({ calendarSynced, date, durationMinutes, time });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <input className="field-control" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
              </Field>
              <Field label="Time">
                <input className="field-control" onChange={(event) => setTime(event.target.value)} type="time" value={time} />
              </Field>
            </div>
            <Field label="Duration">
              <div className="grid grid-cols-3 gap-2">
                {[30, 45, 60].map((value) => (
                  <button
                    className={`min-h-11 rounded-[8px] border text-sm font-bold ${durationMinutes === value ? "border-[#2450C8] bg-[#EEF2FD] text-[#2450C8]" : "border-[#E3E6EB] bg-white text-[#3D4654]"}`}
                    key={value}
                    onClick={() => setDurationMinutes(value)}
                    type="button"
                  >
                    {value}m
                  </button>
                ))}
              </div>
            </Field>
            <label className="flex items-center justify-between gap-4 rounded-[8px] border border-[#EDEFF2] px-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#0F1520]">Calendar</span>
                <span className="mt-0.5 block text-xs leading-5 text-[#6B7686]">Keep the default sync state.</span>
              </span>
              <input checked={calendarSynced} className="h-5 w-5 accent-[#2450C8]" onChange={(event) => setCalendarSynced(event.target.checked)} type="checkbox" />
            </label>
            <details className="rounded-[8px] border border-[#EDEFF2] px-3 py-3">
              <summary className="cursor-pointer text-sm font-bold text-[#0F1520]">More options</summary>
              <p className="mt-3 text-sm leading-6 text-[#6B7686]">Role, context, extra participants, and notes stay available later. They are hidden here because DOS already knows this is a one-to-one meeting with {person.firstName}.</p>
            </details>
            <PrimaryButton icon={<CalendarDays />} submit>Schedule</PrimaryButton>
          </form>
        </Panel>
      </div>
    </PageShell>
  );
}

type MeetingSaveInput = {
  addPurity: boolean;
  assignCommandsJourney: boolean;
  nextStep: string;
  nextStepDue: string;
  notes: string;
  personId: string;
  prayer: string;
  quietTimeNote: string;
  quietTimeOutcome: AccountabilityState;
  sourceMeetingId: string | null;
};

function MeetingScreen({
  onBack,
  onSave,
  person,
  sourceMeetingId,
  state,
}: {
  onBack: () => void;
  onSave: (input: MeetingSaveInput) => void;
  person: ProtoPerson;
  sourceMeetingId: string | null;
  state: PrototypeState;
}) {
  const lastMeeting = loggedMeetings(state, person.id)[0] ?? null;
  const topics = personTopics(state, person.id);
  const quietTime = topics.find((topic) => topic.topic === "Quiet Time With God") ?? topics[0] ?? null;
  const journeys = personJourneys(state, person.id);
  const prayers = personPrayers(state, person.id).filter((prayer) => prayer.status === "active");
  const nextStep = personNextSteps(state, person.id).find((step) => step.status === "open") ?? null;
  const [notes, setNotes] = useState("Lyf said the lunch-break Quiet Time helped. We talked about fighting for purity with his phone at night and praying with Tammie before bed.");
  const [quietTimeOutcome, setQuietTimeOutcome] = useState<AccountabilityState>("going_well");
  const [quietTimeNote, setQuietTimeNote] = useState("Lunch-break rhythm worked four days this week.");
  const [addPurity, setAddPurity] = useState(true);
  const [prayer, setPrayer] = useState(prayers[0]?.request ?? "");
  const [nextStepText, setNextStepText] = useState("Text Lyf Friday and ask how the phone-off-at-9 rhythm is going.");
  const [nextStepDue, setNextStepDue] = useState("2026-08-21");
  const [viewedJourney, setViewedJourney] = useState(false);
  const [assignCommandsJourney, setAssignCommandsJourney] = useState(false);

  return (
    <PageShell
      action={<IconButton label="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Meeting Workspace"
      title={fullName(person)}
    >
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid content-start gap-5">
          <Panel eyebrow="Before" title="Context carried in">
            <div className="divide-y divide-[#EDEFF2]">
              <SummaryRow icon={<Clock />} label="Previous notes" text={lastMeeting?.notes ?? "No previous notes"} />
              {quietTime ? <SummaryRow icon={<ClipboardCheck />} label="Accountability" text={`${quietTime.topic} - ${outcomeCopy[quietTime.status]} - ${relativeDate(quietTime.lastCheckInAt)}`} /> : null}
              {journeys.map((journey) => <SummaryRow icon={<BookOpen />} key={journey.id} label="Journey" text={`${journey.resourceTitle} - ${journey.completedUnits}/${journey.totalUnits}`} />)}
              {prayers.map((item) => <SummaryRow icon={<Heart />} key={item.id} label="Prayer" text={item.request} />)}
              {nextStep ? <SummaryRow icon={<Send />} label="Open next step" text={nextStep.description} /> : null}
            </div>
          </Panel>
        </aside>

        <section className="grid gap-5">
          <Panel eyebrow="Today" title="Capture">
            <Field label="Notes">
              <textarea className="field-control min-h-[170px] resize-y" onChange={(event) => setNotes(event.target.value)} value={notes} />
            </Field>
            <button className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-[#E3E6EB] bg-white px-3 text-sm font-bold text-[#3D4654]" type="button">
              <Mic className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Voice note
            </button>
          </Panel>

          <Panel eyebrow="From this conversation" title="Simple actions">
            <div className="grid gap-5">
              <section>
                <p className="text-sm font-bold text-[#0F1520]">Quiet Time With God</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["going_well", "struggling", "discussed", "reset"] as AccountabilityState[]).map((stateValue) => (
                    <button
                      className={`min-h-10 rounded-[8px] border px-2 text-xs font-bold ${quietTimeOutcome === stateValue ? "border-[#2450C8] bg-[#EEF2FD] text-[#2450C8]" : "border-[#E3E6EB] bg-white text-[#3D4654]"}`}
                      key={stateValue}
                      onClick={() => setQuietTimeOutcome(stateValue)}
                      type="button"
                    >
                      {outcomeCopy[stateValue]}
                    </button>
                  ))}
                </div>
                <textarea className="field-control mt-3 min-h-20" onChange={(event) => setQuietTimeNote(event.target.value)} value={quietTimeNote} />
              </section>

              <label className="flex items-start gap-3 border-t border-[#EDEFF2] pt-4">
                <input checked={addPurity} className="mt-1 h-5 w-5 accent-[#2450C8]" onChange={(event) => setAddPurity(event.target.checked)} type="checkbox" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#0F1520]">Add Purity accountability</span>
                  <span className="mt-1 block text-sm leading-6 text-[#6B7686]">Creates a weekly topic distinct from the Journey.</span>
                </span>
              </label>

              <Field label="Prayer">
                <textarea className="field-control min-h-24" onChange={(event) => setPrayer(event.target.value)} value={prayer} />
              </Field>

              <section className="border-t border-[#EDEFF2] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#0F1520]">Journey</p>
                    <p className="mt-1 text-sm leading-6 text-[#6B7686]">View the current Journey or queue a next one.</p>
                  </div>
                  <div className="flex gap-2">
                    <SmallActionButton onClick={() => setViewedJourney(true)}>View</SmallActionButton>
                    <SmallActionButton onClick={() => setAssignCommandsJourney((current) => !current)}>{assignCommandsJourney ? "Queued" : "Assign"}</SmallActionButton>
                  </div>
                </div>
                {viewedJourney ? <p className="mt-3 rounded-[8px] border border-[#CFE0FF] bg-[#EEF2FD] px-3 py-2 text-sm font-semibold leading-6 text-[#2450C8]">Opened 14 Days Through the New Testament in leader context.</p> : null}
                {assignCommandsJourney ? <p className="mt-3 text-sm leading-6 text-[#3D4654]">Commands of Jesus will be added as a direct Journey assignment on save.</p> : null}
              </section>

              <div className="grid gap-3 border-t border-[#EDEFF2] pt-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field label="Next step">
                  <input className="field-control" onChange={(event) => setNextStepText(event.target.value)} value={nextStepText} />
                </Field>
                <Field label="Due">
                  <input className="field-control" onChange={(event) => setNextStepDue(event.target.value)} type="date" value={nextStepDue} />
                </Field>
              </div>

              <PrimaryButton
                icon={<Check />}
                onClick={() => onSave({
                  addPurity,
                  assignCommandsJourney,
                  nextStep: nextStepText,
                  nextStepDue,
                  notes,
                  personId: person.id,
                  prayer,
                  quietTimeNote,
                  quietTimeOutcome,
                  sourceMeetingId,
                })}
              >
                Save
              </PrimaryButton>
            </div>
          </Panel>
        </section>
      </div>
    </PageShell>
  );
}

function HistoryScreen({ onBack, person, state }: { onBack: () => void; person: ProtoPerson; state: PrototypeState }) {
  const events = buildHistory(state, person.id);

  return (
    <PageShell
      action={<IconButton label="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Unified History"
      title={fullName(person)}
    >
      <div className="mx-auto max-w-3xl">
        <Panel eyebrow="Chronological" title={`${events.length} events`}>
          <div className="divide-y divide-[#EDEFF2]">
            {events.map((event) => (
              <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-3" key={event.id}>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#9AA4B2]">{formatDate(event.date)}</p>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0F1520]">{event.title}</p>
                  {event.detail ? <p className="mt-1 text-sm leading-6 text-[#3D4654]">{event.detail}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

type AddPersonInput = {
  email: string;
  firstName: string;
  howKnown: string;
  lastName: string;
  phone: string;
};

function AddPersonScreen({ onBack, onSave }: { onBack: () => void; onSave: (input: AddPersonInput) => void }) {
  const [input, setInput] = useState<AddPersonInput>({
    email: "",
    firstName: "",
    howKnown: "",
    lastName: "",
    phone: "",
  });
  const canSave = input.firstName.trim() && input.lastName.trim() && input.phone.trim();

  function update(field: keyof AddPersonInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  return (
    <PageShell
      action={<IconButton label="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Add Person"
      title="Start simple"
    >
      <div className="mx-auto max-w-2xl">
        <Panel eyebrow="Essential fields" title="New person">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSave) {
                onSave(input);
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <input className="field-control" onChange={(event) => update("firstName", event.target.value)} value={input.firstName} />
              </Field>
              <Field label="Last name">
                <input className="field-control" onChange={(event) => update("lastName", event.target.value)} value={input.lastName} />
              </Field>
            </div>
            <Field label="Phone">
              <input className="field-control" onChange={(event) => update("phone", event.target.value)} type="tel" value={input.phone} />
            </Field>
            <Field label="Email">
              <input className="field-control" onChange={(event) => update("email", event.target.value)} type="email" value={input.email} />
            </Field>
            <Field label="How do you know them?">
              <input className="field-control" onChange={(event) => update("howKnown", event.target.value)} value={input.howKnown} />
            </Field>
            <p className="text-sm leading-6 text-[#6B7686]">Engagement, household, address, reminders, and discipleship details stay off the first capture and can be added when they become useful.</p>
            <PrimaryButton disabled={!canSave} icon={<UserPlus />} submit>Add Person</PrimaryButton>
          </form>
        </Panel>
      </div>
    </PageShell>
  );
}

function ReportScreen({
  activeSphere,
  onBack,
  onOpenPerson,
  setActiveSphere,
  state,
}: {
  activeSphere: Sphere;
  onBack: () => void;
  onOpenPerson: (personId: string) => void;
  setActiveSphere: (sphere: Sphere) => void;
  state: PrototypeState;
}) {
  const visiblePeople = state.people.filter((person) => person.sphere === activeSphere);
  const counts = sphereCounts(state.people);
  const totalMinutes = visiblePeople.reduce((sum, person) => sum + reportMetrics(state, person).minutes, 0);

  return (
    <PageShell
      action={<IconButton label="Back" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>}
      eyebrow="Ministry / Relationship Report"
      title="Investment and fruit"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid min-w-0 gap-5">
          <Panel eyebrow="3 / 12 / 70 / 120" title={sphereCopy[activeSphere].label}>
            <div className="grid items-center gap-5 md:grid-cols-[250px_minmax(0,1fr)]">
              <CircleTarget activeSphere={activeSphere} people={state.people} onSelectSphere={setActiveSphere} />
              <div className="min-w-0">
                <p className="text-sm leading-6 text-[#475569]">{sphereCopy[activeSphere].intent}</p>
                <SphereTabs activeSphere={activeSphere} counts={counts} setActiveSphere={setActiveSphere} />
              </div>
            </div>
            <div className="mt-5 divide-y divide-[#EDEFF2]">
              {visiblePeople.map((person) => (
                <ReportPersonRow
                  key={person.id}
                  metrics={reportMetrics(state, person)}
                  onOpen={() => onOpenPerson(person.id)}
                  person={person}
                  state={state}
                />
              ))}
              {!visiblePeople.length ? <p className="py-4 text-sm leading-6 text-[#6B7686]">No people in this sphere yet.</p> : null}
            </div>
          </Panel>
        </section>

        <aside className="grid content-start gap-5">
          <Panel eyebrow="Sphere summary" title={`${visiblePeople.length} people`}>
            <div className="grid gap-3 text-sm leading-6 text-[#475569]">
              <p>{Math.round(totalMinutes / 60)}h invested</p>
              <p>{visiblePeople.reduce((sum, person) => sum + reportMetrics(state, person).meetings, 0)} meetings or gatherings</p>
              <p>{visiblePeople.reduce((sum, person) => sum + reportMetrics(state, person).activeAccountability, 0)} active accountability rhythms</p>
            </div>
          </Panel>
          <Panel eyebrow="View" title="What matters">
            <div className="grid gap-3 text-sm leading-6 text-[#475569]">
              <p>Time invested</p>
              <p>Relationship state and engagement</p>
              <p>Journey, accountability, groups, fruit, and follow-up</p>
            </div>
          </Panel>
        </aside>
      </div>
    </PageShell>
  );
}

function SphereTabs({
  activeSphere,
  counts,
  setActiveSphere,
}: {
  activeSphere: Sphere;
  counts: Record<Sphere, number>;
  setActiveSphere: (sphere: Sphere) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sphereOrder.map((sphere) => {
        const active = activeSphere === sphere;

        return (
          <button
            className={`min-h-9 rounded-full border px-3 text-xs font-black transition-colors ${active ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#DCEBFF] bg-white text-[#1D4ED8] hover:bg-[#F8FBFF]"}`}
            key={sphere}
            onClick={() => setActiveSphere(sphere)}
            type="button"
          >
            {sphereCopy[sphere].short} ({counts[sphere]})
          </button>
        );
      })}
    </div>
  );
}

function ReportPersonRow({
  metrics,
  onOpen,
  person,
  state,
}: {
  metrics: ReturnType<typeof reportMetrics>;
  onOpen: () => void;
  person: ProtoPerson;
  state: PrototypeState;
}) {
  const groups = personGroups(state, person.id);
  const journeys = personJourneys(state, person.id).filter((journey) => journey.status !== "completed");

  return (
    <button className="grid w-full gap-3 py-4 text-left md:grid-cols-[minmax(180px,1fr)_minmax(0,1.6fr)_auto]" onClick={onOpen} type="button">
      <div className="min-w-0">
        <p className="text-base font-bold text-[#0F1520]">{fullName(person)}</p>
        <p className="mt-1 text-sm leading-5 text-[#6B7686]">{person.relationshipLabel} - engagement {person.engagementLevel > 0 ? `+${person.engagementLevel}` : person.engagementLevel}</p>
      </div>
      <div className="grid gap-1 text-sm leading-5 text-[#3D4654] sm:grid-cols-2">
        <span>{metrics.meetings} meetings/gatherings</span>
        <span>{Math.round(metrics.minutes / 60)}h invested</span>
        <span>{metrics.activeAccountability} accountability</span>
        <span>{journeys[0]?.resourceTitle ?? "No active Journey"}</span>
        <span>{groups[0]?.name ?? "No group"}</span>
        <span>{metrics.openStep ? `Next: ${formatDate(metrics.openStep.dueAt)}` : "No open follow-up"}</span>
      </div>
      <ChevronRight className="hidden h-4 w-4 self-center text-[#9AA4B2] md:block" aria-hidden="true" strokeWidth={1.9} />
    </button>
  );
}

function QuickCheckInSheet({
  onClose,
  onSave,
  person,
  topic,
}: {
  onClose: () => void;
  onSave: (topicId: string, outcome: AccountabilityState, note: string | null) => void;
  person: ProtoPerson | null;
  topic: ProtoAccountabilityTopic;
}) {
  const [outcome, setOutcome] = useState<AccountabilityState>("going_well");
  const [note, setNote] = useState("Checked in without logging a full meeting.");

  return (
    <div className="fixed inset-0 z-40 bg-[#0F1520]/28 px-4 py-5 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-lg items-end sm:items-center">
        <section className="w-full rounded-[8px] border border-[#EDEFF2] bg-white p-4 shadow-[0_24px_70px_rgba(15,21,32,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563EB]">Quick Check-In</p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F1520]">{topic.topic}</h2>
              <p className="mt-1 text-sm leading-6 text-[#6B7686]">{person ? fullName(person) : "Person"}</p>
            </div>
            <IconButton label="Close" onClick={onClose}><ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /></IconButton>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {(["going_well", "struggling", "discussed", "reset"] as AccountabilityState[]).map((value) => (
              <button
                className={`min-h-11 rounded-[8px] border px-2 text-sm font-bold ${outcome === value ? "border-[#2450C8] bg-[#EEF2FD] text-[#2450C8]" : "border-[#E3E6EB] bg-white text-[#3D4654]"}`}
                key={value}
                onClick={() => setOutcome(value)}
                type="button"
              >
                {outcomeCopy[value]}
              </button>
            ))}
          </div>
          <Field label="Note">
            <textarea className="field-control mt-3 min-h-24" onChange={(event) => setNote(event.target.value)} value={note} />
          </Field>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <SecondaryButton icon={<ArrowLeft />} onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton icon={<Check />} onClick={() => onSave(topic.id, outcome, note.trim() || null)}>Save</PrimaryButton>
          </div>
        </section>
      </div>
    </div>
  );
}

function PersonListRow({ metrics, onClick, person }: { metrics: ReturnType<typeof reportMetrics>; onClick: () => void; person: ProtoPerson }) {
  return (
    <button className="flex w-full items-center gap-3 py-3 text-left" onClick={onClick} type="button">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F1520] text-xs font-bold text-white">{initials(person)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#0F1520]">{fullName(person)}</span>
        <span className="mt-1 block text-sm leading-5 text-[#6B7686]">{person.relationshipLabel} - {metrics.meetings} touches - {sphereCopy[person.sphere].label}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9AA4B2]" aria-hidden="true" strokeWidth={1.9} />
    </button>
  );
}

function SummaryRow({ action, icon, label, text }: { action?: ReactNode; icon: ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-[#2563EB] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9AA4B2]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[#3D4654]">{text}</p>
      </div>
      {action}
    </div>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9AA4B2]">{label}</dt>
      <dd className="mt-1 text-[#3D4654]">{value}</dd>
    </div>
  );
}

function Panel({ action, children, eyebrow, title }: { action?: ReactNode; children: ReactNode; eyebrow: string; title: string }) {
  return (
    <section className="rounded-[8px] border border-[#EDEFF2] bg-white p-4 shadow-[0_14px_34px_rgba(15,21,32,0.04)] sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563EB]">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-[#0F1520]">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7686]">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function PrimaryButton({
  children,
  disabled,
  icon,
  onClick,
  submit,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick?: () => void;
  submit?: boolean;
}) {
  return (
    <button
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#2563EB] px-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#E3E6EB] disabled:text-[#9AA4B2] [&>svg]:h-4 [&>svg]:w-4"
      disabled={disabled}
      onClick={onClick}
      type={submit ? "submit" : "button"}
    >
      {icon}
      {children}
    </button>
  );
}

function SecondaryButton({ children, icon, onClick }: { children: ReactNode; icon: ReactNode; onClick?: () => void }) {
  return (
    <button
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#E3E6EB] bg-white px-3 text-sm font-bold text-[#3D4654] transition-colors hover:border-[#C6D3EA] hover:bg-[#F8FBFF] [&>svg]:h-4 [&>svg]:w-4"
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function SmallActionButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="min-h-9 shrink-0 rounded-[8px] bg-[#2450C8] px-3 text-xs font-bold text-white" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-sm font-bold text-[#2450C8]" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#E3E6EB] bg-white text-[#3D4654] transition-colors hover:border-[#C6D3EA]"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#EDEFF2] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold text-[#3D4654]">{children}</span>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition-colors ${active ? "bg-[#EEF2FD] text-[#2450C8]" : "text-[#3D4654] hover:bg-[#F8FBFF]"}`}
      onClick={onClick}
      type="button"
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

function MobileNav({
  active,
  onHome,
  onMeetings,
  onMore,
}: {
  active: PrimaryNav;
  onHome: () => void;
  onMeetings: () => void;
  onMore: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] lg:hidden" aria-label="Primary">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-full border border-white/75 bg-white/78 p-1.5 shadow-[0_24px_55px_rgba(148,163,184,0.22)] backdrop-blur-2xl">
        <MobileNavButton active={active === "home"} icon={<Home />} label="Home" onClick={onHome} />
        <MobileNavButton active={active === "meetings"} icon={<CalendarDays />} label="Meetings" onClick={onMeetings} />
        <MobileNavButton active={active === "more"} icon={<MoreHorizontal />} label="More" onClick={onMore} />
      </div>
    </nav>
  );
}

function MobileNavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${active ? "bg-[#EBF2FF] text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" : "text-[#94A3B8]"}`}
      onClick={onClick}
      type="button"
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}
