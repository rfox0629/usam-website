"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, Cake, CalendarDays, ChevronRight, Church, Mail, MapPin, MessageCircle, MoreHorizontal, Pencil, Phone, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  buildMeetingRecommendations,
  dosKitchenTableQuestions,
  relationshipWithJesusTemperature,
  type DosConversationFlowKey,
  type DosKitchenTableAnswer,
  type DosKitchenTableQuestionId,
  type DosRecommendedResource,
  type DosKitchenTableResponses,
} from "@/src/lib/dos/meeting-engine";
import { formatDosMeetingSecondary, formatDosParticipantList, formatDosParticipantTitle, resolveDosMeetingParticipantNames } from "@/src/lib/dos/meeting-display";
import type { DosAppData, DosAppFruit, DosAppMeeting, DosAppMeetingType, DosAppPerson } from "@/src/lib/dos/missionary-app";
import { dosGuideResources } from "@/src/lib/dos/guide-resources";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const tabs = [
  { icon: "home", label: "Home", value: "home" },
  { icon: "people", label: "People", value: "people" },
  { icon: "meetings", label: "Meetings", value: "meetings" },
  { icon: "fruit", label: "Fruit", value: "fruit" },
  { icon: "more", label: "More", value: "more" },
] as const;

const meetingTypeOptions: ReadonlyArray<{ helper: string; label: string; value: DosAppMeetingType }> = [
  { helper: "Around the table", label: "Kitchen Table", value: "kitchen_table" },
  { helper: "Coffee or meal", label: "Coffee", value: "coffee" },
  { helper: "Voice call", label: "Phone", value: "phone" },
  { helper: "Video call", label: "Zoom", value: "zoom" },
  { helper: "Message thread", label: "Text", value: "text" },
  { helper: "Prayer moment", label: "Prayer", value: "prayer" },
  { helper: "Several people", label: "Group", value: "group" },
  { helper: "Training rhythm", label: "Discipleship", value: "discipleship" },
  { helper: "Something else", label: "Other", value: "other" },
];

const conversationFlowOptions: ReadonlyArray<{ helper?: string; label: string; value: DosConversationFlowKey }> = [
  { label: "None", value: "none" },
  { helper: "USAM only", label: "Kitchen Table Gospel", value: "kitchen_table_gospel" },
];

const kitchenTableAnswerOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] as const satisfies ReadonlyArray<{ label: string; value: DosKitchenTableAnswer }>;

const kitchenTableUnsureAnswerOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Unsure", value: "unsure" },
] as const satisfies ReadonlyArray<{ label: string; value: DosKitchenTableAnswer }>;

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

const relationshipTypeOptions = [
  { helper: "Just met / early contact", label: "New", value: "New" },
  { helper: "Building relationship", label: "Walking With", value: "Walking With" },
  { helper: "Regular discipleship", label: "Discipling", value: "Discipling" },
  { helper: "Pouring into leaders", label: "Mentor", value: "Mentor" },
] as const;
const defaultRelationshipType = relationshipTypeOptions[0].value;
const futureTools = ["Prayer Alerts", "Connection Logs", "Discussion Guides", "Follow Up"];

type ActiveTab = typeof tabs[number]["value"];
type ButtonTone = "black" | "soft" | "white";
type FormMode = "editMeeting" | "editPerson" | "fruit" | "meeting" | "person" | null;
type IconName = typeof tabs[number]["icon"] | "add" | "arrow" | "bell" | "calendar" | "log" | "search";
type RelationshipTypeValue = typeof relationshipTypeOptions[number]["value"];
type KitchenTableNonRatingQuestionId = Exclude<DosKitchenTableQuestionId, "relationshipWithJesus">;
type PersonFormDefaults = {
  birthday?: string;
  church?: string;
  city?: string;
  email?: string;
  homeAddress?: string;
  name?: string;
  notes?: string;
  occupation?: string;
  phone?: string;
  state?: string;
  zip?: string;
};

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

function conversationFlowLabel(value: DosConversationFlowKey) {
  return conversationFlowOptions.find((option) => option.value === value)?.label ?? "None";
}

function answerLabel(value: DosKitchenTableAnswer | undefined) {
  if (!value) {
    return "Skipped";
  }

  return value === "unsure" ? "Unsure" : value.charAt(0).toUpperCase() + value.slice(1);
}

function meetingMetadataLine(meeting: DosAppMeeting) {
  return formatDosMeetingSecondary(meetingActivityTitle(meeting), formatDate(meeting.date));
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function toRelationshipTypeValue(value: string | null | undefined): RelationshipTypeValue {
  const normalized = normalizeText(value).toLowerCase();
  const exactValue = relationshipTypeOptions.find((option) => option.value.toLowerCase() === normalized)?.value;

  if (exactValue) {
    return exactValue;
  }

  if (normalized.includes("mentor")) {
    return "Mentor";
  }

  if (normalized.includes("disciple")) {
    return "Discipling";
  }

  if (normalized && !normalized.includes("new")) {
    return "Walking With";
  }

  return defaultRelationshipType;
}

function splitAdditionalInfo(notes: string | null | undefined) {
  const rawNotes = normalizeText(notes);
  const marker = "\n\nAdditional information:\n";

  if (!rawNotes.includes(marker)) {
    return { additional: "", notes: rawNotes };
  }

  const [baseNotes, additional = ""] = rawNotes.split(marker);

  return {
    additional,
    notes: baseNotes.trim(),
  };
}

function parseAddress(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const stateZip = parts[2] ?? "";
  const stateZipMatch = stateZip.match(/^([A-Za-z]{2})\s+(.+)$/);

  return {
    city: parts[1] ?? "",
    homeAddress: parts[0] ?? value,
    state: stateZipMatch?.[1] ?? "",
    zip: stateZipMatch?.[2] ?? "",
  };
}

function personFormDefaults(person?: DosAppPerson | null): PersonFormDefaults {
  if (!person) {
    return {};
  }

  const { additional, notes } = splitAdditionalInfo(person.notes);
  const defaults: PersonFormDefaults = {
    church: person.church ?? "",
    email: person.email ?? "",
    name: person.name,
    notes,
    phone: person.phone,
  };

  additional.split("\n").forEach((line) => {
    const [label = "", ...rest] = line.split(":");
    const value = rest.join(":").trim();

    if (!value) {
      return;
    }

    if (label === "Home address") {
      Object.assign(defaults, parseAddress(value));
    }

    if (label === "Occupation") {
      defaults.occupation = value;
    }

    if (label === "Birthday") {
      defaults.birthday = value;
    }
  });

  return defaults;
}

function personAddressLine(defaults: PersonFormDefaults) {
  const cityStateZip = [defaults.city, [defaults.state, defaults.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return [defaults.homeAddress, cityStateZip].filter(Boolean).join(", ");
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

function meetingParticipantNames(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return resolveDosMeetingParticipantNames({
    fieldPersonIds: meeting.fieldPersonIds,
    participantNames: meeting.participantNames,
    people,
  });
}

function meetingPeople(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return formatDosParticipantList(meetingParticipantNames(meeting, people));
}

function meetingPeopleTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return formatDosParticipantTitle(meetingParticipantNames(meeting, people));
}

function meetingAvatarNames(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meetingParticipantNames(meeting, people).slice(0, 3);
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

function FieldTextareaClass() {
  return "mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#DDD9D0] bg-[#F8F7F3] px-4 py-3 text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]";
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
  description?: string;
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
              {description ? <p className="mt-3 text-sm leading-6 text-[#77716A]">{description}</p> : null}
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
  onClick,
  person,
  variant = "card",
}: {
  index: number;
  onClick?: () => void;
  person: DosAppPerson;
  variant?: "card" | "row";
}) {
  const isRow = variant === "row";
  const content = (
    <>
      <div className={`flex ${isRow ? "h-9 w-9" : "h-10 w-10"} shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(index)}`}>
        {initials(person.name)}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-[#1E1D1A]">{person.name}</p>
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone(person.status)}`} />
        </div>
        <p className="mt-1 truncate text-xs text-[#77716A]">
          {isRow ? recentActivityLine(person) : `${statusLabel(person.status)} · ${lastActivityLine(person).replace("Last interaction · ", "")}`}
        </p>
      </div>
      {onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-[#A9A29A]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className={`flex w-full items-center gap-3 bg-white transition-colors hover:bg-[#FFFDF8] ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2DED6] px-4 py-3"}`}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className={`flex items-center gap-3 bg-white ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2DED6] px-4 py-3"}`}>{content}</article>;
}

function MeetingCard({
  meeting,
  onClick,
  people,
}: {
  meeting: DosAppMeeting;
  onClick: () => void;
  people: DosAppPerson[];
}) {
  const hasFlow = meeting.conversationFlowKey !== "none";
  const avatarNames = meetingAvatarNames(meeting, people);
  const title = meetingPeopleTitle(meeting, people);

  return (
    <button className="w-full rounded-2xl border border-[#E2DED6] bg-white p-4 text-left transition-colors hover:border-[#D8C8A7] hover:bg-[#FFFDF8]" onClick={onClick} type="button">
      <div className="flex items-start gap-3">
        {avatarNames.length ? (
          <div className="mt-0.5 flex shrink-0 -space-x-2">
            {avatarNames.map((name, index) => (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${avatarTone(index)}`}
                key={`${meeting.id}-${name}`}
              >
                {initials(name)}
              </span>
            ))}
          </div>
        ) : (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D79C37]" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1E1D1A]">{title}</p>
              <p className="mt-1 truncate text-xs text-[#77716A]">
                {meetingMetadataLine(meeting)}
              </p>
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#A9A29A]" aria-hidden="true" strokeWidth={1.8} />
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#3B3935]">{meeting.notes || "No summary added yet."}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hasFlow ? (
              <span className="rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
                {conversationFlowLabel(meeting.conversationFlowKey)}
              </span>
            ) : null}
            {meeting.recommendedResources.length ? (
              <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
                {meeting.recommendedResources.length} queued
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function CompactOptionSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ helper?: string; label: string; value: string }>;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <FieldLabel>{label}</FieldLabel>
      <button
        aria-expanded={isOpen}
        className={`mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-sm transition-colors ${
          isOpen ? "border-[#D4A63D] shadow-[0_10px_24px_rgba(212,166,61,0.12)]" : "border-[#DDD9D0] hover:border-[#D8C8A7]"
        }`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate font-semibold text-[#1E1D1A]">{selectedOption?.label ?? "Select"}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#8E8880] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-2xl border border-[#E2DED6] bg-white p-1.5 shadow-[0_18px_45px_rgba(42,37,29,0.14)]">
          {options.map((option) => {
            const selected = option.value === selectedOption?.value;

            return (
              <button
                aria-pressed={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
                  selected ? "bg-[#FFF8E7] text-[#8A5A12]" : "text-[#1E1D1A] hover:bg-[#F8F7F3]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
                {option.helper ? <span className="shrink-0 text-[11px] font-medium text-[#8E8880]">{option.helper}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MeetingContextPicker({
  onChange,
  value,
}: {
  onChange: (value: DosAppMeetingType) => void;
  value: DosAppMeetingType;
}) {
  return (
    <CompactOptionSelect
      label="Meeting Context"
      onChange={(nextValue) => onChange(nextValue as DosAppMeetingType)}
      options={meetingTypeOptions.map((option) => ({ label: option.label, value: option.value }))}
      value={value}
    />
  );
}

function ConversationFlowPicker({
  allowKitchenTableGospel,
  onChange,
  value,
}: {
  allowKitchenTableGospel: boolean;
  onChange: (value: DosConversationFlowKey) => void;
  value: DosConversationFlowKey;
}) {
  const options = allowKitchenTableGospel
    ? conversationFlowOptions
    : conversationFlowOptions.filter((option) => option.value === "none");

  return (
    <CompactOptionSelect
      label="Conversation Flow"
      onChange={(nextValue) => onChange(nextValue as DosConversationFlowKey)}
      options={options}
      value={(options.find((option) => option.value === value) ?? options[0])?.value ?? "none"}
    />
  );
}

function KitchenTableGospelFlow({
  onAnswer,
  onRating,
  responses,
}: {
  onAnswer: (questionId: KitchenTableNonRatingQuestionId, answer: DosKitchenTableAnswer) => void;
  onRating: (rating: number) => void;
  responses: DosKitchenTableResponses;
}) {
  const temperature = relationshipWithJesusTemperature(responses.relationshipWithJesus);

  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-[#1E1D1A]">Guided Questions</p>
        {temperature ? (
          <span className="rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
            {temperature}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        {dosKitchenTableQuestions.map((question) => {
          if (question.kind === "rating") {
            return (
              <div className="rounded-2xl bg-[#F8F7F3] p-2.5" key={question.id}>
                <p className="text-sm font-semibold text-[#1E1D1A]">{question.label}</p>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => {
                    const selected = responses.relationshipWithJesus === rating;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`min-h-8 rounded-xl border text-xs font-bold ${
                          selected ? "border-[#D4A63D] bg-[#D4A63D] text-white" : "border-[#E2DED6] bg-white text-[#1E1D1A]"
                        }`}
                        key={rating}
                        onClick={() => onRating(rating)}
                        type="button"
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-[#77716A]">1-3 Cold · 4-7 Lukewarm · 8-10 Hot</p>
              </div>
            );
          }

          const questionId = question.id as KitchenTableNonRatingQuestionId;
          const answer = responses[questionId];
          const options = question.kind === "yes_no_unsure" ? kitchenTableUnsureAnswerOptions : kitchenTableAnswerOptions;

          return (
            <div className="rounded-2xl bg-[#F8F7F3] p-2.5" key={question.id}>
              <p className="text-sm font-semibold leading-5 text-[#1E1D1A]">{question.label}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {options.map((option) => {
                  const selected = answer === option.value;

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-8 rounded-xl border text-xs font-bold ${
                        selected ? "border-[#D4A63D] bg-[#FFF8E7] text-[#8A5A12]" : "border-[#E2DED6] bg-white text-[#1E1D1A]"
                      }`}
                      key={option.value}
                      onClick={() => onAnswer(questionId, option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MeetingPeopleSelector({
  allPeople,
  onQueryChange,
  onToggle,
  people,
  query,
  selectedPersonIds,
}: {
  allPeople: DosAppPerson[];
  onQueryChange: (value: string) => void;
  onToggle: (personId: string) => void;
  people: DosAppPerson[];
  query: string;
  selectedPersonIds: string[];
}) {
  const selectedPeople = selectedPersonIds
    .map((personId) => allPeople.find((person) => person.id === personId))
    .filter((person): person is DosAppPerson => Boolean(person));
  const visiblePeople = people.filter((person) => !selectedPersonIds.includes(person.id));

  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-3">
      <FieldLabel>People Involved</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedPeople.length ? selectedPeople.map((person, index) => (
          <button
            className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-[#D7C7A4] bg-[#FFF8E7] py-1 pl-1 pr-3 text-xs font-semibold text-[#1E1D1A]"
            key={person.id}
            onClick={() => onToggle(person.id)}
            type="button"
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarTone(index)}`}>
              {initials(person.name)}
            </span>
            <span className="truncate">{person.name}</span>
          </button>
        )) : (
          <span className="rounded-full bg-[#F8F7F3] px-3 py-1.5 text-xs text-[#77716A]">No people selected</span>
        )}
      </div>

      <div className="relative mt-2.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8880]">
          <Icon name="search" size={14} />
        </span>
        <input
          className="min-h-11 w-full rounded-full border border-[#DDD9D0] bg-[#F8F7F3] pl-9 pr-4 text-sm text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search people in your field"
          type="search"
          value={query}
        />
      </div>

      {allPeople.length ? (
        <div className="mt-2 grid max-h-36 gap-1 overflow-y-auto pr-1">
          {visiblePeople.map((person, index) => (
            <button
              className="flex min-h-9 items-center gap-2.5 rounded-2xl px-2.5 text-left text-sm text-[#1E1D1A] transition-colors hover:bg-[#F8F7F3]"
              key={person.id}
              onClick={() => onToggle(person.id)}
              type="button"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatarTone(index)}`}>
                {initials(person.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{person.name}</span>
              <span className="h-2 w-2 rounded-full bg-[#D79C37]" aria-hidden="true" />
            </button>
          ))}
          {!visiblePeople.length ? <p className="rounded-2xl border border-dashed border-[#DDD9D0] p-3 text-sm text-[#77716A]">No more matching people.</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#77716A]">No people added yet.</p>
      )}
    </section>
  );
}

function MeetingRecommendationsPreview({
  resources,
}: {
  resources: DosRecommendedResource[];
}) {
  if (!resources.length) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Recommended Resources</FieldLabel>
        <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
          Queued
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {resources.map((resource) => (
          <span className="rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-3 py-1.5 text-xs font-semibold text-[#1E1D1A]" key={resource.id}>
            {resource.title}
          </span>
        ))}
      </div>
    </section>
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

function RelationshipTypePicker({
  onChange,
  value,
}: {
  onChange: (value: RelationshipTypeValue) => void;
  value: RelationshipTypeValue;
}) {
  return (
    <fieldset>
      <FieldLabel>Relationship Type</FieldLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {relationshipTypeOptions.map((option) => {
          const selected = value === option.value;

          return (
            <label
              className={`relative flex min-h-[70px] cursor-pointer flex-col justify-between rounded-2xl border p-3 transition-colors ${
                selected
                  ? "border-[#D4A63D] bg-[#FFF8E7] shadow-[0_10px_24px_rgba(212,166,61,0.12)]"
                  : "border-[#E2DED6] bg-white hover:border-[#D8C8A7]"
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                name="relationship_type"
                onChange={() => onChange(option.value)}
                required
                type="radio"
                value={option.value}
              />
              <span className="pr-5 text-sm font-bold leading-tight text-[#1E1D1A]">{option.label}</span>
              <span className="mt-1 text-[11px] leading-4 text-[#77716A]">{option.helper}</span>
              <span
                className={`absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border ${
                  selected ? "border-[#D4A63D] bg-[#D4A63D]" : "border-[#DDD9D0] bg-[#F8F7F3]"
                }`}
                aria-hidden="true"
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AdditionalPersonInformation({
  defaults = {},
  isOpen,
  onToggle,
}: {
  defaults?: PersonFormDefaults;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-4">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <span>
          <span className="block text-sm font-bold text-[#1E1D1A]">Additional Information</span>
          <span className="mt-1 block text-xs leading-5 text-[#77716A]">Add details now or fill them in later.</span>
        </span>
        <span className={`text-lg leading-none text-[#8E8880] transition-transform ${isOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>

      {isOpen ? (
        <div className="mt-4 grid gap-3 border-t border-[#EEEAE2] pt-4">
          <label className="block">
            <FieldLabel>Email</FieldLabel>
            <input className={FieldInputClass()} defaultValue={defaults.email} name="email" placeholder="email@example.com" type="email" />
          </label>
          <label className="block">
            <FieldLabel>Home Address</FieldLabel>
            <input className={FieldInputClass()} defaultValue={defaults.homeAddress} name="home_address" placeholder="Street address" />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_72px_86px] gap-2">
            <label className="block min-w-0">
              <FieldLabel>City</FieldLabel>
              <input className={FieldInputClass()} defaultValue={defaults.city} name="city" placeholder="City" />
            </label>
            <label className="block min-w-0">
              <FieldLabel>State</FieldLabel>
              <input className={FieldInputClass()} defaultValue={defaults.state} maxLength={2} name="state" placeholder="ST" />
            </label>
            <label className="block min-w-0">
              <FieldLabel>ZIP</FieldLabel>
              <input className={FieldInputClass()} defaultValue={defaults.zip} inputMode="numeric" name="zip" placeholder="ZIP" />
            </label>
          </div>
          <label className="block">
            <FieldLabel>Church</FieldLabel>
            <input className={FieldInputClass()} defaultValue={defaults.church} name="church" placeholder="Church / community" />
          </label>
          <label className="block">
            <FieldLabel>Occupation</FieldLabel>
            <input className={FieldInputClass()} defaultValue={defaults.occupation} name="occupation" placeholder="What do they do?" />
          </label>
          <label className="block">
            <FieldLabel>Birthday</FieldLabel>
            <input className={FieldInputClass()} defaultValue={defaults.birthday} name="birthday" type="date" />
          </label>
          <label className="block">
            <FieldLabel>Notes</FieldLabel>
            <textarea className={FieldTextareaClass()} defaultValue={defaults.notes} name="notes" placeholder="Private notes..." />
          </label>
        </div>
      ) : null}
    </section>
  );
}

function DetailCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </p>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function DetailRow({
  action,
  icon,
  label,
  value,
}: {
  action?: ReactNode;
  icon?: ReactNode;
  label?: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#1E1D1A]">
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F7F3] text-[#8A5A12]">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {label ? <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>{label}</p> : null}
        <div className="mt-0.5 break-words leading-5 text-[#1E1D1A]">{value}</div>
      </div>
      {action}
    </div>
  );
}

function PersonQuickAction({
  children,
  href,
  icon,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  const className = "flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-[#E2DED6] bg-white px-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#1E1D1A] transition-colors hover:border-[#D4A63D] hover:bg-[#FFF8E7]";

  if (href) {
    return (
      <a className={className} href={href} style={{ fontFamily: font.rajdhani }}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button className={className} onClick={onClick} style={{ fontFamily: font.rajdhani }} type="button">
      {icon}
      {children}
    </button>
  );
}

function PersonDetailOverlay({
  fruit,
  index,
  meetings,
  onBack,
  onEdit,
  onOpenMeeting,
  onLogMeeting,
  person,
}: {
  fruit: DosAppFruit[];
  index: number;
  meetings: DosAppMeeting[];
  onBack: () => void;
  onEdit: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onLogMeeting: () => void;
  person: DosAppPerson;
}) {
  const defaults = personFormDefaults(person);
  const address = personAddressLine(defaults);
  const personMeetings = meetings.filter((meeting) => meeting.fieldPersonIds.includes(person.id));
  const personFruit = fruit.filter((item) => item.fieldPersonId === person.id);
  const recentMeetings = personMeetings.slice(0, 3);
  const notesCount = defaults.notes ? 1 : 0;

  return (
    <div className="absolute inset-0 z-[70] overflow-y-auto bg-[#F5F3EE] px-4 pb-24 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDD9D0] bg-white text-[#1E1D1A]" onClick={onBack} type="button" aria-label="Back to people">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          Person
        </p>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD9D0] bg-white px-4 py-2 text-xs font-bold text-[#1E1D1A]" onClick={onEdit} type="button">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
          Edit
        </button>
      </header>

      <section className="mt-5 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-base font-bold ${avatarTone(index)}`}>
          {initials(person.name)}
        </div>
        <h2 className="mt-3 text-3xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          {person.name}
        </h2>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-3 py-1.5 text-xs font-semibold text-[#8A5A12]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4A63D]" aria-hidden="true" />
          {person.relationshipType || "New"}
        </span>
      </section>

      <section className="mt-5 grid grid-cols-4 gap-2">
        <PersonQuickAction icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} href={person.phone ? `tel:${person.phone}` : undefined} onClick={person.phone ? undefined : onEdit}>
          Call
        </PersonQuickAction>
        <PersonQuickAction icon={<MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} href={person.phone ? `sms:${person.phone}` : undefined} onClick={person.phone ? undefined : onEdit}>
          Text
        </PersonQuickAction>
        <PersonQuickAction icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={onEdit}>
          Note
        </PersonQuickAction>
        <PersonQuickAction icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={onEdit}>
          More
        </PersonQuickAction>
      </section>

      <div className="mt-5">
        <AppButton icon="log" onClick={onLogMeeting} tone="black">Log Meeting</AppButton>
      </div>

      <div className="mt-5 grid gap-3">
        <DetailCard title="Contact Information">
          <DetailRow
            action={person.phone ? <a className="text-[#8A5A12]" href={`sms:${person.phone}`} aria-label={`Text ${person.name}`}><MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} /></a> : null}
            icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
            value={person.phone}
          />
          {person.email ? (
            <DetailRow
              action={<a className="text-[#8A5A12]" href={`mailto:${person.email}`} aria-label={`Email ${person.name}`}><Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} /></a>}
              icon={<Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
              value={person.email}
            />
          ) : null}
          {address ? <DetailRow icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} value={address} /> : null}
        </DetailCard>

        <DetailCard title="About">
          {person.church ? <DetailRow icon={<Church className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Church" value={person.church} /> : null}
          {defaults.occupation ? <DetailRow icon={<Briefcase className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Occupation" value={defaults.occupation} /> : null}
          {defaults.birthday ? <DetailRow icon={<Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Birthday" value={formatDate(defaults.birthday)} /> : null}
          {defaults.notes ? <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Notes" value={defaults.notes} /> : null}
          {!person.church && !defaults.occupation && !defaults.birthday && !defaults.notes ? <p className="text-sm text-[#77716A]">No details yet.</p> : null}
        </DetailCard>

        <DetailCard title="Activity">
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Meetings" value={personMeetings.length} />
            <StatTile label="Fruit" value={personFruit.length} />
            <StatTile label="Notes" value={notesCount} />
          </div>
          <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Last activity" value={formatRelativeDate(person.lastActivityAt)} />
        </DetailCard>

        <DetailCard title="History">
          {recentMeetings.length ? recentMeetings.map((meeting) => (
            <button className="flex items-center gap-3 rounded-2xl bg-[#F8F7F3] p-3 text-left" key={meeting.id} type="button" onClick={() => onOpenMeeting(meeting.id)}>
              <CalendarDays className="h-4 w-4 shrink-0 text-[#8A5A12]" aria-hidden="true" strokeWidth={1.8} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1E1D1A]">{meetingActivityTitle(meeting)}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#77716A]">{meeting.notes || formatDate(meeting.date)}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#A9A29A]" aria-hidden="true" strokeWidth={1.8} />
            </button>
          )) : <p className="text-sm text-[#77716A]">No meetings yet.</p>}
        </DetailCard>
      </div>
    </div>
  );
}

function MeetingDetailOverlay({
  meeting,
  onBack,
  onEdit,
  onLogMeeting,
  people,
}: {
  meeting: DosAppMeeting;
  onBack: () => void;
  onEdit: () => void;
  onLogMeeting: () => void;
  people: DosAppPerson[];
}) {
  const isTableMeeting = meeting.source === "table";
  const temperature = relationshipWithJesusTemperature(meeting.conversationResponses.relationshipWithJesus);
  const hasKitchenTableFlow = meeting.conversationFlowKey === "kitchen_table_gospel";
  const avatarNames = meetingAvatarNames(meeting, people);
  const title = meetingPeopleTitle(meeting, people);

  return (
    <div className="absolute inset-0 z-[70] overflow-y-auto bg-[#F5F3EE] px-4 pb-24 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDD9D0] bg-white text-[#1E1D1A]" onClick={onBack} type="button" aria-label="Back to meetings">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          Meeting
        </p>
        {isTableMeeting ? (
          <button className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD9D0] bg-white px-4 py-2 text-xs font-bold text-[#1E1D1A]" onClick={onEdit} type="button">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
            Edit
          </button>
        ) : <span className="h-10 w-10" aria-hidden="true" />}
      </header>

      <section className="mt-5 text-center">
        {avatarNames.length ? (
          <div className="mx-auto flex justify-center -space-x-2">
            {avatarNames.map((name, index) => (
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#F5F3EE] text-sm font-bold ${avatarTone(index)}`}
                key={`${meeting.id}-detail-${name}`}
              >
                {initials(name)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8E7] text-[#8A5A12]">
            <CalendarDays className="h-6 w-6" aria-hidden="true" strokeWidth={1.6} />
          </div>
        )}
        <h2 className="mx-auto mt-3 max-w-[320px] text-3xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-5 text-[#77716A]">{meetingMetadataLine(meeting)}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-3 py-1.5 text-xs font-semibold text-[#8A5A12]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A63D]" aria-hidden="true" />
            {conversationFlowLabel(meeting.conversationFlowKey)}
          </span>
          {temperature ? (
            <span className="inline-flex items-center rounded-full bg-[#F1F0EC] px-3 py-1.5 text-xs font-semibold text-[#5F5952]">
              {temperature}
            </span>
          ) : null}
        </div>
      </section>

      <div className="mt-5">
        <AppButton icon="log" onClick={onLogMeeting} tone="black">Log Meeting</AppButton>
      </div>

      <div className="mt-5 grid gap-3">
        <DetailCard title="Summary">
          <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Notes" value={meeting.notes || "No summary added yet."} />
        </DetailCard>

        {hasKitchenTableFlow ? (
          <DetailCard title="Kitchen Table Gospel">
            {dosKitchenTableQuestions.map((question) => {
              const value = question.kind === "rating"
                ? meeting.conversationResponses.relationshipWithJesus
                : meeting.conversationResponses[question.id as KitchenTableNonRatingQuestionId];
              const renderedValue = question.kind === "rating"
                ? value ? `${value} · ${relationshipWithJesusTemperature(value as number)}` : "Skipped"
                : answerLabel(value as DosKitchenTableAnswer | undefined);

              return (
                <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F8F7F3] p-3" key={question.id}>
                  <p className="text-sm leading-5 text-[#1E1D1A]">{question.label}</p>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#5F5952]">{renderedValue}</span>
                </div>
              );
            })}
          </DetailCard>
        ) : null}

        {meeting.recommendedResources.length ? (
          <DetailCard title="Recommended Resources">
            {/* TODO: Add SMS/email/share actions for queued resources after DOS messaging workflows exist. */}
            {meeting.recommendedResources.map((resource) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F7F3] p-3" key={resource.id}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1E1D1A]">{resource.title}</p>
                  {resource.reason ? <p className="mt-1 text-xs text-[#77716A]">{resource.reason}</p> : null}
                </div>
                <span className="shrink-0 rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
                  Queued
                </span>
              </div>
            ))}
          </DetailCard>
        ) : null}
      </div>
    </div>
  );
}

export function DosMvpAppClient({ data }: { data: DosAppData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [errorMessage, setErrorMessage] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [isAdditionalPersonInfoOpen, setIsAdditionalPersonInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kitchenTableResponses, setKitchenTableResponses] = useState<DosKitchenTableResponses>({});
  const [meetingPeopleQuery, setMeetingPeopleQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [selectedConversationFlow, setSelectedConversationFlow] = useState<DosConversationFlowKey>("none");
  const [selectedMeetingContext, setSelectedMeetingContext] = useState<DosAppMeetingType>("kitchen_table");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMeetingPersonIds, setSelectedMeetingPersonIds] = useState<string[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipTypeValue>(defaultRelationshipType);
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const latestMeeting = data.meetings[0];
  const latestFruit = data.fruit[0];
  const visiblePeople = useMemo(() => filteredPeople(data.people, peopleQuery), [data.people, peopleQuery]);
  const meetingPeopleOptions = useMemo(() => filteredPeople(data.people, meetingPeopleQuery), [data.people, meetingPeopleQuery]);
  const draftRecommendedResources = useMemo(() => (
    selectedConversationFlow === "kitchen_table_gospel"
      ? buildMeetingRecommendations(selectedConversationFlow, kitchenTableResponses)
      : []
  ), [kitchenTableResponses, selectedConversationFlow]);
  const selectedMeeting = useMemo(() => data.meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null, [data.meetings, selectedMeetingId]);
  const selectedPerson = useMemo(() => data.people.find((person) => person.id === selectedPersonId) ?? null, [data.people, selectedPersonId]);
  const attentionPeople = useMemo(() => data.people.filter(isNeedsAttention), [data.people]);
  const relatingCount = data.people.filter((person) => normalizeText(person.status).toLowerCase() !== "new").length;
  const multiplyingCount = Math.max(data.stats.approvedFruit, data.fruit.length);
  const recentPeople = data.people.slice(0, 3);
  const workspaceLabel = data.workspace.isUsamWorkspace ? `${data.workspace.displayName} · USA` : data.workspace.displayName;
  const selectedPersonDefaults = personFormDefaults(selectedPerson);

  function resetMeetingDraft(personIds: string[] = []) {
    setKitchenTableResponses({});
    setMeetingPeopleQuery("");
    setSelectedConversationFlow("none");
    setSelectedMeetingContext("kitchen_table");
    setSelectedMeetingPersonIds(personIds);
  }

  function closeForm() {
    setErrorMessage("");
    setFormMode(null);
    setIsAdditionalPersonInfoOpen(false);
    setSelectedRelationshipType(defaultRelationshipType);
    resetMeetingDraft();
  }

  function openForm(mode: Exclude<FormMode, null>) {
    setErrorMessage("");
    setFormMode(mode);
    setIsAdditionalPersonInfoOpen(false);
    if (mode === "meeting") {
      setSelectedMeetingId(null);
      resetMeetingDraft();
    }
    if (mode === "person") {
      setSelectedRelationshipType(defaultRelationshipType);
    }
  }

  function openPersonDetail(personId: string) {
    setErrorMessage("");
    setSelectedMeetingId(null);
    setSelectedPersonId(personId);
  }

  function openPersonEdit(person: DosAppPerson) {
    setErrorMessage("");
    setFormMode("editPerson");
    setIsAdditionalPersonInfoOpen(true);
    setSelectedRelationshipType(toRelationshipTypeValue(person.relationshipType));
  }

  function openMeetingForPerson(personId: string) {
    setSelectedPersonId(null);
    setSelectedMeetingId(null);
    setErrorMessage("");
    setFormMode("meeting");
    setIsAdditionalPersonInfoOpen(false);
    resetMeetingDraft([personId]);
  }

  function openMeetingDetail(meetingId: string) {
    setErrorMessage("");
    setSelectedPersonId(null);
    setSelectedMeetingId(meetingId);
  }

  function openMeetingEdit(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return;
    }

    setErrorMessage("");
    setFormMode("editMeeting");
    setIsAdditionalPersonInfoOpen(false);
    setKitchenTableResponses(meeting.conversationFlowKey === "kitchen_table_gospel" ? meeting.conversationResponses : {});
    setMeetingPeopleQuery("");
    setSelectedConversationFlow(data.workspace.isUsamWorkspace ? meeting.conversationFlowKey : "none");
    setSelectedMeetingContext(meeting.type);
    setSelectedMeetingId(meeting.id);
    setSelectedMeetingPersonIds(meeting.fieldPersonIds);
  }

  function personPayloadFromForm(formData: FormData, relationshipType: RelationshipTypeValue, id?: string) {
    return {
      birthday: String(formData.get("birthday") ?? ""),
      church: String(formData.get("church") ?? ""),
      city: String(formData.get("city") ?? ""),
      email: String(formData.get("email") ?? ""),
      homeAddress: String(formData.get("home_address") ?? ""),
      id,
      name: String(formData.get("name") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      occupation: String(formData.get("occupation") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      relationshipType,
      state: String(formData.get("state") ?? ""),
      zip: String(formData.get("zip") ?? ""),
    };
  }

  async function submitJson(endpoint: string, payload: Record<string, unknown>, method: "PATCH" | "POST" = "POST") {
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
        method,
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
      ...personPayloadFromForm(formData, selectedRelationshipType),
    });
  }

  function handleEditPersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedPerson) {
      return;
    }

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipType, selectedPerson.id),
    }, "PATCH");
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none";

    void submitJson("/api/dos/app/meetings", {
      conversationFlowKey,
      conversationResponses: conversationFlowKey === "kitchen_table_gospel" ? kitchenTableResponses : {},
      fieldPersonIds: selectedMeetingPersonIds,
      notes: String(formData.get("notes") ?? ""),
      tableDate: String(formData.get("table_date") ?? todayDateValue()),
      tableType: selectedMeetingContext,
    });
  }

  function handleEditMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    const conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none";

    void submitJson("/api/dos/app/meetings", {
      conversationFlowKey,
      conversationResponses: conversationFlowKey === "kitchen_table_gospel" ? kitchenTableResponses : {},
      fieldPersonIds: selectedMeetingPersonIds,
      id: selectedMeeting.id,
      notes: String(formData.get("notes") ?? ""),
      tableDate: String(formData.get("table_date") ?? selectedMeeting.date ?? todayDateValue()),
      tableType: selectedMeetingContext,
    }, "PATCH");
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

  function toggleMeetingPersonId(personId: string) {
    setSelectedMeetingPersonIds((current) =>
      current.includes(personId)
        ? current.filter((currentPersonId) => currentPersonId !== personId)
        : [...current, personId],
    );
  }

  function handleKitchenTableAnswer(questionId: KitchenTableNonRatingQuestionId, answer: DosKitchenTableAnswer) {
    setKitchenTableResponses((current) => {
      if (current[questionId] === answer) {
        const { [questionId]: _removed, ...rest } = current;

        return rest;
      }

      return {
        ...current,
        [questionId]: answer,
      };
    });
  }

  function handleKitchenTableRating(rating: number) {
    setKitchenTableResponses((current) => {
      if (current.relationshipWithJesus === rating) {
        const { relationshipWithJesus: _removed, ...rest } = current;

        return rest;
      }

      return {
        ...current,
        relationshipWithJesus: rating,
      };
    });
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
                        {meetingPeopleTitle(latestMeeting, data.people)} · {meetingActivityTitle(latestMeeting)} · {formatRelativeDate(latestMeeting.date)}
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
                        <PersonCard index={index} onClick={() => openPersonDetail(person.id)} person={person} variant="row" />
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
                  <div className="grid gap-3">{visiblePeople.map((person, index) => <PersonCard index={index} key={person.id} onClick={() => openPersonDetail(person.id)} person={person} />)}</div>
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
                <div className="grid gap-3">{data.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onClick={() => openMeetingDetail(meeting.id)} people={data.people} />)}</div>
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
              <div className="mb-5">
                <SectionHeading title="Library" />
                <div className="grid gap-3">
                  {dosGuideResources.map((guide) => (
                    <article className="rounded-2xl border border-[#E2DED6] bg-white p-4" key={guide.href}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1E1D1A]">{guide.title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#77716A]">{guide.description}</p>
                        </div>
                        <a
                          className="shrink-0 rounded-full border border-[#D7C7A4] bg-[#FFF8E8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12] transition-colors hover:border-[#D4A63D] hover:bg-[#F4E3C8]"
                          href={guide.href}
                          rel="noopener noreferrer"
                          style={{ fontFamily: font.rajdhani }}
                          target="_blank"
                        >
                          Open Guide
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
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

        {selectedPerson ? (
          <PersonDetailOverlay
            fruit={data.fruit}
            index={Math.max(0, data.people.findIndex((person) => person.id === selectedPerson.id))}
            meetings={data.meetings}
            onBack={() => setSelectedPersonId(null)}
            onEdit={() => openPersonEdit(selectedPerson)}
            onLogMeeting={() => openMeetingForPerson(selectedPerson.id)}
            onOpenMeeting={openMeetingDetail}
            person={selectedPerson}
          />
        ) : null}

        {selectedMeeting ? (
          <MeetingDetailOverlay
            meeting={selectedMeeting}
            onBack={() => setSelectedMeetingId(null)}
            onEdit={() => openMeetingEdit(selectedMeeting)}
            onLogMeeting={() => openForm("meeting")}
            people={data.people}
          />
        ) : null}

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
            <div className="grid gap-3">
              <label className="block">
                <FieldLabel>Name</FieldLabel>
                <input className={FieldInputClass()} name="name" placeholder="Full name" required />
              </label>
              <label className="block">
                <FieldLabel>Phone</FieldLabel>
                <input className={FieldInputClass()} inputMode="tel" name="phone" placeholder="Phone number" required />
              </label>
            </div>
            <RelationshipTypePicker onChange={setSelectedRelationshipType} value={selectedRelationshipType} />
            <AdditionalPersonInformation
              isOpen={isAdditionalPersonInfoOpen}
              onToggle={() => setIsAdditionalPersonInfoOpen((current) => !current)}
            />
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Add Person"}</AppButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "editPerson" && selectedPerson ? (
        <Sheet description="Update the details you know. Keep the field record useful." onClose={closeForm} title="Edit Person">
          <form className="space-y-4" onSubmit={handleEditPersonSubmit}>
            <div className="grid gap-3">
              <label className="block">
                <FieldLabel>Name</FieldLabel>
                <input className={FieldInputClass()} defaultValue={selectedPerson.name} name="name" placeholder="Full name" required />
              </label>
              <label className="block">
                <FieldLabel>Phone</FieldLabel>
                <input className={FieldInputClass()} defaultValue={selectedPerson.phone} inputMode="tel" name="phone" placeholder="Phone number" required />
              </label>
            </div>
            <RelationshipTypePicker onChange={setSelectedRelationshipType} value={selectedRelationshipType} />
            <AdditionalPersonInformation
              defaults={selectedPersonDefaults}
              isOpen={isAdditionalPersonInfoOpen}
              onToggle={() => setIsAdditionalPersonInfoOpen((current) => !current)}
            />
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Save Person"}</AppButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "meeting" ? (
        <Sheet onClose={closeForm} title="Log Meeting">
          <form className="space-y-3" onSubmit={handleMeetingSubmit}>
            <MeetingContextPicker onChange={setSelectedMeetingContext} value={selectedMeetingContext} />
            <MeetingPeopleSelector
              allPeople={data.people}
              onQueryChange={setMeetingPeopleQuery}
              onToggle={toggleMeetingPersonId}
              people={meetingPeopleOptions}
              query={meetingPeopleQuery}
              selectedPersonIds={selectedMeetingPersonIds}
            />
            <label className="block">
              <FieldLabel>Date</FieldLabel>
              <input className={FieldInputClass()} defaultValue={todayDateValue()} name="table_date" type="date" />
            </label>
            <ConversationFlowPicker
              allowKitchenTableGospel={data.workspace.isUsamWorkspace}
              onChange={setSelectedConversationFlow}
              value={selectedConversationFlow}
            />
            {selectedConversationFlow === "kitchen_table_gospel" ? (
              <KitchenTableGospelFlow
                onAnswer={handleKitchenTableAnswer}
                onRating={handleKitchenTableRating}
                responses={kitchenTableResponses}
              />
            ) : null}
            <label className="block">
              <FieldLabel>What happened?</FieldLabel>
              <textarea className={`${FieldInputClass()} min-h-24 py-3`} name="notes" placeholder="Briefly capture the conversation." />
            </label>
            <MeetingRecommendationsPreview resources={draftRecommendedResources} />
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Log Meeting"}</AppButton>
          </form>
        </Sheet>
      ) : null}

      {formMode === "editMeeting" && selectedMeeting ? (
        <Sheet onClose={closeForm} title="Edit Meeting">
          <form className="space-y-3" onSubmit={handleEditMeetingSubmit}>
            <MeetingContextPicker onChange={setSelectedMeetingContext} value={selectedMeetingContext} />
            <MeetingPeopleSelector
              allPeople={data.people}
              onQueryChange={setMeetingPeopleQuery}
              onToggle={toggleMeetingPersonId}
              people={meetingPeopleOptions}
              query={meetingPeopleQuery}
              selectedPersonIds={selectedMeetingPersonIds}
            />
            <label className="block">
              <FieldLabel>Date</FieldLabel>
              <input className={FieldInputClass()} defaultValue={selectedMeeting.date ?? todayDateValue()} name="table_date" type="date" />
            </label>
            <ConversationFlowPicker
              allowKitchenTableGospel={data.workspace.isUsamWorkspace}
              onChange={setSelectedConversationFlow}
              value={selectedConversationFlow}
            />
            {selectedConversationFlow === "kitchen_table_gospel" ? (
              <KitchenTableGospelFlow
                onAnswer={handleKitchenTableAnswer}
                onRating={handleKitchenTableRating}
                responses={kitchenTableResponses}
              />
            ) : null}
            <label className="block">
              <FieldLabel>What happened?</FieldLabel>
              <textarea className={`${FieldInputClass()} min-h-24 py-3`} defaultValue={selectedMeeting.notes ?? ""} name="notes" placeholder="Briefly capture the conversation." />
            </label>
            <MeetingRecommendationsPreview resources={draftRecommendedResources} />
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Save Meeting"}</AppButton>
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
