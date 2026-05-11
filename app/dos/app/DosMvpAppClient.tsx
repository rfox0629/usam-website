"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { DosAppData, DosAppFruit, DosAppMeeting, DosAppPerson } from "@/src/lib/dos/missionary-app";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const tabs = [
  { icon: "home", label: "Home", value: "home" },
  { icon: "people", label: "People", value: "people" },
  { icon: "meetings", label: "Meetings", value: "meetings" },
  { icon: "fruit", label: "Fruit", value: "fruit" },
  { icon: "more", label: "More", value: "more" },
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
const futureTools = ["Prayer Alerts", "Connection Logs", "Discussion Guides", "Follow Up"];

type ActiveTab = typeof tabs[number]["value"];
type ButtonTone = "black" | "soft" | "white";
type FormMode = "fruit" | "meeting" | "person" | null;
type IconName = typeof tabs[number]["icon"] | "add" | "arrow" | "bell" | "calendar" | "log" | "search";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const commonProps = {
    "aria-hidden": true,
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: size,
  };

  switch (name) {
    case "add":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...commonProps}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <path d="M7 3v3" />
          <path d="M17 3v3" />
          <path d="M4 8h16" />
          <rect height="16" rx="3" width="16" x="4" y="5" />
        </svg>
      );
    case "fruit":
      return (
        <svg {...commonProps}>
          <path d="M12 21c4-3 7-7 7-11a7 7 0 0 0-14 0c0 4 3 8 7 11Z" />
          <path d="M12 11v4" />
          <path d="M9.5 8.5c1.2-1 2.8-1 5 0" />
        </svg>
      );
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "log":
      return (
        <svg {...commonProps}>
          <path d="M8 6h10" />
          <path d="M8 12h10" />
          <path d="M8 18h7" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
      );
    case "meetings":
      return (
        <svg {...commonProps}>
          <rect height="6" rx="1.5" width="6" x="4" y="4" />
          <rect height="6" rx="1.5" width="6" x="14" y="4" />
          <rect height="6" rx="1.5" width="6" x="4" y="14" />
          <rect height="6" rx="1.5" width="6" x="14" y="14" />
        </svg>
      );
    case "more":
      return (
        <svg {...commonProps}>
          <path d="M12 4 5 7v5c0 4.5 3 7 7 8 4-1 7-3.5 7-8V7l-7-3Z" />
        </svg>
      );
    case "people":
      return (
        <svg {...commonProps}>
          <path d="M16 20v-1.5c0-1.7-1.8-3-4-3s-4 1.3-4 3V20" />
          <circle cx="12" cy="9" r="3" />
          <path d="M20 20v-1.2c0-1.2-1-2.2-2.5-2.7" />
          <path d="M17 6.2a2.5 2.5 0 0 1 0 4.6" />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );
    default:
      return null;
  }
}

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

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "No contact yet";
  }

  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const activityDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((today - activityDay) / (24 * 60 * 60 * 1000));

  if (daysAgo <= 0) {
    return "Today";
  }

  if (daysAgo === 1) {
    return "Yesterday";
  }

  return `${daysAgo} days ago`;
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function meetingTypeLabel(value: string) {
  return meetingTypeOptions.find((option) => option.value === value)?.label ?? "Meeting";
}

function meetingActivityTitle(meeting: DosAppMeeting) {
  return meeting.source === "connection" ? meeting.title : meetingTypeLabel(meeting.type);
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function statusLabel(value: string | null | undefined) {
  const status = normalizeText(value).replaceAll("_", " ");

  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "New";
}

function statusTone(value: string | null | undefined) {
  const status = normalizeText(value).toLowerCase();

  if (status.includes("disciple") || status.includes("active")) {
    return "bg-[#78A667]";
  }

  if (status.includes("follow") || status.includes("new")) {
    return "bg-[#D79C37]";
  }

  return "bg-[#9AA288]";
}

function relationshipLine(person: DosAppPerson) {
  return person.relationshipType ? `Walking with · ${person.relationshipType}` : "Walking with";
}

function relationshipStatusLabel(person: DosAppPerson) {
  const status = normalizeText(person.status).toLowerCase();

  if (status.includes("disciple")) {
    return "Discipling";
  }

  if (status.includes("new")) {
    return "New";
  }

  if (status.includes("follow")) {
    return "Follow up";
  }

  return "Walking with";
}

function lastActivityLine(person: DosAppPerson) {
  return person.lastActivityAt ? `Last interaction · ${formatDate(person.lastActivityAt.slice(0, 10))}` : "No meetings yet";
}

function recentActivityLine(person: DosAppPerson) {
  return `${relationshipStatusLabel(person)} · ${formatRelativeDate(person.lastActivityAt)}`;
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "D";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return `${first}${second}`.toUpperCase();
}

function avatarTone(index: number) {
  return ["bg-[#CFE6DA] text-[#1C5D4F]", "bg-[#DAD7F6] text-[#4B438B]", "bg-[#F0D6CB] text-[#8A3F2C]", "bg-[#E9DEC8] text-[#735C2C]"][index % 4];
}

function personName(people: DosAppPerson[], id: string | null | undefined) {
  return people.find((person) => person.id === id)?.name ?? "Unlinked person";
}

function meetingPeople(meeting: DosAppMeeting, people: DosAppPerson[]) {
  const linkedNames = meeting.fieldPersonIds
    .map((id) => people.find((person) => person.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const names = linkedNames.length ? linkedNames : meeting.participantNames;

  return names.length ? names.join(" + ") : "Private meeting";
}

function filteredPeople(people: DosAppPerson[], query: string) {
  const search = query.trim().toLowerCase();

  if (!search) {
    return people;
  }

  return people.filter((person) => (
    person.name.toLowerCase().includes(search)
    || normalizeText(person.phone).toLowerCase().includes(search)
    || normalizeText(person.relationshipType).toLowerCase().includes(search)
    || normalizeText(person.status).toLowerCase().includes(search)
  ));
}

function isNeedsAttention(person: DosAppPerson) {
  return !person.lastActivityAt || normalizeText(person.status).toLowerCase().includes("follow");
}

function AppButton({
  children,
  disabled,
  icon,
  onClick,
  tone = "white",
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: "button" | "submit";
}) {
  const toneClass = {
    black: "bg-[#111111] text-white shadow-[0_10px_24px_rgba(17,17,17,0.12)] hover:bg-black",
    soft: "border border-[#E0DED8] bg-[#F8F7F3] text-[#1E1D1A] hover:bg-white",
    white: "border border-[#DDD9D0] bg-white text-[#1E1D1A] hover:border-[#C9C1B4]",
  }[tone];
  const sizeClass = tone === "black" ? "min-h-[54px] text-[15px]" : "min-h-11 text-xs sm:text-sm";

  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

function CompactButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#DDD9D0] bg-white px-3 text-xs font-semibold text-[#1E1D1A] transition-colors hover:border-[#C9C1B4]"
      onClick={onClick}
      type="button"
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </button>
  );
}

function EmptyState({
  action,
  text,
  title,
}: {
  action?: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#E2DED6] bg-white p-5 text-sm leading-6 text-[#77716A]">
      <p className="font-semibold text-[#1E1D1A]">{title}</p>
      <p className="mt-1">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function FieldInputClass() {
  return "mt-2 min-h-12 w-full rounded-2xl border border-[#DDD9D0] bg-[#F8F7F3] px-4 text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]";
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-[#F1F0EC] px-3 py-3.5 text-center">
      <p className="text-[21px] font-bold leading-none text-[#111111]">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </div>
  );
}

function SectionHeading({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </h2>
      {action}
    </div>
  );
}

function TaskCard({
  action,
  children,
  icon,
  title,
}: {
  action: ReactNode;
  children: ReactNode;
  icon?: IconName;
  title: string;
}) {
  return (
    <article className="flex min-h-[72px] items-center justify-between gap-4 rounded-[18px] border border-[#E2DED6] bg-white px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F0EC] text-[#1E1D1A]">
            <Icon name={icon} size={16} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-[#1E1D1A]">{title}</p>
          <div className="mt-1 text-xs leading-5 text-[#77716A]">{children}</div>
        </div>
      </div>
      {action}
    </article>
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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/35 px-3 py-5 backdrop-blur-sm" onMouseDown={onClose} role="presentation">
      <div className="flex min-h-full items-end justify-center">
        <div
          aria-modal="true"
          className="w-full max-w-lg rounded-[28px] border border-[#E2DED6] bg-[#F6F4EF] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
                DOS
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-none text-[#1E1D1A]">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#77716A]">{description}</p>
            </div>
            <button
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#DDD9D0] bg-white text-xl leading-none text-[#1E1D1A]"
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

function PersonCard({
  index,
  person,
  variant = "card",
}: {
  index: number;
  person: DosAppPerson;
  variant?: "card" | "row";
}) {
  const isRow = variant === "row";

  return (
    <article className={`flex items-center gap-3 bg-white ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2DED6] px-4 py-3"}`}>
      <div className={`flex ${isRow ? "h-9 w-9" : "h-10 w-10"} shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(index)}`}>
        {initials(person.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-[#1E1D1A]">{person.name}</p>
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone(person.status)}`} />
        </div>
        <p className="mt-1 truncate text-xs text-[#77716A]">
          {isRow ? recentActivityLine(person) : `${statusLabel(person.status)} · ${lastActivityLine(person).replace("Last interaction · ", "")}`}
        </p>
      </div>
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
    <article className="rounded-2xl border border-[#E2DED6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1E1D1A]">{meetingActivityTitle(meeting)}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
            {meeting.source === "connection" ? "Connection" : "Meeting"}
          </p>
        </div>
        <p className="text-xs text-[#8E8880]">{formatDate(meeting.date)}</p>
      </div>
      <p className="mt-2 text-xs text-[#77716A]">{meetingPeople(meeting, people)}</p>
      <p className="mt-3 text-sm leading-6 text-[#3B3935]">{meeting.notes || "No summary added yet."}</p>
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
    <article className="rounded-2xl border border-[#E2DED6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#1E1D1A]">{fruit.status === "approved" ? "Approved Fruit" : "Private Draft"}</p>
        <p className="text-xs text-[#8E8880]">{formatDate(fruit.testimonyDate)}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#3B3935]">{fruit.summary}</p>
      {fruit.fieldPersonId ? <p className="mt-3 text-xs text-[#77716A]">Linked to {personName(people, fruit.fieldPersonId)}</p> : null}
      {fruit.outcomeTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {fruit.outcomeTags.map((tag) => (
            <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[10px] font-semibold text-[#5F5952]" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SearchField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8880]">
          <Icon name="search" size={15} />
        </span>
        <input
          className="min-h-12 w-full rounded-full border border-[#DDD9D0] bg-white pl-10 pr-4 text-sm text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </div>
    </label>
  );
}

export function DosMvpAppClient({ data }: { data: DosAppData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [errorMessage, setErrorMessage] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingPeopleQuery, setMeetingPeopleQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const latestMeeting = data.meetings[0];
  const latestFruit = data.fruit[0];
  const visiblePeople = useMemo(() => filteredPeople(data.people, peopleQuery), [data.people, peopleQuery]);
  const meetingPeopleOptions = useMemo(() => filteredPeople(data.people, meetingPeopleQuery), [data.people, meetingPeopleQuery]);
  const attentionPeople = useMemo(() => data.people.filter(isNeedsAttention), [data.people]);
  const relatingCount = data.people.filter((person) => normalizeText(person.status).toLowerCase() !== "new").length;
  const multiplyingCount = Math.max(data.stats.approvedFruit, data.fruit.length);
  const recentPeople = data.people.slice(0, 3);
  const workspaceLabel = `${data.workspace.displayName} · USA`;

  function closeForm() {
    setErrorMessage("");
    setFormMode(null);
    setMeetingPeopleQuery("");
  }

  function openForm(mode: Exclude<FormMode, null>) {
    setErrorMessage("");
    setFormMode(mode);
    setMeetingPeopleQuery("");
  }

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

      closeForm();
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
    <div className="min-h-[100dvh] bg-[#EDEAE3] text-[#1E1D1A] sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[#F5F3EE] shadow-[0_18px_60px_rgba(42,37,29,0.08)] sm:h-[calc(100dvh-3rem)] sm:max-h-[860px] sm:max-w-[390px] sm:rounded-[34px] sm:border sm:border-[#DED9CF]">
        <div className="h-full overflow-y-auto px-4 pb-28 pt-8 [scrollbar-width:none]">
          <header className="relative">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E1D1A]" style={{ fontFamily: font.rajdhani }}>
                DOS
              </p>
              <h1 className="mt-1 max-w-[250px] text-4xl font-bold leading-[0.92] tracking-[-0.02em] text-[#111111]" style={{ fontFamily: font.oswald }}>
                Discipleship on the go.
              </h1>
              <p className="mt-3 max-w-[260px] text-sm leading-5 text-[#77716A]">
                Do the work of an Evangelist. One table at a time.
              </p>
            </div>
            <span className="absolute right-0 top-0 rounded-full border border-[#D9D4CA] bg-[#F8F7F3] px-4 py-1.5 text-xs font-medium text-[#1E1D1A]">
              Field
            </span>
          </header>

          <main className="mt-7">
            {activeTab === "home" ? (
              <div className="space-y-5">
              <section className="rounded-[22px] border border-[#DDD9D0] bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
                      Your Field
                    </p>
                    <h2 className="mt-1 text-base font-bold leading-tight text-[#1E1D1A]">{workspaceLabel}</h2>
                  </div>
                  <p className="text-xs text-[#77716A]">{data.stats.peopleCount} people</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StatTile label="People" value={data.stats.peopleCount} />
                  <StatTile label="Relating" value={relatingCount} />
                  <StatTile label="Multiply" value={multiplyingCount} />
                </div>
              </section>

              <section className="space-y-3">
                <AppButton icon="add" onClick={() => openForm("person")} tone="black">Add Person</AppButton>
                <div className="grid grid-cols-3 gap-2">
                  <AppButton icon="log" onClick={() => openForm("meeting")}>Log</AppButton>
                  <AppButton icon="search" onClick={() => setActiveTab("people")}>Search</AppButton>
                  <AppButton icon="calendar" onClick={() => openForm("meeting")}>Meet</AppButton>
                </div>
              </section>

              <section>
                <SectionHeading title="Today" />
                <div className="grid gap-3">
                  <TaskCard
                    action={<button className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-white" onClick={() => setActiveTab("people")} type="button">Start</button>}
                    title="Pray for 3 people"
                  >
                    Daily rhythm · 2 min
                  </TaskCard>
                  <TaskCard
                    action={(
                      <button className="flex items-center gap-2 rounded-full bg-[#F4E3C8] px-3 py-2 text-xs font-bold text-[#8A5A12]" onClick={() => setActiveTab("people")} type="button">
                        {attentionPeople.length}
                        <Icon name="arrow" size={13} />
                      </button>
                    )}
                    title="Needs attention"
                  >
                    No contact in 10+ days
                  </TaskCard>
                </div>
              </section>

              {latestMeeting || latestFruit ? (
                <section>
                  <SectionHeading title="Latest" />
                  <div className="grid gap-3">
                    {latestMeeting ? (
                      <TaskCard
                        action={<button className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-white" onClick={() => setActiveTab("meetings")} type="button">View</button>}
                        icon="log"
                        title="Latest meeting"
                      >
                        {meetingActivityTitle(latestMeeting)} · {meetingPeople(latestMeeting, data.people)} · {formatRelativeDate(latestMeeting.date)}
                      </TaskCard>
                    ) : null}
                    {latestFruit ? (
                      <TaskCard
                        action={<button className="rounded-full border border-[#DDD9D0] bg-white px-4 py-2 text-xs font-bold text-[#1E1D1A]" onClick={() => setActiveTab("fruit")} type="button">View</button>}
                        icon="fruit"
                        title="Latest fruit"
                      >
                        {latestFruit.summary || "Fruit recorded"} · {formatDate(latestFruit.testimonyDate)}
                      </TaskCard>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section>
                <SectionHeading
                  action={<button className="text-xs text-[#77716A]" onClick={() => setActiveTab("people")} type="button">View all</button>}
                  title="Recent"
                />
                {recentPeople.length ? (
                  <div className="overflow-hidden rounded-[20px] border border-[#E2DED6] bg-white">
                    {recentPeople.map((person, index) => (
                      <div className="border-b border-[#ECE8E0] last:border-b-0" key={person.id}>
                        <PersonCard index={index} person={person} variant="row" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Add someone to begin seeing recent field activity here." title="No recent people yet." />
                )}
              </section>
              </div>
            ) : null}

            {activeTab === "people" ? (
              <div>
              <SectionHeading action={<CompactButton icon="add" onClick={() => openForm("person")}>Add</CompactButton>} title="People" />
              <SearchField label="Find Person" onChange={setPeopleQuery} placeholder="Search by name, phone, or relationship" value={peopleQuery} />
              <div className="mt-4">
                {visiblePeople.length ? (
                  <div className="grid gap-3">{visiblePeople.map((person, index) => <PersonCard index={index} key={person.id} person={person} />)}</div>
                ) : data.people.length ? (
                  <EmptyState text="Try a different name or relationship." title="No matching people." />
                ) : (
                  <EmptyState action={<CompactButton icon="add" onClick={() => openForm("person")}>Add Person</CompactButton>} text="Start by adding someone you are walking with." title="No people added yet." />
                )}
                </div>
              </div>
            ) : null}

            {activeTab === "meetings" ? (
              <div>
              <SectionHeading action={<CompactButton icon="log" onClick={() => openForm("meeting")}>Log</CompactButton>} title="Meetings" />
              {data.meetings.length ? (
                <div className="grid gap-3">{data.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} people={data.people} />)}</div>
              ) : (
                <EmptyState action={<CompactButton icon="log" onClick={() => openForm("meeting")}>Log Meeting</CompactButton>} text="Capture the next conversation, table, call, or prayer moment." title="No meetings logged yet." />
              )}
              </div>
            ) : null}

            {activeTab === "fruit" ? (
              <div>
              <SectionHeading action={<CompactButton icon="fruit" onClick={() => openForm("fruit")}>Record</CompactButton>} title="Fruit" />
              {data.fruit.length ? (
                <div className="grid gap-3">{data.fruit.map((fruit) => <FruitCard fruit={fruit} key={fruit.id} people={data.people} />)}</div>
              ) : (
                <EmptyState action={<CompactButton icon="fruit" onClick={() => openForm("fruit")}>Record Fruit</CompactButton>} text="Record what changed when you see spiritual movement." title="No fruit recorded yet." />
              )}
              </div>
            ) : null}

            {activeTab === "more" ? (
              <div>
              <SectionHeading title="More" />
              <div className="grid gap-3">
                {futureTools.map((tool) => (
                  <div className="flex min-h-14 items-center justify-between rounded-2xl border border-[#E2DED6] bg-white px-4" key={tool}>
                    <span className="text-sm font-medium text-[#1E1D1A]">{tool}</span>
                    <span className="rounded-full bg-[#F1F0EC] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
                      Soon
                    </span>
                  </div>
                ))}
              </div>
              <Link
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#DDD9D0] bg-white px-4 text-sm font-bold text-[#1E1D1A]"
                href={data.workspace.publicProfileHref}
              >
                View Public Profile
              </Link>
              </div>
            ) : null}
          </main>
        </div>

        <nav className="absolute inset-x-0 bottom-0 z-50 border-t border-[#E2DED6] bg-[#F8F7F3]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {tabs.map((tab) => (
            <button
              aria-current={activeTab === tab.value ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${
                activeTab === tab.value ? "text-[#111111]" : "text-[#8E8880]"
              }`}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              <Icon name={tab.icon} size={18} />
              {tab.label}
            </button>
          ))}
          </div>
        </nav>
      </div>

      {formMode === "person" ? (
        <Sheet description="Add someone to your field. Keep the first pass fast." onClose={closeForm} title="Add Person">
          <form className="space-y-4" onSubmit={handlePersonSubmit}>
            <label className="block">
              <FieldLabel>Name</FieldLabel>
              <input className={FieldInputClass()} name="name" required />
            </label>
            <label className="block">
              <FieldLabel>Phone</FieldLabel>
              <input className={FieldInputClass()} name="phone" required />
            </label>
            <label className="block">
              <FieldLabel>Relationship Type</FieldLabel>
              <select className={FieldInputClass()} name="relationship_type">
                <option value="">Not set</option>
                {relationshipTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Add Person"}</AppButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "meeting" ? (
        <Sheet description="Log what happened. Meeting notes stay private to this field." onClose={closeForm} title="Log Meeting">
          <form className="space-y-4" onSubmit={handleMeetingSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Type</FieldLabel>
                <select className={FieldInputClass()} name="table_type" defaultValue="kitchen_table">
                  {meetingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Date</FieldLabel>
                <input className={FieldInputClass()} defaultValue={todayDateValue()} name="table_date" type="date" />
              </label>
            </div>
            <div>
              <SearchField label="People Involved" onChange={setMeetingPeopleQuery} placeholder="Search people in your field" value={meetingPeopleQuery} />
              {data.people.length ? (
                <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">
                  {meetingPeopleOptions.map((person, index) => (
                    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#E2DED6] bg-white px-3 text-sm text-[#1E1D1A]" key={person.id}>
                      <input className="accent-black" name="field_person_ids" type="checkbox" value={person.id} />
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarTone(index)}`}>
                        {initials(person.name)}
                      </span>
                      <span>
                        <span className="block font-medium">{person.name}</span>
                        <span className="block text-xs text-[#8E8880]">{relationshipLine(person)}</span>
                      </span>
                    </label>
                  ))}
                  {!meetingPeopleOptions.length ? <p className="rounded-2xl border border-dashed border-[#DDD9D0] p-3 text-sm text-[#77716A]">No matching people.</p> : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#77716A]">No people added yet.</p>
              )}
            </div>
            <label className="block">
              <FieldLabel>What happened?</FieldLabel>
              <textarea className={`${FieldInputClass()} min-h-24 py-3`} name="notes" placeholder="Briefly capture the conversation." />
            </label>
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Log Meeting"}</AppButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "fruit" ? (
        <Sheet description="Record what changed. This starts private for review." onClose={closeForm} title="Record Fruit">
          <form className="space-y-4" onSubmit={handleFruitSubmit}>
            <label className="block">
              <FieldLabel>Summary</FieldLabel>
              <textarea className={`${FieldInputClass()} min-h-24 py-3`} name="summary" placeholder="Short private summary of the fruit." required />
            </label>
            <label className="block">
              <FieldLabel>Date</FieldLabel>
              <input className={FieldInputClass()} defaultValue={todayDateValue()} name="testimony_date" type="date" />
            </label>
            <label className="block">
              <FieldLabel>Linked Person</FieldLabel>
              <select className={FieldInputClass()} name="field_person_id">
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
                      className={`min-h-11 rounded-2xl border px-3 text-left text-xs font-semibold ${
                        selected ? "border-[#111111] bg-[#111111] text-white" : "border-[#DDD9D0] bg-white text-[#1E1D1A]"
                      }`}
                      key={tag}
                      onClick={() => toggleOutcomeTag(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Record Fruit"}</AppButton>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
