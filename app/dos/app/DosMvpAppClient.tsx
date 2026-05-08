"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { DosAppData, DosAppFruit, DosAppMeeting, DosAppPerson } from "@/src/lib/dos/missionary-app";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const tabs = [
  { label: "Home", value: "home" },
  { label: "People", value: "people" },
  { label: "Meetings", value: "meetings" },
  { label: "Fruit", value: "fruit" },
  { label: "More", value: "more" },
] as const;

const meetingTypeOptions = [
  { label: "Kitchen Table", value: "kitchen_table" },
  { label: "Coffee", value: "coffee" },
  { label: "Phone", value: "phone" },
  { label: "Zoom", value: "zoom" },
  { label: "Group", value: "group" },
  { label: "Other", value: "other" },
];

const outcomeTagOptions = [
  "Salvation",
  "Baptism",
  "Healing",
  "Deliverance",
  "Church Connection",
  "Discipleship",
  "Prayer Answered",
  "Other",
] as const;

const relationshipTypeOptions = ["Friend", "Family", "Neighbor", "Coworker", "Church", "Disciple", "Mentor", "Other"];
const futureTools = ["Stewardship", "Teachings", "Prayer", "In Season", "Settings"];

type ActiveTab = typeof tabs[number]["value"];
type FormMode = "fruit" | "meeting" | "person" | null;

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function meetingTypeLabel(value: string) {
  return meetingTypeOptions.find((option) => option.value === value)?.label ?? "Meeting";
}

function personName(people: DosAppPerson[], id: string | null | undefined) {
  return people.find((person) => person.id === id)?.name ?? "Unlinked person";
}

function meetingPeople(meeting: DosAppMeeting, people: DosAppPerson[]) {
  const linkedNames = meeting.fieldPersonIds
    .map((id) => people.find((person) => person.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const names = linkedNames.length ? linkedNames : meeting.participantNames;

  return names.length ? names.join(" + ") : "No people attached";
}

function EmptyState({
  action,
  text,
}: {
  action?: ReactNode;
  text: string;
}) {
  return (
    <div className="border border-dashed border-stone-800 bg-[#080808] p-5 text-sm leading-7 text-stone-400">
      <p className="text-stone-200">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function SectionHeading({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400"
          style={{ fontFamily: font.rajdhani }}
        >
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      className="inline-flex min-h-11 w-full items-center justify-center border border-amber-500/60 bg-amber-400 px-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      style={{ fontFamily: font.rajdhani }}
      type={type}
    >
      {children}
    </button>
  );
}

function CompactButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center border border-stone-700 bg-[#080808] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-amber-400 hover:text-amber-300"
      onClick={onClick}
      style={{ fontFamily: font.rajdhani }}
      type="button"
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function Sheet({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm" onMouseDown={onClose} role="presentation">
      <div className="flex min-h-full items-end justify-center">
        <div
          aria-modal="true"
          className="w-full max-w-lg border border-stone-800 bg-[#080808] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400" style={{ fontFamily: font.rajdhani }}>
                DOS App
              </p>
              <h2 className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">{description}</p>
            </div>
            <button
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone-700 text-xl leading-none text-stone-300 transition-colors hover:border-amber-400 hover:text-amber-300"
              onClick={onClose}
              type="button"
            >
              &times;
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: DosAppPerson }) {
  return (
    <article className="border border-stone-800 bg-[#080808] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {person.name}
          </h3>
          <p className="mt-2 text-sm text-stone-400">{person.relationshipType || "Relationship not set"}</p>
        </div>
        <span className="border border-amber-500/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300" style={{ fontFamily: font.rajdhani }}>
          {person.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-4 text-sm text-stone-500">{person.phone}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
        Last activity: {person.lastActivityAt ? formatDate(person.lastActivityAt.slice(0, 10)) : "No meetings yet"}
      </p>
    </article>
  );
}

function MeetingCard({
  meeting,
  people,
}: {
  meeting: DosAppMeeting;
  people: DosAppPerson[];
}) {
  return (
    <article className="border border-stone-800 bg-[#080808] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400" style={{ fontFamily: font.rajdhani }}>
        {meetingTypeLabel(meeting.type)}
      </p>
      <h3 className="mt-3 text-xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {meetingPeople(meeting, people)}
      </h3>
      <p className="mt-3 text-sm text-stone-500">{formatDate(meeting.date)}</p>
      <p className="mt-3 text-sm leading-6 text-stone-300">{meeting.notes || "No meeting notes added."}</p>
    </article>
  );
}

function FruitCard({
  fruit,
  people,
}: {
  fruit: DosAppFruit;
  people: DosAppPerson[];
}) {
  return (
    <article className="border border-stone-800 bg-[#080808] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400" style={{ fontFamily: font.rajdhani }}>
          {fruit.status === "approved" ? "Approved Fruit" : "Private Draft"}
        </p>
        <p className="text-xs text-stone-500">{formatDate(fruit.testimonyDate)}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-200">{fruit.summary}</p>
      {fruit.fieldPersonId ? (
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
          Linked to {personName(people, fruit.fieldPersonId)}
        </p>
      ) : null}
      {fruit.outcomeTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {fruit.outcomeTags.map((tag) => (
            <span className="border border-amber-500/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300" key={tag} style={{ fontFamily: font.rajdhani }}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function DosMvpAppClient({ data }: { data: DosAppData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [errorMessage, setErrorMessage] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const latestMeeting = data.meetings[0];
  const latestFruit = data.fruit[0];
  const homeHighlights = useMemo(() => [
    { label: "People", value: data.stats.peopleCount },
    { label: "Meetings", value: data.stats.meetingsCount },
    { label: "Fruit", value: data.stats.fruitCount },
  ], [data.stats.fruitCount, data.stats.meetingsCount, data.stats.peopleCount]);

  async function submitJson(endpoint: string, payload: Record<string, unknown>) {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          ...payload,
          workspaceId: data.workspace.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save.");
      }

      setFormMode(null);
      setSelectedOutcomeTags([]);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/people", {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      relationshipType: String(formData.get("relationship_type") ?? ""),
    });
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/meetings", {
      fieldPersonIds: formData.getAll("field_person_ids"),
      notes: String(formData.get("notes") ?? ""),
      tableDate: String(formData.get("table_date") ?? todayDateValue()),
      tableType: String(formData.get("table_type") ?? "kitchen_table"),
    });
  }

  function handleFruitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/fruit", {
      fieldPersonId: String(formData.get("field_person_id") ?? ""),
      outcomeTags: selectedOutcomeTags,
      summary: String(formData.get("summary") ?? ""),
      testimonyDate: String(formData.get("testimony_date") ?? todayDateValue()),
    });
  }

  function toggleOutcomeTag(tag: string) {
    setSelectedOutcomeTags((current) =>
      current.includes(tag)
        ? current.filter((currentTag) => currentTag !== tag)
        : [...current, tag],
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-[#050505] text-stone-100">
      <header className="border-b border-stone-900 px-4 pb-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400" style={{ fontFamily: font.rajdhani }}>
              DOS Field App
            </p>
            <h1 className="mt-3 text-4xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              {data.workspace.displayName}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-400">
              {data.workspace.shortMission || "Private field workflow for people, meetings, and fruit."}
            </p>
          </div>
          {data.workspace.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-14 w-14 border border-stone-800 object-cover" src={data.workspace.profileImageUrl} />
          ) : null}
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {homeHighlights.map((item) => (
            <div className="min-w-28 border border-stone-800 bg-[#080808] px-3 py-2" key={item.label}>
              <p className="text-2xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>{item.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani }}>{item.label}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5">
        {activeTab === "home" ? (
          <div>
            <SectionHeading eyebrow="Home" title="Today" />
            <div className="grid gap-3">
              <PrimaryButton onClick={() => setFormMode("person")}>Add Person</PrimaryButton>
              <PrimaryButton onClick={() => setFormMode("meeting")}>Log Meeting</PrimaryButton>
              <PrimaryButton onClick={() => setFormMode("fruit")}>Record Fruit</PrimaryButton>
            </div>
            <div className="mt-6 grid gap-4">
              <div className="border border-stone-800 bg-[#080808] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani }}>Latest Meeting</p>
                {latestMeeting ? (
                  <p className="mt-2 text-sm leading-6 text-stone-200">{meetingTypeLabel(latestMeeting.type)} with {meetingPeople(latestMeeting, data.people)}</p>
                ) : (
                  <p className="mt-2 text-sm text-stone-500">No meetings logged yet.</p>
                )}
              </div>
              <div className="border border-stone-800 bg-[#080808] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani }}>Latest Fruit</p>
                {latestFruit ? (
                  <p className="mt-2 text-sm leading-6 text-stone-200">{latestFruit.summary}</p>
                ) : (
                  <p className="mt-2 text-sm text-stone-500">No fruit recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "people" ? (
          <div>
            <SectionHeading action={<CompactButton onClick={() => setFormMode("person")}>Add</CompactButton>} eyebrow="Your Field" title="People" />
            {data.people.length ? (
              <div className="grid gap-3">{data.people.map((person) => <PersonCard key={person.id} person={person} />)}</div>
            ) : (
              <EmptyState action={<CompactButton onClick={() => setFormMode("person")}>Add Person</CompactButton>} text="No people added yet." />
            )}
          </div>
        ) : null}

        {activeTab === "meetings" ? (
          <div>
            <SectionHeading action={<CompactButton onClick={() => setFormMode("meeting")}>Log</CompactButton>} eyebrow="Meetings" title="Timeline" />
            {data.meetings.length ? (
              <div className="grid gap-3">{data.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} people={data.people} />)}</div>
            ) : (
              <EmptyState action={<CompactButton onClick={() => setFormMode("meeting")}>Log Meeting</CompactButton>} text="No meetings logged yet." />
            )}
          </div>
        ) : null}

        {activeTab === "fruit" ? (
          <div>
            <SectionHeading action={<CompactButton onClick={() => setFormMode("fruit")}>Record</CompactButton>} eyebrow="Fruit" title="Private Drafts" />
            <p className="mb-4 text-sm leading-6 text-stone-500">
              Recorded fruit stays private until it is reviewed, approved, and toggled public from the Missionary Workspace.
            </p>
            {data.fruit.length ? (
              <div className="grid gap-3">{data.fruit.map((fruit) => <FruitCard fruit={fruit} key={fruit.id} people={data.people} />)}</div>
            ) : (
              <EmptyState action={<CompactButton onClick={() => setFormMode("fruit")}>Record Fruit</CompactButton>} text="No fruit recorded yet." />
            )}
          </div>
        ) : null}

        {activeTab === "more" ? (
          <div>
            <SectionHeading eyebrow="More" title="Future Tools" />
            <div className="grid gap-3">
              {futureTools.map((tool) => (
                <div className="flex min-h-14 items-center justify-between border border-stone-800 bg-[#080808] px-4" key={tool}>
                  <span className="text-sm text-stone-300">{tool}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
                    Soon
                  </span>
                </div>
              ))}
            </div>
            <Link
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center border border-stone-700 px-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-amber-400 hover:text-amber-300"
              href={data.workspace.publicProfileHref}
              style={{ fontFamily: font.rajdhani }}
            >
              View Public Profile
            </Link>
          </div>
        ) : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-800 bg-[#050505]/95 px-2 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {tabs.map((tab) => (
            <button
              aria-current={activeTab === tab.value ? "page" : undefined}
              className={`min-h-12 px-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                activeTab === tab.value ? "bg-amber-400 text-stone-950" : "text-stone-500 hover:text-amber-300"
              }`}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{ fontFamily: font.rajdhani }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {formMode === "person" ? (
        <Sheet description="Add someone to your field. Keep it simple now; deepen the record later." onClose={() => setFormMode(null)} title="Add Person">
          <form className="space-y-4" onSubmit={handlePersonSubmit}>
            <label className="block">
              <FieldLabel>Name</FieldLabel>
              <input className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" name="name" required />
            </label>
            <label className="block">
              <FieldLabel>Phone</FieldLabel>
              <input className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" name="phone" required />
            </label>
            <label className="block">
              <FieldLabel>Relationship Type</FieldLabel>
              <select className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" name="relationship_type">
                <option value="">Not set</option>
                {relationshipTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            {errorMessage ? <p className="border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-100">{errorMessage}</p> : null}
            <PrimaryButton type="submit">{isSubmitting ? "Saving..." : "Add Person"}</PrimaryButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "meeting" ? (
        <Sheet description="Log the real interaction. Meeting notes stay private to this workspace." onClose={() => setFormMode(null)} title="Log Meeting">
          <form className="space-y-4" onSubmit={handleMeetingSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Type</FieldLabel>
                <select className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" name="table_type" defaultValue="kitchen_table">
                  {meetingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Date</FieldLabel>
                <input className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" defaultValue={todayDateValue()} name="table_date" type="date" />
              </label>
            </div>
            <div>
              <FieldLabel>People Involved</FieldLabel>
              {data.people.length ? (
                <div className="mt-2 grid gap-2">
                  {data.people.map((person) => (
                    <label className="flex min-h-11 items-center gap-3 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-200" key={person.id}>
                      <input className="accent-amber-400" name="field_person_ids" type="checkbox" value={person.id} />
                      {person.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-stone-500">No people added yet.</p>
              )}
            </div>
            <label className="block">
              <FieldLabel>Notes</FieldLabel>
              <textarea className="mt-2 min-h-24 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-stone-100 outline-none focus:border-amber-400" name="notes" placeholder="Briefly capture what happened." />
            </label>
            {errorMessage ? <p className="border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-100">{errorMessage}</p> : null}
            <PrimaryButton type="submit">{isSubmitting ? "Saving..." : "Log Meeting"}</PrimaryButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "fruit" ? (
        <Sheet description="Record what changed. This starts as a private draft for review." onClose={() => setFormMode(null)} title="Record Fruit">
          <form className="space-y-4" onSubmit={handleFruitSubmit}>
            <label className="block">
              <FieldLabel>Summary</FieldLabel>
              <textarea className="mt-2 min-h-24 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-stone-100 outline-none focus:border-amber-400" name="summary" placeholder="Short private summary of the fruit." required />
            </label>
            <label className="block">
              <FieldLabel>Date</FieldLabel>
              <input className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" defaultValue={todayDateValue()} name="testimony_date" type="date" />
            </label>
            <label className="block">
              <FieldLabel>Linked Person</FieldLabel>
              <select className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-stone-100 outline-none focus:border-amber-400" name="field_person_id">
                <option value="">Not linked</option>
                {data.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <div>
              <FieldLabel>Outcome Tags</FieldLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {outcomeTagOptions.map((tag) => {
                  const selected = selectedOutcomeTags.includes(tag);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-11 border px-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] ${
                        selected ? "border-amber-400 bg-amber-400 text-stone-950" : "border-stone-700 bg-[#050505] text-stone-300"
                      }`}
                      key={tag}
                      onClick={() => toggleOutcomeTag(tag)}
                      style={{ fontFamily: font.rajdhani }}
                      type="button"
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            {errorMessage ? <p className="border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-100">{errorMessage}</p> : null}
            <PrimaryButton type="submit">{isSubmitting ? "Saving..." : "Record Fruit"}</PrimaryButton>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
