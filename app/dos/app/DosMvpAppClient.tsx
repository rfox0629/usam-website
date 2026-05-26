"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Briefcase, Cake, CalendarDays, Camera, ChevronRight, Church, Copy, Droplet, FileImage, Flame, Gift, Mail, MapPin, Megaphone, MessageCircle, Mic, Moon, MoreHorizontal, Pencil, Phone, Search, Send, Share2, Sparkles, Square, StickyNote, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent, ReactNode } from "react";
import {
  buildMeetingRecommendations,
  dosConversationFlowDefinitions,
  getConversationFlowDefinition,
  relationshipWithJesusTemperature,
  type DosConversationAnswer,
  type DosConversationFlowKey,
  type DosConversationQuestion,
  type DosConversationResponses,
  type DosConversationResponseValue,
  type DosRecommendedResource,
} from "@/src/lib/dos/meeting-engine";
import { formatDosMeetingSecondary, formatDosParticipantList, formatDosParticipantTitle, resolveDosMeetingParticipantNames } from "@/src/lib/dos/meeting-display";
import type { DosRelationshipScore } from "@/src/lib/dos/circle-scoring";
import type { DosAppData, DosAppFruit, DosAppMeeting, DosAppMeetingType, DosAppPerson, DosAppReviewStatus } from "@/src/lib/dos/missionary-app";
import { personNotesToPlainText, splitPersonNotesValue } from "@/src/lib/dos/person-notes";
import { dosFollowUpGuideResources, dosTableTeachingResources } from "@/src/lib/dos/guide-resources";

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
  ...dosConversationFlowDefinitions.map((flow) => ({
    helper: flow.gatedTo === "usam" ? "USAM only" : undefined,
    label: flow.title,
    value: flow.id,
  })),
];

const conversationYesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] as const satisfies ReadonlyArray<{ label: string; value: DosConversationAnswer }>;

const conversationUnsureAnswerOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Unsure", value: "unsure" },
] as const satisfies ReadonlyArray<{ label: string; value: DosConversationAnswer }>;

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

const libraryFilters = [
  { label: "All", value: "all" },
  { label: "Teachings", value: "teachings" },
  { label: "Follow up", value: "follow_up" },
] as const;

type ActiveTab = typeof tabs[number]["value"];
type ButtonTone = "black" | "soft" | "white";
type CircleFocusView = "seventy" | "three" | "twelve";
type FormMode = "editMeeting" | "editPerson" | "fruit" | "meeting" | "person" | null;
type IconName = typeof tabs[number]["icon"] | "add" | "arrow" | "bell" | "calendar" | "log" | "search";
type LibraryFilter = typeof libraryFilters[number]["value"];
type RelationshipTypeValue = typeof relationshipTypeOptions[number]["value"];
type MeetingCaptureType = "photo" | "screenshot" | "voice";
type MeetingCaptureDraft = {
  file: Blob;
  fileName: string;
  id: string;
  previewUrl?: string;
  type: MeetingCaptureType;
};
type IntelligenceHistoryItem = {
  calculatedAt: string | null;
  newCircle: string;
  newScore: number;
  previousCircle: string | null;
  previousScore: number | null;
};
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

function parseDisplayDate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null) {
  const date = parseDisplayDate(value);

  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRelativeDate(value: string | null) {
  const date = parseDisplayDate(value);

  if (!date) {
    return "No contact yet";
  }

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

function isWithinLastDays(value: string | null | undefined, days: number) {
  const date = value ? parseDisplayDate(value) : null;

  if (!date) {
    return false;
  }

  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function captureTypeLabel(type: MeetingCaptureType) {
  return {
    photo: "Photo",
    screenshot: "Screenshot",
    voice: "Voice Note",
  }[type];
}

function captureFileName(type: MeetingCaptureType, extension: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return `${type}-${timestamp}.${extension}`;
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

function answerLabel(value: DosConversationAnswer | undefined) {
  if (!value) {
    return "Skipped";
  }

  return value === "unsure" ? "Unsure" : value.charAt(0).toUpperCase() + value.slice(1);
}

function meetingMetadataLine(meeting: DosAppMeeting) {
  return formatDosMeetingSecondary(meetingActivityTitle(meeting), formatDate(meeting.date));
}

function reviewStatusLabel(value: DosAppReviewStatus) {
  return {
    approved: "Approved",
    not_sent: "Not Sent",
    pending: "Pending",
    private: "Private",
    submitted: "Submitted",
  }[value];
}

function reviewStatusClass(value: DosAppReviewStatus) {
  return value === "not_sent"
    ? "border-[#E2DED6] bg-[#F8F7F3] text-[#77716A]"
    : "border-[#D7C7A4] bg-[#FFF8E7] text-[#8A5A12]";
}

function reviewSharePermissionLabel(value: string | null) {
  if (value === "with_name") {
    return "Name OK";
  }

  if (value === "anonymous") {
    return "Anonymous OK";
  }

  return "Private";
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
  const { additional, notes: baseNotes } = splitPersonNotesValue(notes);
  return {
    additional,
    notes: personNotesToPlainText(baseNotes),
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

function mapsHrefForAddress(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function preferredMapsHrefForAddress(address: string) {
  const encodedAddress = encodeURIComponent(address);
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;

  if (/iPad|iPhone|iPod|Macintosh/i.test(userAgent)) {
    return `https://maps.apple.com/?q=${encodedAddress}`;
  }

  if (/Android/i.test(userAgent)) {
    return `geo:0,0?q=${encodedAddress}`;
  }

  return mapsHrefForAddress(address);
}

function openAddressInMaps(address: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = preferredMapsHrefForAddress(address);
}

function handleAddressMapClick(event: MouseEvent<HTMLAnchorElement>, address: string) {
  event.preventDefault();
  openAddressInMaps(address);
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
  onClick,
  value,
}: {
  label: string;
  onClick?: () => void;
  value: number | string;
}) {
  const className = "rounded-xl bg-[#F1F0EC] px-3 py-3.5 text-center";
  const interactiveClassName = `${className} cursor-pointer transition-colors hover:bg-[#E9E4DA] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#D4A63D]/35`;
  const valueClassName = typeof value === "number"
    ? "text-[21px] font-bold leading-none text-[#111111]"
    : "text-[13px] font-bold leading-tight text-[#111111]";
  const content = (
    <>
      <p className={valueClassName}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button className={interactiveClassName} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
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

function LibrarySection({
  children,
  subtext,
  title,
}: {
  children: ReactNode;
  subtext?: string;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
          {title}
        </h2>
        {subtext ? <p className="mt-1 text-xs leading-5 text-[#77716A]">{subtext}</p> : null}
      </div>
      {children}
    </section>
  );
}

function followUpResourceIcon(title: string) {
  switch (title) {
    case "Attending Church":
      return { className: "bg-[#E6F4ED] text-[#24724D]", IconComponent: Church };
    case "Daily Bible Reading":
      return { className: "bg-[#E8F0FF] text-[#2F5FAF]", IconComponent: BookOpen };
    case "Baptism":
      return { className: "bg-[#E4F5F8] text-[#227083]", IconComponent: Droplet };
    case "Biblical Giving":
      return { className: "bg-[#FFF0D8] text-[#986013]", IconComponent: Gift };
    case "Discipleship":
      return { className: "bg-[#EAF1E2] text-[#577D31]", IconComponent: Users };
    case "Evangelism":
      return { className: "bg-[#FFF3CF] text-[#9A6417]", IconComponent: Megaphone };
    case "Prayer and Fasting":
      return { className: "bg-[#F4E9FF] text-[#7142A8]", IconComponent: Flame };
    case "Sabbath":
      return { className: "bg-[#E9ECFF] text-[#4F5FA8]", IconComponent: Moon };
    case "Spiritual Gifts":
      return { className: "bg-[#F8EAFE] text-[#8A4E9F]", IconComponent: Sparkles };
    default:
      return { className: "bg-[#F1F0EC] text-[#6F6658]", IconComponent: BookOpen };
  }
}

function FeaturedTeachingCard({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#F0DEB9] bg-[#FFF0D8] shadow-[0_16px_34px_rgba(42,37,29,0.07)]">
      <div className="relative p-4 pb-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A6417]" style={{ fontFamily: font.rajdhani }}>
            Start here
          </span>
          <h3 className="mt-3 text-lg font-bold leading-tight text-[#1E1D1A]">{title}</h3>
          <p className="mt-1 text-xs font-medium leading-4 text-[#8A5A12]">{description}</p>
        </div>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-[#D9901E]">
          <BookOpen className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </div>
      </div>
      <div className="bg-[#FFF7E8]/80 p-3">
        <a
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-4 text-[11px] font-bold text-white transition-colors hover:bg-[#2A2722]"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
          Open Teaching
        </a>
      </div>
    </article>
  );
}

function TableTeachingRow({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  const shortDescription = title === "Four Questions" ? "Honesty, help, surrender, and obedience." : description;

  return (
    <a
      className="flex min-h-[72px] items-center gap-2.5 rounded-[20px] border border-[#F0DEB9] bg-[#FFFCF5] px-3 py-2.5 shadow-[0_10px_24px_rgba(42,37,29,0.04)] transition-colors hover:border-[#D7C7A4]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0D8] text-[#9A6417]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#1E1D1A]">{title}</span>
        <span className="mt-1 block line-clamp-2 text-xs leading-4 text-[#77716A]">{shortDescription}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A6417]" style={{ fontFamily: font.rajdhani }}>
        Open
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
      </span>
    </a>
  );
}

function FollowUpGuideRow({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  const { className: iconClassName, IconComponent } = followUpResourceIcon(title);

  return (
    <a
      className="group flex min-h-[64px] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[#FFFCF5]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <IconComponent className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#1E1D1A]">{title}</span>
        <span className="mt-0.5 block line-clamp-1 text-xs leading-4 text-[#77716A]">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#C79A31] transition-transform group-hover:translate-x-0.5" aria-hidden="true" strokeWidth={1.9} />
    </a>
  );
}

function FollowUpGuideList() {
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#E8E2D8] bg-white shadow-[0_12px_28px_rgba(42,37,29,0.04)]">
      <div className="divide-y divide-[#EFEAE1]">
        {dosFollowUpGuideResources.map((guide) => (
          <FollowUpGuideRow
            description={guide.description}
            href={guide.href}
            key={guide.href}
            title={guide.title}
          />
        ))}
      </div>
    </article>
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

function circleDisplayName(circle: string) {
  switch (circle) {
    case "three":
      return "My 3";
    case "twelve":
      return "My 12";
    case "seventy":
      return "My 70";
    default:
      return "Field";
  }
}

function scoreLabel(value: number) {
  return `${Math.round(value)}`;
}

function uniqueCircleMembers(items: Array<{ person: DosAppPerson; score: DosRelationshipScore }>) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.person.id)) {
      return false;
    }

    seen.add(item.person.id);
    return true;
  });
}

function circleFocusCopy(view: CircleFocusView) {
  switch (view) {
    case "twelve":
      return {
        countLabel: "in My 12",
        denominator: 12,
        label: "My 12",
        subtitle: "Your core discipleship circle",
      };
    case "seventy":
      return {
        countLabel: "in My 70",
        denominator: 70,
        label: "My 70",
        subtitle: "Your broader field",
      };
    case "three":
    default:
      return {
        countLabel: "in My 3",
        denominator: 3,
        label: "My 3",
        subtitle: "Your closest discipleship investments",
      };
  }
}

function CircleAvatar({
  index,
  layer,
  person,
  size = "md",
}: {
  index: number;
  layer?: "center" | "middle" | "outer";
  person?: DosAppPerson;
  size?: "lg" | "md" | "sm" | "xs";
}) {
  const sizeClass = {
    lg: "h-11 w-11 text-sm",
    md: "h-10 w-10 text-xs",
    sm: "h-8 w-8 text-[10px]",
    xs: "h-6 w-6 text-[8px]",
  }[size];

  if (!person) {
    return (
      <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-dashed border-[#D8D2C8] bg-[#F8F7F3] text-[#B5AEA3]`}>
        +
      </span>
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-bold ${avatarTone(index)}`}
      data-circle-layer={layer}
      data-person-id={person.id}
    >
      {initials(person.name)}
    </span>
  );
}

function circleNodePosition(index: number, total: number, radiusPercent: number) {
  const safeTotal = Math.max(1, total);
  const angle = (-90 + (360 / safeTotal) * index) * (Math.PI / 180);
  const left = 50 + Math.cos(angle) * radiusPercent;
  const top = 50 + Math.sin(angle) * radiusPercent;

  return {
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`,
  };
}

function TargetNode({
  children,
  className = "",
  left,
  top,
}: {
  children: ReactNode;
  className?: string;
  left: string;
  top: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-all duration-300 ease-out ${className}`}
      style={{ left, top }}
    >
      {children}
    </span>
  );
}

function CircleClusterNode({
  count,
  left,
  top,
}: {
  count: number;
  left: string;
  top: string;
}) {
  return (
    <TargetNode left={left} top={top}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5D8B8] bg-[#FFF8E7] text-[10px] font-bold text-[#8A5A12] shadow-[0_8px_18px_rgba(42,37,29,0.08)]">
        +{count}
      </span>
    </TargetNode>
  );
}

const my3NodePositions = [
  ["50%", "42%"],
  ["42%", "58%"],
  ["58%", "58%"],
] as const;

function CircleFocusHero({
  my12,
  my3,
  my70,
  onViewCircles,
}: {
  my12: Array<{ person: DosAppPerson; score: DosRelationshipScore }>;
  my3: Array<{ person: DosAppPerson; score: DosRelationshipScore }>;
  my70: Array<{ person: DosAppPerson; score: DosRelationshipScore }>;
  onViewCircles: () => void;
}) {
  const [activeView, setActiveView] = useState<CircleFocusView>("three");
  const copy = circleFocusCopy(activeView);
  const centerPeople = my3.slice(0, 3);
  const centerIds = new Set(centerPeople.map((item) => item.person.id));
  const middleLayerPeople = my12.filter((item) => !centerIds.has(item.person.id)).slice(0, 9);
  const middleAndCenterIds = new Set([...Array.from(centerIds), ...middleLayerPeople.map((item) => item.person.id)]);
  const outerLayerPeople = my70.filter((item) => !middleAndCenterIds.has(item.person.id)).slice(0, 58);
  const activeMembershipCount = activeView === "three"
    ? centerPeople.length
    : activeView === "twelve"
      ? centerPeople.length + middleLayerPeople.length
      : centerPeople.length + middleLayerPeople.length + outerLayerPeople.length;
  const my3Slots = [0, 1, 2].map((index) => centerPeople[index]?.person);
  const visibleMy70Nodes = outerLayerPeople.length > 14 ? outerLayerPeople.slice(0, 8) : outerLayerPeople.slice(0, 12);
  const clusterCount = outerLayerPeople.length > visibleMy70Nodes.length ? outerLayerPeople.length - visibleMy70Nodes.length : 0;
  const outerNodeCount = visibleMy70Nodes.length + (clusterCount > 0 ? 1 : 0);
  const my12Active = activeView === "twelve";
  const my70Active = activeView === "seventy";
  const showMiddleLayer = activeView === "twelve" || activeView === "seventy";
  const centerClassName = activeView === "three" ? "scale-110 opacity-100" : activeView === "twelve" ? "scale-100 opacity-95" : "scale-95 opacity-85";
  const middleRingClassName = my12Active
    ? "scale-100 border-[#D4A63D]/55 bg-[#FFF8E7]/35"
    : my70Active
      ? "scale-95 border-[#E7E1D7]/80 bg-white/25"
      : "scale-95 border-[#E7E1D7]/80 bg-transparent";
  const outerRingClassName = my70Active
    ? "scale-100 border-[#D4A63D]/50 bg-[#FFF8E7]/30"
    : "scale-95 border-[#E7E1D7]/70 bg-transparent";

  function handleTargetClick(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const distanceFromCenter = Math.sqrt(x * x + y * y);

    if (distanceFromCenter <= 72) {
      setActiveView("three");
      return;
    }

    if (distanceFromCenter <= 108) {
      setActiveView("twelve");
      return;
    }

    setActiveView("seventy");
  }

  return (
    <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(42,37,29,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
            Circle Focus
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-[#111111]">{copy.label}</h2>
          <p className="mt-1 text-sm leading-5 text-[#77716A]">{copy.subtitle}.</p>
        </div>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D4A63D]" aria-hidden="true" />
      </div>

      <button
        aria-label={`Circle Focus target. ${copy.label} selected.`}
        className="relative mx-auto mt-5 block h-[17rem] w-[17rem] max-w-full cursor-pointer rounded-full text-left focus:outline-none focus:ring-2 focus:ring-[#D4A63D]/40"
        onClick={handleTargetClick}
        type="button"
      >
        <span
          className={`absolute left-1/2 top-1/2 z-[1] h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ${outerRingClassName}`}
          data-circle-ring="outer"
        />
        <span
          className={`absolute left-1/2 top-1/2 z-[2] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ${middleRingClassName}`}
          data-circle-ring="middle"
        />
        <span
          className={`absolute left-1/2 top-1/2 z-[3] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ${
            activeView === "three" ? "scale-105 border-[#D4A63D]/70 bg-[#FFF8E7]" : "scale-100 border-[#E8DFCF] bg-white/70"
          }`}
          data-circle-ring="center"
        />

        {showMiddleLayer ? middleLayerPeople.map((item, index) => {
          const position = circleNodePosition(index, middleLayerPeople.length, 31.5);

          return (
            <TargetNode
              className={my12Active ? "opacity-100 scale-100" : "opacity-65 scale-90"}
              key={`twelve-${item.person.id}`}
              left={position.left}
              top={position.top}
            >
              <CircleAvatar index={index + 3} layer="middle" person={item.person} size="sm" />
            </TargetNode>
          );
        }) : null}

        {my70Active ? visibleMy70Nodes.map((item, index) => {
          const position = circleNodePosition(index, outerNodeCount, 41);

          return (
            <TargetNode
              className="opacity-80 scale-100"
              key={`seventy-${item.person.id}`}
              left={position.left}
              top={position.top}
            >
              <CircleAvatar index={index + 7} layer="outer" person={item.person} size="xs" />
            </TargetNode>
          );
        }) : null}
        {my70Active && clusterCount > 0 ? (
          <CircleClusterNode
            count={clusterCount}
            left={circleNodePosition(visibleMy70Nodes.length, outerNodeCount, 41).left}
            top={circleNodePosition(visibleMy70Nodes.length, outerNodeCount, 41).top}
          />
        ) : null}

        {my3Slots.map((person, index) => (
          <TargetNode
            className={`z-30 ${centerClassName}`}
            key={person?.id ?? `empty-${index}`}
            left={my3NodePositions[index][0]}
            top={my3NodePositions[index][1]}
          >
            <CircleAvatar index={index} layer="center" person={person} size={activeView === "three" ? "lg" : "md"} />
          </TargetNode>
        ))}

        <span className="absolute inset-x-0 bottom-0 z-40 block text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
          {copy.label}
        </span>
      </button>

      <div className="mt-1 grid grid-cols-3 rounded-full bg-[#F6F4EF] p-1">
        {(["three", "twelve", "seventy"] as const).map((view) => {
          const selected = activeView === view;

          return (
            <button
              aria-pressed={selected}
              className={`min-h-9 rounded-full px-2 text-xs font-bold transition-all ${
                selected ? "bg-white text-[#111111] shadow-[0_6px_16px_rgba(42,37,29,0.08)]" : "text-[#77716A]"
              }`}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {circleFocusCopy(view).label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-[#1E1D1A]">
        {Math.min(activeMembershipCount, copy.denominator)} / {copy.denominator} {copy.countLabel}
      </p>

      <button
        className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#111111] px-4 text-sm font-bold text-white"
        onClick={onViewCircles}
        type="button"
      >
        View Circles
      </button>
    </section>
  );
}

function CircleListRow({
  meetingCount,
  onClick,
  person,
  score,
}: {
  meetingCount: number;
  onClick: () => void;
  person: DosAppPerson;
  score: DosRelationshipScore;
}) {
  return (
    <button className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-3 text-left transition-colors hover:bg-[#FFFDF8]" onClick={onClick} type="button">
      <CircleAvatar index={Math.round(score.totalScore) % 6} person={person} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#1E1D1A]">{person.name}</span>
        <span className="mt-0.5 block truncate text-xs text-[#77716A]">{meetingCount} {meetingCount === 1 ? "meeting" : "meetings"} · {formatRelativeDate(person.lastActivityAt)}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#A9A29A]" aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}

function HomeActionPill({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-xs font-bold text-[#1E1D1A] shadow-[0_10px_26px_rgba(42,37,29,0.055)]"
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
}

function FocusRow({
  action,
  index,
  onClick,
  person,
}: {
  action: string;
  index: number;
  onClick: () => void;
  person: DosAppPerson;
}) {
  return (
    <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-3 text-left shadow-[0_8px_24px_rgba(42,37,29,0.045)]" onClick={onClick} type="button">
      <CircleAvatar index={index} person={person} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#1E1D1A]">{person.name}</span>
        <span className="mt-0.5 block truncate text-xs text-[#77716A]">{action}</span>
      </span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A63D]" aria-hidden="true" />
    </button>
  );
}

function RecentActivityRow({
  children,
  icon,
  onClick,
  title,
}: {
  children: ReactNode;
  icon: IconName;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-3 text-left" onClick={onClick} type="button">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F7F3] text-[#8A5A12]">
        <Icon name={icon} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#1E1D1A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#77716A]">{children}</span>
      </span>
    </button>
  );
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
  allowConversationFlows,
  onChange,
  value,
}: {
  allowConversationFlows: boolean;
  onChange: (value: DosConversationFlowKey) => void;
  value: DosConversationFlowKey;
}) {
  const options = allowConversationFlows
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

function responseAsNumber(value: DosConversationResponseValue | undefined) {
  return typeof value === "number" ? value : undefined;
}

function responseAsString(value: DosConversationResponseValue | undefined) {
  return typeof value === "string" ? value : "";
}

function responseAsStringArray(value: DosConversationResponseValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function questionResponseLabel(question: DosConversationQuestion, value: DosConversationResponseValue | undefined) {
  if (question.kind === "rating") {
    const rating = responseAsNumber(value);

    return rating ? `${rating} · ${relationshipWithJesusTemperature(rating)}` : "Skipped";
  }

  if (question.kind === "text" || question.kind === "notes") {
    return responseAsString(value) || "No notes";
  }

  return answerLabel(value as DosConversationAnswer | undefined);
}

function ConversationFlowExperience({
  flowKey,
  onResponseChange,
  onToggleFollowUpAction,
  responses,
}: {
  flowKey: DosConversationFlowKey;
  onResponseChange: (questionId: string, value: DosConversationResponseValue | undefined) => void;
  onToggleFollowUpAction: (actionId: string) => void;
  responses: DosConversationResponses;
}) {
  const flow = getConversationFlowDefinition(flowKey);
  const temperature = flowKey === "kitchen_table_gospel"
    ? relationshipWithJesusTemperature(responseAsNumber(responses.relationshipWithJesus))
    : null;
  const selectedFollowUpActions = responseAsStringArray(responses.followUpActions);

  if (!flow) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#1E1D1A]">{flow.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-[#77716A]">{flow.description}</p>
        </div>
        {temperature ? (
          <span className="rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
            {temperature}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3">
        {flow.sections.map((section) => (
          <div className="grid gap-2" key={section.id}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
                {section.title}
              </p>
              {section.description ? <p className="mt-0.5 text-xs leading-5 text-[#77716A]">{section.description}</p> : null}
            </div>
            {section.questions.map((question) => (
              <ConversationQuestionCard
                key={question.id}
                onResponseChange={onResponseChange}
                question={question}
                value={responses[question.id]}
              />
            ))}
          </div>
        ))}

        {flow.closingPrompt || flow.gospelInvitation ? (
          <div className="rounded-2xl border border-[#E5D5AD] bg-[#FFF8E7] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
              Gospel Invitation
            </p>
            {flow.closingPrompt ? <p className="mt-2 text-sm font-semibold leading-5 text-[#1E1D1A]">{flow.closingPrompt}</p> : null}
            {flow.gospelInvitation ? <p className="mt-1 text-xs leading-5 text-[#6F6658]">{flow.gospelInvitation}</p> : null}
          </div>
        ) : null}

        {flow.followUpActions?.length ? (
          <div className="rounded-2xl bg-[#F8F7F3] p-2.5">
            <p className="text-sm font-semibold text-[#1E1D1A]">Follow-up</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flow.followUpActions.map((action) => {
                const selected = selectedFollowUpActions.includes(action.id);

                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-8 rounded-full border px-3 text-xs font-bold ${
                      selected ? "border-[#D4A63D] bg-[#FFF8E7] text-[#8A5A12]" : "border-[#E2DED6] bg-white text-[#1E1D1A]"
                    }`}
                    key={action.id}
                    onClick={() => onToggleFollowUpAction(action.id)}
                    type="button"
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ConversationQuestionCard({
  onResponseChange,
  question,
  value,
}: {
  onResponseChange: (questionId: string, value: DosConversationResponseValue | undefined) => void;
  question: DosConversationQuestion;
  value: DosConversationResponseValue | undefined;
}) {
  if (question.kind === "rating") {
    const ratingValue = responseAsNumber(value);
    const scaleMin = question.scale?.min ?? 1;
    const scaleMax = question.scale?.max ?? 10;

    return (
      <div className="rounded-2xl bg-[#F8F7F3] p-2.5">
        <p className="text-sm font-semibold text-[#1E1D1A]">{question.label}</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {Array.from({ length: scaleMax - scaleMin + 1 }, (_, index) => scaleMin + index).map((rating) => {
            const selected = ratingValue === rating;

            return (
              <button
                aria-pressed={selected}
                className={`min-h-8 rounded-xl border text-xs font-bold ${
                  selected ? "border-[#D4A63D] bg-[#D4A63D] text-white" : "border-[#E2DED6] bg-white text-[#1E1D1A]"
                }`}
                key={rating}
                onClick={() => onResponseChange(question.id, selected ? undefined : rating)}
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

  if (question.kind === "text" || question.kind === "notes") {
    return (
      <label className="block rounded-2xl bg-[#F8F7F3] p-2.5">
        <span className="text-sm font-semibold text-[#1E1D1A]">{question.label}</span>
        <textarea
          className={`${FieldInputClass()} mt-2 min-h-20 bg-white py-3`}
          onChange={(event) => onResponseChange(question.id, event.target.value)}
          placeholder={question.placeholder}
          value={responseAsString(value)}
        />
      </label>
    );
  }

  const answer = value as DosConversationAnswer | undefined;
  const options = question.kind === "yes_no_unsure" ? conversationUnsureAnswerOptions : conversationYesNoOptions;

  return (
    <div className="rounded-2xl bg-[#F8F7F3] p-2.5">
      <p className="text-sm font-semibold leading-5 text-[#1E1D1A]">{question.label}</p>
      {question.scriptureRefs?.length ? (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
          {question.scriptureRefs.join(" · ")}
        </p>
      ) : null}
      {question.prompt ? <p className="mt-1 text-xs leading-5 text-[#77716A]">{question.prompt}</p> : null}
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
              onClick={() => onResponseChange(question.id, selected ? undefined : option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
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
      <div className="mt-2 flex flex-wrap gap-1.5">
        {selectedPeople.length ? selectedPeople.map((person, index) => (
          <button
            aria-label={`Remove ${person.name} from meeting`}
            className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#D7C7A4] bg-[#FFF8E7] pl-1 pr-2 text-[11px] font-semibold text-[#1E1D1A] transition-colors hover:border-[#D4A63D]"
            key={person.id}
            onClick={() => onToggle(person.id)}
            type="button"
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${avatarTone(index)}`}>
              {initials(person.name)}
            </span>
            <span className="max-w-[9rem] truncate">{person.name}</span>
            <span className="ml-0.5 text-[13px] leading-none text-[#8A5A12]" aria-hidden="true">
              &times;
            </span>
          </button>
        )) : (
          <span className="inline-flex h-7 items-center rounded-full bg-[#F8F7F3] px-2.5 text-[11px] text-[#77716A]">No people selected</span>
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

function MeetingCaptureNotes({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [captures, setCaptures] = useState<MeetingCaptureDraft[]>([]);
  const [captureMessage, setCaptureMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => () => {
    mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function addCapture(capture: Omit<MeetingCaptureDraft, "id">) {
    setCaptures((currentCaptures) => [
      ...currentCaptures,
      {
        ...capture,
        id: `${capture.type}-${Date.now()}-${currentCaptures.length}`,
      },
    ]);
    setCaptureMessage("");
  }

  function addFiles(type: Exclude<MeetingCaptureType, "voice">, files: FileList | null) {
    const selectedFiles = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));

    if (!selectedFiles.length) {
      return;
    }

    selectedFiles.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      addCapture({
        file,
        fileName: file.name,
        previewUrl,
        type,
      });
    });
  }

  function handleFileSelection(type: Exclude<MeetingCaptureType, "voice">, event: ChangeEvent<HTMLInputElement>) {
    addFiles(type, event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function removeCapture(captureId: string) {
    setCaptures((currentCaptures) => {
      const capture = currentCaptures.find((currentCapture) => currentCapture.id === captureId);

      if (capture?.previewUrl) {
        URL.revokeObjectURL(capture.previewUrl);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== capture.previewUrl);
      }

      return currentCaptures.filter((currentCapture) => currentCapture.id !== captureId);
    });
  }

  async function startVoiceNote() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCaptureMessage("Voice recording is not available here.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const previewUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(previewUrl);
        addCapture({
          file: blob,
          fileName: captureFileName("voice", "webm"),
          previewUrl,
          type: "voice",
        });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
      });

      recorder.start();
      setIsRecording(true);
      setCaptureMessage("");
    } catch {
      setCaptureMessage("Microphone unavailable.");
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }

  function stopVoiceNote() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  return (
    <section className="rounded-[22px] border border-[#E2DED6] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Capture Notes</FieldLabel>
        {captures.length ? (
          <span className="rounded-full bg-[#F1F0EC] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: font.rajdhani }}>
            Draft
          </span>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <CaptureActionButton active={isRecording} icon={isRecording ? <Square className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} /> : <Mic className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={isRecording ? stopVoiceNote : startVoiceNote}>
          {isRecording ? "Stop" : "Voice"}
        </CaptureActionButton>
        <CaptureActionButton icon={<Camera className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={() => photoInputRef.current?.click()}>
          Photo
        </CaptureActionButton>
        <CaptureActionButton icon={<FileImage className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={() => screenshotInputRef.current?.click()}>
          Screenshot
        </CaptureActionButton>
      </div>

      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFileSelection("photo", event)}
        ref={photoInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event) => handleFileSelection("screenshot", event)}
        ref={screenshotInputRef}
        type="file"
      />

      {captureMessage ? <p className="mt-2 text-xs text-[#8A5A12]">{captureMessage}</p> : null}
      {captures.length ? (
        <div className="mt-2 grid gap-1.5">
          {/* TODO: Persist captures to a workspace-scoped meeting_attachments table with meeting_id, workspace_id, type, file_name, storage_path/file_url, and created_at once a DOS attachments bucket exists. */}
          {/* TODO: Send voice notes through AI transcription and summary before attaching them to meeting insights. */}
          {captures.map((capture) => (
            <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#E2DED6] bg-[#F8F7F3] p-1.5 pr-2" key={capture.id}>
              {capture.type === "voice" ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF8E7] text-[#8A5A12]">
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
                </span>
              ) : (
                <img alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover" src={capture.previewUrl} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#1E1D1A]">{capture.fileName}</p>
                <p className="text-[11px] text-[#77716A]">{captureTypeLabel(capture.type)} · {formatFileSize(capture.file.size)}</p>
              </div>
              <button
                aria-label={`Remove ${captureTypeLabel(capture.type)}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8E8880] transition-colors hover:bg-white hover:text-[#1E1D1A]"
                onClick={() => removeCapture(capture.id)}
                type="button"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <textarea className={`${FieldInputClass()} min-h-24 py-3`} defaultValue={defaultValue ?? ""} name="notes" placeholder="What happened?" />
    </section>
  );
}

function CaptureActionButton({
  active = false,
  children,
  icon,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-bold transition-colors ${
        active ? "border-[#D4A63D] bg-[#FFF8E7] text-[#8A5A12]" : "border-[#DDD9D0] bg-[#F8F7F3] text-[#1E1D1A] hover:border-[#D8C8A7]"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
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

function fruitStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "archived":
      return "Archived";
    case "pending_review":
      return "Pending Review";
    case "private":
      return "Private";
    case "draft":
    default:
      return "Private Draft";
  }
}

function fruitStatusBadgeClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-[#EAF6EA] text-[#2F6B3B]";
    case "pending_review":
      return "bg-[#FFF8E7] text-[#8A5A12]";
    case "private":
      return "bg-[#F1F0EC] text-[#6F6658]";
    case "archived":
      return "bg-[#E7E4DE] text-[#77716A]";
    case "draft":
    default:
      return "bg-[#F1F0EC] text-[#8A5A12]";
  }
}

function FruitCard({
  fruit,
  people,
}: {
  fruit: DosAppFruit;
  people: DosAppPerson[];
}) {
  const isQuickReview = fruit.sourceApp === "dos_quick_review";
  const linkedPerson = fruit.fieldPersonId ? personName(people, fruit.fieldPersonId) : null;
  const statusLabel = fruitStatusLabel(fruit.status);
  const quickReviewPermission = isQuickReview
    ? fruit.permissionToShare
      ? fruit.submittedByName ? "Name OK" : "Anonymous OK"
      : "Private"
    : null;

  return (
    <article className="rounded-2xl border border-[#E2DED6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1E1D1A]">{isQuickReview ? "Quick Review" : statusLabel}</p>
          <p className="mt-1 text-xs text-[#8E8880]">{formatDate(fruit.testimonyDate)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${fruitStatusBadgeClass(fruit.status)}`} style={{ fontFamily: font.rajdhani }}>
            {statusLabel}
          </span>
          {quickReviewPermission ? (
            <span className="rounded-full border border-[#E2DED6] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6F6658]" style={{ fontFamily: font.rajdhani }}>
              {quickReviewPermission}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#3B3935]">{fruit.summary}</p>
      <div className="mt-3 grid gap-1 text-xs leading-5 text-[#77716A]">
        {isQuickReview && fruit.submittedByName ? <span>Submitted by {fruit.submittedByName}</span> : null}
        {linkedPerson ? <span>Linked to {linkedPerson}</span> : null}
      </div>
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

function ConversationFlowDetail({ meeting }: { meeting: DosAppMeeting }) {
  const flow = getConversationFlowDefinition(meeting.conversationFlowKey);

  if (!flow) {
    return null;
  }

  const selectedActions = responseAsStringArray(meeting.conversationResponses.followUpActions);
  const selectedActionLabels = (flow.followUpActions ?? [])
    .filter((action) => selectedActions.includes(action.id))
    .map((action) => action.label);

  return (
    <DetailCard title={flow.title}>
      {flow.sections.map((section) => (
        <div className="grid gap-2" key={section.id}>
          {flow.sections.length > 1 ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
              {section.title}
            </p>
          ) : null}
          {section.questions.map((question) => (
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F8F7F3] p-3" key={question.id}>
              <p className="text-sm leading-5 text-[#1E1D1A]">{question.label}</p>
              <span className="max-w-[52%] shrink-0 rounded-full bg-white px-2.5 py-1 text-right text-xs font-semibold text-[#5F5952]">
                {questionResponseLabel(question, meeting.conversationResponses[question.id])}
              </span>
            </div>
          ))}
        </div>
      ))}
      {selectedActionLabels.length ? (
        <div className="rounded-2xl bg-[#F8F7F3] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
            Follow-up
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedActionLabels.map((label) => (
              <span className="rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-2.5 py-1 text-xs font-semibold text-[#8A5A12]" key={label}>
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </DetailCard>
  );
}

function DetailRow({
  ariaLabel,
  href,
  icon,
  label,
  onClick,
  value,
}: {
  ariaLabel?: string;
  href?: string;
  icon?: ReactNode;
  label?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  value: ReactNode;
}) {
  const content = (
    <>
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F7F3] text-[#8A5A12]">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {label ? <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>{label}</p> : null}
        <div className="mt-0.5 break-words leading-5 text-[#1E1D1A]">{value}</div>
      </div>
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-[#B4ADA3]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (href) {
    return (
      <a
        aria-label={ariaLabel}
        className="-mx-1 flex items-center gap-3 rounded-2xl px-1 py-1 text-sm text-[#1E1D1A] transition-colors hover:bg-[#FFF8E7] active:scale-[0.99]"
        href={href}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-[#1E1D1A]">
      {content}
    </div>
  );
}

function MoreMenuAction({
  children,
  disabled,
  href,
  icon,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  const className = "flex min-h-12 w-full items-center gap-3 rounded-2xl border border-[#E2DED6] bg-white px-4 text-left text-sm font-semibold text-[#1E1D1A] transition-colors hover:border-[#D4A63D] hover:bg-[#FFF8E7] disabled:cursor-not-allowed disabled:opacity-45";
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8F7F3] text-[#8A5A12]">{icon}</span>
      <span>{children}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} disabled={disabled} onClick={onClick} type="button">
      {content}
    </button>
  );
}

function BottomNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: ActiveTab;
  onSelect: (tab: ActiveTab) => void;
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-[60] border-t border-[#E2DED6] bg-[#F8F7F3]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((tab) => (
          <button
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${
              activeTab === tab.value ? "text-[#111111]" : "text-[#8E8880]"
            }`}
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            type="button"
          >
            <Icon name={tab.icon} size={18} />
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
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

function CirclesDetailOverlay({
  meetingCountByPersonId,
  my12,
  my3,
  my70,
  onBack,
  onOpenPerson,
}: {
  meetingCountByPersonId: Map<string, number>;
  my12: Array<{ person: DosAppPerson; score: DosRelationshipScore }>;
  my3: Array<{ person: DosAppPerson; score: DosRelationshipScore }>;
  my70: Array<{ person: DosAppPerson; score: DosRelationshipScore }>;
  onBack: () => void;
  onOpenPerson: (personId: string) => void;
}) {
  const sections = [
    { empty: "No one in My 3 yet.", items: my3, title: "My 3" },
    { empty: "The core circle will appear as activity grows.", items: my12, title: "My 12" },
    { empty: "The broader field will appear as activity grows.", items: my70, title: "My 70" },
  ];

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#F5F3EE] px-4 pb-28 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1E1D1A] shadow-[0_8px_20px_rgba(42,37,29,0.06)]" onClick={onBack} type="button" aria-label="Back to home">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          Circle Focus
        </p>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <section className="mt-6">
        <h2 className="text-3xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          Circles
        </h2>
        <p className="mt-2 text-sm leading-5 text-[#77716A]">Expanded focus for the people you are actively investing in.</p>
      </section>

      <div className="mt-6 grid gap-5">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
                {section.title}
              </p>
              <span className="text-xs text-[#77716A]">{section.items.length}</span>
            </div>
            {section.items.length ? (
              <div className="grid gap-2">
                {section.items.map(({ person, score }) => (
                  <CircleListRow
                    key={person.id}
                    meetingCount={meetingCountByPersonId.get(person.id) ?? 0}
                    onClick={() => onOpenPerson(person.id)}
                    person={person}
                    score={score}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-white px-4 py-3 text-sm text-[#77716A]">{section.empty}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function PersonDetailOverlay({
  circleScore,
  index,
  meetings,
  onBack,
  onEdit,
  onOpenMeeting,
  onLogMeeting,
  person,
  workspaceId,
}: {
  circleScore?: DosRelationshipScore | null;
  index: number;
  meetings: DosAppMeeting[];
  onBack: () => void;
  onEdit: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onLogMeeting: () => void;
  person: DosAppPerson;
  workspaceId: string;
}) {
  const meetingsSectionRef = useRef<HTMLDivElement | null>(null);
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [intelligenceHistory, setIntelligenceHistory] = useState<IntelligenceHistoryItem[]>([]);
  const [pinMessage, setPinMessage] = useState("");
  const [moreMessage, setMoreMessage] = useState("");
  const defaults = personFormDefaults(person);
  const address = personAddressLine(defaults);
  const mapHref = address ? mapsHrefForAddress(address) : "";
  const personMeetings = meetings.filter((meeting) => meeting.fieldPersonIds.includes(person.id));
  const personReviews = personMeetings.filter((meeting) => meeting.review.status !== "not_sent" && meeting.review.status !== "pending");
  const recentMeetings = personMeetings.slice(0, 3);
  const lastContact = person.lastActivityAt ? formatRelativeDate(person.lastActivityAt) : "None";
  const scrollToSection = (section: "meetings" | "reviews") => {
    const sectionRef = {
      meetings: meetingsSectionRef,
      reviews: reviewsSectionRef,
    }[section];

    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const copyToClipboard = async (value: string, label: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setMoreMessage("Copy unavailable.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMoreMessage(`${label} copied.`);
    } catch {
      setMoreMessage("Copy failed.");
    }
  };
  const shareContact = async () => {
    const contactLines = [
      person.name,
      person.phone ? `Phone: ${person.phone}` : "",
      person.email ? `Email: ${person.email}` : "",
      address ? `Address: ${address}` : "",
    ].filter(Boolean).join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: contactLines, title: person.name });
        setMoreMessage("Contact shared.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyToClipboard(contactLines, "Contact");
  };
  useEffect(() => {
    if (!isIntelligenceOpen) {
      return;
    }

    let ignore = false;

    fetch(`/api/dos/circles/person/${person.id}?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!ignore && Array.isArray(result?.history)) {
          setIntelligenceHistory(result.history);
        }
      })
      .catch(() => {
        if (!ignore) {
          setIntelligenceHistory([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isIntelligenceOpen, person.id, workspaceId]);
  const pinToCircle = async (circle: "field" | "seventy" | "three" | "twelve", locked = true) => {
    setPinMessage("Saving...");

    try {
      const response = await fetch("/api/dos/circles/override", {
        body: JSON.stringify({
          circle,
          locked,
          personId: person.id,
          reason: locked ? "Pinned from person profile." : "",
          workspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(typeof result.error === "string" ? result.error : "Unable to save pin.");
      }

      setPinMessage(locked ? `Pinned to ${circleDisplayName(circle)}.` : "Pin removed.");
    } catch (error) {
      setPinMessage(error instanceof Error ? error.message : "Unable to save pin.");
    }
  };

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#F5F3EE] px-4 pb-28 pt-7 [scrollbar-width:none]">
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

      <section className="mx-auto mt-5 grid w-full max-w-[280px] grid-cols-2 gap-2">
        <PersonQuickAction icon={<MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} href={person.phone ? `sms:${person.phone}` : undefined} onClick={person.phone ? undefined : onEdit}>
          Text
        </PersonQuickAction>
        <PersonQuickAction icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={() => setIsMoreOpen(true)}>
          More
        </PersonQuickAction>
      </section>

      <div className="mt-5">
        <AppButton icon="log" onClick={onLogMeeting} tone="black">Log Meeting</AppButton>
      </div>

      <div className="mt-5 grid gap-3">
        <DetailCard title="Contact Information">
          <DetailRow
            ariaLabel={person.phone ? `Call ${person.name}` : undefined}
            href={person.phone ? `tel:${person.phone}` : undefined}
            icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
            value={person.phone}
          />
          {person.email ? (
            <DetailRow
              ariaLabel={`Email ${person.name}`}
              href={`mailto:${person.email}`}
              icon={<Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
              value={person.email}
            />
          ) : null}
          {address ? (
            <DetailRow
              ariaLabel={`Open map for ${address}`}
              href={mapHref}
              icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
              onClick={(event) => handleAddressMapClick(event, address)}
              value={address}
            />
          ) : null}
        </DetailCard>

        <DetailCard title="About">
          {person.church ? <DetailRow icon={<Church className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Church" value={person.church} /> : null}
          {defaults.occupation ? <DetailRow icon={<Briefcase className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Occupation" value={defaults.occupation} /> : null}
          {defaults.birthday ? <DetailRow icon={<Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Birthday" value={formatDate(defaults.birthday)} /> : null}
          {!person.church && !defaults.occupation && !defaults.birthday ? <p className="text-sm text-[#77716A]">No details yet.</p> : null}
        </DetailCard>

        <DetailCard title="Activity">
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Meetings" onClick={() => scrollToSection("meetings")} value={personMeetings.length} />
            <StatTile label="Reviews" onClick={() => scrollToSection("reviews")} value={personReviews.length} />
            <StatTile label="Last Contact" onClick={() => scrollToSection("meetings")} value={lastContact} />
          </div>
        </DetailCard>

        <section className="rounded-[22px] border border-[#E2DED6] bg-white p-4">
          <button
            aria-expanded={isIntelligenceOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setIsIntelligenceOpen((current) => !current)}
            type="button"
          >
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
                Relationship Intelligence
              </span>
              <span className="mt-1 block text-sm font-semibold text-[#1E1D1A]">
                My Circle: {circleScore ? `${circleDisplayName(circleScore.circle)} · Score ${scoreLabel(circleScore.totalScore)}` : "Field · Score 0"}
              </span>
              {personMeetings.length && (!circleScore || circleScore.totalScore === 0) ? (
                <span className="mt-1 block text-xs text-[#8A5A12]">Meeting activity found. Score will refresh automatically.</span>
              ) : null}
            </span>
            <ChevronRight className={`h-4 w-4 text-[#A9A29A] transition-transform ${isIntelligenceOpen ? "rotate-90" : ""}`} aria-hidden="true" strokeWidth={1.8} />
          </button>

          {isIntelligenceOpen ? (
            <div className="mt-4 border-t border-[#EEEAE2] pt-4">
              {circleScore ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile label="Score" value={scoreLabel(circleScore.totalScore)} />
                    <StatTile label="Circle" value={circleDisplayName(circleScore.circle)} />
                    <StatTile label="Trust" value={scoreLabel(circleScore.confidenceScore)} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6F6658]" style={{ fontFamily: font.rajdhani }}>
                      {circleScore.assignmentSource === "manual" ? "Manual" : "Automatic"}
                    </span>
                    {Object.entries(circleScore.breakdown).map(([key, value]) => (
                      <span className="rounded-full border border-[#E2DED6] bg-[#F8F7F3] px-2.5 py-1 text-[10px] font-semibold text-[#5F5952]" key={key}>
                        {key.replace(/([A-Z])/g, " $1")} {scoreLabel(value)}
                      </span>
                    ))}
                  </div>
                  <p className="rounded-2xl bg-[#F8F7F3] p-3 text-sm leading-6 text-[#3B3935]">{circleScore.explanation.summary}</p>
                  {circleScore.explanation.positive_factors.length ? (
                    <div className="grid gap-1.5">
                      {circleScore.explanation.positive_factors.map((factor) => (
                        <p className="text-xs leading-5 text-[#5F5952]" key={factor}>+ {factor}</p>
                      ))}
                    </div>
                  ) : null}
                  {circleScore.explanation.negative_factors.length ? (
                    <div className="grid gap-1.5">
                      {circleScore.explanation.negative_factors.map((factor) => (
                        <p className="text-xs leading-5 text-[#8A5A12]" key={factor}>Needs focus · {factor}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    {(["three", "twelve", "seventy", "field"] as const).map((circle) => (
                      <button
                        className="min-h-10 rounded-full border border-[#DDD9D0] bg-[#F8F7F3] px-3 text-xs font-bold text-[#1E1D1A]"
                        key={circle}
                        onClick={() => { void pinToCircle(circle); }}
                        type="button"
                      >
                        Pin {circleDisplayName(circle)}
                      </button>
                    ))}
                    {circleScore.assignmentSource === "manual" ? (
                      <button
                        className="col-span-2 min-h-10 rounded-full border border-[#D7C7A4] bg-[#FFF8E7] px-3 text-xs font-bold text-[#8A5A12]"
                        onClick={() => { void pinToCircle(circleScore.circle, false); }}
                        type="button"
                      >
                        Remove Pin
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9389]" style={{ fontFamily: font.rajdhani }}>
                      Movement History
                    </p>
                    {intelligenceHistory.length ? intelligenceHistory.slice(0, 4).map((item) => (
                      <div className="rounded-2xl bg-[#F8F7F3] p-3" key={`${item.calculatedAt}-${item.newScore}`}>
                        <p className="text-xs font-semibold text-[#1E1D1A]">
                          {item.previousCircle ? `${circleDisplayName(item.previousCircle)} -> ` : ""}{circleDisplayName(item.newCircle)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#77716A]">
                          {item.previousScore === null ? "New score" : `${scoreLabel(item.previousScore)} -> ${scoreLabel(item.newScore)}`} · {formatDate(item.calculatedAt)}
                        </p>
                      </div>
                    )) : (
                      <p className="text-xs text-[#77716A]">No movement history yet.</p>
                    )}
                  </div>
                  {pinMessage ? <p className="rounded-2xl bg-[#FFF8E7] px-3 py-2 text-center text-xs font-semibold text-[#8A5A12]">{pinMessage}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-[#77716A]">Recalculate circles to score this relationship.</p>
              )}
            </div>
          ) : null}
        </section>

        <div ref={meetingsSectionRef}>
          <DetailCard title="Meetings">
            {recentMeetings.length ? recentMeetings.map((meeting) => (
              <button className="flex items-center gap-3 rounded-2xl bg-[#F8F7F3] p-3 text-left transition-colors hover:bg-[#EFEAE1] active:scale-[0.99]" key={meeting.id} type="button" onClick={() => onOpenMeeting(meeting.id)}>
                <CalendarDays className="h-4 w-4 shrink-0 text-[#8A5A12]" aria-hidden="true" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#1E1D1A]">{meetingActivityTitle(meeting)}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#77716A]">{formatDate(meeting.date)}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#3B3935]">{meeting.notes || "No summary added yet."}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#A9A29A]" aria-hidden="true" strokeWidth={1.8} />
              </button>
            )) : <p className="text-sm text-[#77716A]">No meetings yet.</p>}
          </DetailCard>
        </div>

        <div ref={reviewsSectionRef}>
          <DetailCard title="Reviews">
            {personReviews.length ? personReviews.slice(0, 3).map((meeting) => (
              <button className="rounded-2xl bg-[#F8F7F3] p-3 text-left transition-colors hover:bg-[#EFEAE1] active:scale-[0.99]" key={meeting.id} onClick={() => onOpenMeeting(meeting.id)} type="button">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1E1D1A]">Quick Review</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${reviewStatusClass(meeting.review.status)}`} style={{ fontFamily: font.rajdhani }}>
                    {reviewStatusLabel(meeting.review.status)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#3B3935]">{meeting.review.stoodOut || "Review submitted."}</p>
                <p className="mt-2 text-xs text-[#8E8880]">
                  {meeting.review.submittedName ? `${meeting.review.submittedName} · ` : ""}
                  {meetingActivityTitle(meeting)} · {formatDate(meeting.review.submittedAt ?? meeting.date)}
                </p>
              </button>
            )) : <p className="text-sm text-[#77716A]">No reviews yet.</p>}
          </DetailCard>
        </div>
      </div>

      {isMoreOpen ? (
        <Sheet onClose={() => setIsMoreOpen(false)} title="More">
          <div className="grid gap-2">
            <MoreMenuAction icon={<Share2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={() => { void shareContact(); }}>
              Share Contact
            </MoreMenuAction>
            <MoreMenuAction disabled={!person.phone} icon={<Copy className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={() => { void copyToClipboard(person.phone, "Phone"); }}>
              Copy Phone
            </MoreMenuAction>
            <MoreMenuAction disabled={!person.email} icon={<Copy className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={() => { void copyToClipboard(person.email ?? "", "Email"); }}>
              Copy Email
            </MoreMenuAction>
            <MoreMenuAction disabled={!address} icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={() => openAddressInMaps(address)}>
              Open in Maps
            </MoreMenuAction>
            <MoreMenuAction icon={<Pencil className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} onClick={() => { setIsMoreOpen(false); onEdit(); }}>
              Edit Details
            </MoreMenuAction>
            {moreMessage ? <p className="rounded-2xl bg-[#FFF8E7] px-3 py-2 text-center text-xs font-semibold text-[#8A5A12]">{moreMessage}</p> : null}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function ReviewActionButton({
  children,
  disabled,
  icon,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl border border-[#D7C7A4] bg-[#FFF8E7] px-1.5 text-[11px] font-bold text-[#8A5A12] transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function MeetingDetailOverlay({
  isSendingReview,
  meeting,
  onCopyReview,
  onBack,
  onEdit,
  onLogMeeting,
  onSendReview,
  onShareReview,
  people,
  reviewShareMessage,
}: {
  isSendingReview?: boolean;
  meeting: DosAppMeeting;
  onCopyReview: () => void;
  onBack: () => void;
  onEdit: () => void;
  onLogMeeting: () => void;
  onSendReview: () => void;
  onShareReview: () => void;
  people: DosAppPerson[];
  reviewShareMessage?: string;
}) {
  const isTableMeeting = meeting.source === "table";
  const temperature = meeting.conversationFlowKey === "kitchen_table_gospel"
    ? relationshipWithJesusTemperature(responseAsNumber(meeting.conversationResponses.relationshipWithJesus))
    : null;
  const avatarNames = meetingAvatarNames(meeting, people);
  const title = meetingPeopleTitle(meeting, people);

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#F5F3EE] px-4 pb-28 pt-7 [scrollbar-width:none]">
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

      <div className="mt-5 grid gap-2">
        <AppButton icon="log" onClick={onLogMeeting} tone="black">Log Meeting</AppButton>
      </div>

      <div className="mt-5 grid gap-3">
        {isTableMeeting ? (
          <DetailCard title="Review Status">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1E1D1A]">{reviewStatusLabel(meeting.review.status)}</p>
                <p className="mt-1 text-xs leading-5 text-[#77716A]">
                  {meeting.review.status === "not_sent"
                    ? "Create a quick check-in link."
                    : meeting.review.status === "pending"
                      ? "Link ready. Waiting for a response."
                      : meeting.review.submittedAt
                        ? `Received ${formatDate(meeting.review.submittedAt)}.`
                        : "Review received."}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${reviewStatusClass(meeting.review.status)}`} style={{ fontFamily: font.rajdhani }}>
                {reviewStatusLabel(meeting.review.status)}
              </span>
            </div>
            {meeting.review.status !== "not_sent" && meeting.review.sharePermission ? (
              <span className="mt-3 inline-flex rounded-full border border-[#E2DED6] bg-[#F8F7F3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6F6658]" style={{ fontFamily: font.rajdhani }}>
                {reviewSharePermissionLabel(meeting.review.sharePermission)}
              </span>
            ) : null}
            {meeting.review.stoodOut ? (
              <p className="mt-3 line-clamp-3 rounded-2xl bg-[#F8F7F3] p-3 text-sm leading-6 text-[#3B3935]">{meeting.review.stoodOut}</p>
            ) : null}
            {meeting.review.status === "not_sent" || meeting.review.status === "pending" ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <ReviewActionButton disabled={isSendingReview} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendReview}>
                  Send Review
                </ReviewActionButton>
                <ReviewActionButton disabled={isSendingReview} icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onCopyReview}>
                  Copy Link
                </ReviewActionButton>
                <ReviewActionButton disabled={isSendingReview} icon={<Share2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onShareReview}>
                  Share
                </ReviewActionButton>
              </div>
            ) : null}
            {reviewShareMessage ? (
              <p className="mt-3 rounded-2xl border border-[#E2DED6] bg-[#FFF8E7] px-3 py-2 text-center text-xs font-semibold text-[#8A5A12]">{reviewShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        <DetailCard title="Summary">
          <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Notes" value={meeting.notes || "No summary added yet."} />
        </DetailCard>

        <ConversationFlowDetail meeting={meeting} />

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
  const [isCirclesOpen, setIsCirclesOpen] = useState(false);
  const [isAdditionalPersonInfoOpen, setIsAdditionalPersonInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [conversationResponses, setConversationResponses] = useState<DosConversationResponses>({});
  const [meetingPeopleQuery, setMeetingPeopleQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [reviewLinksByMeetingId, setReviewLinksByMeetingId] = useState<Record<string, string>>({});
  const [reviewLinkMeetingId, setReviewLinkMeetingId] = useState<string | null>(null);
  const [reviewShareMessage, setReviewShareMessage] = useState("");
  const [selectedConversationFlow, setSelectedConversationFlow] = useState<DosConversationFlowKey>("none");
  const [selectedMeetingContext, setSelectedMeetingContext] = useState<DosAppMeetingType>("kitchen_table");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMeetingPersonIds, setSelectedMeetingPersonIds] = useState<string[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipTypeValue>(defaultRelationshipType);
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const visibleFruit = useMemo(() => data.fruit.filter((fruit) => fruit.status !== "archived"), [data.fruit]);
  const people = data.people;
  const latestMeeting = data.meetings[0];
  const latestFruit = visibleFruit[0];
  const visiblePeople = useMemo(() => filteredPeople(people, peopleQuery), [people, peopleQuery]);
  const scoreByPersonId = useMemo(() => {
    const scores = data.circles ? [...data.circles.my3, ...data.circles.my12, ...data.circles.my70, ...data.circles.field] : [];

    return new Map(scores.map((score) => [score.person.id, score]));
  }, [data.circles]);
  const meetingPeopleOptions = useMemo(() => filteredPeople(people, meetingPeopleQuery), [people, meetingPeopleQuery]);
  const draftRecommendedResources = useMemo(() => (
    buildMeetingRecommendations(selectedConversationFlow, conversationResponses)
  ), [conversationResponses, selectedConversationFlow]);
  const featuredTableTeaching = dosTableTeachingResources[0];
  const secondaryTableTeachings = dosTableTeachingResources.slice(1);
  const showTableTeachings = libraryFilter === "all" || libraryFilter === "teachings";
  const showFollowUpResources = libraryFilter === "all" || libraryFilter === "follow_up";
  const selectedMeeting = useMemo(() => data.meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null, [data.meetings, selectedMeetingId]);
  const selectedMeetingWithReview = useMemo(() => {
    if (!selectedMeeting) {
      return null;
    }

    const token = reviewLinksByMeetingId[selectedMeeting.id];

    if (!token || selectedMeeting.review.status !== "not_sent") {
      return selectedMeeting;
    }

    return {
      ...selectedMeeting,
      review: {
        ...selectedMeeting.review,
        status: "pending" as const,
        token,
      },
    };
  }, [reviewLinksByMeetingId, selectedMeeting]);
  const selectedPerson = useMemo(() => people.find((person) => person.id === selectedPersonId) ?? null, [people, selectedPersonId]);
  const attentionPeople = useMemo(() => people.filter(isNeedsAttention), [people]);
  const my3People = (data.circles?.my3 ?? []).map((score) => ({ person: people.find((person) => person.id === score.person.id), score })).filter((item): item is { person: DosAppPerson; score: DosRelationshipScore } => Boolean(item.person));
  const my12People = (data.circles?.my12 ?? []).map((score) => ({ person: people.find((person) => person.id === score.person.id), score })).filter((item): item is { person: DosAppPerson; score: DosRelationshipScore } => Boolean(item.person));
  const my70People = (data.circles?.my70 ?? []).map((score) => ({ person: people.find((person) => person.id === score.person.id), score })).filter((item): item is { person: DosAppPerson; score: DosRelationshipScore } => Boolean(item.person));
  const my12CirclePeople = uniqueCircleMembers([...my3People, ...my12People]).slice(0, 12);
  const my70CirclePeople = uniqueCircleMembers([...my3People, ...my12People, ...my70People]).slice(0, 70);
  const meetingCountByPersonId = useMemo(() => {
    const counts = new Map<string, number>();

    data.meetings.forEach((meeting) => {
      meeting.fieldPersonIds.forEach((personId) => {
        counts.set(personId, (counts.get(personId) ?? 0) + 1);
      });
    });

    return counts;
  }, [data.meetings]);
  const todayFocusPeople = useMemo(() => {
    const preferredPeople = attentionPeople.length
      ? attentionPeople
      : my3People.map((item) => item.person);

    return preferredPeople.slice(0, 3);
  }, [attentionPeople, my3People]);
  const workspaceLabel = data.workspace.isUsamWorkspace ? `${data.workspace.displayName} · USA` : data.workspace.displayName;
  const selectedPersonDefaults = personFormDefaults(selectedPerson);

  function resetMeetingDraft(personIds: string[] = []) {
    setConversationResponses({});
    setMeetingPeopleQuery("");
    setSelectedConversationFlow("none");
    setSelectedMeetingContext("kitchen_table");
    setSelectedMeetingPersonIds(personIds);
  }

  function closeForm() {
    setErrorMessage("");
    setFormMode(null);
    setIsAdditionalPersonInfoOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
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

  function handleConversationFlowChange(flowKey: DosConversationFlowKey) {
    setSelectedConversationFlow(flowKey);
    setConversationResponses({});
  }

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setErrorMessage("");
    setIsCirclesOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setSelectedMeetingId(null);
    setSelectedPersonId(null);
  }

  function openPersonDetail(personId: string) {
    setActiveTab("people");
    setErrorMessage("");
    setIsCirclesOpen(false);
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
    setActiveTab("meetings");
    setErrorMessage("");
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
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
    setConversationResponses(meeting.conversationFlowKey !== "none" ? meeting.conversationResponses : {});
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
      conversationResponses: conversationFlowKey !== "none" ? conversationResponses : {},
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
      conversationResponses: conversationFlowKey !== "none" ? conversationResponses : {},
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

  function reviewUrlFromToken(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/dos/review/${token}`
      : `/dos/review/${token}`;
  }

  function existingReviewUrl(meeting: DosAppMeeting) {
    const token = reviewLinksByMeetingId[meeting.id] ?? meeting.review.token;

    return token ? reviewUrlFromToken(token) : null;
  }

  async function ensureReviewLink(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return null;
    }

    const existingUrl = existingReviewUrl(meeting);

    if (existingUrl) {
      return existingUrl;
    }

    const response = await fetch("/api/dos/app/review-links", {
      body: JSON.stringify({
        meetingId: meeting.id,
        workspaceId: data.workspace.id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as { error?: string; token?: string; url?: string };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "Unable to create review link.");
    }

    if (result.token) {
      setReviewLinksByMeetingId((current) => ({
        ...current,
        [meeting.id]: result.token as string,
      }));
    }

    return result.url;
  }

  async function copyReviewUrl(url: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);

      return true;
    }

    return false;
  }

  async function handleCopyReview(meeting: DosAppMeeting) {
    setErrorMessage("");
    setReviewLinkMeetingId(meeting.id);
    setReviewShareMessage("");

    try {
      const url = await ensureReviewLink(meeting);

      if (!url) {
        return;
      }

      const copied = await copyReviewUrl(url);

      setReviewShareMessage(copied ? "Review link copied." : url);
    } catch (error) {
      setReviewShareMessage(error instanceof Error ? error.message : "Unable to create review link.");
    } finally {
      setReviewLinkMeetingId(null);
    }
  }

  async function handleShareReview(meeting: DosAppMeeting) {
    setErrorMessage("");
    setReviewLinkMeetingId(meeting.id);
    setReviewShareMessage("");

    try {
      const url = await ensureReviewLink(meeting);

      if (!url) {
        return;
      }

      // TODO: Add SMS/email/WhatsApp sending from this link once DOS messaging workflows exist.
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            text: "Quick check-in for our conversation.",
            title: "DOS Quick Review",
            url,
          });
          setReviewShareMessage("Review link shared.");
          return;
        } catch {
          // Fall through to clipboard for browsers that cancel or block sharing.
        }
      }

      const copied = await copyReviewUrl(url);

      setReviewShareMessage(copied ? "Review link copied." : url);
    } catch (error) {
      setReviewShareMessage(error instanceof Error ? error.message : "Unable to share review link.");
    } finally {
      setReviewLinkMeetingId(null);
    }
  }

  async function handleSendReview(meeting: DosAppMeeting) {
    await handleShareReview(meeting);
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

  function handleConversationResponse(questionId: string, value: DosConversationResponseValue | undefined) {
    setConversationResponses((current) => {
      if (value === undefined || value === "") {
        const { [questionId]: _removed, ...rest } = current;

        return rest;
      }

      return {
        ...current,
        [questionId]: value,
      };
    });
  }

  function handleConversationFollowUpAction(actionId: string) {
    setConversationResponses((current) => {
      const currentActions = responseAsStringArray(current.followUpActions);
      const nextActions = currentActions.includes(actionId)
        ? currentActions.filter((currentAction) => currentAction !== actionId)
        : [...currentActions, actionId];

      if (!nextActions.length) {
        const { followUpActions: _removed, ...rest } = current;

        return rest;
      }

      return {
        ...current,
        followUpActions: nextActions,
      };
    });
  }

  return (
    <div className="min-h-[100dvh] bg-[#EDEAE3] text-[#1E1D1A] sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[#F5F3EE] shadow-[0_18px_60px_rgba(42,37,29,0.08)] sm:h-[calc(100dvh-3rem)] sm:max-h-[860px] sm:max-w-[390px] sm:rounded-[34px] sm:border sm:border-[#DED9CF]">
        <div className="h-full overflow-y-auto px-4 pb-28 pt-8 [scrollbar-width:none]">
          <header className="relative">
            {activeTab === "more" ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A6417]" style={{ fontFamily: font.rajdhani }}>
                  Library
                </p>
                <h1 className="mt-1 text-[30px] font-bold leading-none text-[#1E1D1A]">Resources</h1>
                <p className="mt-1 text-[13px] leading-5 text-[#77716A]">For conversations and follow up.</p>
                <button
                  aria-label="Search library"
                  className="absolute right-0 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-[#1E1D1A] transition-colors hover:border-[#E2DED6] hover:bg-white"
                  type="button"
                >
                  <Search className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E1D1A]" style={{ fontFamily: font.rajdhani }}>
                    DOS
                  </p>
                  <h1 className="mt-1 max-w-[250px] text-4xl font-bold leading-[0.92] tracking-[-0.02em] text-[#111111]" style={{ fontFamily: font.oswald }}>
                    Discipleship on the go.
                  </h1>
                </div>
                <span className="absolute right-0 top-0 rounded-full border border-[#D9D4CA] bg-[#F8F7F3] px-4 py-1.5 text-xs font-medium text-[#1E1D1A]">
                  Field
                </span>
              </>
            )}
          </header>

          <main className={activeTab === "more" ? "mt-5" : "mt-7"}>
            {activeTab === "home" ? (
              <div className="space-y-5">
                <CircleFocusHero
                  my12={my12CirclePeople}
                  my3={my3People}
                  my70={my70CirclePeople}
                  onViewCircles={() => setIsCirclesOpen(true)}
                />

                <section className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <HomeActionPill icon="add" onClick={() => openForm("person")}>Add Person</HomeActionPill>
                  <HomeActionPill icon="log" onClick={() => openForm("meeting")}>Log Meeting</HomeActionPill>
                  <HomeActionPill icon="search" onClick={() => setActiveTab("people")}>Search</HomeActionPill>
                </section>

                <section>
                  <SectionHeading title="Today's Focus" />
                  {todayFocusPeople.length ? (
                    <div className="grid gap-2">
                      {todayFocusPeople.map((person, index) => (
                        <FocusRow
                          action={!person.lastActivityAt ? "no contact yet" : isNeedsAttention(person) ? "log follow up" : "stay close today"}
                          index={index}
                          key={person.id}
                          onClick={() => openPersonDetail(person.id)}
                          person={person}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#77716A]">No focus items right now.</div>
                  )}
                </section>

                <section>
                  <SectionHeading title="Recent Activity" />
                  <div className="grid gap-2">
                    {latestMeeting ? (
                      <RecentActivityRow
                        icon="log"
                        onClick={() => setActiveTab("meetings")}
                        title="Latest meeting"
                      >
                        {meetingPeopleTitle(latestMeeting, people)} · {meetingActivityTitle(latestMeeting)} · {formatRelativeDate(latestMeeting.date)}
                      </RecentActivityRow>
                    ) : null}
                    {latestFruit ? (
                      <RecentActivityRow
                        icon="fruit"
                        onClick={() => setActiveTab("fruit")}
                        title="Latest fruit"
                      >
                        {latestFruit.summary || "Fruit recorded"} · {formatDate(latestFruit.testimonyDate)}
                      </RecentActivityRow>
                    ) : null}
                    {!latestMeeting && !latestFruit ? (
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#77716A]">Log a meeting to begin your activity rhythm.</div>
                    ) : null}
                  </div>
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
                ) : people.length ? (
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
                <div className="grid gap-3">{data.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onClick={() => openMeetingDetail(meeting.id)} people={people} />)}</div>
              ) : (
                <EmptyState action={<CompactButton icon="log" onClick={() => openForm("meeting")}>Log Meeting</CompactButton>} text="Capture the next conversation, table, call, or prayer moment." title="No meetings logged yet." />
              )}
              </div>
            ) : null}

            {activeTab === "fruit" ? (
              <div>
              <SectionHeading action={<CompactButton icon="fruit" onClick={() => openForm("fruit")}>Record</CompactButton>} title="Fruit" />
              {visibleFruit.length ? (
                <div className="grid gap-3">{visibleFruit.map((fruit) => <FruitCard fruit={fruit} key={fruit.id} people={people} />)}</div>
              ) : (
                <EmptyState action={<CompactButton icon="fruit" onClick={() => openForm("fruit")}>Record Fruit</CompactButton>} text="Record what changed when you see spiritual movement." title="No fruit recorded yet." />
              )}
              </div>
            ) : null}

            {activeTab === "more" ? (
              <div>
              <div className="mb-6 flex flex-wrap gap-1.5">
                {libraryFilters.map((filter) => {
                  const isActive = libraryFilter === filter.value;

                  return (
                    <button
                      className={`min-h-8 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                        isActive
                          ? "border-[#111111] bg-[#111111] text-white"
                          : "border-[#DDD5C9] bg-white text-[#5E584F] hover:border-[#C99A2F]"
                      }`}
                      key={filter.value}
                      onClick={() => setLibraryFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6">
                {showTableTeachings ? (
                  <LibrarySection
                    title="Table Teachings"
                  >
                    <div className="grid gap-3">
                      <FeaturedTeachingCard
                        description={featuredTableTeaching.description}
                        href={featuredTableTeaching.href}
                        title={featuredTableTeaching.title}
                      />
                      {secondaryTableTeachings.map((teaching) => (
                        <TableTeachingRow
                          description={teaching.description}
                          href={teaching.href}
                          key={teaching.href}
                          title={teaching.title}
                        />
                      ))}
                    </div>
                  </LibrarySection>
                ) : null}

                {showFollowUpResources ? (
                  <LibrarySection
                    subtext="To send after a conversation."
                    title="Follow Up Resources"
                  >
                    <FollowUpGuideList />
                  </LibrarySection>
                ) : null}
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

        {isCirclesOpen ? (
          <CirclesDetailOverlay
            meetingCountByPersonId={meetingCountByPersonId}
            my12={my12CirclePeople}
            my3={my3People}
            my70={my70CirclePeople}
            onBack={() => setIsCirclesOpen(false)}
            onOpenPerson={openPersonDetail}
          />
        ) : null}

        {selectedPerson ? (
          <PersonDetailOverlay
            index={Math.max(0, people.findIndex((person) => person.id === selectedPerson.id))}
            meetings={data.meetings}
            onBack={() => setSelectedPersonId(null)}
            onEdit={() => openPersonEdit(selectedPerson)}
            onLogMeeting={() => openMeetingForPerson(selectedPerson.id)}
            onOpenMeeting={openMeetingDetail}
            person={selectedPerson}
            circleScore={scoreByPersonId.get(selectedPerson.id) ?? null}
            workspaceId={data.workspace.id}
          />
        ) : null}

        {selectedMeetingWithReview ? (
          <MeetingDetailOverlay
            isSendingReview={reviewLinkMeetingId === selectedMeetingWithReview.id}
            meeting={selectedMeetingWithReview}
            onBack={() => setSelectedMeetingId(null)}
            onCopyReview={() => handleCopyReview(selectedMeetingWithReview)}
            onEdit={() => openMeetingEdit(selectedMeetingWithReview)}
            onLogMeeting={() => openForm("meeting")}
            onSendReview={() => handleSendReview(selectedMeetingWithReview)}
            onShareReview={() => handleShareReview(selectedMeetingWithReview)}
            people={people}
            reviewShareMessage={reviewShareMessage}
          />
        ) : null}

        <BottomNavigation activeTab={activeTab} onSelect={selectTab} />
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
              allPeople={people}
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
              allowConversationFlows={data.workspace.isUsamWorkspace}
              onChange={handleConversationFlowChange}
              value={selectedConversationFlow}
            />
            {selectedConversationFlow !== "none" ? (
              <ConversationFlowExperience
                flowKey={selectedConversationFlow}
                onResponseChange={handleConversationResponse}
                onToggleFollowUpAction={handleConversationFollowUpAction}
                responses={conversationResponses}
              />
            ) : null}
            <MeetingCaptureNotes />
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
              allPeople={people}
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
              allowConversationFlows={data.workspace.isUsamWorkspace}
              onChange={handleConversationFlowChange}
              value={selectedConversationFlow}
            />
            {selectedConversationFlow !== "none" ? (
              <ConversationFlowExperience
                flowKey={selectedConversationFlow}
                onResponseChange={handleConversationResponse}
                onToggleFollowUpAction={handleConversationFollowUpAction}
                responses={conversationResponses}
              />
            ) : null}
            <MeetingCaptureNotes defaultValue={selectedMeeting.notes} />
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
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
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
