"use client";

import Link from "next/link";
import { ArrowLeft, Bell, BookOpen, Briefcase, Cake, CalendarDays, Camera, ChevronRight, Church, Copy, Droplet, ExternalLink, FileImage, Flame, Gift, HelpCircle, LogOut, Mail, MapPin, Megaphone, MessageCircle, Mic, Moon, MoreHorizontal, Palette, Pencil, Phone, Search, Send, Settings, Share2, Shield, Sparkles, Square, StickyNote, Upload, User, Users, X } from "lucide-react";
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
import type { DosAppData, DosAppFruit, DosAppFruitEvent, DosAppLeaderReflection, DosAppMeeting, DosAppMeetingType, DosAppParticipantReview, DosAppParticipantTestimony, DosAppPerson, DosAppReviewStatus, DosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { personNotesToPlainText, splitPersonNotesValue } from "@/src/lib/dos/person-notes";
import {
  defaultRelationshipModel,
  discipleshipStageLabel,
  discipleshipStageOptions,
  relationshipContextLabel,
  relationshipContextOptions,
  relationshipModelFromRelationshipType,
  relationshipModelSummary,
  relationshipTypeFromModel,
  relationshipTypeOptions,
  roleInMyLifeLabel,
  roleInMyLifeOptions,
  type DiscipleshipStageValue,
  type DosRelationshipModel,
  type RelationshipContextValue,
  type RelationshipTypeValue,
  type RoleInMyLifeValue,
} from "@/src/lib/dos/relationship-model";
import { dosFollowUpGuideResources, dosTableTeachingResources } from "@/src/lib/dos/guide-resources";

const font = { oswald: "'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };

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
  "Gospel Conversation",
  "Prayer Received",
  "Salvation",
  "Re Dedication",
  "Baptism",
  "Joined Discipleship",
  "Church Visit",
  "Joined Church",
  "Shared Testimony",
  "Started Discipling Others",
  "Marketplace Ministry",
  "Prayer Request",
  "Freedom / Deliverance",
  "Repentance",
  "Ongoing Accountability",
] as const;

const libraryFilters = [
  { label: "All", value: "all" },
  { label: "Teachings", value: "teachings" },
  { label: "Follow up", value: "follow_up" },
] as const;

type ActiveTab = typeof tabs[number]["value"];
type ButtonTone = "black" | "soft" | "white";
type CircleFocusView = "seventy" | "three" | "twelve";
type FormMode = "editMeeting" | "editPerson" | "fruit" | "meeting" | "person" | "reflection" | null;
type IconName = typeof tabs[number]["icon"] | "add" | "arrow" | "bell" | "calendar" | "log" | "search";
type LibraryFilter = typeof libraryFilters[number]["value"];
type MeetingCaptureType = "photo" | "screenshot" | "voice";
type MeetingCaptureDraft = {
  file: Blob;
  fileName: string;
  id: string;
  previewUrl?: string;
  type: MeetingCaptureType;
};
type SegmentedTabOption<T extends string> = {
  label: string;
  value: T;
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
type PeopleImportRow = {
  church: string;
  city: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  notes: string;
  phone: string;
  sourceRowNumber: number;
  state: string;
};
type PeopleImportAnalysis = {
  duplicateRows: PeopleImportRow[];
  invalidRows: PeopleImportRow[];
  readyRows: PeopleImportRow[];
};
type PeopleImportResult = {
  duplicateCount: number;
  importedCount: number;
  invalidCount: number;
  skippedCount: number;
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
          <path d="M12 21V10" />
          <path d="M12 13.5c-3.7 0-6.2-2.3-7-6.6 4 .1 6.5 2.2 7 6.6Z" />
          <path d="M12 11.5c.9-3.8 3.4-5.8 7.2-5.9-.4 4.3-3 6.4-7.2 5.9Z" />
          <path d="M12 18c2.3-.4 4-1.7 5.1-3.9" />
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

function currentWeekRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

function isDateWithinRange(value: string | null | undefined, start: Date, end: Date) {
  const date = value ? parseDisplayDate(value) : null;

  return Boolean(date && date.getTime() >= start.getTime() && date.getTime() <= end.getTime());
}

function formatWeekRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
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

function isPrayerMeeting(meeting: DosAppMeeting) {
  const content = `${meetingActivityTitle(meeting)} ${meeting.notes ?? ""}`.toLowerCase();

  return meeting.type === "prayer" || content.includes("prayer") || content.includes("pray");
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
    ? "border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]"
    : "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]";
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

function fruitSourceLabel(value: DosAppFruitEvent["sourceType"]) {
  return {
    leader_reflection: "Leader Reflection",
    manual: "Manual",
    participant_review: "Review",
    system: "System",
    testimony: "Testimony",
  }[value];
}

function confidenceLabel(value: DosAppFruitEvent["confidenceLevel"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function visibilityLabel(value: DosAppFruitEvent["visibility"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "None";
}

function fruitNarrative(event: DosAppFruitEvent) {
  if (event.description) {
    return event.description;
  }

  if (event.sourceType === "leader_reflection") {
    return "Observed in a Leader Reflection.";
  }

  if (event.sourceType === "participant_review") {
    return "Confirmed through a participant Review.";
  }

  if (event.sourceType === "testimony") {
    return "Confirmed through a shared story.";
  }

  if (event.sourceType === "system") {
    return "Verified from repeated engagement patterns.";
  }

  return "Recorded as structured Fruit.";
}

function sourceTransparencyLabel(event: DosAppFruitEvent) {
  if (event.confidenceLevel === "observed" || event.sourceType === "leader_reflection") {
    return "Observed by leader";
  }

  if (event.confidenceLevel === "confirmed" || event.sourceType === "participant_review" || event.sourceType === "testimony") {
    return "Confirmed by participant";
  }

  return "Verified by behavior";
}

function fruitSourceLine(event: DosAppFruitEvent) {
  const source = {
    leader_reflection: "From a Leader Reflection",
    manual: "Added manually",
    participant_review: "From a participant review",
    system: "From engagement patterns",
    testimony: "From a shared story",
  }[event.sourceType];

  return event.meetingId ? `${source} after a meeting` : source;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function personRelationshipModel(person: DosAppPerson): DosRelationshipModel {
  return {
    discipleshipStage: person.discipleshipStage,
    relationshipContext: person.relationshipContext,
    roleInMyLife: person.roleInMyLife,
  };
}

function relationshipModelForPerson(person: DosAppPerson): DosRelationshipModel {
  return personRelationshipModel(person);
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

function relationshipLine(person: DosAppPerson) {
  return relationshipModelSummary(personRelationshipModel(person));
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

function firstNameFromDisplayName(name: string) {
  const cleaned = name.split(/[,&+]/)[0]?.trim() ?? "";
  const first = cleaned.split(/\s+/)[0]?.trim();

  return first || "Ryan";
}

function cleanIdentitySegment(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function workspaceIdentityName(workspace: DosAppWorkspace) {
  const displayName = cleanIdentitySegment(workspace.displayName);
  const normalizedName = displayName?.toLowerCase().replace(/\s+/g, " ");

  if (normalizedName === "ryan & brooke fox" || normalizedName === "ryan and brooke fox") {
    return "Fox Family";
  }

  return displayName ?? "My Field";
}

function workspaceFieldSublabel(workspace: DosAppWorkspace) {
  return [
    cleanIdentitySegment(workspace.stateName),
    cleanIdentitySegment(workspace.organizationName),
  ].filter(Boolean).join(" · ");
}

function workspaceProfileName(workspace: DosAppWorkspace, fallbackFirstName: string) {
  const providedName = cleanIdentitySegment(workspace.userFullName);

  if (providedName) {
    return providedName;
  }

  const displayName = cleanIdentitySegment(workspace.displayName);
  const normalizedName = displayName?.toLowerCase().replace(/\s+/g, " ");

  if (normalizedName === "fox family" || normalizedName === "ryan & brooke fox" || normalizedName === "ryan and brooke fox") {
    return "Ryan Fox";
  }

  return fallbackFirstName;
}

function workspaceProfileEmail(workspace: DosAppWorkspace) {
  return cleanIdentitySegment(workspace.userEmail) ?? (workspace.isPreview ? "ryan@foxfamily.org" : "");
}

function workspaceProfilePhone(workspace: DosAppWorkspace) {
  return cleanIdentitySegment(workspace.userPhone) ?? "";
}

function localTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

const circleFocusHeadlines = [
  "Tend your three.",
  "Stay close to your people.",
  "Steward your field.",
  "Faithful with a few.",
  "Who's on your heart?",
  "One conversation at a time.",
  "Start with prayer.",
] as const;

const currentRhythmDay = 14;

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();

  return Math.floor(diff / 86400000);
}

function circleFocusHeadline(date = new Date()) {
  return circleFocusHeadlines[getDayOfYear(date) % circleFocusHeadlines.length];
}

function homeDateSubtitle(date = new Date(), rhythmDay = currentRhythmDay) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);

  return `${formattedDate} · Day ${rhythmDay}`;
}

function avatarTone(index: number) {
  return ["bg-[#EBF2FF] text-[#1D4ED8]", "bg-[#EBF2FF] text-[#2563EB]", "bg-[#F1F5F9] text-[#64748B]", "bg-[#E2E8F0] text-[#0F172A]"][index % 4];
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
    || relationshipLine(person).toLowerCase().includes(search)
    || normalizeText(person.status).toLowerCase().includes(search)
  ));
}

function normalizeCsvHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvText(text: string) {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (isQuoted && nextCharacter === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (character === "," && !isQuoted) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  const cleanedRows = rows
    .map((row) => row.map((field) => field.trim()))
    .filter((row) => row.some((field) => field.trim()));
  const headers = cleanedRows[0] ?? [];

  return {
    headers,
    rows: cleanedRows.slice(1),
  };
}

function csvValue(headers: readonly string[], row: readonly string[], aliases: readonly string[]) {
  const normalizedAliases = aliases.map(normalizeCsvHeader);
  const index = headers.findIndex((header) => normalizedAliases.includes(normalizeCsvHeader(header)));

  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function mapDosPeopleCsvRow(headers: readonly string[], row: readonly string[], rowIndex: number): PeopleImportRow {
  const firstName = csvValue(headers, row, ["first_name", "first name", "firstname"]);
  const lastName = csvValue(headers, row, ["last_name", "last name", "lastname"]);
  const fallbackName = csvValue(headers, row, ["name", "full_name", "full name", "display_name", "display name"]);

  return {
    church: csvValue(headers, row, ["church", "church_attending", "church attending", "spiritual community", "community"]),
    city: csvValue(headers, row, ["city"]),
    email: csvValue(headers, row, ["email", "home email", "email address"]),
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName,
    notes: csvValue(headers, row, ["notes", "note", "comments", "comment"]),
    phone: csvValue(headers, row, ["phone", "phone number", "mobile phone", "mobile phone number", "cell", "cell phone"]),
    sourceRowNumber: rowIndex + 2,
    state: csvValue(headers, row, ["state", "province"]),
  };
}

function peopleImportPhoneKey(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function peopleImportEmailKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function peopleImportNameKey(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function peopleImportKeys(person: Pick<PeopleImportRow, "email" | "name" | "phone"> | Pick<DosAppPerson, "email" | "name" | "phone">) {
  return [
    peopleImportPhoneKey(person.phone) ? `phone:${peopleImportPhoneKey(person.phone)}` : "",
    peopleImportEmailKey(person.email) ? `email:${peopleImportEmailKey(person.email)}` : "",
    peopleImportNameKey(person.name) ? `name:${peopleImportNameKey(person.name)}` : "",
  ].filter(Boolean);
}

function analyzePeopleImportRows(rows: PeopleImportRow[], existingPeople: DosAppPerson[]): PeopleImportAnalysis {
  const duplicateKeySet = new Set<string>();
  const duplicateRows: PeopleImportRow[] = [];
  const invalidRows: PeopleImportRow[] = [];
  const readyRows: PeopleImportRow[] = [];

  existingPeople.forEach((person) => {
    peopleImportKeys(person).forEach((key) => duplicateKeySet.add(key));
  });

  rows.forEach((row) => {
    if (!row.name.trim()) {
      invalidRows.push(row);
      return;
    }

    const keys = peopleImportKeys(row);

    if (keys.some((key) => duplicateKeySet.has(key))) {
      duplicateRows.push(row);
      return;
    }

    keys.forEach((key) => duplicateKeySet.add(key));
    readyRows.push(row);
  });

  return { duplicateRows, invalidRows, readyRows };
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
    black: "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:brightness-[0.98]",
    soft: "border border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] hover:bg-white",
    white: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#BFDBFE]",
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
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
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
    <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 text-sm leading-6 text-[#64748B]">
      <p className="font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function FieldInputClass() {
  return "mt-2 min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]";
}

function FieldTextareaClass() {
  return "mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]";
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
  const className = "rounded-xl bg-[#F1F5F9] px-3 py-3.5 text-center";
  const interactiveClassName = `${className} cursor-pointer transition-colors hover:bg-[#EBF2FF] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35`;
  const valueClassName = typeof value === "number"
    ? "text-[21px] font-bold leading-none text-[#0F172A]"
    : "text-[13px] font-bold leading-tight text-[#0F172A]";
  const content = (
    <>
      <p className={valueClassName}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F1F5F9] px-3 py-3.5">
      <p className="line-clamp-2 text-sm font-bold leading-tight text-[#0F172A]">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
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
      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
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
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          {title}
        </h2>
        {subtext ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{subtext}</p> : null}
      </div>
      {children}
    </section>
  );
}

function followUpResourceIcon(title: string) {
  switch (title) {
    case "Attending Church":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Church };
    case "Daily Bible Reading":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: BookOpen };
    case "Baptism":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Droplet };
    case "Biblical Giving":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Gift };
    case "Discipleship":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Users };
    case "Evangelism":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Megaphone };
    case "Prayer and Fasting":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Flame };
    case "Sabbath":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Moon };
    case "Spiritual Gifts":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Sparkles };
    default:
      return { className: "bg-[#F1F5F9] text-[#64748B]", IconComponent: BookOpen };
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
    <article className="overflow-hidden rounded-[24px] border border-[#BFDBFE] bg-[#EBF2FF] shadow-[0_16px_34px_rgba(42,37,29,0.07)]">
      <div className="relative p-4 pb-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            Start here
          </span>
          <h3 className="mt-3 text-lg font-bold leading-tight text-[#0F172A]">{title}</h3>
          <p className="mt-1 text-xs font-medium leading-4 text-[#1D4ED8]">{description}</p>
        </div>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-[#2563EB]">
          <BookOpen className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </div>
      </div>
      <div className="bg-[#EBF2FF]/80 p-3">
        <a
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-[11px] font-bold text-white transition-colors hover:brightness-[0.98]"
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
      className="flex min-h-[72px] items-center gap-2.5 rounded-[20px] border border-[#BFDBFE] bg-[#FFFFFF] px-3 py-2.5 shadow-[0_10px_24px_rgba(42,37,29,0.04)] transition-colors hover:border-[#BFDBFE]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EBF2FF] text-[#1D4ED8]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#0F172A]">{title}</span>
        <span className="mt-1 block line-clamp-2 text-xs leading-4 text-[#64748B]">{shortDescription}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
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
      className="group flex min-h-[64px] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[#FFFFFF]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <IconComponent className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#0F172A]">{title}</span>
        <span className="mt-0.5 block line-clamp-1 text-xs leading-4 text-[#64748B]">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5" aria-hidden="true" strokeWidth={1.9} />
    </a>
  );
}

function FollowUpGuideList() {
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white shadow-[0_12px_28px_rgba(42,37,29,0.04)]">
      <div className="divide-y divide-[#EBF2FF]">
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
    <article className="flex min-h-[72px] items-center justify-between gap-4 rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0F172A]">
            <Icon name={icon} size={16} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-[#0F172A]">{title}</p>
          <div className="mt-1 text-xs leading-5 text-[#64748B]">{children}</div>
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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-5 backdrop-blur-md" onMouseDown={onClose} role="presentation">
      <div className="flex min-h-full items-end justify-center">
        <div
          aria-modal="true"
          className="w-full max-w-lg overflow-hidden rounded-t-[30px] rounded-b-[24px] border border-white/70 bg-[#FAFBFD] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.20)]"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                DOS
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-none text-[#0F172A]">{title}</h2>
              {description ? <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p> : null}
            </div>
            <button
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-xl leading-none text-[#0F172A]"
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

function MobileBottomSheet({
  badge,
  children,
  footer,
  onClose,
  subtitle,
  title,
}: {
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[80] flex items-end bg-[#0F172A]/20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] backdrop-blur-[3px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="max-h-[calc(100dvh-1.5rem)] w-full overflow-hidden rounded-t-[32px] rounded-b-[24px] border border-white/70 bg-[#FAFBFD] p-3 shadow-[0_28px_85px_rgba(32,27,20,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
        <header className="flex items-start gap-3 px-1 pb-3">
          <button
            aria-label="Close"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          {badge ? <div className="shrink-0">{badge}</div> : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-[#0F172A]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-[#64748B]">{subtitle}</p> : null}
          </div>
        </header>
        <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-0.5 [scrollbar-width:none]">
          {children}
        </div>
        {footer ? <div className="mt-3 px-0.5">{footer}</div> : null}
      </section>
    </div>
  );
}

function ActionList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_36px_rgba(42,37,29,0.055)]">
      {children}
    </div>
  );
}

function ActionListRow({
  children,
  href,
  icon,
  isLast = false,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  icon: ReactNode;
  isLast?: boolean;
  onClick?: () => void;
}) {
  const className = `flex min-h-[54px] w-full items-center gap-3 bg-white px-4 text-left text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FFFFFF] ${
    isLast ? "" : "border-b border-[#E2E8F0]"
  }`;
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1D4ED8]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  );
}

function UserProfileAvatar({
  imageUrl,
  name,
  size = "sm",
}: {
  imageUrl?: string | null;
  name: string;
  size?: "lg" | "sm";
}) {
  const dimension = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";
  const initial = name.trim().charAt(0).toUpperCase() || "R";

  if (imageUrl) {
    return (
      <span className={`${dimension} flex shrink-0 overflow-hidden rounded-full border border-[#BFDBFE] bg-[#EBF2FF] shadow-[0_10px_24px_rgba(37,99,235,0.10)]`}>
        <img alt="" className="h-full w-full object-cover" src={imageUrl} />
      </span>
    );
  }

  return (
    <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]`}>
      {initial}
    </span>
  );
}

function ProfileSheetFrame({
  children,
  onClose,
  rightAction,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  rightAction?: ReactNode;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[90] box-border flex items-end bg-[#0F172A]/18 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-[3px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="flex max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_1.7rem)] min-h-0 w-full flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#F4F6FB] p-3 shadow-[0_28px_85px_rgba(32,27,20,0.22)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="relative flex h-10 shrink-0 items-center justify-center">
          <button
            aria-label="Close"
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          <h2 className="text-sm font-bold text-[#0F172A]">{title}</h2>
          <div className="absolute right-0 flex h-9 min-w-9 items-center justify-center">{rightAction}</div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-0.5 pb-2 pt-2 [scrollbar-width:none]">
          {children}
        </div>
      </section>
    </div>
  );
}

function ProfileGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">{title}</p>
      <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">{children}</div>
    </section>
  );
}

function ProfileRow({
  children,
  icon,
  isLast = false,
  meta,
  onClick,
  sublabel,
}: {
  children: ReactNode;
  icon: ReactNode;
  isLast?: boolean;
  meta?: ReactNode;
  onClick?: () => void;
  sublabel?: string;
}) {
  return (
    <button
      className={`flex min-h-[58px] w-full items-center gap-3 bg-white px-3 text-left transition-colors hover:bg-[#F8FAFC] ${isLast ? "" : "border-b border-[#E2E8F0]"}`}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#EBF2FF] text-[#2563EB]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{children}</span>
        {sublabel ? <span className="mt-0.5 block truncate text-xs font-medium text-[#64748B]">{sublabel}</span> : null}
      </span>
      {meta ? <span className="shrink-0 text-xs font-semibold text-[#64748B]">{meta}</span> : <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />}
    </button>
  );
}

function RhythmBars() {
  return (
    <div className="flex items-end gap-1.5" aria-label="Seven day rhythm preview">
      {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
        <span
          aria-hidden="true"
          className="w-1.5 rounded-full bg-[#2563EB]"
          key={bar}
          style={{ height: `${14 + (bar % 3) * 3}px` }}
        />
      ))}
    </div>
  );
}

function ProfileSheet({
  email,
  fieldName,
  fieldSublabel,
  name,
  onClose,
  onEditProfile,
  onOpenCircles,
  photoUrl,
}: {
  email: string;
  fieldName: string;
  fieldSublabel: string;
  name: string;
  onClose: () => void;
  onEditProfile: () => void;
  onOpenCircles: () => void;
  photoUrl?: string | null;
}) {
  return (
    <ProfileSheetFrame
      onClose={onClose}
      rightAction={(
        <button
          aria-label="Profile settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
          type="button"
        >
          <Settings className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </button>
      )}
      title="Profile"
    >
      <div className="flex flex-col items-center px-2 pt-2 text-center">
        <UserProfileAvatar imageUrl={photoUrl} name={name} size="lg" />
        <h3 className="mt-3 text-lg font-bold leading-tight text-[#0F172A]">{name}</h3>
        <p className="mt-0.5 text-xs font-medium text-[#64748B]">{email || "No email added"}</p>
      </div>

      <div className="mt-5 grid gap-4">
        <section className="rounded-[18px] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]">Current Rhythm</p>
              <p className="mt-1 text-base font-bold leading-none text-[#0F172A]">Day {currentRhythmDay}</p>
            </div>
            <RhythmBars />
          </div>
        </section>

        <ProfileGroup title="Your Field">
          <ProfileRow icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} meta={<span className="text-[#2563EB]">Switch</span>} sublabel={fieldSublabel}>
            {fieldName}
          </ProfileRow>
          <ProfileRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} isLast onClick={onOpenCircles}>
            People & circles
          </ProfileRow>
        </ProfileGroup>

        <ProfileGroup title="Account">
          <ProfileRow icon={<User className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} onClick={onEditProfile}>
            Edit profile
          </ProfileRow>
          <ProfileRow icon={<Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} meta="On">
            Notifications
          </ProfileRow>
          <ProfileRow icon={<Palette className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} isLast meta="System">
            Appearance
          </ProfileRow>
        </ProfileGroup>

        <ProfileGroup title="Support">
          <ProfileRow icon={<HelpCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} meta={<ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />}>
            Get help
          </ProfileRow>
          <ProfileRow icon={<Shield className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} isLast meta={<ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />}>
            Privacy & terms
          </ProfileRow>
        </ProfileGroup>

        <footer className="pb-1 pt-1 text-center">
          <Link className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-white" href="/api/access/logout">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
            Sign out
          </Link>
          <p className="mt-1 text-[10px] font-semibold text-[#94A3B8]">DOS v0.4.2</p>
        </footer>
      </div>
    </ProfileSheetFrame>
  );
}

function EditProfileSheet({
  email,
  fieldName,
  fieldSublabel,
  name,
  onClose,
  phone,
}: {
  email: string;
  fieldName: string;
  fieldSublabel: string;
  name: string;
  onClose: () => void;
  phone: string;
}) {
  const [stateName, organizationName] = fieldSublabel.split(" · ");

  return (
    <ProfileSheetFrame onClose={onClose} title="Edit profile">
      <div className="px-1">
        <button
          className="mb-4 flex min-h-[52px] w-full items-center justify-center rounded-[16px] border border-dashed border-[#BFDBFE] bg-white text-sm font-bold text-[#2563EB]"
          type="button"
        >
          Change photo
        </button>

        <div className="grid gap-3">
          {[
            ["Name", name],
            ["Email", email],
            ["Phone", phone],
            ["Field name", fieldName],
            ["State", stateName ?? ""],
            ["Organization", organizationName ?? ""],
          ].map(([label, value]) => (
            <label className="grid gap-1.5" key={label}>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">{label}</span>
              <input
                className="min-h-11 rounded-[14px] border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                defaultValue={value}
              />
            </label>
          ))}
        </div>

        <button
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      </div>
    </ProfileSheetFrame>
  );
}

function SegmentedTabs<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedTabOption<T>>;
  value: T;
}) {
  return (
    <div className="grid grid-cols-3 rounded-full bg-[#E2E8F0] p-1 shadow-inner shadow-white/60">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={`min-h-9 rounded-full px-2 text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 ${
            value === option.value
              ? "bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(42,37,29,0.08)]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
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
        <p className="truncate text-sm font-semibold text-[#0F172A]">{person.name}</p>
        <p className="mt-1 truncate text-xs text-[#64748B]">{relationshipLine(person)}</p>
      </div>
      {onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className={`flex w-full items-center gap-3 bg-white transition-colors hover:bg-[#FFFFFF] ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2E8F0] px-4 py-3"}`}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className={`flex items-center gap-3 bg-white ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2E8F0] px-4 py-3"}`}>{content}</article>;
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

type CirclePersonItem = { person: DosAppPerson; score: DosRelationshipScore };

function uniqueCircleMembers(items: CirclePersonItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.person.id)) {
      return false;
    }

    seen.add(item.person.id);
    return true;
  });
}

function rankedCircleMembers(items: CirclePersonItem[]) {
  return uniqueCircleMembers(items).sort((first, second) => second.score.totalScore - first.score.totalScore);
}

function circleLayerDetails(activeCircle: CircleFocusView, rankedPeople: CirclePersonItem[]) {
  switch (activeCircle) {
    case "three":
      return {
        capacity: 3,
        cumulativeCount: Math.min(rankedPeople.length, 3),
        empty: "No one in My 3 yet.",
        items: rankedPeople.slice(0, 3),
        sectionLabel: "Top 3",
        startIndex: 0,
        subtitle: "The people you invest in most deeply.",
        title: "My 3",
        value: "3",
      };
    case "twelve":
      return {
        capacity: 12,
        cumulativeCount: Math.min(rankedPeople.length, 12),
        empty: "No additional people in your 12 yet.",
        items: rankedPeople.slice(3, 12),
        sectionLabel: "Next 9 People",
        startIndex: 3,
        subtitle: "These are the next 9 people in your core circle. Together with your 3, this makes 12.",
        title: "My 12",
        value: "12",
      };
    case "seventy":
      return {
        capacity: 70,
        cumulativeCount: Math.min(rankedPeople.length, 70),
        empty: "No additional people in your 70 yet.",
        items: rankedPeople.slice(12, 70),
        sectionLabel: "Next 58 People",
        startIndex: 12,
        subtitle: "These are the next 58 people in your broader field. Together with your 12, this makes 70.",
        title: "My 70",
        value: "70",
      };
  }
}

function previewCircleLayerItems(activeCircle: CircleFocusView, items: CirclePersonItem[]) {
  return activeCircle === "seventy" ? items.slice(0, 6) : items;
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
      <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-dashed border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8]`}>
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

function CircleTarget({
  my12Count,
  my3Count,
  my70Count,
  onSelectCircle,
}: {
  my12Count: number;
  my3Count: number;
  my70Count: number;
  onSelectCircle: (circle: CircleFocusView) => void;
}) {
  const [focusedCircle, setFocusedCircle] = useState<CircleFocusView | null>(null);
  const isMy3Focused = focusedCircle === "three";
  const isMy12Focused = focusedCircle === "twelve";
  const isMy70Focused = focusedCircle === "seventy";

  return (
    <div
      aria-label="Discipleship circle target"
      className="relative mx-auto mt-5 h-[172px] w-[172px] rounded-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusedCircle(null);
        }
      }}
      onMouseLeave={() => setFocusedCircle(null)}
    >
      <span
        className={`absolute inset-0 rounded-full border bg-[#EBF2FF]/45 transition-all duration-200 ${
          isMy70Focused
            ? "border-[#2563EB]/70 shadow-[0_0_0_5px_rgba(37,99,235,0.08),inset_0_8px_26px_rgba(255,255,255,0.82),0_16px_34px_rgba(37,99,235,0.14)]"
            : "border-[#BFDBFE] shadow-[inset_0_6px_26px_rgba(255,255,255,0.72),0_14px_30px_rgba(37,99,235,0.08)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[122px] w-[122px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#EBF2FF]/78 transition-all duration-200 ${
          isMy12Focused
            ? "border-[#2563EB]/70 shadow-[0_0_0_4px_rgba(37,99,235,0.09),inset_0_8px_24px_rgba(255,255,255,0.78)]"
            : "border-[#BFDBFE] shadow-[inset_0_8px_24px_rgba(255,255,255,0.62)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#BFDBFE] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] transition-all duration-200 ${
          isMy3Focused
            ? "scale-[1.03] shadow-[0_14px_28px_rgba(37,99,235,0.36),inset_0_5px_14px_rgba(255,255,255,0.28)]"
            : "shadow-[0_12px_24px_rgba(37,99,235,0.30),inset_0_5px_14px_rgba(255,255,255,0.22)]"
        }`}
        aria-hidden="true"
      />
      <button
        aria-label={`Open My 70, ${my70Count} people`}
        className="absolute inset-0 z-10 rounded-full text-center text-[#2563EB] transition-transform duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("seventy");
        }}
        onFocus={() => setFocusedCircle("seventy")}
        onMouseEnter={() => setFocusedCircle("seventy")}
        type="button"
      >
        <span className="absolute left-1/2 top-[1px] flex h-7 min-w-10 -translate-x-1/2 items-center justify-center rounded-full px-2 text-[13px] font-bold leading-none transition-colors duration-200 hover:bg-white/45">
          70
        </span>
      </button>
      <button
        aria-label={`Open My 12, ${my12Count} people`}
        className="absolute left-1/2 top-1/2 z-20 h-[122px] w-[122px] -translate-x-1/2 -translate-y-1/2 rounded-full text-center text-[#2563EB] transition-transform duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("twelve");
        }}
        onFocus={() => setFocusedCircle("twelve")}
        onMouseEnter={() => setFocusedCircle("twelve")}
        type="button"
      >
        <span className="absolute left-1/2 top-[3px] flex h-7 min-w-10 -translate-x-1/2 items-center justify-center rounded-full px-2 text-[13px] font-bold leading-none transition-colors duration-200 hover:bg-white/45">
          12
        </span>
      </button>
      <button
        aria-label={`Open My 3, ${my3Count} people`}
        className="absolute left-1/2 top-1/2 z-30 flex h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center transition-colors duration-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("three");
        }}
        onFocus={() => setFocusedCircle("three")}
        onMouseEnter={() => setFocusedCircle("three")}
        type="button"
      >
        <span className="text-[13px] font-bold leading-none text-white">3</span>
      </button>
    </div>
  );
}

function CircleFocusHero({
  headline,
  onSelectCircle,
  onViewCircles,
  rankedPeople,
}: {
  headline: string;
  onSelectCircle: (circle: CircleFocusView) => void;
  onViewCircles: () => void;
  rankedPeople: CirclePersonItem[];
}) {
  const my3Count = Math.min(rankedPeople.length, 3);
  const my12Count = Math.min(rankedPeople.length, 12);
  const my70Count = Math.min(rankedPeople.length, 70);

  return (
    <section className="rounded-[30px] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(42,37,29,0.08)]">
      <h2 className="max-w-[260px] text-[21px] font-bold leading-tight text-[#0F172A]">{headline}</h2>

      <CircleTarget my12Count={my12Count} my3Count={my3Count} my70Count={my70Count} onSelectCircle={onSelectCircle} />

      <button
        className="mt-5 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
        onClick={onViewCircles}
        type="button"
      >
        See who's inside
      </button>
    </section>
  );
}

function CircleListRow({
  index,
  isLast = false,
  lastMeetingDate,
  onClick,
  onLogMeeting,
  person,
}: {
  index: number;
  isLast?: boolean;
  lastMeetingDate?: string | null;
  onClick: () => void;
  onLogMeeting?: () => void;
  person: DosAppPerson;
}) {
  const needsFollowUp = person.status === "follow_up";
  const activity = needsFollowUp
    ? "Follow up today"
    : lastMeetingDate
      ? `Met ${formatRelativeDate(lastMeetingDate).toLowerCase()}`
      : "No meeting yet";

  return (
    <div
      className={`flex min-h-[64px] w-full items-center gap-3 bg-white px-3 py-2 text-left transition-colors hover:bg-[#FFFFFF] ${isLast ? "" : "border-b border-[#E2E8F0]"}`}
    >
      <CircleAvatar index={index} person={person} size="sm" />
      <button className="min-w-0 flex-1 text-left" onClick={onClick} type="button">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{person.name}</span>
        <span className={`mt-0.5 block truncate text-xs ${needsFollowUp ? "font-semibold text-[#1D4ED8]" : "text-[#2563EB]"}`}>{activity}</span>
      </button>
      {onLogMeeting ? (
        <button
          aria-label={`Log meeting with ${person.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#FFFFFF] text-[#1D4ED8] transition-colors hover:border-[#2563EB]"
          onClick={onLogMeeting}
          type="button"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
        </button>
      ) : null}
      <button
        aria-label={`Open ${person.name}`}
        className="flex h-8 w-7 shrink-0 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        onClick={onClick}
        type="button"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </button>
    </div>
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
      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2 text-[11px] font-bold text-[#0F172A] shadow-[0_10px_26px_rgba(42,37,29,0.055)]"
      onClick={onClick}
      type="button"
    >
      <span className="text-[#2563EB]">
        <Icon name={icon} size={14} />
      </span>
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
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{person.name}</span>
        <span className="mt-0.5 block truncate text-xs text-[#64748B]">{action}</span>
      </span>
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1D4ED8]">
        <Icon name={icon} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#64748B]">{children}</span>
      </span>
    </button>
  );
}

function WeekStatTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-[0_8px_22px_rgba(42,37,29,0.04)]">
      <p className="text-lg font-bold leading-none text-[#0F172A]">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </div>
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
    <button className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left transition-colors hover:border-[#BFDBFE] hover:bg-[#FFFFFF]" onClick={onClick} type="button">
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
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F172A]">{title}</p>
              <p className="mt-1 truncate text-xs text-[#64748B]">
                {meetingMetadataLine(meeting)}
              </p>
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#0F172A]">{meeting.notes || "No summary added yet."}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hasFlow ? (
              <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                {conversationFlowLabel(meeting.conversationFlowKey)}
              </span>
            ) : null}
            {meeting.recommendedResources.length ? (
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
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
          isOpen ? "border-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]" : "border-[#E2E8F0] hover:border-[#BFDBFE]"
        }`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate font-semibold text-[#0F172A]">{selectedOption?.label ?? "Select"}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_18px_45px_rgba(42,37,29,0.14)]">
          {options.map((option) => {
            const selected = option.value === selectedOption?.value;

            return (
              <button
                aria-pressed={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
                  selected ? "bg-[#EBF2FF] text-[#1D4ED8]" : "text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
                {option.helper ? <span className="shrink-0 text-[11px] font-medium text-[#94A3B8]">{option.helper}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FormOptionSelect({
  defaultValue = "",
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: ReadonlyArray<{ helper?: string; label: string; value: string }>;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input name={name} type="hidden" value={value} />
      <CompactOptionSelect label={label} onChange={setValue} options={options} value={value} />
    </>
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
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0F172A]">{flow.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-[#64748B]">{flow.description}</p>
        </div>
        {temperature ? (
          <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            {temperature}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3">
        {flow.sections.map((section) => (
          <div className="grid gap-2" key={section.id}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                {section.title}
              </p>
              {section.description ? <p className="mt-0.5 text-xs leading-5 text-[#64748B]">{section.description}</p> : null}
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
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              Gospel Invitation
            </p>
            {flow.closingPrompt ? <p className="mt-2 text-sm font-semibold leading-5 text-[#0F172A]">{flow.closingPrompt}</p> : null}
            {flow.gospelInvitation ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{flow.gospelInvitation}</p> : null}
          </div>
        ) : null}

        {flow.followUpActions?.length ? (
          <div className="rounded-2xl bg-[#F1F5F9] p-2.5">
            <p className="text-sm font-semibold text-[#0F172A]">Follow-up</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flow.followUpActions.map((action) => {
                const selected = selectedFollowUpActions.includes(action.id);

                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-8 rounded-full border px-3 text-xs font-bold ${
                      selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] bg-white text-[#0F172A]"
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
      <div className="rounded-2xl bg-[#F1F5F9] p-2.5">
        <p className="text-sm font-semibold text-[#0F172A]">{question.label}</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {Array.from({ length: scaleMax - scaleMin + 1 }, (_, index) => scaleMin + index).map((rating) => {
            const selected = ratingValue === rating;

            return (
              <button
                aria-pressed={selected}
                className={`min-h-8 rounded-xl border text-xs font-bold ${
                  selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E2E8F0] bg-white text-[#0F172A]"
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
        <p className="mt-2 text-[11px] leading-4 text-[#64748B]">1-3 Cold · 4-7 Lukewarm · 8-10 Hot</p>
      </div>
    );
  }

  if (question.kind === "text" || question.kind === "notes") {
    return (
      <label className="block rounded-2xl bg-[#F1F5F9] p-2.5">
        <span className="text-sm font-semibold text-[#0F172A]">{question.label}</span>
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
    <div className="rounded-2xl bg-[#F1F5F9] p-2.5">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">{question.label}</p>
      {question.scriptureRefs?.length ? (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {question.scriptureRefs.join(" · ")}
        </p>
      ) : null}
      {question.prompt ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{question.prompt}</p> : null}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {options.map((option) => {
          const selected = answer === option.value;

          return (
            <button
              aria-pressed={selected}
              className={`min-h-8 rounded-xl border text-xs font-bold ${
                selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] bg-white text-[#0F172A]"
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
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3">
      <FieldLabel>People Involved</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {selectedPeople.length ? selectedPeople.map((person, index) => (
          <button
            aria-label={`Remove ${person.name} from meeting`}
            className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] pl-1 pr-2 text-[11px] font-semibold text-[#0F172A] transition-colors hover:border-[#2563EB]"
            key={person.id}
            onClick={() => onToggle(person.id)}
            type="button"
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${avatarTone(index)}`}>
              {initials(person.name)}
            </span>
            <span className="max-w-[9rem] truncate">{person.name}</span>
            <span className="ml-0.5 text-[13px] leading-none text-[#1D4ED8]" aria-hidden="true">
              &times;
            </span>
          </button>
        )) : (
          <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-2.5 text-[11px] text-[#64748B]">No people selected</span>
        )}
      </div>

      <div className="relative mt-2.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <Icon name="search" size={14} />
        </span>
        <input
          className="min-h-11 w-full rounded-full border border-[#E2E8F0] bg-[#F1F5F9] pl-9 pr-4 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
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
              className="flex min-h-9 items-center gap-2.5 rounded-2xl px-2.5 text-left text-sm text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
              key={person.id}
              onClick={() => onToggle(person.id)}
              type="button"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatarTone(index)}`}>
                {initials(person.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{person.name}</span>
            </button>
          ))}
          {!visiblePeople.length ? <p className="rounded-2xl border border-dashed border-[#E2E8F0] p-3 text-sm text-[#64748B]">No more matching people.</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#64748B]">No people added yet.</p>
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
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Capture Notes</FieldLabel>
        {captures.length ? (
          <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
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

      {captureMessage ? <p className="mt-2 text-xs text-[#1D4ED8]">{captureMessage}</p> : null}
      {captures.length ? (
        <div className="mt-2 grid gap-1.5">
          {/* TODO: Persist captures to a workspace-scoped meeting_attachments table with meeting_id, workspace_id, type, file_name, storage_path/file_url, and created_at once a DOS attachments bucket exists. */}
          {/* TODO: Send voice notes through AI transcription and summary before attaching them to meeting insights. */}
          {captures.map((capture) => (
            <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] p-1.5 pr-2" key={capture.id}>
              {capture.type === "voice" ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EBF2FF] text-[#1D4ED8]">
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
                </span>
              ) : (
                <img alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover" src={capture.previewUrl} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#0F172A]">{capture.fileName}</p>
                <p className="text-[11px] text-[#64748B]">{captureTypeLabel(capture.type)} · {formatFileSize(capture.file.size)}</p>
              </div>
              <button
                aria-label={`Remove ${captureTypeLabel(capture.type)}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-white hover:text-[#0F172A]"
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
        active ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] hover:border-[#BFDBFE]"
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
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Recommended Resources</FieldLabel>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
          Queued
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {resources.map((resource) => (
          <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#0F172A]" key={resource.id}>
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
      return "bg-[#EBF2FF] text-[#1D4ED8]";
    case "pending_review":
      return "bg-[#EBF2FF] text-[#1D4ED8]";
    case "private":
      return "bg-[#F1F5F9] text-[#64748B]";
    case "archived":
      return "bg-[#F1F5F9] text-[#64748B]";
    case "draft":
    default:
      return "bg-[#F1F5F9] text-[#1D4ED8]";
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
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A]">{isQuickReview ? "Quick Review" : statusLabel}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">{formatDate(fruit.testimonyDate)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${fruitStatusBadgeClass(fruit.status)}`} style={{ fontFamily: font.rajdhani }}>
            {statusLabel}
          </span>
          {quickReviewPermission ? (
            <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
              {quickReviewPermission}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#0F172A]">{fruit.summary}</p>
      <div className="mt-3 grid gap-1 text-xs leading-5 text-[#64748B]">
        {isQuickReview && fruit.submittedByName ? <span>Submitted by {fruit.submittedByName}</span> : null}
        {linkedPerson ? <span>Linked to {linkedPerson}</span> : null}
      </div>
      {fruit.outcomeTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {fruit.outcomeTags.map((tag) => (
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-semibold text-[#64748B]" key={tag}>
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
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <Icon name="search" size={15} />
        </span>
        <input
          className="min-h-12 w-full rounded-full border border-[#E2E8F0] bg-white pl-10 pr-4 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </div>
    </label>
  );
}

function PeopleImportSheet({
  existingPeople,
  onClose,
  onImport,
}: {
  existingPeople: DosAppPerson[];
  onClose: () => void;
  onImport: (rows: PeopleImportRow[]) => Promise<PeopleImportResult>;
}) {
  const [fileName, setFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<PeopleImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<PeopleImportRow[]>([]);
  const analysis = useMemo(() => analyzePeopleImportRows(rows, existingPeople), [existingPeople, rows]);
  const previewRows = rows.slice(0, 5);
  const canImport = analysis.readyRows.length > 0 && !isImporting;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFileName(file?.name ?? "");
    setImportError("");
    setImportResult(null);
    setParseError("");
    setRows([]);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Choose a CSV file.");
      return;
    }

    try {
      const text = await file.text();
      const parsedCsv = parseCsvText(text);

      if (!parsedCsv.headers.length || !parsedCsv.rows.length) {
        setParseError("This CSV needs a header row and at least one contact.");
        return;
      }

      setRows(parsedCsv.rows.map((row, index) => mapDosPeopleCsvRow(parsedCsv.headers, row, index)));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read this CSV.");
    }
  }

  async function handleImport() {
    if (!canImport) {
      return;
    }

    setImportError("");
    setImportResult(null);
    setIsImporting(true);

    try {
      const result = await onImport(analysis.readyRows);

      setImportResult(result);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import contacts.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Sheet description="Upload a CSV to add people to your field." onClose={onClose} title="Import Contacts">
      <div className="space-y-4">
        <label className="block rounded-[22px] border border-dashed border-[#BFDBFE] bg-white p-4">
          <FieldLabel>CSV File</FieldLabel>
          <input
            accept=".csv,text/csv"
            className="mt-3 block w-full text-sm text-[#64748B] file:mr-4 file:rounded-full file:border-0 file:bg-[#2563EB] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={handleFileChange}
            type="file"
          />
          {fileName ? <p className="mt-3 text-xs text-[#64748B]">Loaded {fileName}</p> : null}
        </label>

        {parseError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{parseError}</p> : null}
        {importError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{importError}</p> : null}
        {importResult ? (
          <p className="rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] p-3 text-sm text-[#1D4ED8]">
            Imported {importResult.importedCount}. Skipped {importResult.skippedCount}.
          </p>
        ) : null}

        {rows.length ? (
          <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <SummaryTile label="Ready" value={String(analysis.readyRows.length)} />
              <SummaryTile label="Duplicates" value={String(analysis.duplicateRows.length)} />
              <SummaryTile label="Needs Name" value={String(analysis.invalidRows.length)} />
            </div>
            <div className="mt-4 space-y-2">
              {previewRows.map((row) => (
                <div className="rounded-2xl bg-[#F1F5F9] p-3" key={`${row.sourceRowNumber}-${row.name}-${row.phone}`}>
                  <p className="text-sm font-bold text-[#0F172A]">{row.name || "Missing name"}</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">
                    {[row.phone, row.email, row.church].filter(Boolean).join(" · ") || `Row ${row.sourceRowNumber}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <AppButton disabled={!canImport} icon="add" onClick={handleImport} tone="black">
          {isImporting ? "Importing..." : analysis.readyRows.length ? `Import ${analysis.readyRows.length} Contacts` : "Import Contacts"}
        </AppButton>
      </div>
    </Sheet>
  );
}

function RelationshipStewardshipGroup<T extends string>({
  helper,
  label,
  name,
  onChange,
  options,
  value,
}: {
  helper: string;
  label: string;
  name: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ helper?: string; label: string; value: T }>;
  value: T;
}) {
  return (
    <fieldset>
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 text-xs leading-5 text-[#64748B]">{helper}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <label
              className={`relative flex min-h-[70px] cursor-pointer flex-col justify-between rounded-2xl border p-3 transition-colors ${
                selected
                  ? "border-[#93C5FD] bg-[#EBF2FF]"
                  : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE]"
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                name={name}
                onChange={() => onChange(option.value)}
                required
                type="radio"
                value={option.value}
              />
              <span className="pr-5 text-sm font-bold leading-tight text-[#0F172A]">{option.label}</span>
              {option.helper ? <span className="mt-1 text-[11px] leading-4 text-[#64748B]">{option.helper}</span> : null}
              <span
                className={`absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border ${
                  selected ? "border-[#2563EB] bg-[#2563EB]" : "border-[#E2E8F0] bg-[#F1F5F9]"
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

function RelationshipTypePicker({
  onChange,
  value,
}: {
  onChange: (value: DosRelationshipModel) => void;
  value: DosRelationshipModel;
}) {
  const selectedValue = relationshipTypeFromModel(value);

  return (
    <fieldset>
      <FieldLabel>Relationship Type</FieldLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {relationshipTypeOptions.map((option) => {
          const selected = selectedValue === option.value;

          return (
            <label
              className={`relative flex min-h-[76px] cursor-pointer flex-col justify-between rounded-[18px] border p-3 transition-colors ${
                selected
                  ? "border-[#93C5FD] bg-[#EBF2FF] shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
                  : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE]"
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                name="relationship_type"
                onChange={() => onChange(relationshipModelFromRelationshipType(option.value as RelationshipTypeValue, value))}
                required
                type="radio"
                value={option.value}
              />
              <span className="pr-6 text-sm font-bold leading-tight text-[#0F172A]">{option.label}</span>
              <span className="mt-1 text-[11px] leading-4 text-[#64748B]">{option.helper}</span>
              <span
                className={`absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                  selected ? "border-[#2563EB] bg-white" : "border-[#CBD5E1] bg-white"
                }`}
                aria-hidden="true"
              >
                {selected ? <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RelationshipStewardshipPicker({
  onChange,
  value,
}: {
  onChange: (value: DosRelationshipModel) => void;
  value: DosRelationshipModel;
}) {
  return (
    <div className="space-y-4">
      <RelationshipStewardshipGroup<RelationshipContextValue>
        helper="Where does this relationship exist?"
        label="Relationship Context"
        name="relationship_context"
        onChange={(relationshipContext) => onChange({ ...value, relationshipContext })}
        options={relationshipContextOptions}
        value={value.relationshipContext}
      />
      <RelationshipStewardshipGroup<RoleInMyLifeValue>
        helper="What role does this person currently play?"
        label="Role in My Life"
        name="role_in_my_life"
        onChange={(roleInMyLife) => onChange({ ...value, roleInMyLife })}
        options={roleInMyLifeOptions}
        value={value.roleInMyLife}
      />
      <RelationshipStewardshipGroup<DiscipleshipStageValue>
        helper="Where are they spiritually right now?"
        label="Discipleship Movement"
        name="discipleship_stage"
        onChange={(discipleshipStage) => onChange({ ...value, discipleshipStage })}
        options={discipleshipStageOptions}
        value={value.discipleshipStage}
      />
    </div>
  );
}

function AdditionalPersonInformation({
  defaults = {},
  isOpen,
  onToggle,
  showToggle = true,
}: {
  defaults?: PersonFormDefaults;
  isOpen: boolean;
  onToggle: () => void;
  showToggle?: boolean;
}) {
  const fields = (
    <div className={showToggle ? "mt-4 grid gap-3 border-t border-[#E2E8F0] pt-4" : "grid gap-3"}>
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
  );

  if (!showToggle) {
    return (
      <section className="grid gap-2">
        <div>
          <FieldLabel>Additional Information</FieldLabel>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">Add details now or fill them in later.</p>
        </div>
        {fields}
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-4">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <span>
          <span className="block text-sm font-bold text-[#0F172A]">Additional Information</span>
          <span className="mt-1 block text-xs leading-5 text-[#64748B]">Add details now or fill them in later.</span>
        </span>
        <span className={`text-lg leading-none text-[#94A3B8] transition-transform ${isOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>

      {isOpen ? fields : null}
    </section>
  );
}

function PersonRelationshipSetup({
  additionalDefaults,
  detailsOpen,
  onChange,
  onToggleDetails,
  value,
}: {
  additionalDefaults?: PersonFormDefaults;
  detailsOpen: boolean;
  onChange: (value: DosRelationshipModel) => void;
  onToggleDetails: () => void;
  value: DosRelationshipModel;
}) {
  return (
    <section className="space-y-3">
      <RelationshipTypePicker onChange={onChange} value={value} />
      <button
        aria-expanded={detailsOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-sm font-semibold text-[#2563EB] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
        onClick={onToggleDetails}
        type="button"
      >
        <span>{detailsOpen ? "Hide extra details" : "Add more detail"}</span>
        <span className={`text-lg leading-none text-[#94A3B8] transition-transform ${detailsOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>
      {detailsOpen ? (
        <div className="space-y-4 rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <RelationshipStewardshipPicker onChange={onChange} value={value} />
          <AdditionalPersonInformation defaults={additionalDefaults} isOpen onToggle={onToggleDetails} showToggle={false} />
        </div>
      ) : null}
    </section>
  );
}

function DetailCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </p>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function SectionEmptyState({
  action,
  text,
  title,
}: {
  action?: ReactNode;
  text?: string;
  title: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#E2E8F0] bg-[#F1F5F9] p-4">
      <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
      {text ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{text}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function FruitEventIcon({ event }: { event: DosAppFruitEvent }) {
  const iconClass = "h-4 w-4";

  if (event.fruitType.toLowerCase().includes("church")) {
    return <Church className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  if (event.fruitType.toLowerCase().includes("prayer")) {
    return <Moon className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  if (event.fruitType.toLowerCase().includes("testimony")) {
    return <Mic className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  if (event.fruitType.toLowerCase().includes("discip")) {
    return <Users className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  return <Flame className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
}

function FruitEventRow({
  event,
  onDelete,
  onUpdate,
}: {
  event: DosAppFruitEvent;
  onDelete?: (event: DosAppFruitEvent) => void;
  onUpdate?: (event: DosAppFruitEvent, updates: Record<string, unknown>) => void;
}) {
  const debugEntries = [
    ["Source", fruitSourceLabel(event.sourceType)],
    ["Generated From", event.generatedBy ?? "Manual"],
    ["Meeting", shortId(event.meetingId)],
    ["Source ID", shortId(event.sourceId)],
    ["Key", event.generationKey ?? "None"],
  ];

  return (
    <article className="relative rounded-[22px] border border-[#E2E8F0] bg-white p-3.5">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]">
          <FruitEventIcon event={event} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              {sourceTransparencyLabel(event)}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{confidenceLabel(event.confidenceLevel)}</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(event.date)}</span>
          </div>
          <h3 className="mt-2 text-lg font-bold leading-6 text-[#0F172A]">{event.title || event.fruitType}</h3>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">{fruitNarrative(event)}</p>
          <p className="mt-2 text-xs leading-5 text-[#94A3B8]">{fruitSourceLine(event)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{event.fruitType}</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{visibilityLabel(event.visibility)}</span>
            {event.status === "hidden" ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#1D4ED8]">Hidden</span> : null}
          </div>
          {onUpdate ? (
            <details className="mt-2 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2">
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                Adjust
              </summary>
              <div className="mt-3 grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button className="min-h-9 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-3 text-xs font-bold text-white" onClick={() => onUpdate(event, { confidenceLevel: "confirmed", status: "reviewed" })} type="button">
                    Confirm Fruit
                  </button>
                  <button className="min-h-9 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-3 text-xs font-bold text-[#0F172A]" onClick={() => onUpdate(event, { status: "hidden", visibility: "private" })} type="button">
                    Hide Fruit
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["private", "internal", "public"] as const).map((visibility) => (
                    <button
                      className={`min-h-8 rounded-full border px-2 text-[11px] font-semibold ${
                        event.visibility === visibility ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]"
                      }`}
                      key={visibility}
                      onClick={() => onUpdate(event, { visibility })}
                      type="button"
                    >
                      {visibilityLabel(visibility)}
                    </button>
                  ))}
                </div>
                <form
                  className="grid gap-2"
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    const formData = new FormData(submitEvent.currentTarget);

                    onUpdate(event, {
                      description: String(formData.get("description") ?? ""),
                      title: String(formData.get("title") ?? ""),
                    });
                  }}
                >
                  <input className={`${FieldInputClass()} min-h-10 rounded-xl text-sm`} defaultValue={event.title ?? event.fruitType} name="title" placeholder="Title" />
                  <textarea className={`${FieldTextareaClass()} min-h-20 rounded-xl text-sm`} defaultValue={event.description ?? ""} name="description" placeholder="Description" />
                  <button className="min-h-9 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8]" type="submit">
                    Save Fruit
                  </button>
                </form>
                {onDelete ? (
                  <button className="min-h-9 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700" onClick={() => onDelete(event)} type="button">
                    Delete Mistake
                  </button>
                ) : null}
              </div>
            </details>
          ) : null}
          <details className="mt-2 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2">
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
              Source Details
            </summary>
            <div className="mt-2 grid gap-1.5 text-xs text-[#64748B]">
              {debugEntries.map(([label, value]) => (
                <p className="flex justify-between gap-3" key={label}>
                  <span className="text-[#94A3B8]">{label}</span>
                  <span className="truncate text-right font-semibold">{value}</span>
                </p>
              ))}
              {Object.keys(event.debugContext).length ? (
                <p className="break-words rounded-xl bg-[#F1F5F9] p-2 text-[11px] leading-5 text-[#64748B]">
                  {Object.entries(event.debugContext).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
                </p>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function LeaderReflectionRow({ reflection }: { reflection: DosAppLeaderReflection }) {
  return (
    <div className="rounded-2xl bg-[#F1F5F9] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold text-[#0F172A]">{reflection.whatHappened || reflection.privateNotes || "Leader Reflection"}</p>
        {reflection.followUpNeeded ? (
          <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            Follow Up
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-[#64748B]">{formatDate(reflection.createdAt)}</p>
      {reflection.prayerNeeds ? <p className="mt-2 text-sm leading-6 text-[#0F172A]">Prayer: {reflection.prayerNeeds}</p> : null}
      {reflection.observedFruit.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reflection.observedFruit.map((fruit) => (
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]" key={fruit}>{fruit}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ParticipantReviewRow({ review }: { review: DosAppParticipantReview }) {
  return (
    <div className="rounded-2xl bg-[#F1F5F9] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#0F172A]">Review</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(review.submittedAt)}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{review.comments || "Participant review submitted."}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">Heard: {review.feltHeard ?? "Skipped"}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">Meet Again: {review.wouldMeetAgain === null ? "Skipped" : review.wouldMeetAgain ? "Yes" : "No"}</span>
      </div>
    </div>
  );
}

function ParticipantTestimonyRow({ testimony }: { testimony: DosAppParticipantTestimony }) {
  return (
    <div className="rounded-2xl bg-[#F1F5F9] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#0F172A]">Testimony</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(testimony.submittedAt)}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{testimony.whatChanged || testimony.story}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{testimony.permissionToShare ? "Share OK" : "Private"}</span>
        {testimony.publicDisplayName ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{testimony.publicDisplayName}</span> : null}
      </div>
    </div>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
              {section.title}
            </p>
          ) : null}
          {section.questions.map((question) => (
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F1F5F9] p-3" key={question.id}>
              <p className="text-sm leading-5 text-[#0F172A]">{question.label}</p>
              <span className="max-w-[52%] shrink-0 rounded-full bg-white px-2.5 py-1 text-right text-xs font-semibold text-[#64748B]">
                {questionResponseLabel(question, meeting.conversationResponses[question.id])}
              </span>
            </div>
          ))}
        </div>
      ))}
      {selectedActionLabels.length ? (
        <div className="rounded-2xl bg-[#F1F5F9] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            Follow-up
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedActionLabels.map((label) => (
              <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-xs font-semibold text-[#1D4ED8]" key={label}>
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
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1D4ED8]">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {label ? <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>{label}</p> : null}
        <div className="mt-0.5 break-words leading-5 text-[#0F172A]">{value}</div>
      </div>
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (href) {
    return (
      <a
        aria-label={ariaLabel}
        className="-mx-1 flex items-center gap-3 rounded-2xl px-1 py-1 text-sm text-[#0F172A] transition-colors hover:bg-[#EBF2FF] active:scale-[0.99]"
        href={href}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-[#0F172A]">
      {content}
    </div>
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
    <nav className="absolute inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)]">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-full border border-white/75 bg-white/82 p-1.5 shadow-[0_18px_48px_rgba(42,37,29,0.16)] backdrop-blur-xl">
        {tabs.map((tab) => (
          <button
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${
              activeTab === tab.value ? "bg-[#EBF2FF] text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" : "text-[#94A3B8]"
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
  const className = "flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-[#E2E8F0] bg-white px-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#0F172A] transition-colors hover:border-[#2563EB] hover:bg-[#EBF2FF]";

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

function CircleLayerList({
  empty,
  hiddenCount = 0,
  items,
  latestMeetingDateByPersonId,
  onLogMeeting,
  onOpenPerson,
  startIndex = 0,
}: {
  empty: string;
  hiddenCount?: number;
  items: CirclePersonItem[];
  latestMeetingDateByPersonId: Map<string, string | null>;
  onLogMeeting?: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  startIndex?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_36px_rgba(42,37,29,0.055)]">
      {items.length ? (
        <>
          {items.map(({ person }, index) => (
            <CircleListRow
              isLast={!hiddenCount && index === items.length - 1}
              index={startIndex + index}
              key={person.id}
              lastMeetingDate={latestMeetingDateByPersonId.get(person.id) ?? null}
              onClick={() => onOpenPerson(person.id)}
              onLogMeeting={onLogMeeting ? () => onLogMeeting(person.id) : undefined}
              person={person}
            />
          ))}
          {hiddenCount ? (
            <div className="flex min-h-[56px] items-center gap-3 bg-white px-4 text-sm font-semibold text-[#0F172A]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-light text-[#64748B]">+</span>
              <span className="min-w-0 flex-1">{hiddenCount} more people</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="px-4 py-5 text-center text-sm leading-5 text-[#64748B]">{empty}</p>
      )}
    </div>
  );
}

function CircleLayerSheet({
  activeCircle,
  latestMeetingDateByPersonId,
  onClose,
  onLogMeeting,
  onLogMeetingForPerson,
  onOpenPerson,
  rankedPeople,
}: {
  activeCircle: CircleFocusView;
  latestMeetingDateByPersonId: Map<string, string | null>;
  onClose: () => void;
  onLogMeeting: () => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  rankedPeople: CirclePersonItem[];
}) {
  const details = circleLayerDetails(activeCircle, rankedPeople);
  const visiblePeople = previewCircleLayerItems(activeCircle, details.items);
  const hiddenCount = Math.max(0, details.items.length - visiblePeople.length);
  const badgeClassName = "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]";

  return (
    <MobileBottomSheet
      badge={<span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${badgeClassName}`}>{details.value}</span>}
      footer={(
        <button
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          onClick={onLogMeeting}
          type="button"
        >
          <Icon name="add" size={14} />
          Log Meeting
        </button>
      )}
      onClose={onClose}
      subtitle={details.subtitle}
      title={details.title}
    >
        <CircleLayerList
          empty={details.empty}
          hiddenCount={hiddenCount}
          items={visiblePeople}
          latestMeetingDateByPersonId={latestMeetingDateByPersonId}
          onLogMeeting={onLogMeetingForPerson}
          onOpenPerson={onOpenPerson}
          startIndex={details.startIndex}
        />
    </MobileBottomSheet>
  );
}

function CirclesDetailOverlay({
  latestMeetingDateByPersonId,
  onBack,
  onLogMeeting,
  onLogMeetingForPerson,
  onOpenPerson,
  onSearch,
  rankedPeople,
}: {
  latestMeetingDateByPersonId: Map<string, string | null>;
  onBack: () => void;
  onLogMeeting: () => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  onSearch: () => void;
  rankedPeople: CirclePersonItem[];
}) {
  const [activeCircle, setActiveCircle] = useState<CircleFocusView>("three");
  const circleTabs: Array<SegmentedTabOption<CircleFocusView>> = [
    { label: "My 3", value: "three" },
    { label: "My 12", value: "twelve" },
    { label: "My 70", value: "seventy" },
  ];
  const circleContent = circleLayerDetails(activeCircle, rankedPeople);
  const visiblePeople = previewCircleLayerItems(activeCircle, circleContent.items);
  const hiddenCount = Math.max(0, circleContent.items.length - visiblePeople.length);

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#FAFBFD] px-4 pb-28 pt-6 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white" onClick={onBack} type="button" aria-label="Back to home">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-sm font-bold text-[#0F172A]">
          Your Circles
        </p>
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white" onClick={onSearch} type="button" aria-label="Search people">
          <Search className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
        </button>
      </header>

      <div className="mt-5">
        <SegmentedTabs onChange={setActiveCircle} options={circleTabs} value={activeCircle} />
      </div>

      <section className="mx-auto mt-5 max-w-[300px] text-center">
        <p className="text-sm leading-5 text-[#64748B]">{circleContent.subtitle}</p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {circleContent.cumulativeCount} / {circleContent.capacity} in {circleDisplayName(activeCircle)}
        </p>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            {circleContent.sectionLabel}
          </p>
          <span className="text-xs text-[#64748B]">{circleContent.items.length}</span>
        </div>
        <CircleLayerList
          empty={circleContent.empty}
          hiddenCount={hiddenCount}
          items={visiblePeople}
          latestMeetingDateByPersonId={latestMeetingDateByPersonId}
          onLogMeeting={onLogMeetingForPerson}
          onOpenPerson={onOpenPerson}
          startIndex={circleContent.startIndex}
        />
        <button
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          onClick={onLogMeeting}
          type="button"
        >
          <Icon name="log" size={14} />
          Log Meeting
        </button>
      </section>
    </div>
  );
}

function PersonDetailOverlay({
  circleScore,
  fruitEvents,
  index,
  isPreview = false,
  leaderReflections,
  meetings,
  onBack,
  onEdit,
  onOpenMeeting,
  onLogMeeting,
  participantReviews,
  participantTestimonies,
  onDeleteFruitEvent,
  onUpdateFruitEvent,
  person,
  workspaceId,
}: {
  circleScore?: DosRelationshipScore | null;
  fruitEvents: DosAppFruitEvent[];
  index: number;
  isPreview?: boolean;
  leaderReflections: DosAppLeaderReflection[];
  meetings: DosAppMeeting[];
  onBack: () => void;
  onEdit: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onLogMeeting: () => void;
  onDeleteFruitEvent: (event: DosAppFruitEvent) => void;
  onUpdateFruitEvent: (event: DosAppFruitEvent, updates: Record<string, unknown>) => void;
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  person: DosAppPerson;
  workspaceId: string;
}) {
  const meetingsSectionRef = useRef<HTMLDivElement | null>(null);
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);
  const testimoniesSectionRef = useRef<HTMLDivElement | null>(null);
  const fruitSectionRef = useRef<HTMLDivElement | null>(null);
  const reflectionsSectionRef = useRef<HTMLDivElement | null>(null);
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
  const personParticipantReviews = participantReviews.filter((review) => review.personId === person.id || personMeetings.some((meeting) => meeting.id === review.meetingId));
  const personTestimonies = participantTestimonies.filter((testimony) => testimony.personId === person.id || personMeetings.some((meeting) => meeting.id === testimony.meetingId));
  const personFruitEvents = fruitEvents.filter((event) => event.personId === person.id || personMeetings.some((meeting) => meeting.id === event.meetingId));
  const personReflections = leaderReflections.filter((reflection) => reflection.personId === person.id || personMeetings.some((meeting) => meeting.id === reflection.meetingId));
  const latestFruitEvent = personFruitEvents[0];
  const hasDiscipleship = personFruitEvents.some((event) => event.fruitType.includes("Discipleship") || event.title?.includes("Discipleship"));
  const hasFollowUpNeeded = personReflections.some((reflection) => reflection.followUpNeeded);
  const hasMultiplication = personFruitEvents.some((event) => event.fruitType === "Started Discipling Others");
  const recentMeetings = personMeetings.slice(0, 3);
  const lastContact = person.lastActivityAt ? formatRelativeDate(person.lastActivityAt) : "None";
  const scrollToSection = (section: "fruit" | "meetings" | "reflections" | "reviews" | "testimonies") => {
    const sectionRef = {
      fruit: fruitSectionRef,
      meetings: meetingsSectionRef,
      reflections: reflectionsSectionRef,
      reviews: reviewsSectionRef,
      testimonies: testimoniesSectionRef,
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
  const moreActions: Array<{ icon: ReactNode; label: string; onClick: () => void }> = [
    {
      icon: <Share2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />,
      label: "Share Contact",
      onClick: () => { void shareContact(); },
    },
    ...(person.phone ? [{
      icon: <Copy className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />,
      label: "Copy Phone",
      onClick: () => { void copyToClipboard(person.phone, "Phone"); },
    }] : []),
    ...(person.email ? [{
      icon: <Copy className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />,
      label: "Copy Email",
      onClick: () => { void copyToClipboard(person.email ?? "", "Email"); },
    }] : []),
    ...(address ? [{
      icon: <MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />,
      label: "Open in Maps",
      onClick: () => openAddressInMaps(address),
    }] : []),
  ];
  useEffect(() => {
    if (!isIntelligenceOpen || isPreview) {
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
  }, [isIntelligenceOpen, isPreview, person.id, workspaceId]);
  const pinToCircle = async (circle: "field" | "seventy" | "three" | "twelve", locked = true) => {
    if (isPreview) {
      setPinMessage("Preview mode is read-only. Pins are not saved.");
      return;
    }

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
    <div className="absolute inset-0 overflow-y-auto bg-[#FAFBFD] px-4 pb-28 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to people">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          Person
        </p>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#0F172A]" onClick={onEdit} type="button">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
          Edit
        </button>
      </header>

      <section className="mt-5 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-base font-bold ${avatarTone(index)}`}>
          {initials(person.name)}
        </div>
        <h2 className="mt-3 text-[32px] font-bold leading-none tracking-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {person.name}
        </h2>
        <span className="mt-3 inline-flex max-w-[320px] items-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-1.5 text-center text-xs font-semibold leading-5 text-[#1D4ED8]">
          {relationshipLine(person)}
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
          {person.phone ? (
            <DetailRow
              ariaLabel={`Call ${person.name}`}
              href={`tel:${person.phone}`}
              icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
              value={person.phone}
            />
          ) : null}
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
          {!person.phone && !person.email && !address ? <p className="text-sm text-[#64748B]">No contact details yet.</p> : null}
        </DetailCard>

        <DetailCard title="About">
          <DetailRow label="Stewardship" value={relationshipLine(person)} />
          <DetailRow label="Context" value={relationshipContextLabel(person.relationshipContext)} />
          <DetailRow label="Role" value={roleInMyLifeLabel(person.roleInMyLife)} />
          <DetailRow label="Movement" value={discipleshipStageLabel(person.discipleshipStage)} />
          {person.church ? <DetailRow icon={<Church className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Church" value={person.church} /> : null}
          {defaults.occupation ? <DetailRow icon={<Briefcase className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Occupation" value={defaults.occupation} /> : null}
          {defaults.birthday ? <DetailRow icon={<Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Birthday" value={formatDate(defaults.birthday)} /> : null}
          {!person.church && !defaults.occupation && !defaults.birthday ? <p className="text-sm text-[#64748B]">No details yet.</p> : null}
        </DetailCard>

        <DetailCard title="Activity">
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Meetings" onClick={() => scrollToSection("meetings")} value={personMeetings.length} />
            <StatTile label="Reviews" onClick={() => scrollToSection("reviews")} value={personParticipantReviews.length + personReviews.length} />
            <StatTile label="Fruit" onClick={() => scrollToSection("fruit")} value={personFruitEvents.length} />
          </div>
        </DetailCard>

        <DetailCard title="Fruit Summary">
          <div className="grid grid-cols-2 gap-2">
            <SummaryTile label="Latest Fruit" value={latestFruitEvent?.title || latestFruitEvent?.fruitType || "None yet"} />
            <SummaryTile label="Follow Up Needed" value={hasFollowUpNeeded ? "Yes" : "No"} />
            <SummaryTile label="Discipleship Status" value={hasDiscipleship ? "Active" : personMeetings.length >= 3 ? "Growing" : "Not yet"} />
            <SummaryTile label="Multiplication Status" value={hasMultiplication ? "Started" : "Not yet"} />
          </div>
        </DetailCard>

        <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-4">
          <button
            aria-expanded={isIntelligenceOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setIsIntelligenceOpen((current) => !current)}
            type="button"
          >
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                Relationship Intelligence
              </span>
              <span className="mt-1 block text-sm font-semibold text-[#0F172A]">
                My Circle: {circleScore ? `${circleDisplayName(circleScore.circle)} · Score ${scoreLabel(circleScore.totalScore)}` : "Field · Score 0"}
              </span>
              {personMeetings.length && (!circleScore || circleScore.totalScore === 0) ? (
                <span className="mt-1 block text-xs text-[#1D4ED8]">Meeting activity found. Score will refresh automatically.</span>
              ) : null}
            </span>
            <ChevronRight className={`h-4 w-4 text-[#94A3B8] transition-transform ${isIntelligenceOpen ? "rotate-90" : ""}`} aria-hidden="true" strokeWidth={1.8} />
          </button>

          {isIntelligenceOpen ? (
            <div className="mt-4 border-t border-[#E2E8F0] pt-4">
              {circleScore ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile label="Score" value={scoreLabel(circleScore.totalScore)} />
                    <StatTile label="Circle" value={circleDisplayName(circleScore.circle)} />
                    <StatTile label="Trust" value={scoreLabel(circleScore.confidenceScore)} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
                      {circleScore.assignmentSource === "manual" ? "Manual" : "Automatic"}
                    </span>
                    {Object.entries(circleScore.breakdown).map(([key, value]) => (
                      <span className="rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-semibold text-[#64748B]" key={key}>
                        {key.replace(/([A-Z])/g, " $1")} {scoreLabel(value)}
                      </span>
                    ))}
                  </div>
                  <p className="rounded-2xl bg-[#F1F5F9] p-3 text-sm leading-6 text-[#0F172A]">{circleScore.explanation.summary}</p>
                  {circleScore.explanation.positive_factors.length ? (
                    <div className="grid gap-1.5">
                      {circleScore.explanation.positive_factors.map((factor) => (
                        <p className="text-xs leading-5 text-[#64748B]" key={factor}>+ {factor}</p>
                      ))}
                    </div>
                  ) : null}
                  {circleScore.explanation.negative_factors.length ? (
                    <div className="grid gap-1.5">
                      {circleScore.explanation.negative_factors.map((factor) => (
                        <p className="text-xs leading-5 text-[#1D4ED8]" key={factor}>Needs focus · {factor}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    {(["three", "twelve", "seventy", "field"] as const).map((circle) => (
                      <button
                        className="min-h-10 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-3 text-xs font-bold text-[#0F172A]"
                        key={circle}
                        onClick={() => { void pinToCircle(circle); }}
                        type="button"
                      >
                        Pin {circleDisplayName(circle)}
                      </button>
                    ))}
                    {circleScore.assignmentSource === "manual" ? (
                      <button
                        className="col-span-2 min-h-10 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8]"
                        onClick={() => { void pinToCircle(circleScore.circle, false); }}
                        type="button"
                      >
                        Remove Pin
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                      Movement History
                    </p>
                    {intelligenceHistory.length ? intelligenceHistory.slice(0, 4).map((item) => (
                      <div className="rounded-2xl bg-[#F1F5F9] p-3" key={`${item.calculatedAt}-${item.newScore}`}>
                        <p className="text-xs font-semibold text-[#0F172A]">
                          {item.previousCircle ? `${circleDisplayName(item.previousCircle)} -> ` : ""}{circleDisplayName(item.newCircle)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                          {item.previousScore === null ? "New score" : `${scoreLabel(item.previousScore)} -> ${scoreLabel(item.newScore)}`} · {formatDate(item.calculatedAt)}
                        </p>
                      </div>
                    )) : (
                      <p className="text-xs text-[#64748B]">No movement history yet.</p>
                    )}
                  </div>
                  {pinMessage ? <p className="rounded-2xl bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{pinMessage}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">Recalculate circles to score this relationship.</p>
              )}
            </div>
          ) : null}
        </section>

        <div ref={fruitSectionRef}>
          <DetailCard title="Fruit Timeline">
            {personFruitEvents.length ? personFruitEvents.map((event) => (
              <FruitEventRow event={event} key={event.id} onDelete={onDeleteFruitEvent} onUpdate={onUpdateFruitEvent} />
            )) : (
              <SectionEmptyState
                text="After a meeting, capture what happened or invite them to share their story."
                title="No fruit has been logged yet."
              />
            )}
          </DetailCard>
        </div>

        <div ref={meetingsSectionRef}>
          <DetailCard title="Meetings">
            {recentMeetings.length ? recentMeetings.map((meeting) => (
              <button className="flex items-center gap-3 rounded-2xl bg-[#F1F5F9] p-3 text-left transition-colors hover:bg-[#EBF2FF] active:scale-[0.99]" key={meeting.id} type="button" onClick={() => onOpenMeeting(meeting.id)}>
                <CalendarDays className="h-4 w-4 shrink-0 text-[#1D4ED8]" aria-hidden="true" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#0F172A]">{meetingActivityTitle(meeting)}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#64748B]">{formatDate(meeting.date)}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{meeting.notes || "No summary added yet."}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
              </button>
            )) : <SectionEmptyState text="Log the next conversation when it happens." title="No meetings yet." />}
          </DetailCard>
        </div>

        <div ref={reviewsSectionRef}>
          <DetailCard title="Reviews">
            {personParticipantReviews.length ? personParticipantReviews.slice(0, 3).map((review) => (
              <ParticipantReviewRow key={review.id} review={review} />
            )) : null}
            {personReviews.length ? personReviews.slice(0, 3).map((meeting) => (
              <button className="rounded-2xl bg-[#F1F5F9] p-3 text-left transition-colors hover:bg-[#EBF2FF] active:scale-[0.99]" key={meeting.id} onClick={() => onOpenMeeting(meeting.id)} type="button">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0F172A]">Quick Review</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${reviewStatusClass(meeting.review.status)}`} style={{ fontFamily: font.rajdhani }}>
                    {reviewStatusLabel(meeting.review.status)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{meeting.review.stoodOut || "Review submitted."}</p>
                <p className="mt-2 text-xs text-[#94A3B8]">
                  {meeting.review.submittedName ? `${meeting.review.submittedName} · ` : ""}
                  {meetingActivityTitle(meeting)} · {formatDate(meeting.review.submittedAt ?? meeting.date)}
                </p>
              </button>
            )) : null}
            {!personParticipantReviews.length && !personReviews.length ? (
              <SectionEmptyState text="Send a review link after your next meeting." title="No reviews yet." />
            ) : null}
          </DetailCard>
        </div>

        <div ref={testimoniesSectionRef}>
          <DetailCard title="Testimonies">
            {personTestimonies.length ? personTestimonies.slice(0, 3).map((testimony) => (
              <ParticipantTestimonyRow key={testimony.id} testimony={testimony} />
            )) : (
              <SectionEmptyState text="Invite them to share their story after a meaningful conversation." title="No stories yet." />
            )}
          </DetailCard>
        </div>

        <div ref={reflectionsSectionRef}>
          <DetailCard title="Leader Reflections">
            {personReflections.length ? personReflections.slice(0, 4).map((reflection) => (
              <LeaderReflectionRow key={reflection.id} reflection={reflection} />
            )) : (
              <SectionEmptyState text="After a meeting, capture what happened while it is fresh." title="No reflections yet." />
            )}
          </DetailCard>
        </div>
      </div>

      {isMoreOpen ? (
        <MobileBottomSheet onClose={() => setIsMoreOpen(false)} subtitle={person.name} title="More">
          <div className="grid gap-3">
            <ActionList>
              {moreActions.map((action, actionIndex) => (
                <ActionListRow
                  icon={action.icon}
                  isLast={actionIndex === moreActions.length - 1}
                  key={action.label}
                  onClick={action.onClick}
                >
                  {action.label}
                </ActionListRow>
              ))}
            </ActionList>
            {moreMessage ? <p className="rounded-2xl bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{moreMessage}</p> : null}
          </div>
        </MobileBottomSheet>
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
      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] px-1.5 text-[11px] font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-55"
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
  fruitEvents,
  isSendingReview,
  isSendingTestimony,
  leaderReflections,
  meeting,
  onCopyReview,
  onCopyTestimony,
  onBack,
  onEdit,
  onLogMeeting,
  onLogReflection,
  onDeleteFruitEvent,
  onSendReview,
  onSendTestimony,
  onShareReview,
  onShareTestimony,
  onUpdateFruitEvent,
  participantReviews,
  participantTestimonies,
  people,
  reviewShareMessage,
  showPostMeetingFollowUp,
  testimonyShareMessage,
}: {
  fruitEvents: DosAppFruitEvent[];
  isSendingReview?: boolean;
  isSendingTestimony?: boolean;
  leaderReflections: DosAppLeaderReflection[];
  meeting: DosAppMeeting;
  onCopyReview: () => void;
  onCopyTestimony: () => void;
  onBack: () => void;
  onEdit: () => void;
  onLogMeeting: () => void;
  onLogReflection: () => void;
  onDeleteFruitEvent: (event: DosAppFruitEvent) => void;
  onSendReview: () => void;
  onSendTestimony: () => void;
  onShareReview: () => void;
  onShareTestimony: () => void;
  onUpdateFruitEvent: (event: DosAppFruitEvent, updates: Record<string, unknown>) => void;
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  people: DosAppPerson[];
  reviewShareMessage?: string;
  showPostMeetingFollowUp?: boolean;
  testimonyShareMessage?: string;
}) {
  const isTableMeeting = meeting.source === "table";
  const temperature = meeting.conversationFlowKey === "kitchen_table_gospel"
    ? relationshipWithJesusTemperature(responseAsNumber(meeting.conversationResponses.relationshipWithJesus))
    : null;
  const avatarNames = meetingAvatarNames(meeting, people);
  const title = meetingPeopleTitle(meeting, people);
  const meetingReflections = leaderReflections.filter((reflection) => reflection.meetingId === meeting.id);
  const meetingParticipantReviews = participantReviews.filter((review) => review.meetingId === meeting.id);
  const meetingTestimonies = participantTestimonies.filter((testimony) => testimony.meetingId === meeting.id);
  const meetingFruitEvents = fruitEvents.filter((event) => event.meetingId === meeting.id);

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#FAFBFD] px-4 pb-28 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to meetings">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          Meeting
        </p>
        {isTableMeeting ? (
          <button className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#0F172A]" onClick={onEdit} type="button">
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
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#FAFBFD] text-sm font-bold ${avatarTone(index)}`}
                key={`${meeting.id}-detail-${name}`}
              >
                {initials(name)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8]">
            <CalendarDays className="h-6 w-6" aria-hidden="true" strokeWidth={1.6} />
          </div>
        )}
        <h2 className="mx-auto mt-3 max-w-[320px] text-[32px] font-bold leading-none tracking-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-5 text-[#64748B]">{meetingMetadataLine(meeting)}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8]">
            {conversationFlowLabel(meeting.conversationFlowKey)}
          </span>
          {temperature ? (
            <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#64748B]">
              {temperature}
            </span>
          ) : null}
        </div>
      </section>

      <div className="mt-5 grid gap-2">
        <AppButton icon="log" onClick={onLogMeeting} tone="black">Log Meeting</AppButton>
        {isTableMeeting ? <AppButton onClick={onLogReflection} tone="white">Leader Reflection</AppButton> : null}
      </div>

      <div className="mt-5 grid gap-3">
        {showPostMeetingFollowUp && isTableMeeting ? (
          <section className="rounded-[24px] border border-[#BFDBFE] bg-[#EBF2FF] p-4 shadow-[0_18px_45px_rgba(37,99,235,0.10)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              Next
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#0F172A]">Follow up while it is fresh.</h3>
            <div className="mt-3 grid gap-2">
              <button className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-left text-sm font-bold text-white" onClick={onLogReflection} type="button">
                <span>Capture what happened</span>
                <Pencil className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              </button>
              <div className="grid grid-cols-2 gap-2">
                <ReviewActionButton disabled={isSendingReview} icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onCopyReview}>
                  Copy Review Link
                </ReviewActionButton>
                <ReviewActionButton disabled={isSendingTestimony} icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onCopyTestimony}>
                  Copy Story Link
                </ReviewActionButton>
                <ReviewActionButton disabled={isSendingReview} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendReview}>
                  Send Review Link
                </ReviewActionButton>
                <ReviewActionButton disabled={isSendingTestimony} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendTestimony}>
                  Send Story Link
                </ReviewActionButton>
              </div>
            </div>
          </section>
        ) : null}

        {isTableMeeting ? (
          <DetailCard title="Review Status">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{reviewStatusLabel(meeting.review.status)}</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
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
              <span className="mt-3 inline-flex rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
                {reviewSharePermissionLabel(meeting.review.sharePermission)}
              </span>
            ) : null}
            {meeting.review.stoodOut ? (
              <p className="mt-3 line-clamp-3 rounded-2xl bg-[#F1F5F9] p-3 text-sm leading-6 text-[#0F172A]">{meeting.review.stoodOut}</p>
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
              <p className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{reviewShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        {isTableMeeting ? (
          <DetailCard title="Share Your Story">
            <p className="text-sm leading-6 text-[#0F172A]">Invite them to share a transformation story.</p>
            <div className="grid grid-cols-3 gap-2">
              <ReviewActionButton disabled={isSendingTestimony} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendTestimony}>
                Send Story
              </ReviewActionButton>
              <ReviewActionButton disabled={isSendingTestimony} icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onCopyTestimony}>
                Copy Story
              </ReviewActionButton>
              <ReviewActionButton disabled={isSendingTestimony} icon={<Share2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onShareTestimony}>
                Share
              </ReviewActionButton>
            </div>
            {testimonyShareMessage ? (
              <p className="rounded-2xl border border-[#E2E8F0] bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{testimonyShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        <DetailCard title="Summary">
          <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Notes" value={meeting.notes || "No summary added yet."} />
        </DetailCard>

        <ConversationFlowDetail meeting={meeting} />

        <DetailCard title="Leader Reflections">
          {meetingReflections.length ? meetingReflections.map((reflection) => (
            <LeaderReflectionRow key={reflection.id} reflection={reflection} />
          )) : <SectionEmptyState text="Capture what happened after this meeting." title="No reflections yet." />}
        </DetailCard>

        <DetailCard title="Reviews">
          {meetingParticipantReviews.length ? meetingParticipantReviews.map((review) => (
            <ParticipantReviewRow key={review.id} review={review} />
          )) : <SectionEmptyState text="Send a review link after this meeting." title="No reviews yet." />}
        </DetailCard>

        <DetailCard title="Testimonies">
          {meetingTestimonies.length ? meetingTestimonies.map((testimony) => (
            <ParticipantTestimonyRow key={testimony.id} testimony={testimony} />
          )) : <SectionEmptyState text="Invite them to share their story if something changed." title="No stories yet." />}
        </DetailCard>

        <DetailCard title="Fruit Timeline">
          {meetingFruitEvents.length ? meetingFruitEvents.map((event) => (
            <FruitEventRow event={event} key={event.id} onDelete={onDeleteFruitEvent} onUpdate={onUpdateFruitEvent} />
          )) : <SectionEmptyState text="After a meeting, capture what happened or invite them to share their story." title="No fruit has been logged yet." />}
        </DetailCard>

        {meeting.recommendedResources.length ? (
          <DetailCard title="Recommended Resources">
            {/* TODO: Add SMS/email/share actions for queued resources after DOS messaging workflows exist. */}
            {meeting.recommendedResources.map((resource) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F1F5F9] p-3" key={resource.id}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A]">{resource.title}</p>
                  {resource.reason ? <p className="mt-1 text-xs text-[#64748B]">{resource.reason}</p> : null}
                </div>
                <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
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
  const isPreview = data.workspace.isPreview === true;
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [errorMessage, setErrorMessage] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [circleSheetView, setCircleSheetView] = useState<CircleFocusView | null>(null);
  const [isCirclesOpen, setIsCirclesOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAdditionalPersonInfoOpen, setIsAdditionalPersonInfoOpen] = useState(false);
  const [isPeopleImportOpen, setIsPeopleImportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [conversationResponses, setConversationResponses] = useState<DosConversationResponses>({});
  const [meetingPeopleQuery, setMeetingPeopleQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleImportMessage, setPeopleImportMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [reviewLinksByMeetingId, setReviewLinksByMeetingId] = useState<Record<string, string>>({});
  const [reviewLinkMeetingId, setReviewLinkMeetingId] = useState<string | null>(null);
  const [reviewShareMessage, setReviewShareMessage] = useState("");
  const [postMeetingFollowUpId, setPostMeetingFollowUpId] = useState<string | null>(null);
  const [testimonyLinksByMeetingId, setTestimonyLinksByMeetingId] = useState<Record<string, string>>({});
  const [testimonyLinkMeetingId, setTestimonyLinkMeetingId] = useState<string | null>(null);
  const [testimonyShareMessage, setTestimonyShareMessage] = useState("");
  const [selectedConversationFlow, setSelectedConversationFlow] = useState<DosConversationFlowKey>("none");
  const [selectedMeetingContext, setSelectedMeetingContext] = useState<DosAppMeetingType>("kitchen_table");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMeetingPersonIds, setSelectedMeetingPersonIds] = useState<string[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedRelationshipModel, setSelectedRelationshipModel] = useState<DosRelationshipModel>(defaultRelationshipModel);
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const visibleFruit = useMemo(() => data.fruit.filter((fruit) => fruit.status !== "archived"), [data.fruit]);
  const people = data.people;
  const latestMeeting = data.meetings[0];
  const latestFruitActivity = useMemo(() => {
    const fruitItems = [
      ...visibleFruit.map((fruit) => ({
        date: fruit.testimonyDate,
        label: `${fruit.summary || "Fruit recorded"} · ${formatDate(fruit.testimonyDate)}`,
      })),
      ...data.fruitEvents.map((event) => ({
        date: event.date,
        label: `${event.title || event.fruitType || "Fruit recorded"} · ${formatDate(event.date)}`,
      })),
    ];

    return fruitItems.sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    })[0] ?? null;
  }, [data.fruitEvents, visibleFruit]);
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
  const rankedCirclePeople = rankedCircleMembers([...my3People, ...my12People, ...my70People]).slice(0, 70);
  const my3CirclePeople = rankedCirclePeople.slice(0, 3);
  const latestMeetingDateByPersonId = useMemo(() => {
    const latestDates = new Map<string, string | null>();

    data.meetings.forEach((meeting) => {
      if (!meeting.date) {
        return;
      }

      const meetingTime = new Date(meeting.date).getTime();

      meeting.fieldPersonIds.forEach((personId) => {
        const currentDate = latestDates.get(personId);
        const currentTime = currentDate ? new Date(currentDate).getTime() : Number.NEGATIVE_INFINITY;

        if (!currentDate || meetingTime > currentTime) {
          latestDates.set(personId, meeting.date);
        }
      });
    });

    return latestDates;
  }, [data.meetings]);
  const latestPrayerActivity = useMemo(() => {
    const prayerMeetings = data.meetings
      .filter(isPrayerMeeting)
      .map((meeting) => ({
        date: meeting.date,
        label: `${meetingPeopleTitle(meeting, people)} · ${formatRelativeDate(meeting.date)}`,
        meetingId: meeting.id,
      }));
    const prayerReflections = data.leaderReflections
      .filter((reflection) => Boolean(normalizeText(reflection.prayerNeeds)))
      .map((reflection) => {
        const meeting = data.meetings.find((item) => item.id === reflection.meetingId) ?? null;

        return {
          date: reflection.createdAt,
          label: meeting ? `${meetingPeopleTitle(meeting, people)} · ${formatRelativeDate(reflection.createdAt)}` : `Prayer note · ${formatRelativeDate(reflection.createdAt)}`,
          meetingId: reflection.meetingId,
        };
      });

    return [...prayerMeetings, ...prayerReflections].sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    })[0] ?? null;
  }, [data.leaderReflections, data.meetings, people]);
  const thisWeekStats = useMemo(() => {
    const { end, start } = currentWeekRange();
    const meetingsThisWeek = data.meetings.filter((meeting) => isDateWithinRange(meeting.date, start, end));
    const prayedThisWeek = new Set<string>();

    meetingsThisWeek.filter(isPrayerMeeting).forEach((meeting) => prayedThisWeek.add(`meeting-${meeting.id}`));
    data.leaderReflections
      .filter((reflection) => isDateWithinRange(reflection.createdAt, start, end) && Boolean(normalizeText(reflection.prayerNeeds)))
      .forEach((reflection) => prayedThisWeek.add(`reflection-${reflection.id}`));

    return {
      label: formatWeekRange(start, end),
      meetings: meetingsThisWeek.length,
      newPeople: people.filter((person) => isDateWithinRange(person.createdAt, start, end)).length,
      prayed: prayedThisWeek.size,
    };
  }, [data.leaderReflections, data.meetings, people]);
  const todayFocusPeople = useMemo(() => {
    const preferredPeople = attentionPeople.length
      ? attentionPeople
      : my3CirclePeople.map((item) => item.person);

    return preferredPeople.slice(0, 3);
  }, [attentionPeople, my3CirclePeople]);
  const greetingName = cleanIdentitySegment(data.workspace.greetingName) ?? firstNameFromDisplayName(data.workspace.displayName);
  const [timeGreeting, setTimeGreeting] = useState("Good morning");
  const [homeSubtitle, setHomeSubtitle] = useState(() => homeDateSubtitle());
  const [circleHeadline, setCircleHeadline] = useState(() => circleFocusHeadline());
  const profileName = workspaceProfileName(data.workspace, greetingName);
  const profileEmail = workspaceProfileEmail(data.workspace);
  const profilePhone = workspaceProfilePhone(data.workspace);
  const fieldName = workspaceIdentityName(data.workspace);
  const fieldSublabel = workspaceFieldSublabel(data.workspace);
  const selectedPersonDefaults = personFormDefaults(selectedPerson);

  useEffect(() => {
    const updateHomeTime = () => {
      const now = new Date();

      setTimeGreeting(localTimeGreeting(now));
      setHomeSubtitle(homeDateSubtitle(now));
      setCircleHeadline(circleFocusHeadline(now));
    };

    updateHomeTime();
    const interval = window.setInterval(updateHomeTime, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

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
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setSelectedRelationshipModel(defaultRelationshipModel);
    resetMeetingDraft();
  }

  function openForm(mode: Exclude<FormMode, null>) {
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setFormMode(mode);
    setIsAdditionalPersonInfoOpen(false);
    if (mode === "meeting") {
      setSelectedMeetingId(null);
      resetMeetingDraft();
    }
    if (mode === "person") {
      setSelectedRelationshipModel(defaultRelationshipModel);
    }
  }

  function handleConversationFlowChange(flowKey: DosConversationFlowKey) {
    setSelectedConversationFlow(flowKey);
    setConversationResponses({});
  }

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setSelectedMeetingId(null);
    setSelectedPersonId(null);
    setPostMeetingFollowUpId(null);
    setPeopleImportMessage(null);
  }

  function openPersonDetail(personId: string) {
    setActiveTab("people");
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setSelectedPersonId(personId);
  }

  function openPersonEdit(person: DosAppPerson) {
    setErrorMessage("");
    setFormMode("editPerson");
    setIsAdditionalPersonInfoOpen(false);
    setSelectedRelationshipModel(relationshipModelForPerson(person));
  }

  function openMeetingForPerson(personId: string) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
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
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
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

  function personPayloadFromForm(formData: FormData, relationshipModel: DosRelationshipModel, id?: string) {
    return {
      birthday: String(formData.get("birthday") ?? ""),
      church: String(formData.get("church") ?? ""),
      discipleshipStage: relationshipModel.discipleshipStage,
      city: String(formData.get("city") ?? ""),
      email: String(formData.get("email") ?? ""),
      homeAddress: String(formData.get("home_address") ?? ""),
      id,
      name: String(formData.get("name") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      occupation: String(formData.get("occupation") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      relationshipContext: relationshipModel.relationshipContext,
      roleInMyLife: relationshipModel.roleInMyLife,
      state: String(formData.get("state") ?? ""),
      zip: String(formData.get("zip") ?? ""),
    };
  }

  async function submitJson(endpoint: string, payload: Record<string, unknown>, method: "PATCH" | "POST" = "POST", closeAfterSave = true) {
    setErrorMessage("");

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Demo changes are not saved.");
      return null;
    }

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
      const result = await response.json().catch(() => ({})) as { error?: string; id?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save.");
      }

      if (closeAfterSave) {
        closeForm();
      }
      setSelectedOutcomeTags([]);
      router.refresh();

      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePeopleImport(rows: PeopleImportRow[]) {
    setPeopleImportMessage(null);

    if (isPreview) {
      throw new Error("Preview mode is read-only. Contacts are not imported.");
    }

    const response = await fetch("/api/dos/app/people/import", {
      body: JSON.stringify({
        rows,
        workspaceId: data.workspace.id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as Partial<PeopleImportResult> & { error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to import contacts.");
    }

    const importResult: PeopleImportResult = {
      duplicateCount: result.duplicateCount ?? 0,
      importedCount: result.importedCount ?? 0,
      invalidCount: result.invalidCount ?? 0,
      skippedCount: result.skippedCount ?? 0,
    };

    setPeopleImportMessage({
      text: `Imported ${importResult.importedCount}. Skipped ${importResult.skippedCount}.`,
      tone: "success",
    });
    router.refresh();

    return importResult;
  }

  function handlePersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipModel),
    });
  }

  function handleEditPersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedPerson) {
      return;
    }

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipModel, selectedPerson.id),
    }, "PATCH");
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none";

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
      conversationFlowKey,
      conversationResponses: conversationFlowKey !== "none" ? conversationResponses : {},
      fieldPersonIds: selectedMeetingPersonIds,
      notes: String(formData.get("notes") ?? ""),
      tableDate: String(formData.get("table_date") ?? todayDateValue()),
      tableType: selectedMeetingContext,
      }, "POST");

      if (result?.id) {
        setActiveTab("meetings");
        setSelectedMeetingId(result.id);
        setPostMeetingFollowUpId(result.id);
      }
    })();
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

  function handleReflectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    void submitJson("/api/dos/app/reflections", {
      followUpNeeded: formData.get("follow_up_needed") === "on",
      meetingId: selectedMeeting.id,
      nextStep: String(formData.get("next_step") ?? ""),
      observedFruit: selectedOutcomeTags,
      prayerNeeds: String(formData.get("prayer_needs") ?? ""),
      privateNotes: String(formData.get("private_notes") ?? ""),
      spiritualOpenness: String(formData.get("spiritual_openness") ?? ""),
      whatHappened: String(formData.get("what_happened") ?? ""),
    });
  }

  function reviewUrlFromToken(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/review/${token}`
      : `/review/${token}`;
  }

  function testimonyUrlFromToken(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/testimony/${token}`
      : `/testimony/${token}`;
  }

  function existingReviewUrl(meeting: DosAppMeeting) {
    const token = reviewLinksByMeetingId[meeting.id] ?? meeting.review.token;

    return token ? reviewUrlFromToken(token) : null;
  }

  function existingTestimonyUrl(meeting: DosAppMeeting) {
    const token = testimonyLinksByMeetingId[meeting.id];

    return token ? testimonyUrlFromToken(token) : null;
  }

  async function ensureReviewLink(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return null;
    }

    if (isPreview) {
      throw new Error("Preview mode is read-only. Review links are not created.");
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

  async function ensureTestimonyLink(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return null;
    }

    if (isPreview) {
      throw new Error("Preview mode is read-only. Story links are not created.");
    }

    const existingUrl = existingTestimonyUrl(meeting);

    if (existingUrl) {
      return existingUrl;
    }

    const response = await fetch("/api/dos/app/testimony-links", {
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
      throw new Error(result.error ?? "Unable to create story link.");
    }

    if (result.token) {
      setTestimonyLinksByMeetingId((current) => ({
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

  async function handleCopyTestimony(meeting: DosAppMeeting) {
    setErrorMessage("");
    setTestimonyLinkMeetingId(meeting.id);
    setTestimonyShareMessage("");

    try {
      const url = await ensureTestimonyLink(meeting);

      if (!url) {
        return;
      }

      const copied = await copyReviewUrl(url);

      setTestimonyShareMessage(copied ? "Story link copied." : url);
    } catch (error) {
      setTestimonyShareMessage(error instanceof Error ? error.message : "Unable to create story link.");
    } finally {
      setTestimonyLinkMeetingId(null);
    }
  }

  async function handleShareTestimony(meeting: DosAppMeeting) {
    setErrorMessage("");
    setTestimonyLinkMeetingId(meeting.id);
    setTestimonyShareMessage("");

    try {
      const url = await ensureTestimonyLink(meeting);

      if (!url) {
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            text: "Share your story from our conversation.",
            title: "Share Your Story",
            url,
          });
          setTestimonyShareMessage("Story link shared.");
          return;
        } catch {
        }
      }

      const copied = await copyReviewUrl(url);

      setTestimonyShareMessage(copied ? "Story link copied." : url);
    } catch (error) {
      setTestimonyShareMessage(error instanceof Error ? error.message : "Unable to share story link.");
    } finally {
      setTestimonyLinkMeetingId(null);
    }
  }

  async function handleUpdateFruitEvent(event: DosAppFruitEvent, updates: Record<string, unknown>) {
    setErrorMessage("");

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Fruit changes are not saved.");
      return;
    }

    try {
      const response = await fetch(`/api/dos/app/fruit-events/${event.id}`, {
        body: JSON.stringify({
          ...updates,
          workspaceId: data.workspace.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update fruit.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update fruit.");
    }
  }

  async function handleDeleteFruitEvent(event: DosAppFruitEvent) {
    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Fruit changes are not saved.");
      return;
    }

    if (typeof window !== "undefined" && !window.confirm("Delete this mistaken Fruit event?")) {
      return;
    }

    setErrorMessage("");

    try {
      const response = await fetch(`/api/dos/app/fruit-events/${event.id}?workspaceId=${encodeURIComponent(data.workspace.id)}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete fruit.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete fruit.");
    }
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
    <div className="min-h-[100dvh] bg-[#FAFBFD] text-[#0F172A] sm:flex sm:items-center sm:justify-center sm:p-6 lg:p-8">
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[#FAFBFD] shadow-[0_18px_60px_rgba(42,37,29,0.08)] sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:max-w-[430px] sm:rounded-[34px] sm:border sm:border-[#E2E8F0] md:max-w-[760px] lg:max-w-[960px]">
        <div className="h-full overflow-y-auto px-4 pb-28 pt-8 [scrollbar-width:none] md:px-8">
          <header className="relative md:mx-auto md:max-w-[560px]">
            {activeTab === "more" ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                  Library
                </p>
                <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight text-[#0F172A]">Resources</h1>
                <p className="mt-1 text-[13px] leading-5 text-[#64748B]">For conversations and follow up.</p>
                <button
                  aria-label="Search library"
                  className="absolute right-0 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-[#0F172A] transition-colors hover:border-[#E2E8F0] hover:bg-white"
                  type="button"
                >
                  <Search className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                </button>
              </div>
            ) : (
              <>
                <div className="min-w-0 pr-16">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                    DOS
                  </p>
                  <h1 className="mt-1 max-w-[270px] text-[32px] font-bold leading-tight tracking-tight text-[#0F172A]">
                    {timeGreeting}, {greetingName}.
                  </h1>
                  <p className="mt-1 max-w-[292px] text-[12.5px] font-medium leading-4 text-[#64748B]">{homeSubtitle}</p>
                </div>
                <button
                  aria-label="Open profile"
                  className="absolute right-0 top-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                  onClick={() => setIsProfileOpen(true)}
                  type="button"
                >
                  <UserProfileAvatar imageUrl={data.workspace.profileImageUrl} name={profileName} />
                </button>
              </>
            )}
          </header>

          <main className={`${activeTab === "more" ? "mt-5" : "mt-7"} md:mx-auto md:max-w-[560px]`}>
            {activeTab === "home" ? (
              <div className="space-y-5">
                <CircleFocusHero
                  headline={circleHeadline}
                  onSelectCircle={setCircleSheetView}
                  onViewCircles={() => setIsCirclesOpen(true)}
                  rankedPeople={rankedCirclePeople}
                />

                <section className="grid grid-cols-3 gap-2">
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
                    <div className="rounded-[22px] bg-white px-4 py-4 text-sm font-medium text-[#64748B] shadow-[0_8px_24px_rgba(42,37,29,0.04)]">All caught up for now.</div>
                  )}
                </section>

                <section>
                  <SectionHeading action={<span className="text-xs text-[#64748B]">{thisWeekStats.label}</span>} title="This Week" />
                  <div className="grid grid-cols-3 gap-2">
                    <WeekStatTile label="Meetings" value={thisWeekStats.meetings} />
                    <WeekStatTile label="Prayed" value={thisWeekStats.prayed} />
                    <WeekStatTile label="New People" value={thisWeekStats.newPeople} />
                  </div>
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
                    {latestPrayerActivity ? (
                      <RecentActivityRow
                        icon="bell"
                        onClick={() => openMeetingDetail(latestPrayerActivity.meetingId)}
                        title="Latest prayer"
                      >
                        {latestPrayerActivity.label}
                      </RecentActivityRow>
                    ) : null}
                    {latestFruitActivity ? (
                      <RecentActivityRow
                        icon="fruit"
                        onClick={() => setActiveTab("fruit")}
                        title="Latest fruit"
                      >
                        {latestFruitActivity.label}
                      </RecentActivityRow>
                    ) : null}
                    {!latestMeeting && !latestPrayerActivity && !latestFruitActivity ? (
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#64748B]">Log a meeting to begin your activity rhythm.</div>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "people" ? (
              <div>
              <SectionHeading action={<CompactButton icon="add" onClick={() => openForm("person")}>Add</CompactButton>} title="People" />
              <SearchField label="Find Person" onChange={setPeopleQuery} placeholder="Search by name, phone, or relationship" value={peopleQuery} />
              {peopleImportMessage ? (
                <p className={`mt-3 rounded-2xl border p-3 text-sm ${
                  peopleImportMessage.tone === "success"
                    ? "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {peopleImportMessage.text}
                </p>
              ) : null}
              <div className="mt-4">
                {visiblePeople.length ? (
                  <div className="grid gap-3">{visiblePeople.map((person, index) => <PersonCard index={index} key={person.id} onClick={() => openPersonDetail(person.id)} person={person} />)}</div>
                ) : people.length ? (
                  <EmptyState text="Try a different name or relationship." title="No matching people." />
                ) : (
                  <EmptyState action={<CompactButton icon="add" onClick={() => openForm("person")}>Add Person</CompactButton>} text="Start by adding someone you are walking with." title="No people added yet." />
                )}
                </div>
                <section className="mt-4 rounded-[22px] border border-[#E2E8F0] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                        Advanced Settings
                      </p>
                      <h3 className="mt-1 text-sm font-bold text-[#0F172A]">Import Contacts</h3>
                      <p className="mt-1 text-xs leading-5 text-[#64748B]">Upload a CSV to add people to your field.</p>
                    </div>
                    <button
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] text-[#2563EB] transition-colors hover:bg-white"
                      onClick={() => setIsPeopleImportOpen(true)}
                      type="button"
                      aria-label="Import contacts"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                    </button>
                  </div>
                </section>
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
                          ? "border-[#2563EB] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]"
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
              {data.workspace.isUsamWorkspace ? (
                <Link
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#0F172A]"
                  href={data.workspace.publicProfileHref}
                >
                  View Public Profile
                </Link>
              ) : null}
              </div>
            ) : null}
          </main>
        </div>

        {isCirclesOpen ? (
          <CirclesDetailOverlay
            latestMeetingDateByPersonId={latestMeetingDateByPersonId}
            onBack={() => setIsCirclesOpen(false)}
            onLogMeeting={() => openForm("meeting")}
            onLogMeetingForPerson={openMeetingForPerson}
            onOpenPerson={openPersonDetail}
            onSearch={() => {
              setIsCirclesOpen(false);
              setActiveTab("people");
            }}
            rankedPeople={rankedCirclePeople}
          />
        ) : null}

        {circleSheetView ? (
          <CircleLayerSheet
            activeCircle={circleSheetView}
            latestMeetingDateByPersonId={latestMeetingDateByPersonId}
            onClose={() => setCircleSheetView(null)}
            onLogMeeting={() => openForm("meeting")}
            onLogMeetingForPerson={openMeetingForPerson}
            onOpenPerson={openPersonDetail}
            rankedPeople={rankedCirclePeople}
          />
        ) : null}

        {selectedPerson ? (
          <PersonDetailOverlay
            fruitEvents={data.fruitEvents}
            index={Math.max(0, people.findIndex((person) => person.id === selectedPerson.id))}
            isPreview={isPreview}
            leaderReflections={data.leaderReflections}
            meetings={data.meetings}
            onBack={() => setSelectedPersonId(null)}
            onDeleteFruitEvent={handleDeleteFruitEvent}
            onEdit={() => openPersonEdit(selectedPerson)}
            onLogMeeting={() => openMeetingForPerson(selectedPerson.id)}
            onOpenMeeting={openMeetingDetail}
            onUpdateFruitEvent={handleUpdateFruitEvent}
            participantReviews={data.participantReviews}
            participantTestimonies={data.participantTestimonies}
            person={selectedPerson}
            circleScore={scoreByPersonId.get(selectedPerson.id) ?? null}
            workspaceId={data.workspace.id}
          />
        ) : null}

        {selectedMeetingWithReview ? (
          <MeetingDetailOverlay
            fruitEvents={data.fruitEvents}
            isSendingReview={reviewLinkMeetingId === selectedMeetingWithReview.id}
            isSendingTestimony={testimonyLinkMeetingId === selectedMeetingWithReview.id}
            leaderReflections={data.leaderReflections}
            meeting={selectedMeetingWithReview}
            onBack={() => setSelectedMeetingId(null)}
            onCopyReview={() => handleCopyReview(selectedMeetingWithReview)}
            onCopyTestimony={() => handleCopyTestimony(selectedMeetingWithReview)}
            onDeleteFruitEvent={handleDeleteFruitEvent}
            onEdit={() => openMeetingEdit(selectedMeetingWithReview)}
            onLogMeeting={() => openForm("meeting")}
            onLogReflection={() => {
              setSelectedOutcomeTags([]);
              setFormMode("reflection");
            }}
            onSendReview={() => handleSendReview(selectedMeetingWithReview)}
            onSendTestimony={() => handleShareTestimony(selectedMeetingWithReview)}
            onShareReview={() => handleShareReview(selectedMeetingWithReview)}
            onShareTestimony={() => handleShareTestimony(selectedMeetingWithReview)}
            onUpdateFruitEvent={handleUpdateFruitEvent}
            participantReviews={data.participantReviews}
            participantTestimonies={data.participantTestimonies}
            people={people}
            reviewShareMessage={reviewShareMessage}
            showPostMeetingFollowUp={postMeetingFollowUpId === selectedMeetingWithReview.id}
            testimonyShareMessage={testimonyShareMessage}
          />
        ) : null}

        {isProfileOpen ? (
          <ProfileSheet
            email={profileEmail}
            fieldName={fieldName}
            fieldSublabel={fieldSublabel}
            name={profileName}
            onClose={() => setIsProfileOpen(false)}
            onEditProfile={() => {
              setIsProfileOpen(false);
              setIsEditProfileOpen(true);
            }}
            onOpenCircles={() => {
              setIsProfileOpen(false);
              setIsCirclesOpen(true);
            }}
            photoUrl={data.workspace.profileImageUrl}
          />
        ) : null}

        {isEditProfileOpen ? (
          <EditProfileSheet
            email={profileEmail}
            fieldName={fieldName}
            fieldSublabel={fieldSublabel}
            name={profileName}
            onClose={() => setIsEditProfileOpen(false)}
            phone={profilePhone}
          />
        ) : null}

        {isPeopleImportOpen ? (
          <PeopleImportSheet
            existingPeople={people}
            onClose={() => setIsPeopleImportOpen(false)}
            onImport={handlePeopleImport}
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
            <PersonRelationshipSetup
              detailsOpen={isAdditionalPersonInfoOpen}
              onChange={setSelectedRelationshipModel}
              onToggleDetails={() => setIsAdditionalPersonInfoOpen((current) => !current)}
              value={selectedRelationshipModel}
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
            <PersonRelationshipSetup
              additionalDefaults={selectedPersonDefaults}
              detailsOpen={isAdditionalPersonInfoOpen}
              onChange={setSelectedRelationshipModel}
              onToggleDetails={() => setIsAdditionalPersonInfoOpen((current) => !current)}
              value={selectedRelationshipModel}
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

      {formMode === "reflection" && selectedMeeting ? (
        <Sheet onClose={closeForm} title="Leader Reflection">
          <form className="space-y-4" onSubmit={handleReflectionSubmit}>
            <FormOptionSelect
              label="Spiritual Openness"
              name="spiritual_openness"
              options={[
                { label: "Select", value: "" },
                { label: "Not ready", value: "Not ready" },
                { label: "Curious", value: "Curious" },
                { label: "Open", value: "Open" },
                { label: "Ready to follow", value: "Ready to follow" },
                { label: "Actively following", value: "Actively following" },
              ]}
            />
            <label className="block">
              <FieldLabel>What Happened</FieldLabel>
              <textarea className={FieldTextareaClass()} name="what_happened" placeholder="Internal observations from the meeting." />
            </label>
            <label className="block">
              <FieldLabel>Prayer Needs</FieldLabel>
              <textarea className={FieldTextareaClass()} name="prayer_needs" placeholder="Prayer needs or sensitive context." />
            </label>
            <label className="flex items-start gap-3 rounded-[20px] border border-[#E2E8F0] bg-white p-3">
              <input className="mt-1 h-4 w-4 accent-[#2563EB]" name="follow_up_needed" type="checkbox" />
              <span className="text-sm font-semibold text-[#0F172A]">Follow up needed</span>
            </label>
            <FormOptionSelect
              label="Next Step"
              name="next_step"
              options={[
                { label: "Select", value: "" },
                { label: "Continue meeting", value: "Continue meeting" },
                { label: "Begin discipleship", value: "Begin discipleship" },
                { label: "Send follow up", value: "Send follow up" },
                { label: "Invite to group", value: "Invite to group" },
                { label: "Connect to church", value: "Connect to church" },
                { label: "Connect to ministry", value: "Connect to ministry" },
                { label: "Hand off", value: "Hand off" },
                { label: "Pray and wait", value: "Pray and wait" },
                { label: "Other", value: "Other" },
              ]}
            />
            <div>
              <FieldLabel>Observed Fruit</FieldLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {outcomeTagOptions.map((tag) => {
                  const selected = selectedOutcomeTags.includes(tag);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-11 rounded-2xl border px-3 text-left text-xs font-semibold ${
                        selected ? "border-[#2563EB] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white" : "border-[#E2E8F0] bg-white text-[#0F172A]"
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
            <label className="block">
              <FieldLabel>Private Notes</FieldLabel>
              <textarea className={FieldTextareaClass()} name="private_notes" placeholder="Private internal notes." />
            </label>
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Save Reflection"}</AppButton>
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
            <FormOptionSelect
              label="Linked Person"
              name="field_person_id"
              options={[
                { label: "Not linked", value: "" },
                ...people.map((person) => ({
                  helper: relationshipLine(person),
                  label: person.name,
                  value: person.id,
                })),
              ]}
            />
            <div>
              <FieldLabel>Outcome Tags</FieldLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {outcomeTagOptions.map((tag) => {
                  const selected = selectedOutcomeTags.includes(tag);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-11 rounded-2xl border px-3 text-left text-xs font-semibold ${
                        selected ? "border-[#2563EB] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white" : "border-[#E2E8F0] bg-white text-[#0F172A]"
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
