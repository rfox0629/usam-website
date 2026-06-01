"use client";

import Link from "next/link";
import { ArrowLeft, Bell, BookOpen, Briefcase, Cake, CalendarDays, Camera, CheckCircle2, ChevronRight, Church, Droplet, ExternalLink, FileImage, Flame, Gift, GitBranch, Heart, HeartHandshake, HelpCircle, LogOut, Mail, MapPin, Megaphone, MessageCircle, Mic, Moon, Palette, Pencil, Phone, Search, Send, Settings, Shield, Sparkles, Square, StickyNote, User, UserPlus, Users, X } from "lucide-react";
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
import type { DosAppCalendarConnection, DosAppData, DosAppFruit, DosAppFruitEvent, DosAppLeaderReflection, DosAppMeeting, DosAppMeetingType, DosAppParticipantReview, DosAppParticipantTestimony, DosAppPerson, DosAppPrayerLog, DosAppRelationshipReminder, DosAppReviewStatus, DosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { selectPersonDetailFruitSummary, type PersonDetailFruitSummary } from "@/src/lib/dos/person-fruit-summary";
import { personNotesToPlainText, splitPersonNotesValue } from "@/src/lib/dos/person-notes";
import {
  defaultRelationshipModel,
  discipleshipStageLabel,
  relationshipContextLabel,
  relationshipContextOptions,
  relationshipModelFromRelationshipType,
  normalizeRelationshipType,
  relationshipScoreFromEngagementLevel,
  relationshipScoreLabel,
  relationshipTypeFromModel,
  relationshipTypeOptions,
  type DosRelationshipModel,
  type RelationshipScoreValue,
  type RelationshipTypeValue,
} from "@/src/lib/dos/relationship-model";
import { dosFollowUpGuideResources, dosTableTeachingResources } from "@/src/lib/dos/guide-resources";

const font = { oswald: "'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };
const dosRootShellClassName = "mx-auto min-h-[100dvh] w-full max-w-[430px] bg-white text-[#0F172A] sm:flex sm:items-center sm:justify-center sm:py-6";
const dosPhoneShellClassName = "relative mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden bg-white shadow-[0_18px_60px_rgba(42,37,29,0.08)] sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-[34px] sm:border sm:border-[#E2E8F0]";

const tabs = [
  { icon: "home", label: "Home", value: "home" },
  { icon: "people", label: "People", value: "people" },
  { icon: "meetings", label: "Meetings", value: "meetings" },
  { icon: "fruit", label: "Fruit", value: "fruit" },
  { icon: "library", label: "Library", value: "more" },
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

const commitmentLevelOptions: ReadonlyArray<{
  helper: string;
  label: string;
  value: RelationshipScoreValue;
}> = [
  { helper: "All in. No reservations. Has counted the cost.", label: "+3 Fully Committed", value: 3 },
  { helper: "Committed with some reservations. Currently counting the cost.", label: "+2 Committed", value: 2 },
  { helper: "Desires to follow Jesus but struggles with competing priorities and distractions.", label: "+1 Seeking Commitment", value: 1 },
  { helper: "Interested in spiritual things but not currently taking action.", label: "0 Interested", value: 0 },
  { helper: "Often seeks God's help during difficulties but repeatedly encounters roadblocks.", label: "-1 Crisis Driven", value: -1 },
  { helper: "Consumed by personal issues and rarely receptive to counsel or guidance.", label: "-2 Resistant", value: -2 },
  { helper: "Refuses counsel. Refuses responsibility. Unwilling to consider change.", label: "-3 Hardened", value: -3 },
];

function overviewEngagementLabel(value: RelationshipScoreValue) {
  switch (value) {
    case 3:
      return "Fully Committed";
    case 2:
      return "Committed";
    case 1:
      return "Seeking";
    case -1:
      return "Crisis Driven";
    case -2:
      return "Resistant";
    case -3:
      return "Hardened";
    case 0:
    default:
      return "Neutral";
  }
}

const conversationYesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] as const satisfies ReadonlyArray<{ label: string; value: DosConversationAnswer }>;

const conversationUnsureAnswerOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Unsure", value: "unsure" },
] as const satisfies ReadonlyArray<{ label: string; value: DosConversationAnswer }>;

const fruitOutcomeOptions = [
  "Reconciliation",
  "New Believers",
  "Marriage Restoration",
  "Baptized",
  "Discipling",
  "Started Discipling Others",
  "Gospel Conversation",
  "Prayer Received",
  "Church Connection",
  "Testimony Shared",
  "Joined Discipleship",
  "Bible Study Started",
  "Prayer Request",
  "Church Visit",
  "Serving",
  "Disciple Maker",
] as const;

const outcomeTagOptions = fruitOutcomeOptions;
const meetingObservedFruitOptions = fruitOutcomeOptions.map((label) => ({ label, value: label }));
const reminderTypeOptions = [
  { helper: "Yearly", label: "Birthday", value: "birthday" },
  { helper: "Yearly", label: "Anniversary", value: "anniversary" },
  { helper: "Yearly", label: "Baptism", value: "baptism" },
  { helper: "Yearly", label: "Salvation", value: "salvation" },
  { helper: "One time", label: "Follow Up", value: "follow_up" },
  { helper: "One time", label: "Prayer", value: "prayer" },
  { helper: "Flexible", label: "Custom", value: "custom" },
] as const;
const reminderRecurrenceOptions = [
  { label: "None", value: "none" },
  { label: "Yearly", value: "yearly" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
] as const;

type ActiveTab = typeof tabs[number]["value"];
type ButtonTone = "black" | "soft" | "white";
type CircleFocusView = "seventy" | "three" | "twelve";
type PeopleCircleView = CircleFocusView | "other";
type MeetingsView = "agenda" | "calendar";
type MeetingCalendarItemKind = "anniversary" | "birthday" | "follow_up" | "meeting" | "prayer";
type MeetingCalendarItem = {
  date: string;
  id: string;
  kind: MeetingCalendarItemKind;
  meeting?: DosAppMeeting;
  personId?: string | null;
  personName?: string | null;
  reminder?: DosAppRelationshipReminder;
  subtitle: string;
  syncLabel?: string;
  title: string;
};
type FormMode = "editMeeting" | "editPerson" | "fruit" | "meeting" | "meetingNotes" | "person" | "reminder" | "scheduleMeeting" | null;
type IconName = typeof tabs[number]["icon"] | "add" | "arrow" | "bell" | "calendar" | "log" | "prayer" | "search" | "upload";
type MeetingCaptureType = "photo" | "screenshot" | "voice";
type MeetingReviewFollowUp = "none" | "quick_review" | "testimony_request";
type PendingMeetingSendAction = {
  meeting: DosAppMeeting;
  type: Exclude<MeetingReviewFollowUp, "none">;
};
const quickReviewQuestionPreview = [
  "I felt heard",
  "I felt cared for",
  "This conversation helped me",
  "I would meet again",
  "Optional note",
] as const;
const testimonyQuestionPreview = [
  "What happened?",
  "What changed?",
  "Did you take a next step?",
  "May we share this story publicly?",
  "Public display name, if sharing publicly",
] as const;
type ScriptureReference = {
  reference: string;
  text: string;
};
type ScriptureQuickViewState = {
  scripture: ScriptureReference;
  top: number;
};
type MeetingCaptureDraft = {
  file: Blob;
  fileName: string;
  id: string;
  previewUrl?: string;
  type: MeetingCaptureType;
};

const scriptureReferences = {
  hebrews1025: {
    reference: "Hebrews 10:25",
    text: "Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another: and so much the more, as ye see the day approaching.",
  },
  luke1610: {
    reference: "Luke 16:10",
    text: "He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much.",
  },
  matthew716: {
    reference: "Matthew 7:16",
    text: "Ye shall know them by their fruits. Do men gather grapes of thorns, or figs of thistles?",
  },
  secondPeter318: {
    reference: "2 Peter 3:18",
    text: "But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ. To him be glory both now and for ever. Amen.",
  },
} as const satisfies Record<string, ScriptureReference>;
type SegmentedTabOption<T extends string> = {
  label: string;
  value: T;
};
type PersonFormDefaults = {
  birthday?: string;
  childrenNames?: string;
  church?: string;
  city?: string;
  email?: string;
  engagementScore?: RelationshipScoreValue;
  homeAddress?: string;
  householdNotes?: string;
  name?: string;
  notes?: string;
  occupation?: string;
  phone?: string;
  spouseName?: string;
  state?: string;
  zip?: string;
};
type PersonChildDraft = {
  firstName: string;
  id: string;
  lastName: string;
};
type PersonHouseholdDraft = {
  children: PersonChildDraft[];
  spouseFirstName: string;
  spouseLastName: string;
};
type PeopleImportRow = {
  childrenNames: string;
  church: string;
  city: string;
  email: string;
  firstName: string;
  householdNotes: string;
  lastName: string;
  name: string;
  notes: string;
  phone: string;
  sourceRowNumber: number;
  spouseName: string;
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
    case "library":
      return (
        <svg {...commonProps}>
          <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12v16H7a2.5 2.5 0 0 0-2.5 2.5v-16Z" />
          <path d="M7 3v16" />
          <path d="M10 7h5.5" />
          <path d="M10 10h4" />
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
    case "upload":
      return (
        <svg {...commonProps}>
          <path d="M12 16V5" />
          <path d="m8 9 4-4 4 4" />
          <path d="M5 19h14" />
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

function formatTime(value: string | null) {
  const date = parseDisplayDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMeetingTimeRange(meeting: DosAppMeeting) {
  const start = formatTime(meeting.scheduledStartAt ?? meeting.date);
  const end = formatTime(meeting.scheduledEndAt);

  return [formatDate(meeting.scheduledStartAt ?? meeting.date), start && end ? `${start} - ${end}` : start].filter(Boolean).join(" · ");
}

function formatDateTime(value: string | null | undefined) {
  const dateValue = value ?? null;
  const time = formatTime(dateValue);

  return [formatDate(dateValue), time].filter(Boolean).join(" · ");
}

function startOfDisplayDay(value: string | null | undefined) {
  const date = value ? parseDisplayDate(value) : null;

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isUpcomingDate(value: string | null | undefined) {
  const date = startOfDisplayDay(value);

  if (!date) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return date.getTime() >= todayStart;
}

function dayOffsetFromToday(value: string | null | undefined) {
  const date = startOfDisplayDay(value);

  if (!date) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return Math.round((date.getTime() - todayStart) / (24 * 60 * 60 * 1000));
}

function isTodayDate(value: string | null | undefined) {
  return dayOffsetFromToday(value) === 0;
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

function dateSortValue(value: string | null | undefined) {
  return parseDisplayDate(value ?? null)?.getTime() ?? 0;
}

function formatWeekRangeCompact(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} · ${formatter.format(end)}`;
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

function calendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromCalendarKey(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function calendarDateKeyFromValue(value: string | null | undefined) {
  const date = parseDisplayDate(value ?? null);

  return date ? calendarDateKey(date) : "";
}

function startOfCalendarMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function daysInCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameCalendarMonth(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function calendarMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function calendarSelectedDayLabel(value: string) {
  const date = dateFromCalendarKey(value);
  const label = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "long",
  }).format(date);

  return isTodayDate(value) ? `Today · ${label}` : label;
}

function localDateTimeIso(dateValue: string, timeValue: string) {
  const date = new Date(`${dateValue}T${timeValue || "00:00"}:00`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formDurationMinutes(value: FormDataEntryValue | null) {
  const minutes = Number(value);

  return Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
}

function meetingTypeLabel(value: string) {
  return meetingTypeOptions.find((option) => option.value === value)?.label ?? "Meeting";
}

function meetingActivityTitle(meeting: DosAppMeeting) {
  return meeting.source === "connection" ? meeting.title : meetingTypeLabel(meeting.type);
}

function reminderTypeLabel(value: DosAppRelationshipReminder["reminderType"]) {
  return reminderTypeOptions.find((option) => option.value === value)?.label ?? "Reminder";
}

function reminderDisplayTitle(reminder: DosAppRelationshipReminder, person?: DosAppPerson | null) {
  if (reminder.title?.trim()) {
    return reminder.title.trim();
  }

  const personName = person?.name ?? "Person";

  switch (reminder.reminderType) {
    case "anniversary":
      return `${personName} anniversary`;
    case "baptism":
      return `${personName} baptism`;
    case "birthday":
      return `${personName} birthday`;
    case "salvation":
      return `${personName} salvation`;
    case "follow_up":
      return `Follow up with ${personName}`;
    case "prayer":
      return `Pray for ${personName}`;
    case "custom":
    default:
      return `Reminder for ${personName}`;
  }
}

function nextReminderDate(reminder: DosAppRelationshipReminder) {
  const date = parseDisplayDate(reminder.reminderDate);

  if (!date || reminder.recurrence === "none") {
    return reminder.reminderDate;
  }

  const now = new Date();
  const nextDate = new Date(date);

  if (reminder.recurrence === "yearly") {
    nextDate.setFullYear(now.getFullYear());
    if (nextDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      nextDate.setFullYear(now.getFullYear() + 1);
    }
  }

  if (reminder.recurrence === "monthly") {
    nextDate.setFullYear(now.getFullYear(), now.getMonth());
    if (nextDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }

  if (reminder.recurrence === "weekly") {
    while (nextDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      nextDate.setDate(nextDate.getDate() + 7);
    }
  }

  return nextDate.toISOString();
}

function reminderSyncLabel(reminder: DosAppRelationshipReminder) {
  if (reminder.googleSyncStatus === "synced") {
    return "Synced";
  }

  if (reminder.googleSyncStatus === "failed") {
    return "Sync failed";
  }

  return "Local only";
}

function meetingSyncLabel(meeting: DosAppMeeting) {
  if (meeting.googleSyncStatus === "synced") {
    return "Synced";
  }

  if (meeting.googleSyncStatus === "failed") {
    return "Sync failed";
  }

  return "Local only";
}

function calendarKindForReminder(reminder: DosAppRelationshipReminder): MeetingCalendarItemKind | null {
  if (reminder.reminderType === "birthday") {
    return "birthday";
  }

  if (reminder.reminderType === "anniversary" || reminder.reminderType === "baptism" || reminder.reminderType === "salvation") {
    return "anniversary";
  }

  if (reminder.reminderType === "follow_up") {
    return "follow_up";
  }

  if (reminder.reminderType === "prayer") {
    return "prayer";
  }

  return null;
}

function reminderDatesForCalendarMonth(reminder: DosAppRelationshipReminder, month: Date) {
  const baseDate = parseDisplayDate(reminder.reminderDate);

  if (!baseDate) {
    return [];
  }

  const withBaseTime = (year: number, monthIndex: number, day: number) => (
    new Date(year, monthIndex, day, baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds())
  );

  if (reminder.recurrence === "none") {
    return isSameCalendarMonth(baseDate, month) ? [baseDate] : [];
  }

  if (reminder.recurrence === "yearly") {
    const occurrence = withBaseTime(month.getFullYear(), baseDate.getMonth(), baseDate.getDate());

    return isSameCalendarMonth(occurrence, month) ? [occurrence] : [];
  }

  if (reminder.recurrence === "monthly") {
    const occurrence = withBaseTime(month.getFullYear(), month.getMonth(), baseDate.getDate());

    return isSameCalendarMonth(occurrence, month) ? [occurrence] : [];
  }

  const dates: Date[] = [];
  const cursor = new Date(month.getFullYear(), month.getMonth(), 1, baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
  const offset = (baseDate.getDay() - cursor.getDay() + 7) % 7;

  cursor.setDate(cursor.getDate() + offset);

  while (isSameCalendarMonth(cursor, month)) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

function buildMeetingCalendarItems({
  meetings,
  month,
  people,
  reminders,
}: {
  meetings: DosAppMeeting[];
  month: Date;
  people: DosAppPerson[];
  reminders: DosAppRelationshipReminder[];
}) {
  const meetingItems: MeetingCalendarItem[] = meetings
    .filter((meeting) => meeting.meetingStatus === "scheduled")
    .map((meeting) => {
      const date = meeting.scheduledStartAt ?? meeting.date;
      const parsedDate = parseDisplayDate(date);

      return { date, meeting, parsedDate };
    })
    .filter((item): item is { date: string; meeting: DosAppMeeting; parsedDate: Date } => Boolean(item.date && item.parsedDate && isSameCalendarMonth(item.parsedDate, month)))
    .map(({ date, meeting }) => {
      const linkedPerson = primaryMeetingPerson(meeting, people);

      return {
        date,
        id: `meeting-${meeting.id}`,
        kind: "meeting" as const,
        meeting,
        personId: linkedPerson?.id ?? meeting.fieldPersonIds[0] ?? null,
        personName: linkedPerson?.name ?? null,
        subtitle: formatMeetingTimeRange(meeting),
        syncLabel: meetingSyncLabel(meeting),
        title: meetingDisplayTitle(meeting, people),
      };
    });

  const reminderItems: MeetingCalendarItem[] = reminders.flatMap((reminder) => {
    const kind = calendarKindForReminder(reminder);

    if (!kind) {
      return [];
    }

    const linkedPerson = people.find((person) => person.id === reminder.personId) ?? null;

    return reminderDatesForCalendarMonth(reminder, month).map((date) => ({
      date: date.toISOString(),
      id: `reminder-${reminder.id}-${calendarDateKey(date)}`,
      kind,
      personId: reminder.personId,
      personName: linkedPerson?.name ?? null,
      reminder,
      subtitle: `${reminderTypeLabel(reminder.reminderType)} · ${linkedPerson?.name ?? "Person"}`,
      syncLabel: reminderSyncLabel(reminder),
      title: reminderDisplayTitle(reminder, linkedPerson),
    }));
  });

  return [...meetingItems, ...reminderItems].sort((first, second) => dateSortValue(first.date) - dateSortValue(second.date));
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
  const dateLine = meeting.meetingStatus === "scheduled" ? formatMeetingTimeRange(meeting) : formatDate(meeting.date);

  return formatDosMeetingSecondary(meetingActivityTitle(meeting), dateLine);
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

function fruitMultiplicationLabel(value: PersonDetailFruitSummary["multiplicationStatus"]) {
  if (value === "Not yet") {
    return "None Yet";
  }

  if (value === "Started") {
    return "Discipling Others";
  }

  return value;
}

const observableFruitOutcomeKeywords = [
  "gospel conversation",
  "good news",
  "prayer received",
  "requested prayer",
  "salvation",
  "new believer",
  "baptism",
  "baptized",
  "church connection",
  "church engagement",
  "joined discipleship",
  "began discipling others",
  "started discipling others",
  "disciple maker",
  "testimony shared",
] as const;

const signalStyleFruitKeywords = [
  "follow up engagement",
  "ongoing discipleship",
  "relationship signal",
  "circle signal",
  "engagement signal",
] as const;

function isObservableFruitOutcome(event: DosAppFruitEvent) {
  const titleAndType = fruitSearchText(event.title, event.fruitType);
  const text = fruitSearchText(event.title, event.fruitType, event.description);

  if (signalStyleFruitKeywords.some((keyword) => titleAndType.includes(keyword))) {
    return false;
  }

  return observableFruitOutcomeKeywords.some((keyword) => text.includes(keyword));
}

function fruitOutcomeLabel(event: DosAppFruitEvent | undefined) {
  if (!event) {
    return "None yet";
  }

  return event.title?.trim() || event.fruitType || "Fruit recorded";
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function phoneDigitsOnly(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatPhoneNumber(value: string | null | undefined) {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    return "";
  }

  if (digits.length < 4) {
    return `(${digits}`;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function phoneActionHref(action: "sms" | "tel", value: string | null | undefined) {
  const digits = phoneDigitsOnly(value);

  return `${action}:${digits || normalizeText(value)}`;
}

function personRelationshipModel(person: DosAppPerson): DosRelationshipModel {
  return {
    discipleshipStage: person.discipleshipStage,
    relationshipType: normalizeRelationshipType(person.relationshipType, person.roleInMyLife, person.status),
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
    childrenNames: person.childrenNames ?? "",
    church: person.church ?? "",
    email: person.email ?? "",
    engagementScore: relationshipScoreFromEngagementLevel(person.engagementLevel),
    name: person.name,
    householdNotes: person.householdNotes ?? "",
    notes,
    phone: person.phone,
    spouseName: person.spouseName ?? "",
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

function hasHouseholdDetails(person: DosAppPerson | PersonFormDefaults) {
  return Boolean(person.spouseName?.trim() || person.childrenNames?.trim() || person.householdNotes?.trim());
}

function compactNamePart(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function splitNameParts(value: string | null | undefined) {
  const normalized = compactNamePart(value);

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName = "", ...lastNameParts] = normalized.split(" ");

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

function blankChildDraft(index = 0): PersonChildDraft {
  return {
    firstName: "",
    id: `child-${index}`,
    lastName: "",
  };
}

function parseChildDrafts(value: string | null | undefined) {
  const children = (value ?? "")
    .split(/[,;\n]+/)
    .map((child) => compactNamePart(child))
    .filter(Boolean)
    .map((child, index) => {
      const nameParts = splitNameParts(child);

      return {
        ...nameParts,
        id: `existing-child-${index}`,
      };
    });

  return children.length ? children : [blankChildDraft()];
}

function householdDraftFromDefaults(defaults?: PersonFormDefaults): PersonHouseholdDraft {
  const spouse = splitNameParts(defaults?.spouseName);

  return {
    children: parseChildDrafts(defaults?.childrenNames),
    spouseFirstName: spouse.firstName,
    spouseLastName: spouse.lastName,
  };
}

function joinNameParts(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [compactNamePart(firstName), compactNamePart(lastName)].filter(Boolean).join(" ");
}

function householdDraftSpouseName(draft: PersonHouseholdDraft) {
  return joinNameParts(draft.spouseFirstName, draft.spouseLastName);
}

function householdDraftChildrenNames(draft: PersonHouseholdDraft) {
  return draft.children
    .map((child) => joinNameParts(child.firstName, child.lastName))
    .filter(Boolean)
    .join(", ");
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
  const model = personRelationshipModel(person);

  return [
    relationshipTypePillLabel(person),
    relationshipContextLabel(model.relationshipContext),
    discipleshipStageLabel(model.discipleshipStage),
  ].join(" · ");
}

function relationshipTypePillLabel(person: DosAppPerson) {
  const relationshipType = relationshipTypeFromModel(personRelationshipModel(person));

  return relationshipTypeOptions.find((option) => option.value === relationshipType)?.label ?? statusLabel(person.relationshipType);
}

function normalizedSignalText(...values: Array<null | string | string[] | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSignal(value: string, signals: string[]) {
  return signals.some((signal) => value.includes(signal));
}

const multiplicationJourneySignals = [
  "disciple maker",
  "discipling others",
  "started discipling others",
  "multiplication",
  "multiplying",
  "reproducing",
  "reproduction",
];

const disciplingJourneySignals = [
  "discipling",
  "disciple",
  "testimony",
  "training",
  "leadership",
  "leader",
  "leading",
  "teaching",
  "helping others",
  "walking with another",
];

function isSubmittedStatus(status: string) {
  return ["approved", "reviewed", "submitted"].includes(status.toLowerCase());
}

function deriveSpiritualJourney({
  fruitEvents,
  fruitSummary,
  meetings,
  participantReviews,
  participantTestimonies,
  person,
  reflections,
}: {
  fruitEvents: DosAppFruitEvent[];
  fruitSummary: PersonDetailFruitSummary;
  meetings: DosAppMeeting[];
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  person: DosAppPerson;
  reflections: DosAppLeaderReflection[];
}) {
  const personFlags = person as DosAppPerson & { disciple_maker?: boolean; discipleMaker?: boolean };
  const approvedFruitText = fruitEvents
    .filter((event) => event.status === "approved")
    .map((event) => normalizedSignalText(event.fruitType, event.title, event.description))
    .join(" ");
  const reflectionText = reflections
    .map((reflection) => normalizedSignalText(reflection.observedFruit, reflection.whatHappened, reflection.nextStep))
    .join(" ");
  const testimonyText = participantTestimonies
    .filter((testimony) => isSubmittedStatus(testimony.status))
    .map((testimony) => normalizedSignalText(testimony.story, testimony.whatChanged, testimony.decisionMade, testimony.nextStep))
    .join(" ");
  const hasApprovedMultiplicationFruit = fruitSummary.multiplicationStatus !== "Not yet"
    || hasSignal(approvedFruitText, multiplicationJourneySignals);
  const hasDiscipleMakerSignal = Boolean(personFlags.disciple_maker || personFlags.discipleMaker)
    || person.discipleshipStage === "disciple_maker"
    || hasApprovedMultiplicationFruit;

  if (hasDiscipleMakerSignal) {
    return "Disciple Maker";
  }

  const disciplingText = [approvedFruitText, reflectionText, testimonyText].join(" ");
  const hasDisciplingSignal = person.discipleshipStage === "discipling"
    || hasSignal(disciplingText, disciplingJourneySignals)
    || participantTestimonies.some((testimony) => isSubmittedStatus(testimony.status) && Boolean(testimony.story?.trim() || testimony.whatChanged?.trim()));

  if (hasDisciplingSignal) {
    return "Discipling";
  }

  const hasMeaningfulGrowthSignal = person.discipleshipStage === "walking_with"
    || meetings.length >= 2
    || reflections.length > 0
    || participantReviews.some((review) => isSubmittedStatus(review.status))
    || fruitEvents.some((event) => isSubmittedStatus(event.status));

  return hasMeaningfulGrowthSignal ? "Growing" : "Exploring";
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

function meetingParticipantTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return formatDosParticipantTitle(meetingParticipantNames(meeting, people), "");
}

function meetingFallbackTitle(meeting: DosAppMeeting) {
  const context = meetingActivityTitle(meeting);

  return context.toLowerCase().includes("meeting") ? context : `${context} Meeting`;
}

function meetingDisplayTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meetingParticipantTitle(meeting, people) || meetingFallbackTitle(meeting);
}

type UpcomingTimelineGroup = "Later" | "This Week" | "Today" | "Tomorrow";
type UpcomingTimelineIcon = "anniversary" | "birthday" | "meeting" | "prayer" | "reminder";
type UpcomingTimelineItem = {
  date: string | null;
  group: UpcomingTimelineGroup;
  icon: UpcomingTimelineIcon;
  id: string;
  label: string;
  meeting?: DosAppMeeting;
  notes: string | null;
  personId: string | null;
  personName: string | null;
  reminder?: DosAppRelationshipReminder;
  syncLabel: string;
  title: string;
};

const upcomingTimelineGroupOrder: UpcomingTimelineGroup[] = ["Today", "Tomorrow", "This Week", "Later"];

function upcomingTimelineGroup(value: string | null | undefined): UpcomingTimelineGroup {
  const offset = dayOffsetFromToday(value);

  if (offset === 0) {
    return "Today";
  }

  if (offset === 1) {
    return "Tomorrow";
  }

  if (offset !== null && offset >= 2 && offset <= 6) {
    return "This Week";
  }

  return "Later";
}

function timelineIconForReminder(reminder: DosAppRelationshipReminder): UpcomingTimelineIcon {
  if (reminder.reminderType === "birthday") {
    return "birthday";
  }

  if (reminder.reminderType === "anniversary" || reminder.reminderType === "baptism" || reminder.reminderType === "salvation") {
    return "anniversary";
  }

  if (reminder.reminderType === "prayer") {
    return "prayer";
  }

  return "reminder";
}

function primaryMeetingPerson(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meeting.fieldPersonIds
    .map((personId) => people.find((person) => person.id === personId) ?? null)
    .find((person): person is DosAppPerson => Boolean(person)) ?? null;
}

function buildUpcomingTimelineItems({
  meetings,
  people,
  person,
  reminders,
}: {
  meetings: DosAppMeeting[];
  people: DosAppPerson[];
  person?: DosAppPerson | null;
  reminders: DosAppRelationshipReminder[];
}) {
  const personFilterId = person?.id ?? null;
  const meetingItems: UpcomingTimelineItem[] = meetings
    .filter((meeting) => meeting.meetingStatus === "scheduled")
    .filter((meeting) => !personFilterId || meeting.fieldPersonIds.includes(personFilterId))
    .filter((meeting) => isUpcomingDate(meeting.scheduledStartAt ?? meeting.date))
    .map((meeting) => {
      const linkedPerson = person ?? primaryMeetingPerson(meeting, people);
      const date = meeting.scheduledStartAt ?? meeting.date;

      return {
        date,
        group: upcomingTimelineGroup(date),
        icon: "meeting" as const,
        id: `meeting-${meeting.id}`,
        label: `Scheduled · ${formatMeetingTimeRange(meeting)}`,
        meeting,
        notes: meeting.notes,
        personId: linkedPerson?.id ?? meeting.fieldPersonIds[0] ?? null,
        personName: linkedPerson?.name ?? null,
        syncLabel: meetingSyncLabel(meeting),
        title: meetingDisplayTitle(meeting, person ? [person] : people),
      };
    });
  const reminderItems: UpcomingTimelineItem[] = reminders
    .filter((reminder) => !personFilterId || reminder.personId === personFilterId)
    .map((reminder) => ({
      reminder,
      reminderDate: nextReminderDate(reminder),
    }))
    .filter((item) => isUpcomingDate(item.reminderDate))
    .map(({ reminder, reminderDate }) => {
      const linkedPerson = person ?? people.find((item) => item.id === reminder.personId) ?? null;

      return {
        date: reminderDate,
        group: upcomingTimelineGroup(reminderDate),
        icon: timelineIconForReminder(reminder),
        id: `reminder-${reminder.id}`,
        label: `${reminderTypeLabel(reminder.reminderType)} · ${formatDate(reminderDate)}`,
        notes: reminder.notes,
        personId: reminder.personId,
        personName: linkedPerson?.name ?? null,
        reminder,
        syncLabel: reminderSyncLabel(reminder),
        title: reminderDisplayTitle(reminder, linkedPerson),
      };
    });

  return [...meetingItems, ...reminderItems].sort((first, second) => dateSortValue(first.date) - dateSortValue(second.date));
}

function groupedUpcomingTimelineItems(items: UpcomingTimelineItem[]) {
  return upcomingTimelineGroupOrder
    .map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    }))
    .filter((group) => group.items.length);
}

function todayFocusTitle(item: UpcomingTimelineItem) {
  if (item.meeting) {
    return item.personName ? `Meet with ${item.personName}` : item.title;
  }

  return item.personName ? `${item.title} · ${item.personName}` : item.title;
}

function meetingTestimonyRecipientTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  const fieldPersonIds = Array.from(new Set(meeting.fieldPersonIds.filter(Boolean)));

  if (fieldPersonIds.length !== 1) {
    return "";
  }

  return people.find((person) => person.id === fieldPersonIds[0])?.name ?? "";
}

function canSendMeetingTestimonyRequest(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return Boolean(meetingTestimonyRecipientTitle(meeting, people));
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
    || formatPhoneNumber(person.phone).toLowerCase().includes(search)
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
    childrenNames: csvValue(headers, row, ["children", "kids", "children_names", "children names"]),
    church: csvValue(headers, row, ["church", "church_attending", "church attending", "spiritual community", "community"]),
    city: csvValue(headers, row, ["city"]),
    email: csvValue(headers, row, ["email", "home email", "email address"]),
    firstName,
    householdNotes: csvValue(headers, row, ["household_notes", "household notes", "family_notes", "family notes"]),
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName,
    notes: csvValue(headers, row, ["notes", "note", "comments", "comment"]),
    phone: csvValue(headers, row, ["phone", "phone number", "mobile phone", "mobile phone number", "cell", "cell phone"]),
    sourceRowNumber: rowIndex + 2,
    spouseName: csvValue(headers, row, ["spouse", "spouse_name", "spouse name", "wife", "husband"]),
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

function MeetingActionRow({
  onLogMeeting,
  onScheduleMeeting,
}: {
  onLogMeeting: () => void;
  onScheduleMeeting: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-3 text-[12px] font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-transform active:scale-[0.99] max-[350px]:text-[11px]"
        onClick={onLogMeeting}
        type="button"
      >
        <Icon name="log" size={14} />
        <span className="truncate">Log Meeting</span>
      </button>
      <button
        className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-full border border-[#DCEBFF] bg-white px-3 text-[12px] font-bold text-[#0F172A] shadow-[0_8px_22px_rgba(37,99,235,0.05)] transition-colors hover:border-[#BFDBFE] active:scale-[0.99] max-[350px]:text-[11px]"
        onClick={onScheduleMeeting}
        type="button"
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
        <span className="truncate max-[350px]:hidden">Schedule Meeting</span>
        <span className="hidden max-[350px]:inline">Schedule</span>
      </button>
    </div>
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
      className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#BFDBFE] max-[350px]:px-2 max-[350px]:text-[11px]"
      onClick={onClick}
      type="button"
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      <span className="min-w-0 truncate">{children}</span>
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

type PersonOutcomeEntry =
  | {
    date: string | null;
    event: DosAppFruitEvent;
    id: string;
    type: "fruit";
  }
  | {
    date: string | null;
    id: string;
    testimony: DosAppParticipantTestimony;
    type: "testimony";
  };

function ActivityFilterCard({
  active,
  helper,
  icon,
  label,
  onClick,
  value,
}: {
  active?: boolean;
  helper?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  value: number;
}) {
  const className = `min-w-0 overflow-hidden rounded-[18px] border px-2.5 py-3 text-left transition-all max-[350px]:rounded-[16px] max-[350px]:px-2 ${
    active
      ? "border-[#2563EB] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.26)]"
      : "border-[#E2E8F0] bg-white text-[#0F172A] shadow-[0_8px_22px_rgba(37,99,235,0.045)]"
  }`;
  const content = (
    <>
      <span className="flex items-center justify-between gap-1.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/18 text-white ring-1 ring-white/30" : "bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]"} max-[350px]:h-7 max-[350px]:w-7`}>
          {icon}
        </span>
        <span className={`text-[24px] font-bold leading-none max-[350px]:text-[21px] ${active ? "text-white" : "text-[#0F172A]"}`}>{value}</span>
      </span>
      <span className={`mt-3 block truncate text-[8px] font-bold uppercase tracking-[0.1em] max-[350px]:tracking-[0.06em] ${active ? "text-white/82" : "text-[#64748B]"}`} style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
      {helper ? <span className={`mt-0.5 line-clamp-2 block text-[10px] font-semibold leading-3 ${active ? "text-white/72" : "text-[#94A3B8]"}`}>{helper}</span> : null}
    </>
  );

  if (!onClick) {
    return (
      <div className={className}>
        {content}
      </div>
    );
  }

  return (
    <button
      aria-pressed={active}
      className={`${className} active:scale-[0.98] hover:border-[#BFDBFE] hover:bg-[#F8FAFC]`}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}

function FruitSummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const isShortValue = value.length <= 3;

  return (
    <div className="flex min-h-[108px] min-w-0 flex-col items-center justify-between rounded-[18px] border border-[#E2E8F0] bg-white px-2 py-3 text-center shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:min-h-[104px] max-[350px]:rounded-[16px] max-[350px]:px-1.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
        {icon}
      </span>
      <span className="mt-2 flex min-h-[34px] w-full min-w-0 items-center justify-center px-0.5">
        <span className={`max-w-full whitespace-normal text-center font-bold text-[#0F172A] ${
          isShortValue
            ? "text-[24px] leading-none max-[350px]:text-[21px]"
            : "text-[12px] leading-[0.95rem] max-[350px]:text-[10.5px] max-[350px]:leading-[0.85rem]"
        }`}>
          {value}
        </span>
      </span>
      <span className="mt-2 block w-full text-center text-[8px] font-bold uppercase leading-3 tracking-[0.08em] text-[#64748B] max-[350px]:tracking-[0.04em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
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

function PersonSummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const isShortValue = value.length <= 3;

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-left shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:rounded-[16px] max-[350px]:px-2">
      <span className="flex items-center justify-between gap-1.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
          {icon}
        </span>
        <span className={`min-w-0 text-right font-bold text-[#0F172A] ${isShortValue ? "text-[24px] leading-none max-[350px]:text-[21px]" : "line-clamp-2 text-[12px] leading-4 max-[350px]:text-[10px] max-[350px]:leading-[0.85rem]"}`}>
          {value}
        </span>
      </span>
      <span className="mt-3 block truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748B] max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
    </div>
  );
}

function SnapshotMetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[104px] min-w-0 flex-col items-center justify-between overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-center shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:min-h-[96px] max-[350px]:rounded-[16px] max-[350px]:px-1.5 max-[350px]:py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
        {icon}
      </span>
      <span className="mt-2 flex min-h-[30px] min-w-0 items-center justify-center max-[350px]:mt-1.5 max-[350px]:min-h-[28px]">
        <span className="line-clamp-2 min-w-0 break-words text-[12px] font-bold leading-4 text-[#0F172A] max-[350px]:text-[10px] max-[350px]:leading-[0.85rem]">
          {value}
        </span>
      </span>
      <span className="mt-2 block w-full truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748B] max-[350px]:mt-1.5 max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
    </div>
  );
}

function EngagementSnapshotTile({
  label,
  score,
}: {
  label: string;
  score: string;
}) {
  return (
    <div className="flex min-h-[104px] min-w-0 flex-col items-center justify-between overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-center shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:min-h-[96px] max-[350px]:rounded-[16px] max-[350px]:px-1.5 max-[350px]:py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
        <Droplet className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <span className="mt-2 flex min-h-[30px] min-w-0 items-center justify-center gap-1 max-[350px]:mt-1.5 max-[350px]:min-h-[28px] max-[350px]:gap-0.5">
        <span className="shrink-0 text-[16px] font-bold leading-none text-[#0F172A] max-[350px]:text-[14px]">{score}</span>
        <span className="line-clamp-1 min-w-0 text-[9px] font-bold leading-none text-[#64748B] max-[350px]:text-[7.5px]">
          {label}
        </span>
      </span>
      <span className="mt-2 block w-full truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748B] max-[350px]:mt-1.5 max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        Engagement
      </span>
    </div>
  );
}

function DetailResultTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[78px] min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-[18px] border border-[#D7F3DD] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(22,163,74,0.05)] max-[350px]:gap-1.5 max-[350px]:rounded-[16px] max-[350px]:px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECFDF3] text-[#16A34A] ring-1 ring-[#BBF7D0] max-[350px]:h-8 max-[350px]:w-8">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[8px] font-bold uppercase leading-3 tracking-[0.13em] text-[#94A3B8] max-[350px]:text-[7px] max-[350px]:leading-[0.8rem] max-[350px]:tracking-[0.08em]" style={{ fontFamily: font.rajdhani }}>
          {label}
        </span>
        <span className="mt-1 line-clamp-2 block break-words text-[13px] font-bold leading-[1.15] text-[#15803D] max-[350px]:text-[12px]">{value}</span>
      </span>
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

function TabPageHeader({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <header className="flex min-h-10 items-center justify-between gap-3">
      <h1 className="text-[18px] font-black uppercase tracking-[0.14em] text-[#0F172A]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function TabHero({
  icon,
  onScriptureClick,
  scripture,
  subtitle,
  title,
}: {
  icon: ReactNode;
  onScriptureClick: (scripture: ScriptureReference, event: MouseEvent<HTMLButtonElement>) => void;
  scripture: ScriptureReference;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_58%,#F8FBFF_100%)] px-5 py-5 shadow-[0_18px_38px_rgba(37,99,235,0.09)] ring-1 ring-[#DCEBFF]">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          {icon}
        </span>
        <span className="min-w-0">
          <h2 className="text-[22px] font-bold leading-tight text-[#0F172A]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-5 text-[#64748B]">{subtitle}</p> : null}
          <button
            className="mt-3 inline-flex rounded-full text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB] transition-colors hover:text-[#1D4ED8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
            onClick={(event) => onScriptureClick(scripture, event)}
            style={{ fontFamily: font.rajdhani }}
            type="button"
          >
            {scripture.reference}
          </button>
        </span>
      </div>
    </section>
  );
}

function ScriptureQuickView({
  onClose,
  state,
}: {
  onClose: () => void;
  state: ScriptureQuickViewState;
}) {
  const touchStartYRef = useRef<number | null>(null);

  return (
    <div
      className="absolute inset-0 z-[92] bg-white/35 backdrop-blur-[1.5px]"
      onPointerDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="absolute left-4 right-4 rounded-[24px] border border-[#DCEBFF] bg-white/95 p-4 shadow-[0_18px_48px_rgba(37,99,235,0.16)] ring-1 ring-white/80 transition duration-150 ease-out"
        onPointerDown={(event) => event.stopPropagation()}
        onTouchEnd={(event) => {
          const startY = touchStartYRef.current;
          touchStartYRef.current = null;

          if (startY !== null && event.changedTouches[0] && event.changedTouches[0].clientY - startY > 34) {
            onClose();
          }
        }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY ?? null;
        }}
        role="dialog"
        style={{ top: state.top }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#0F172A]">{state.scripture.reference}</h2>
            <p className="mt-2 text-[13px] font-medium leading-6 text-[#334155]">{state.scripture.text}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
              KJV
            </p>
          </div>
          <button
            aria-label="Close scripture"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-[#64748B] transition-colors hover:bg-[#EBF2FF] hover:text-[#1D4ED8]"
            onClick={onClose}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
          </button>
        </div>
      </section>
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
  showEyebrow = false,
  title,
}: {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  showEyebrow?: boolean;
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
              {showEyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                DOS
              </p> : null}
              <h2 className={`${showEyebrow ? "mt-2" : ""} text-2xl font-bold leading-none text-[#0F172A]`}>{title}</h2>
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
      className="absolute inset-0 z-[90] box-border flex items-end overflow-y-auto bg-[#0F172A]/18 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-[3px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#F4F6FB] p-3 shadow-[0_28px_85px_rgba(32,27,20,0.22)]"
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
            ["Phone", formatPhoneNumber(phone) || phone],
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
    <div className="grid rounded-full bg-[#E2E8F0] p-1 shadow-inner shadow-white/60" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
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

const meetingsViewTabs: ReadonlyArray<SegmentedTabOption<MeetingsView>> = [
  { label: "Agenda", value: "agenda" },
  { label: "Calendar", value: "calendar" },
];

const peopleCircleTabs: ReadonlyArray<SegmentedTabOption<PeopleCircleView>> = [
  { label: "My 3", value: "three" },
  { label: "My 12", value: "twelve" },
  { label: "My 70", value: "seventy" },
  { label: "Other", value: "other" },
];

function PeopleCircleTabs({
  onChange,
  value,
}: {
  onChange: (value: PeopleCircleView) => void;
  value: PeopleCircleView;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-full border border-[#DCEBFF] bg-white p-1 shadow-[0_8px_22px_rgba(37,99,235,0.05)]">
      {peopleCircleTabs.map((option) => {
        const selected = value === option.value;

        return (
          <button
            aria-pressed={selected}
            className={`min-h-9 rounded-full px-1.5 text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 max-[350px]:text-[10px] ${
              selected
                ? "bg-[#EAF2FF] text-[#1D4ED8] shadow-[0_6px_14px_rgba(37,99,235,0.10)] ring-1 ring-[#CFE0FF]"
                : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
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
    case "other":
      return "Everyone Else";
    default:
      return "Field";
  }
}

function scoreLabel(value: number) {
  return `${Math.round(value)}`;
}

type CircleListItem = { person: DosAppPerson };
type CirclePersonItem = CircleListItem & { score: DosRelationshipScore };
type CircleLayerGroups = {
  seventy: CirclePersonItem[];
  three: CirclePersonItem[];
  twelve: CirclePersonItem[];
};

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

function circleLayerDetails(activeCircle: CircleFocusView, circleGroups: CircleLayerGroups) {
  switch (activeCircle) {
    case "three":
      return {
        capacity: 3,
        cumulativeCount: circleGroups.three.length,
        empty: "No one in My 3 yet.",
        items: circleGroups.three,
        sectionLabel: "Top 3",
        startIndex: 0,
        subtitle: "The people you invest in most deeply.",
        title: "My 3",
        value: "3",
      };
    case "twelve":
      return {
        capacity: 12,
        cumulativeCount: circleGroups.three.length + circleGroups.twelve.length,
        empty: "No additional people in your 12 yet.",
        items: circleGroups.twelve,
        sectionLabel: "Next 9 People",
        startIndex: 3,
        subtitle: "These are the next 9 people in your core circle. Together with your 3, this makes 12.",
        title: "My 12",
        value: "12",
      };
    case "seventy":
      return {
        capacity: 70,
        cumulativeCount: circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length,
        empty: "No additional people in your 70 yet.",
        items: circleGroups.seventy,
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

function peopleCircleDetails(activeCircle: PeopleCircleView, circleGroups: CircleLayerGroups, people: DosAppPerson[]) {
  if (activeCircle !== "other") {
    const details = circleLayerDetails(activeCircle, circleGroups);

    return {
      empty: details.empty,
      items: details.items,
      sectionLabel: details.sectionLabel,
      startIndex: details.startIndex,
      subtitle: details.subtitle,
      title: details.title,
    };
  }

  const assignedIds = new Set([
    ...circleGroups.three,
    ...circleGroups.twelve,
    ...circleGroups.seventy,
  ].map(({ person }) => person.id));

  return {
    empty: "No one outside your circles yet.",
    items: people.filter((person) => !assignedIds.has(person.id)).map((person) => ({ person })),
    sectionLabel: "Everyone Else",
    startIndex: 70,
    subtitle: "People in your field who are not currently in My 3, My 12, or My 70.",
    title: "Everyone Else",
  };
}

function filterCircleItems(items: CircleListItem[], query: string) {
  const filtered = filteredPeople(items.map(({ person }) => person), query);
  const filteredIds = new Set(filtered.map((person) => person.id));

  return items.filter(({ person }) => filteredIds.has(person.id));
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
      <svg
        aria-hidden="true"
        className="absolute inset-0 z-10 h-full w-full"
        viewBox="0 0 172 172"
      >
        <circle
          className="cursor-pointer"
          cx="86"
          cy="86"
          fill="none"
          onClick={() => onSelectCircle("seventy")}
          onMouseEnter={() => setFocusedCircle("seventy")}
          pointerEvents="stroke"
          r="74"
          stroke="transparent"
          strokeWidth="24"
        />
        <circle
          className="cursor-pointer"
          cx="86"
          cy="86"
          fill="none"
          onClick={() => onSelectCircle("twelve")}
          onMouseEnter={() => setFocusedCircle("twelve")}
          pointerEvents="stroke"
          r="48"
          stroke="transparent"
          strokeWidth="34"
        />
        <circle
          className="cursor-pointer"
          cx="86"
          cy="86"
          fill="transparent"
          onClick={() => onSelectCircle("three")}
          onMouseEnter={() => setFocusedCircle("three")}
          r="28"
        />
      </svg>
      <button
        aria-label={`Open My 70, ${my70Count} people`}
        className="absolute left-1/2 top-[1px] z-20 flex h-7 min-w-10 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[13px] font-bold leading-none text-[#2563EB] transition-all duration-200 hover:bg-white/45 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("seventy");
        }}
        onFocus={() => setFocusedCircle("seventy")}
        onMouseEnter={() => setFocusedCircle("seventy")}
        type="button"
      >
        70
      </button>
      <button
        aria-label={`Open My 12, ${my12Count} people`}
        className="absolute left-1/2 top-[31px] z-20 flex h-7 min-w-10 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[13px] font-bold leading-none text-[#2563EB] transition-all duration-200 hover:bg-white/45 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("twelve");
        }}
        onFocus={() => setFocusedCircle("twelve")}
        onMouseEnter={() => setFocusedCircle("twelve")}
        type="button"
      >
        12
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
  circleGroups,
  headline,
  onSelectCircle,
  onViewCircles,
}: {
  circleGroups: CircleLayerGroups;
  headline: string;
  onSelectCircle: (circle: CircleFocusView) => void;
  onViewCircles: () => void;
}) {
  const my3Count = circleGroups.three.length;
  const my12Count = circleGroups.three.length + circleGroups.twelve.length;
  const my70Count = circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length;

  return (
    <section className="rounded-[30px] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(42,37,29,0.08)]">
      <h2 className="mx-auto max-w-[260px] text-center text-[21px] font-bold leading-tight text-[#0F172A]">{headline}</h2>

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
      className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-2 text-[11px] font-bold leading-3 text-[#0F172A] shadow-[0_10px_26px_rgba(42,37,29,0.055)] max-[350px]:gap-1 max-[350px]:px-1.5 max-[350px]:text-[10px]"
      onClick={onClick}
      type="button"
    >
      <span className="shrink-0 text-[#2563EB]">
        <Icon name={icon} size={14} />
      </span>
      <span className="min-w-0 text-center">{children}</span>
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
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: number;
}) {
  const isPrayerIcon = icon === "prayer";

  return (
    <div className="min-w-0 rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-center shadow-[0_10px_26px_rgba(37,99,235,0.055)] max-[350px]:px-2">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
          {isPrayerIcon ? (
            <svg aria-hidden="true" className="h-[22px] w-[22px] max-[350px]:h-5 max-[350px]:w-5" fill="none" viewBox="0 0 64 64">
              <path
                d="M29.5 4.5c-4.8 0-8.6 3.9-8.6 8.8v18.6c0 3.8-1.4 7.4-3.9 10.3l-2 2.3 10.1 11.2 3.7-3.8c3.6-3.7 5.6-8.7 5.6-13.9V9.5c0-2.8-2.2-5-4.9-5Z"
                fill="#EFF6FF"
                stroke="#2563EB"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.2"
              />
              <path
                d="M34.5 4.5c4.8 0 8.6 3.9 8.6 8.8v18.6c0 3.8 1.4 7.4 3.9 10.3l2 2.3-10.1 11.2-3.7-3.8c-3.6-3.7-5.6-8.7-5.6-13.9V9.5c0-2.8 2.2-5 4.9-5Z"
                fill="#EFF6FF"
                stroke="#2563EB"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.2"
              />
              <path d="M3.8 49.3 15 40.6l11.1 13.2-11 8.5c-1.2.9-2.9.7-3.8-.5l-8-10.4c-.5-.7-.4-1.6.5-2.1Z" fill="#2563EB" />
              <path d="M60.2 49.3 49 40.6 37.9 53.8l11 8.5c1.2.9 2.9.7 3.8-.5l8-10.4c.5-.7.4-1.6-.5-2.1Z" fill="#2563EB" />
              <path d="M32 7v32" stroke="#2563EB" strokeLinecap="round" strokeWidth="3.8" />
              <path d="M26.5 10.5v25" stroke="#2563EB" strokeLinecap="round" strokeWidth="2.8" />
              <path d="M37.5 10.5v25" stroke="#2563EB" strokeLinecap="round" strokeWidth="2.8" />
            </svg>
          ) : (
            <Icon name={icon} size={14} />
          )}
        </span>
        <span className="mt-1.5 block text-[24px] font-bold leading-none text-[#0F172A] max-[350px]:text-[21px]">{value}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-3 text-center text-[8px] font-bold uppercase leading-3 tracking-[0.1em] text-[#64748B] max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </div>
  );
}

function ThisWeekHeader({ label }: { label: string }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h2 className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
        This Week
      </h2>
      <span className="shrink-0 rounded-full border border-[#DCEBFF] bg-white px-2.5 py-1 text-[11px] font-semibold leading-none text-[#64748B] shadow-[0_6px_14px_rgba(37,99,235,0.04)]">
        {label}
      </span>
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
  const avatarNames = meetingAvatarNames(meeting, people);
  const participantTitle = meetingParticipantTitle(meeting, people);
  const hasPeople = Boolean(participantTitle);
  const context = meetingActivityTitle(meeting);
  const isScheduled = meeting.meetingStatus === "scheduled";
  const summary = meeting.notes?.trim();
  const title = meetingDisplayTitle(meeting, people);
  const metadata = isScheduled
    ? `Scheduled • ${formatMeetingTimeRange(meeting)}`
    : hasPeople ? `${context} • ${formatDate(meeting.date)}` : formatDate(meeting.date);

  return (
    <button className="group w-full max-w-[calc(100vw-32px)] rounded-[20px] border border-[#E2E8F0] bg-white p-3.5 text-left shadow-[0_10px_24px_rgba(15,23,42,0.045)] transition-all hover:border-[#BFDBFE] hover:shadow-[0_14px_30px_rgba(37,99,235,0.08)]" onClick={onClick} type="button">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex shrink-0 items-center">
          {avatarNames.length ? (
            <div className="flex -space-x-2">
              {avatarNames.map((name, index) => (
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold shadow-sm ${avatarTone(index)}`}
                  key={`${meeting.id}-${name}`}
                >
                  {initials(name)}
                </span>
              ))}
            </div>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] shadow-sm">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
            </span>
          )}
          {isScheduled && meeting.googleSyncEnabled ? (
            <span className="mt-2 inline-flex rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
              {meeting.googleSyncStatus === "synced" ? "Google synced" : meeting.googleSyncStatus === "failed" ? "Google failed" : "Google pending"}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-5 text-[#0F172A]">{title}</p>
              <p className="mt-1 truncate text-xs leading-5 text-[#64748B]">{metadata}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8] transition-colors group-hover:text-[#2563EB]" aria-hidden="true" strokeWidth={1.8} />
          </div>
          {summary ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-[#334155]">{summary}</p>
          ) : (
            <p className="mt-1.5 text-sm leading-5 text-[#94A3B8]">{isScheduled ? "No prep notes yet" : "No reflection yet"}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function calendarItemTone(kind: MeetingCalendarItemKind) {
  switch (kind) {
    case "birthday":
      return {
        bg: "bg-[#FEF3C7]",
        dot: "bg-[#F59E0B]",
        text: "text-[#B45309]",
      };
    case "anniversary":
      return {
        bg: "bg-[#FCE7F3]",
        dot: "bg-[#DB2777]",
        text: "text-[#BE185D]",
      };
    case "follow_up":
      return {
        bg: "bg-[#DCFCE7]",
        dot: "bg-[#16A34A]",
        text: "text-[#15803D]",
      };
    case "prayer":
      return {
        bg: "bg-[#EDE9FE]",
        dot: "bg-[#7C3AED]",
        text: "text-[#6D28D9]",
      };
    case "meeting":
    default:
      return {
        bg: "bg-[#EBF2FF]",
        dot: "bg-[#2563EB]",
        text: "text-[#1D4ED8]",
      };
  }
}

function calendarItemLabel(kind: MeetingCalendarItemKind) {
  switch (kind) {
    case "birthday":
      return "Birthday";
    case "anniversary":
      return "Anniversary";
    case "follow_up":
      return "Follow Up";
    case "prayer":
      return "Prayer";
    case "meeting":
    default:
      return "Meeting";
  }
}

function CalendarItemIcon({ kind }: { kind: MeetingCalendarItemKind }) {
  const className = "h-4 w-4";

  switch (kind) {
    case "birthday":
      return <Cake className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "anniversary":
      return <HeartHandshake className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "follow_up":
      return <Send className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "prayer":
      return <Heart className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "meeting":
    default:
      return <CalendarDays className={className} aria-hidden="true" strokeWidth={1.9} />;
  }
}

function CalendarAgendaItem({
  item,
  onOpenMeeting,
  onOpenReminder,
}: {
  item: MeetingCalendarItem;
  onOpenMeeting: (meetingId: string) => void;
  onOpenReminder: (reminderId: string) => void;
}) {
  const tone = calendarItemTone(item.kind);
  const content = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.bg} ${tone.text}`}>
        <CalendarItemIcon kind={item.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-5 text-[#0F172A]">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs font-medium leading-4 text-[#64748B]">{item.subtitle}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${tone.bg} ${tone.text}`} style={{ fontFamily: font.rajdhani }}>
            {calendarItemLabel(item.kind)}
          </span>
          {item.syncLabel ? (
            <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
              {item.syncLabel}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </>
  );
  const className = "flex min-h-[74px] w-full items-center gap-3 rounded-[20px] border border-[#EAF2FF] bg-white px-3.5 py-3 text-left shadow-[0_10px_26px_rgba(37,99,235,0.045)] transition-colors hover:border-[#BFDBFE]";

  const meeting = item.meeting;
  const reminder = item.reminder;

  if (meeting) {
    return (
      <button className={className} onClick={() => onOpenMeeting(meeting.id)} type="button">
        {content}
      </button>
    );
  }

  if (reminder) {
    return (
      <button className={className} onClick={() => onOpenReminder(reminder.id)} type="button">
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function MeetingCalendarView({
  items,
  month,
  onChangeMonth,
  onOpenMeeting,
  onOpenReminder,
  onScheduleMeeting,
  onSelectDate,
  onToday,
  selectedDateKey,
}: {
  items: MeetingCalendarItem[];
  month: Date;
  onChangeMonth: (offset: number) => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenReminder: (reminderId: string) => void;
  onScheduleMeeting: () => void;
  onSelectDate: (date: Date) => void;
  onToday: () => void;
  selectedDateKey: string;
}) {
  const monthStart = startOfCalendarMonth(month);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const itemsByDay = items.reduce((map, item) => {
    const key = calendarDateKeyFromValue(item.date);

    if (!key) {
      return map;
    }

    const dayItems = map.get(key) ?? [];
    dayItems.push(item);
    map.set(key, dayItems);

    return map;
  }, new Map<string, MeetingCalendarItem[]>());
  const selectedItems = itemsByDay.get(selectedDateKey) ?? [];

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white shadow-[0_18px_48px_rgba(37,99,235,0.07)]">
        <header className="flex items-center justify-between gap-2 border-b border-[#EFF6FF] px-3 py-3">
          <button
            aria-label="Previous month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2563EB] transition-colors hover:bg-[#EBF2FF]"
            onClick={() => onChangeMonth(-1)}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-base font-black leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
              {calendarMonthLabel(month)}
            </h2>
            <button className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]" onClick={onToday} style={{ fontFamily: font.rajdhani }} type="button">
              Today
            </button>
          </div>
          <button
            aria-label="Next month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2563EB] transition-colors hover:bg-[#EBF2FF]"
            onClick={() => onChangeMonth(1)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
        </header>

        <div className="px-2.5 pb-3 pt-2">
          <div className="grid grid-cols-7 gap-1 pb-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div className="text-center text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" key={`${day}-${index}`} style={{ fontFamily: font.rajdhani }}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const key = calendarDateKey(date);
              const dayItems = itemsByDay.get(key) ?? [];
              const isSelected = key === selectedDateKey;
              const isOutsideMonth = !isSameCalendarMonth(date, month);
              const isToday = key === todayDateValue();

              return (
                <button
                  aria-label={new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(date)}
                  aria-pressed={isSelected}
                  className={`min-h-[48px] rounded-[16px] px-1.5 py-1.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 max-[350px]:min-h-[44px] max-[350px]:rounded-[14px] ${
                    isSelected
                      ? "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]"
                      : isToday
                        ? "bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]"
                        : "bg-[#F8FAFC] text-[#0F172A] hover:bg-[#EBF2FF]"
                  } ${isOutsideMonth && !isSelected ? "opacity-45" : ""}`}
                  key={key}
                  onClick={() => onSelectDate(date)}
                  type="button"
                >
                  <span className="block text-center text-xs font-bold leading-none max-[350px]:text-[11px]">{date.getDate()}</span>
                  {dayItems.length ? (
                    <span className="mt-2 flex min-h-1.5 items-center justify-center gap-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : calendarItemTone(item.kind).dot}`} key={item.id} />
                      ))}
                      {dayItems.length > 3 ? <span className={`text-[8px] font-bold leading-none ${isSelected ? "text-white" : "text-[#64748B]"}`}>+{dayItems.length - 3}</span> : null}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section>
        <SectionHeading
          title={calendarSelectedDayLabel(selectedDateKey)}
        />
        <div className="grid gap-2.5">
          {selectedItems.length ? selectedItems.map((item) => (
            <CalendarAgendaItem
              item={item}
              key={item.id}
              onOpenMeeting={onOpenMeeting}
              onOpenReminder={onOpenReminder}
            />
          )) : (
            <SectionEmptyState
              action={<CompactButton icon="calendar" onClick={onScheduleMeeting}>Schedule Meeting</CompactButton>}
              text="Scheduled meetings and reminders for the selected day will appear here."
              title="Nothing on this day."
            />
          )}
        </div>
      </section>
    </section>
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
  isCreatingPerson = false,
  onCreatePerson,
  onQueryChange,
  onToggle,
  people,
  query,
  selectedPersonIds,
}: {
  allPeople: DosAppPerson[];
  isCreatingPerson?: boolean;
  onCreatePerson?: (name: string) => Promise<void>;
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
  const hasSearch = query.trim().length > 0;
  const quickAddName = query.trim().replace(/\s+/g, " ");
  const canQuickAdd = Boolean(onCreatePerson && hasSearch && quickAddName && people.length === 0);

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3">
      <FieldLabel>People Involved</FieldLabel>
      {selectedPeople.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedPeople.map((person, index) => (
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
          ))}
        </div>
      ) : null}

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

      {allPeople.length && hasSearch && visiblePeople.length ? (
        <div className="mt-2 grid gap-1 pr-1">
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
        </div>
      ) : null}
      {canQuickAdd ? (
        <button
          className="mt-2 flex min-h-10 w-full items-center gap-2.5 rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-left text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCreatingPerson}
          onClick={() => {
            void onCreatePerson?.(quickAddName);
          }}
          type="button"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2563EB] ring-1 ring-[#BFDBFE]">
            <Icon name="add" size={13} />
          </span>
          <span className="min-w-0 truncate">
            {isCreatingPerson ? "Adding..." : <>+ Add &ldquo;{quickAddName}&rdquo;</>}
          </span>
        </button>
      ) : null}
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
        <FieldLabel>Meeting Notes</FieldLabel>
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

      <textarea className={`${FieldInputClass()} min-h-24 py-3`} defaultValue={defaultValue ?? ""} name="notes" placeholder="What happened at the table?" />
    </section>
  );
}

function MeetingLeaderReflectionSection({
  notesDefault,
  onToggleOutcomeTag,
  selectedOutcomeTags,
}: {
  notesDefault?: string | null;
  onToggleOutcomeTag: (tag: string) => void;
  selectedOutcomeTags: string[];
}) {
  return (
    <section className={meetingFormGroupClassName}>
      <div className={meetingFormGroupCardClassName}>
        <p className={meetingFormGroupTitleClassName}>Leader Reflection</p>

        <div className="mt-3 grid gap-3">
          <MeetingCaptureNotes defaultValue={notesDefault} />

          <label className="block">
            <FieldLabel>Prayer Needs</FieldLabel>
            <textarea className={`${FieldTextareaClass()} min-h-20`} name="prayer_needs" placeholder="What should we pray for?" />
          </label>

          <ObservedFruitMultiSelect
            onToggle={onToggleOutcomeTag}
            selectedOutcomeTags={selectedOutcomeTags}
          />

          <div className="grid gap-2 rounded-2xl bg-[#F8FAFC] p-3">
            <label className="flex min-h-10 items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#0F172A]">Follow Up Needed</span>
                <span className="mt-0.5 block text-xs text-[#64748B]">Mark if this needs action soon.</span>
              </span>
              <input className="h-5 w-5 shrink-0 accent-[#2563EB]" name="follow_up_needed" type="checkbox" />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

const meetingFormGroupClassName = "grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-[#F8FAFC] p-2.5 shadow-[0_10px_24px_rgba(37,99,235,0.04)]";
const meetingFormGroupCardClassName = "rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]";
const meetingFormGroupTitleClassName = "text-sm font-bold text-[#0F172A]";

const meetingDurationOptions = [
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1h", value: "60" },
  { label: "2h", value: "120" },
  { label: "Custom", value: "custom" },
] as const;

function MeetingDurationSelector() {
  return (
    <fieldset className="grid gap-2 rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
      <FieldLabel>Meeting Duration</FieldLabel>
      {/* TODO: Persist meeting duration when the DOS meeting schema exposes a duration field. */}
      <div className="flex flex-wrap gap-2">
        {meetingDurationOptions.map((option) => (
          <label className="cursor-pointer" key={option.value}>
            <input className="peer sr-only" defaultChecked={option.value === "30"} name="meeting_duration" type="radio" value={option.value} />
            <span className="flex min-h-10 items-center justify-center rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-xs font-bold text-[#475569] transition-colors peer-checked:border-[#2563EB] peer-checked:bg-[#EBF2FF] peer-checked:text-[#1D4ED8] max-[350px]:min-h-9 max-[350px]:px-2.5">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ObservedFruitMultiSelect({
  onToggle,
  selectedOutcomeTags,
}: {
  onToggle: (tag: string) => void;
  selectedOutcomeTags: string[];
}) {
  const selectedOptions = meetingObservedFruitOptions.filter((option) => selectedOutcomeTags.includes(option.value));
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const dropdown = dropdownRef.current;

      if (!dropdown || !(event.target instanceof Node) || dropdown.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="grid gap-2">
      <FieldLabel>Observed Fruit</FieldLabel>
      <div className="relative" ref={dropdownRef}>
        <button
          aria-expanded={isOpen}
          className="flex min-h-12 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="min-w-0 truncate">
            {selectedOptions.length ? `${selectedOptions.length} selected` : "Select outcomes"}
          </span>
          <ChevronRight className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" strokeWidth={1.9} />
        </button>
        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 grid max-h-64 gap-1.5 overflow-y-auto rounded-[18px] border border-[#DCEBFF] bg-[#F8FAFC] p-2 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
            {meetingObservedFruitOptions.map((option) => {
              const selected = selectedOutcomeTags.includes(option.value);

              return (
                <button
                  aria-pressed={selected}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-transparent bg-white text-[#475569] hover:border-[#BFDBFE]"
                  }`}
                  key={option.value}
                  onClick={() => onToggle(option.value)}
                  type="button"
                >
                  <span>{option.label}</span>
                  {selected ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <button
              aria-label={`Remove ${option.label}`}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 text-xs font-bold text-[#1D4ED8]"
              key={option.value}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              {option.label}
              <X className="h-3 w-3" aria-hidden="true" strokeWidth={2} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
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

function MeetingFormContent({
  allPeople,
  allowConversationFlows,
  buttonText,
  conversationResponses,
  dateDefault,
  errorMessage,
  includeReflectionFields = false,
  isCreatingPerson = false,
  isSubmitting,
  meetingPeopleOptions,
  meetingPeopleQuery,
  notesDefault,
  onContextChange,
  onCreatePerson,
  onConversationFlowChange,
  onConversationResponse,
  onSubmit,
  onToggleFollowUpAction,
  onToggleOutcomeTag,
  onTogglePerson,
  onPeopleQueryChange,
  recommendedResources,
  selectedConversationFlow,
  selectedMeetingContext,
  selectedOutcomeTags,
  selectedPersonIds,
  showDurationField = false,
  submittingText,
}: {
  allPeople: DosAppPerson[];
  allowConversationFlows: boolean;
  buttonText: string;
  conversationResponses: DosConversationResponses;
  dateDefault: string;
  errorMessage?: string;
  includeReflectionFields?: boolean;
  isCreatingPerson?: boolean;
  isSubmitting: boolean;
  meetingPeopleOptions: DosAppPerson[];
  meetingPeopleQuery: string;
  notesDefault?: string | null;
  onContextChange: (value: DosAppMeetingType) => void;
  onCreatePerson?: (name: string) => Promise<void>;
  onConversationFlowChange: (value: DosConversationFlowKey) => void;
  onConversationResponse: (questionId: string, value: DosConversationResponseValue | undefined) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleFollowUpAction: (actionId: string) => void;
  onToggleOutcomeTag?: (tag: string) => void;
  onTogglePerson: (personId: string) => void;
  onPeopleQueryChange: (value: string) => void;
  recommendedResources: DosRecommendedResource[];
  selectedConversationFlow: DosConversationFlowKey;
  selectedMeetingContext: DosAppMeetingType;
  selectedOutcomeTags?: string[];
  selectedPersonIds: string[];
  showDurationField?: boolean;
  submittingText: string;
}) {
  const peopleSelector = (
    <MeetingPeopleSelector
      allPeople={allPeople}
      isCreatingPerson={isCreatingPerson}
      onCreatePerson={onCreatePerson}
      onQueryChange={onPeopleQueryChange}
      onToggle={onTogglePerson}
      people={meetingPeopleOptions}
      query={meetingPeopleQuery}
      selectedPersonIds={selectedPersonIds}
    />
  );
  const durationSelector = showDurationField ? <MeetingDurationSelector /> : null;
  const meetingContextPicker = <MeetingContextPicker onChange={onContextChange} value={selectedMeetingContext} />;
  const conversationFlowPicker = (
    <ConversationFlowPicker
      allowConversationFlows={allowConversationFlows}
      onChange={onConversationFlowChange}
      value={selectedConversationFlow}
    />
  );

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <FieldLabel>Date</FieldLabel>
        <input className={FieldInputClass()} defaultValue={dateDefault} name="table_date" type="date" />
      </label>
      {showDurationField ? (
        <section className={meetingFormGroupClassName}>
          {peopleSelector}
          {durationSelector}
        </section>
      ) : (
        <>
          {durationSelector}
          {peopleSelector}
        </>
      )}
      {showDurationField ? (
        <section className={meetingFormGroupClassName}>
          <div className={meetingFormGroupCardClassName}>
            <p className={meetingFormGroupTitleClassName}>Meeting Details</p>
            <div className="mt-3 grid gap-3">
              {meetingContextPicker}
              {conversationFlowPicker}
            </div>
          </div>
        </section>
      ) : (
        <>
          {meetingContextPicker}
          {conversationFlowPicker}
        </>
      )}
      {selectedConversationFlow !== "none" ? (
        <ConversationFlowExperience
          flowKey={selectedConversationFlow}
          onResponseChange={onConversationResponse}
          onToggleFollowUpAction={onToggleFollowUpAction}
          responses={conversationResponses}
        />
      ) : null}
      {includeReflectionFields ? (
        <MeetingLeaderReflectionSection
          notesDefault={notesDefault}
          onToggleOutcomeTag={onToggleOutcomeTag ?? (() => undefined)}
          selectedOutcomeTags={selectedOutcomeTags ?? []}
        />
      ) : (
        <MeetingCaptureNotes defaultValue={notesDefault} />
      )}
      <MeetingRecommendationsPreview resources={recommendedResources} />
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? submittingText : buttonText}</AppButton>
    </form>
  );
}

function CalendarConnectionCard({
  calendarConnection,
  isDisconnecting = false,
  onDisconnect,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  isDisconnecting?: boolean;
  onDisconnect?: () => void;
  workspaceId: string;
}) {
  const connectHref = `/api/dos/app/calendar/google/connect?workspaceId=${encodeURIComponent(workspaceId)}&next=${encodeURIComponent(`/dos/app?workspace=${workspaceId}`)}`;
  const statusLabel = calendarConnection.connected ? "Connected" : "Not Connected";
  const statusClassName = calendarConnection.connected
    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
    : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]";
  const statusDetail = calendarConnection.connected
    ? calendarConnection.googleAccountEmail ?? "Google Calendar is ready."
    : calendarConnection.googleConfigured ? "Connect Google Calendar to sync." : "Google setup needed before live sync.";
  const lastSyncLabel = calendarConnection.lastSyncedAt ? `Last sync ${formatDateTime(calendarConnection.lastSyncedAt)}` : "Meetings and reminders still save locally when disconnected.";

  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block text-sm font-bold leading-5 text-[#0F172A]">Google Calendar</span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClassName}`}>{statusLabel}</span>
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#64748B]">
            {statusDetail}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#64748B]">
            {lastSyncLabel}
          </span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!calendarConnection.connected && calendarConnection.googleConfigured ? (
          <a className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8]" href={connectHref}>
            Connect Google Calendar
          </a>
        ) : null}
        {calendarConnection.connected && onDisconnect ? (
          <button
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-bold text-[#334155] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisconnecting}
            onClick={onDisconnect}
            type="button"
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ScheduleMeetingForm({
  allPeople,
  calendarConnection,
  errorMessage,
  isCalendarDisconnecting = false,
  isCreatingPerson = false,
  isSubmitting,
  meetingPeopleOptions,
  meetingPeopleQuery,
  onContextChange,
  onCreatePerson,
  onDisconnectCalendar,
  onPeopleQueryChange,
  onStartLogMeeting,
  onSubmit,
  onTogglePerson,
  selectedMeetingContext,
  selectedPersonIds,
  workspaceId,
}: {
  allPeople: DosAppPerson[];
  calendarConnection: DosAppCalendarConnection;
  errorMessage?: string;
  isCalendarDisconnecting?: boolean;
  isCreatingPerson?: boolean;
  isSubmitting: boolean;
  meetingPeopleOptions: DosAppPerson[];
  meetingPeopleQuery: string;
  onContextChange: (value: DosAppMeetingType) => void;
  onCreatePerson?: (name: string) => Promise<void>;
  onDisconnectCalendar?: () => void;
  onPeopleQueryChange: (value: string) => void;
  onStartLogMeeting: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTogglePerson: (personId: string) => void;
  selectedMeetingContext: DosAppMeetingType;
  selectedPersonIds: string[];
  workspaceId: string;
}) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <CalendarConnectionCard
        calendarConnection={calendarConnection}
        isDisconnecting={isCalendarDisconnecting}
        onDisconnect={onDisconnectCalendar}
        workspaceId={workspaceId}
      />
      <MeetingPeopleSelector
        allPeople={allPeople}
        isCreatingPerson={isCreatingPerson}
        onCreatePerson={onCreatePerson}
        onQueryChange={onPeopleQueryChange}
        onToggle={onTogglePerson}
        people={meetingPeopleOptions}
        query={meetingPeopleQuery}
        selectedPersonIds={selectedPersonIds}
      />
      <div className="grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
        <MeetingContextPicker onChange={onContextChange} value={selectedMeetingContext} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <FieldLabel>Date</FieldLabel>
            <input className={FieldInputClass()} defaultValue={todayDateValue()} name="scheduled_date" required type="date" />
          </label>
          <label className="block min-w-0">
            <FieldLabel>Start Time</FieldLabel>
            <input className={FieldInputClass()} defaultValue="18:00" name="scheduled_time" required type="time" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <FieldLabel>Duration</FieldLabel>
            <select className={FieldInputClass()} defaultValue="60" name="duration_minutes">
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">90 min</option>
              <option value="120">2 hours</option>
            </select>
          </label>
          <label className="flex min-h-[72px] min-w-0 items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <input
              className="h-5 w-5 shrink-0 accent-[#2563EB]"
              defaultChecked={calendarConnection.connected}
              disabled={!calendarConnection.connected}
              name="google_sync_enabled"
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="block text-xs font-bold leading-4 text-[#0F172A]">Sync to Google</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-[#64748B]">
                {calendarConnection.connected ? "Create a calendar event." : "Connect Google Calendar to sync."}
              </span>
            </span>
          </label>
        </div>
        <label className="block">
          <FieldLabel>Notes</FieldLabel>
          <textarea className={`${FieldTextareaClass()} min-h-20`} name="notes" placeholder="What should you remember before this meeting?" />
        </label>
      </div>
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Scheduling..." : "Schedule Meeting"}</AppButton>
      <AppButton disabled={isSubmitting} icon="log" onClick={onStartLogMeeting} tone="white">Log Meeting Instead</AppButton>
    </form>
  );
}

function ReminderFormContent({
  calendarConnection,
  defaultPersonId,
  errorMessage,
  householdPerson,
  isCalendarDisconnecting = false,
  isSubmitting,
  onDelete,
  onDisconnectCalendar,
  onSubmit,
  people,
  reminder,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  defaultPersonId?: string | null;
  errorMessage?: string;
  householdPerson?: DosAppPerson | null;
  isCalendarDisconnecting?: boolean;
  isSubmitting: boolean;
  onDelete?: () => void;
  onDisconnectCalendar?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  people: DosAppPerson[];
  reminder?: DosAppRelationshipReminder | null;
  workspaceId: string;
}) {
  const fallbackPersonId = defaultPersonId ?? people[0]?.id ?? "";
  const defaultReminderType = reminder?.reminderType ?? "follow_up";
  const defaultRecurrence = reminder?.recurrence ?? (["birthday", "anniversary", "baptism", "salvation"].includes(defaultReminderType) ? "yearly" : "none");
  const shortcutPerson = householdPerson ?? people.find((person) => person.id === (reminder?.personId ?? fallbackPersonId)) ?? null;
  const householdReminderTitles = Array.from(new Set([
    shortcutPerson?.spouseName ? "Spouse birthday" : null,
    shortcutPerson?.childrenNames ? "Child birthday" : null,
    shortcutPerson?.spouseName || shortcutPerson?.householdNotes ? "Anniversary" : null,
  ].filter((title): title is string => Boolean(title))));

  function applyReminderTitle(event: MouseEvent<HTMLButtonElement>, title: string) {
    const form = event.currentTarget.form;
    const titleInput = form?.elements.namedItem("title") as HTMLInputElement | null;

    if (titleInput) {
      titleInput.value = title;
      titleInput.focus();
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <CalendarConnectionCard
        calendarConnection={calendarConnection}
        isDisconnecting={isCalendarDisconnecting}
        onDisconnect={onDisconnectCalendar}
        workspaceId={workspaceId}
      />
      <section className="grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
        <label className="block">
          <FieldLabel>Person</FieldLabel>
          <select className={FieldInputClass()} defaultValue={reminder?.personId ?? fallbackPersonId} name="person_id" required>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
        <FormOptionSelect
          defaultValue={defaultReminderType}
          label="Reminder Type"
          name="reminder_type"
          options={reminderTypeOptions}
        />
        <label className="block">
          <FieldLabel>Title</FieldLabel>
          <input className={FieldInputClass()} defaultValue={reminder?.title ?? ""} name="title" placeholder="Optional reminder title" type="text" />
        </label>
        {householdReminderTitles.length ? (
          <div>
            <FieldLabel>Household</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {householdReminderTitles.map((title) => (
                <button
                  className="min-h-8 rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-[11px] font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
                  key={title}
                  onClick={(event) => applyReminderTitle(event, title)}
                  type="button"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <FieldLabel>Date</FieldLabel>
            <input className={FieldInputClass()} defaultValue={(reminder?.reminderDate ?? todayDateValue()).slice(0, 10)} name="reminder_date" required type="date" />
          </label>
          <FormOptionSelect
            defaultValue={defaultRecurrence}
            label="Repeat"
            name="recurrence"
            options={reminderRecurrenceOptions}
          />
        </div>
        <label className="block">
          <FieldLabel>Notes</FieldLabel>
          <textarea className={`${FieldTextareaClass()} min-h-20`} defaultValue={reminder?.notes ?? ""} name="notes" placeholder="Prayer notes, follow-up context, or details." />
        </label>
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
          <span className="min-w-0">
            <span className="block text-sm font-bold text-[#0F172A]">Sync to Google</span>
            <span className="mt-0.5 block text-xs text-[#64748B]">{calendarConnection.connected ? "Create or update a calendar event." : "Connect Google Calendar to sync. Local save still works."}</span>
          </span>
          <input
            className="h-5 w-5 shrink-0 accent-[#2563EB]"
            defaultChecked={calendarConnection.connected && reminder?.googleSyncEnabled !== false}
            disabled={!calendarConnection.connected}
            name="google_sync_enabled"
            type="checkbox"
          />
        </label>
      </section>
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting || !people.length} tone="black" type="submit">{isSubmitting ? "Saving..." : reminder ? "Save Reminder" : "Add Reminder"}</AppButton>
      {reminder && onDelete ? (
        <button
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={onDelete}
          type="button"
        >
          Delete Reminder
        </button>
      ) : null}
    </form>
  );
}

function ReminderRow({
  onClick,
  person,
  reminder,
}: {
  onClick?: () => void;
  person?: DosAppPerson | null;
  reminder: DosAppRelationshipReminder;
}) {
  const syncLabel = reminderSyncLabel(reminder);
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        {reminder.reminderType === "birthday" ? (
          <Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        ) : (
          <Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{reminderDisplayTitle(reminder, person)}</span>
        <span className="mt-1 block text-xs leading-5 text-[#64748B]">
          {reminderTypeLabel(reminder.reminderType)} · {formatDate(nextReminderDate(reminder))}
          {reminder.recurrence !== "none" ? ` · ${reminder.recurrence}` : ""}
        </span>
        {reminder.notes ? <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{reminder.notes}</span> : null}
        {syncLabel ? <span className="mt-2 inline-flex rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">{syncLabel}</span> : null}
      </span>
      {onClick ? <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]" onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      {content}
    </div>
  );
}

function TimelineIcon({ icon }: { icon: UpcomingTimelineIcon }) {
  const className = "h-4 w-4";

  if (icon === "birthday") {
    return <Cake className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  if (icon === "anniversary") {
    return <Heart className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  if (icon === "meeting") {
    return <CalendarDays className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  if (icon === "prayer") {
    return <HeartHandshake className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  return <Bell className={className} aria-hidden="true" strokeWidth={1.9} />;
}

function SyncStatusPill({ label }: { label: string }) {
  const className = label === "Synced"
    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
    : label === "Sync failed"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-[#E2E8F0] bg-white text-[#64748B]";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${className}`}>{label}</span>
  );
}

function UpcomingTimelineRow({
  item,
  onEditReminder,
  onOpenMeeting,
}: {
  item: UpcomingTimelineItem;
  onEditReminder: (reminderId: string) => void;
  onOpenMeeting: (meetingId: string) => void;
}) {
  const handleClick = () => {
    if (item.meeting) {
      onOpenMeeting(item.meeting.id);
      return;
    }

    if (item.reminder) {
      onEditReminder(item.reminder.id);
    }
  };

  return (
    <button
      className="flex min-w-0 items-start gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
      onClick={handleClick}
      type="button"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <TimelineIcon icon={item.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{item.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#64748B]">
          {item.label}
          {item.personName ? ` · ${item.personName}` : ""}
        </span>
        {item.notes ? <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{item.notes}</span> : null}
        <span className="mt-2 flex flex-wrap gap-1.5">
          <SyncStatusPill label={item.syncLabel} />
        </span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}

function TodayFocusCard({
  items,
  onEditReminder,
  onLogMeetingForPerson,
  onOpenMeeting,
  onOpenPerson,
  onScheduleForPerson,
}: {
  items: UpcomingTimelineItem[];
  onEditReminder: (reminderId: string) => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  onScheduleForPerson: (personId?: string | string[]) => void;
}) {
  const primaryPersonId = items.find((item) => item.personId)?.personId ?? null;

  return (
    <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_32px_rgba(37,99,235,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          Today's Focus
        </h2>
        <span className="rounded-full border border-[#DCEBFF] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold text-[#1D4ED8]">{items.length}</span>
      </div>

      <div className="mt-3 grid gap-2">
        {items.length ? items.slice(0, 4).map((item) => (
          <button
            className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-2.5 text-left transition-colors hover:bg-[#EBF2FF]"
            key={item.id}
            onClick={() => {
              if (item.meeting) {
                onOpenMeeting(item.meeting.id);
              } else if (item.reminder) {
                onEditReminder(item.reminder.id);
              }
            }}
            type="button"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
              <TimelineIcon icon={item.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#0F172A]">{todayFocusTitle(item)}</span>
              <span className="mt-0.5 block truncate text-xs text-[#64748B]">{item.label}</span>
            </span>
          </button>
        )) : (
          <p className="rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#64748B]">
            No scheduled reminders today. Ask the Lord who to encourage next.
          </p>
        )}
      </div>

      {primaryPersonId ? (
        <div className="mt-3 grid grid-cols-3 gap-2 max-[350px]:gap-1.5">
          <CompactButton icon="people" onClick={() => onOpenPerson(primaryPersonId)}>View person</CompactButton>
          <CompactButton icon="log" onClick={() => onLogMeetingForPerson(primaryPersonId)}>Log meeting</CompactButton>
          <CompactButton icon="calendar" onClick={() => onScheduleForPerson(primaryPersonId)}>Schedule</CompactButton>
        </div>
      ) : (
        <div className="mt-3">
          <CompactButton icon="calendar" onClick={() => onScheduleForPerson()}>Schedule</CompactButton>
        </div>
      )}
    </section>
  );
}

const fruitThemeDefinitions = [
  { keywords: ["joy", "rejoic", "glad", "delight"], label: "Joy" },
  { keywords: ["encourag", "heard", "cared", "comfort", "peace"], label: "Encouragement" },
  { keywords: ["faithful", "steady", "weekly", "committed", "follow-through", "follow through"], label: "Faithfulness" },
  { keywords: ["bold", "gospel", "evangel", "shared", "preach", "testimony"], label: "Boldness" },
  { keywords: ["hospital", "table", "home", "meal", "welcome"], label: "Hospitality" },
  { keywords: ["generous", "giving", "tithe", "serve", "support"], label: "Generosity" },
] as const;

const demoFruitThemeChips = ["Joy", "Encouragement", "Faithfulness", "Boldness", "Hospitality", "Generosity"];

type FruitDashboardStory = {
  date: string | null;
  id: string;
  personId: string | null;
  personName: string | null;
  tags: string[];
  text: string;
  title: string;
};

function fruitSearchText(...values: Array<null | string | string[] | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasFruitKeyword(story: FruitDashboardStory, keywords: ReadonlyArray<string>) {
  const text = fruitSearchText(story.title, story.text, story.tags);

  return keywords.some((keyword) => text.includes(keyword));
}

function uniqueFruitTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function fruitStoryTitle(value: string | null | undefined) {
  const text = value?.trim();

  if (!text) {
    return "Fruit recorded";
  }

  const firstSentence = text.split(/[.!?]/)[0]?.trim() || text;

  return firstSentence.length > 82 ? `${firstSentence.slice(0, 79).trim()}...` : firstSentence;
}

function approvedFruitStories(fruitItems: DosAppFruit[], fruitEvents: DosAppFruitEvent[], people: DosAppPerson[]) {
  return [
    ...fruitItems
      .filter((fruit) => fruit.status === "approved")
      .map((fruit) => ({
        date: fruit.testimonyDate,
        id: `fruit-${fruit.id}`,
        personId: fruit.fieldPersonId,
        personName: fruit.fieldPersonId ? personName(people, fruit.fieldPersonId) : fruit.submittedByName,
        tags: uniqueFruitTags(fruit.outcomeTags),
        text: fruit.summary,
        title: fruitStoryTitle(fruit.summary),
      } satisfies FruitDashboardStory)),
    ...fruitEvents
      .filter((event) => event.status === "approved")
      .map((event) => ({
        date: event.date,
        id: `fruit-event-${event.id}`,
        personId: event.personId,
        personName: event.personId ? personName(people, event.personId) : null,
        tags: uniqueFruitTags([event.fruitType]),
        text: event.description ?? event.title ?? event.fruitType,
        title: event.title?.trim() || event.fruitType || "Fruit recorded",
      } satisfies FruitDashboardStory)),
  ].sort((first, second) => {
    const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
    const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

    return secondTime - firstTime;
  });
}

function fruitThemeChips(stories: FruitDashboardStory[], isPreview: boolean) {
  const derivedThemes = fruitThemeDefinitions
    .filter((theme) => stories.some((story) => hasFruitKeyword(story, theme.keywords)))
    .map((theme) => theme.label);

  if (derivedThemes.length) {
    return derivedThemes;
  }

  return isPreview ? demoFruitThemeChips : [];
}

function fruitOutcomeCount(stories: FruitDashboardStory[], keywords: string[]) {
  return stories.filter((story) => hasFruitKeyword(story, keywords)).length;
}

function kingdomFruitMetrics(stories: FruitDashboardStory[]) {
  return [
    {
      label: "Reconciliation",
      value: fruitOutcomeCount(stories, ["reconciliation", "reconciled", "restored relationship", "restored relationships", "forgiveness", "forgave", "restored family", "restored friendship"]),
    },
    {
      label: "New Believers",
      value: fruitOutcomeCount(stories, ["salvation", "new believer", "new believers", "gave their life", "born again", "follow jesus", "commitment to jesus", "received christ"]),
    },
    {
      label: "Marriage Restoration",
      value: fruitOutcomeCount(stories, ["marriage restoration", "marriage restored", "marriage healing", "marriage healed", "restored marriage", "healed marriage"]),
    },
    {
      label: "Baptized",
      value: fruitOutcomeCount(stories, ["baptism", "baptized"]),
    },
    {
      label: "Discipling",
      value: fruitOutcomeCount(stories, ["discipling", "joined discipleship", "discipleship started", "started discipleship", "discipleship relationship", "walking with"]),
    },
    {
      label: "Started Discipling Others",
      value: fruitOutcomeCount(stories, ["started discipling others", "disciple maker", "multiplying", "multiplication"]),
    },
  ];
}

function FruitTreeCard({
  storyCount,
}: {
  storyCount: number;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_16px_36px_rgba(37,99,235,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            Fruit Tree
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-[#0F172A]">What God is Growing</h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-1 text-[11px] font-bold text-[#1D4ED8]">
          {storyCount} {storyCount === 1 ? "story" : "stories"}
        </span>
      </div>

      <div className="relative mx-auto mt-5 flex h-44 max-w-[310px] items-center justify-center">
        <div className="absolute h-40 w-40 rounded-full border border-[#DCEBFF] bg-[#F8FBFF]" />
        <div className="absolute h-32 w-32 rounded-full border border-[#BFDBFE] bg-[#EFF6FF]" />
        <div className="absolute h-24 w-24 rounded-full border border-[#93C5FD] bg-white/70" />
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF]" />
        <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_18px_34px_rgba(37,99,235,0.28)]">
          <Icon name="fruit" size={22} />
        </div>
      </div>
    </section>
  );
}

function KingdomFruitMetricTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const icon = {
    Baptized: <Droplet className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />,
    Discipling: <Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />,
    "Marriage Restoration": <Heart className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />,
    "New Believers": <UserPlus className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />,
    Reconciliation: <HeartHandshake className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />,
    "Started Discipling Others": <GitBranch className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />,
  }[label] ?? <Icon name="fruit" size={14} />;

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:rounded-[16px] max-[350px]:px-2.5">
      <div className="flex min-h-[54px] min-w-0 items-center gap-2.5 max-[350px]:gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-8 max-[350px]:w-8">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[25px] font-bold leading-none text-[#0F172A] max-[350px]:text-[22px]">{value}</span>
          <span className="mt-1 block text-[8px] font-bold uppercase leading-[0.8rem] tracking-[0.08em] text-[#64748B] max-[350px]:text-[7.5px] max-[350px]:tracking-[0.04em]" style={{ fontFamily: font.rajdhani }}>
            {label}
          </span>
        </span>
      </div>
    </div>
  );
}

function RecentFruitStoryCard({ story }: { story: FruitDashboardStory }) {
  return (
    <article className="rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8]">
          <Icon name="fruit" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-5 text-[#0F172A]">{story.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            {[story.personName, formatDate(story.date)].filter(Boolean).join(" · ")}
          </p>
          {story.text && story.text !== story.title ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#64748B]">{story.text}</p>
          ) : null}
        </div>
      </div>
      {story.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {story.tags.slice(0, 4).map((tag) => (
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-semibold text-[#64748B]" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
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
                    {[formatPhoneNumber(row.phone) || row.phone, row.email, row.church, row.spouseName ? `Spouse: ${row.spouseName}` : ""].filter(Boolean).join(" · ") || `Row ${row.sourceRowNumber}`}
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
              className={`relative flex min-h-12 cursor-pointer items-center rounded-2xl border px-3 py-2 transition-colors ${
                selected
                  ? "border-[#2563EB] bg-[#EBF2FF] shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
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
              <span className="pr-6 text-[13px] font-bold leading-tight text-[#0F172A]">{option.label}</span>
              <span
                className={`absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border transition-colors ${
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

function RelationshipContextPicker({
  onChange,
  value,
}: {
  onChange: (value: DosRelationshipModel) => void;
  value: DosRelationshipModel;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = relationshipContextOptions.find((option) => option.value === value.relationshipContext) ?? relationshipContextOptions[relationshipContextOptions.length - 1];

  return (
    <fieldset className="overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white">
      <button
        aria-expanded={isOpen}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <FieldLabel>Relationship Context</FieldLabel>
          <span className="mt-1 block truncate text-sm font-bold text-[#0F172A]">{selectedOption.label}</span>
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
          aria-hidden="true"
          strokeWidth={1.9}
        />
      </button>
      {isOpen ? (
        <div className="grid grid-cols-2 gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] p-2">
          {relationshipContextOptions.map((option) => {
            const selected = value.relationshipContext === option.value;

            return (
              <button
                className={`relative flex min-h-10 items-center justify-between gap-2 rounded-2xl border px-3 text-left text-xs font-bold transition-colors ${
                  selected
                    ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]"
                    : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#BFDBFE]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange({ ...value, relationshipContext: option.value });
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    selected ? "border-[#2563EB] bg-white" : "border-[#CBD5E1] bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {selected ? <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

function RelationshipScorePicker({
  onChange,
  value,
}: {
  onChange: (value: RelationshipScoreValue) => void;
  value: RelationshipScoreValue;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = commitmentLevelOptions.find((option) => option.value === value) ?? commitmentLevelOptions.find((option) => option.value === 0)!;

  return (
    <fieldset>
      <input name="engagement_score" type="hidden" value={relationshipScoreLabel(value)} />
      <div className="relative">
        <button
          aria-expanded={isOpen}
          className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-left transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="min-w-0">
            <FieldLabel>Engagement Level</FieldLabel>
            <span className="mt-1 block truncate text-sm font-bold text-[#0F172A]">{selectedOption.label}</span>
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
            aria-hidden="true"
            strokeWidth={1.9}
          />
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-[280px] overflow-y-auto rounded-[20px] border border-[#E2E8F0] bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
            {commitmentLevelOptions.map((option) => {
              const selected = value === option.value;

              return (
                <button
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "bg-[#EBF2FF] text-[#0F172A]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      selected ? "border-[#2563EB] bg-white" : "border-[#CBD5E1] bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {selected ? <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold leading-tight ${selected ? "text-[#1D4ED8]" : "text-[#0F172A]"}`}>{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#64748B]">{option.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function AdditionalPersonInformation({
  defaults = {},
  householdDraft,
  onHouseholdDraftChange,
  isOpen,
  onToggle,
  showToggle = true,
}: {
  defaults?: PersonFormDefaults;
  householdDraft: PersonHouseholdDraft;
  onHouseholdDraftChange: (value: PersonHouseholdDraft) => void;
  isOpen: boolean;
  onToggle: () => void;
  showToggle?: boolean;
}) {
  const updateSpouseDraft = (key: "spouseFirstName" | "spouseLastName", value: string) => {
    onHouseholdDraftChange({
      ...householdDraft,
      [key]: value,
    });
  };

  const updateChildDraft = (childId: string, key: "firstName" | "lastName", value: string) => {
    onHouseholdDraftChange({
      ...householdDraft,
      children: householdDraft.children.map((child) => (
        child.id === childId ? { ...child, [key]: value } : child
      )),
    });
  };

  const addChildDraft = () => {
    onHouseholdDraftChange({
      ...householdDraft,
      children: [
        ...householdDraft.children,
        {
          firstName: "",
          id: `child-${Date.now()}-${householdDraft.children.length}`,
          lastName: "",
        },
      ],
    });
  };

  const removeChildDraft = (childId: string) => {
    const remainingChildren = householdDraft.children.filter((child) => child.id !== childId);

    onHouseholdDraftChange({
      ...householdDraft,
      children: remainingChildren.length ? remainingChildren : [blankChildDraft()],
    });
  };

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
      <details className="group overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] [&::-webkit-details-marker]:hidden">
          <FieldLabel>Household Information</FieldLabel>
          <ChevronRight className="h-4 w-4 shrink-0 rotate-90 text-[#94A3B8] transition-transform group-open:-rotate-90" aria-hidden="true" strokeWidth={1.9} />
        </summary>
        <div className="grid gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="grid gap-2 min-[360px]:grid-cols-2">
            <label className="block min-w-0">
              <FieldLabel>Spouse First Name</FieldLabel>
              <input className={FieldInputClass()} onChange={(event) => updateSpouseDraft("spouseFirstName", event.target.value)} placeholder="First name" value={householdDraft.spouseFirstName} />
            </label>
            <label className="block min-w-0">
              <FieldLabel>Spouse Last Name</FieldLabel>
              <input className={FieldInputClass()} onChange={(event) => updateSpouseDraft("spouseLastName", event.target.value)} placeholder="Last name" value={householdDraft.spouseLastName} />
            </label>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Children</FieldLabel>
              <button
                className="inline-flex h-8 items-center rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-bold text-[#2563EB] transition-colors hover:bg-[#EBF2FF]"
                onClick={addChildDraft}
                type="button"
              >
                + Child
              </button>
            </div>
            <div className="grid gap-2">
              {householdDraft.children.map((child, index) => (
                <div className="grid gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-2" key={child.id}>
                  <div className="grid gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px]">
                    <label className="block min-w-0">
                      <FieldLabel>Child First Name</FieldLabel>
                      <input className={FieldInputClass()} onChange={(event) => updateChildDraft(child.id, "firstName", event.target.value)} placeholder="First name" value={child.firstName} />
                    </label>
                    <label className="block min-w-0">
                      <FieldLabel>Child Last Name</FieldLabel>
                      <input className={FieldInputClass()} onChange={(event) => updateChildDraft(child.id, "lastName", event.target.value)} placeholder="Last name" value={child.lastName} />
                    </label>
                    <button
                      aria-label={`Remove child ${index + 1}`}
                      className="mt-0 flex h-9 w-9 items-center justify-center justify-self-end rounded-full border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 min-[360px]:mt-5"
                      onClick={() => removeChildDraft(child.id)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );

  if (!showToggle) {
    return (
      <section className="grid gap-2">
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
        </span>
        <span className={`text-lg leading-none text-[#94A3B8] transition-transform ${isOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>

      {isOpen ? fields : null}
    </section>
  );
}

function PersonExtraDetails({
  additionalDefaults,
  detailsOpen,
  householdDraft,
  onChange,
  onHouseholdDraftChange,
  onScoreChange,
  onToggleDetails,
  scoreValue,
  showToggle = true,
  value,
}: {
  additionalDefaults?: PersonFormDefaults;
  detailsOpen: boolean;
  householdDraft: PersonHouseholdDraft;
  onChange: (value: DosRelationshipModel) => void;
  onHouseholdDraftChange: (value: PersonHouseholdDraft) => void;
  onScoreChange: (value: RelationshipScoreValue) => void;
  onToggleDetails: () => void;
  scoreValue: RelationshipScoreValue;
  showToggle?: boolean;
  value: DosRelationshipModel;
}) {
  const fields = (
    <div className="space-y-4 rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <RelationshipContextPicker onChange={onChange} value={value} />
      <RelationshipScorePicker onChange={onScoreChange} value={scoreValue} />
      <AdditionalPersonInformation
        defaults={additionalDefaults}
        householdDraft={householdDraft}
        isOpen
        onHouseholdDraftChange={onHouseholdDraftChange}
        onToggle={onToggleDetails}
        showToggle={false}
      />
    </div>
  );

  if (!showToggle) {
    return <section>{fields}</section>;
  }

  return (
    <section className="space-y-3">
      <button
        aria-expanded={detailsOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-sm font-semibold text-[#2563EB] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
        onClick={onToggleDetails}
        type="button"
      >
        <span>{detailsOpen ? "Hide extra details" : "Show extra details"}</span>
        <span className={`text-lg leading-none text-[#94A3B8] transition-transform ${detailsOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>
      {detailsOpen ? fields : null}
    </section>
  );
}

function PersonFormContent({
  additionalDefaults,
  buttonText,
  detailsOpen,
  errorMessage,
  isSubmitting,
  nameDefault,
  onRelationshipChange,
  onDelete,
  onScoreChange,
  onSubmit,
  onToggleDetails,
  phoneDefault,
  relationshipModel,
  scoreValue,
  showDetailsToggle = true,
  submittingText,
}: {
  additionalDefaults?: PersonFormDefaults;
  buttonText: string;
  detailsOpen: boolean;
  errorMessage: string;
  isSubmitting: boolean;
  nameDefault?: string | null;
  onRelationshipChange: (value: DosRelationshipModel) => void;
  onDelete?: () => void;
  onScoreChange: (value: RelationshipScoreValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleDetails: () => void;
  phoneDefault?: string | null;
  relationshipModel: DosRelationshipModel;
  scoreValue: RelationshipScoreValue;
  showDetailsToggle?: boolean;
  submittingText: string;
}) {
  const [nameDraft, setNameDraft] = useState(() => splitNameParts(nameDefault));
  const [phoneDraft, setPhoneDraft] = useState(() => phoneDigitsOnly(phoneDefault));
  const [householdDraft, setHouseholdDraft] = useState<PersonHouseholdDraft>(() => householdDraftFromDefaults(additionalDefaults));

  useEffect(() => {
    setNameDraft(splitNameParts(nameDefault));
  }, [nameDefault]);

  useEffect(() => {
    setPhoneDraft(phoneDigitsOnly(phoneDefault));
  }, [phoneDefault]);

  useEffect(() => {
    setHouseholdDraft(householdDraftFromDefaults(additionalDefaults));
  }, [additionalDefaults?.childrenNames, additionalDefaults?.spouseName]);

  const composedName = joinNameParts(nameDraft.firstName, nameDraft.lastName);
  const effectiveDetailsOpen = showDetailsToggle ? detailsOpen : true;

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <input name="name" type="hidden" value={composedName} />
      <input name="phone" type="hidden" value={phoneDraft} />
      <input name="spouse_name" type="hidden" value={householdDraftSpouseName(householdDraft)} />
      <input name="children_names" type="hidden" value={householdDraftChildrenNames(householdDraft)} />
      <div className="grid gap-3">
        <div className="grid gap-2 min-[360px]:grid-cols-2">
          <label className="block min-w-0">
            <FieldLabel>First Name</FieldLabel>
            <input className={FieldInputClass()} onChange={(event) => setNameDraft((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" required value={nameDraft.firstName} />
          </label>
          <label className="block min-w-0">
            <FieldLabel>Last Name</FieldLabel>
            <input className={FieldInputClass()} onChange={(event) => setNameDraft((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" value={nameDraft.lastName} />
          </label>
        </div>
        <label className="block">
          <FieldLabel>Phone</FieldLabel>
          <input
            className={FieldInputClass()}
            inputMode="tel"
            onChange={(event) => setPhoneDraft(phoneDigitsOnly(event.target.value))}
            placeholder="(651) 456-8974"
            required
            type="tel"
            value={formatPhoneNumber(phoneDraft)}
          />
        </label>
      </div>
      <RelationshipTypePicker onChange={onRelationshipChange} value={relationshipModel} />
      <PersonExtraDetails
        additionalDefaults={additionalDefaults}
        detailsOpen={effectiveDetailsOpen}
        householdDraft={householdDraft}
        onChange={onRelationshipChange}
        onHouseholdDraftChange={setHouseholdDraft}
        onScoreChange={onScoreChange}
        onToggleDetails={onToggleDetails}
        scoreValue={scoreValue}
        showToggle={showDetailsToggle}
        value={relationshipModel}
      />
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? submittingText : buttonText}</AppButton>
      {onDelete ? (
        <button
          className="mt-2 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={onDelete}
          type="button"
        >
          Delete Person
        </button>
      ) : null}
    </form>
  );
}

function DetailCard({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.055)]">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
            {icon}
          </span>
        ) : null}
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {title}
        </p>
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3">{children}</div>
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
    <div className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.035)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{title}</span>
        {text ? <span className="mt-1 block text-sm leading-6 text-[#64748B]">{text}</span> : null}
        {action ? <span className="mt-3 block">{action}</span> : null}
      </span>
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

function FruitEventRow({ event, onClick }: { event: DosAppFruitEvent; onClick?: () => void }) {
  const content = (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]">
        <FruitEventIcon event={event} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold leading-6 text-[#0F172A]">{event.title || event.fruitType}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-[#64748B]">{formatDate(event.date)}</p>
        <p className="mt-1 text-sm leading-6 text-[#64748B]">{fruitNarrative(event)}</p>
      </div>
      {onClick ? <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        className="relative w-full min-w-0 overflow-hidden rounded-[22px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="relative min-w-0 overflow-hidden rounded-[22px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      {content}
    </article>
  );
}

function LeaderReflectionRow({ reflection }: { reflection: DosAppLeaderReflection }) {
  return (
    <article className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-bold leading-5 text-[#0F172A]">{reflection.whatHappened || reflection.privateNotes || "Leader Reflection"}</p>
          {reflection.followUpNeeded ? (
            <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              Follow Up
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#64748B]">{formatDate(reflection.createdAt)}</p>
        {reflection.prayerNeeds ? <p className="mt-2 text-sm leading-6 text-[#0F172A]">Prayer: {reflection.prayerNeeds}</p> : null}
        {reflection.observedFruit.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reflection.observedFruit.map((fruit) => (
              <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]" key={fruit}>{fruit}</span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ParticipantReviewRow({ review }: { review: DosAppParticipantReview }) {
  return (
    <article className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-[#0F172A]">Review</p>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(review.submittedAt)}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{review.comments || "Participant review submitted."}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">Heard: {review.feltHeard ?? "Skipped"}</span>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">Meet Again: {review.wouldMeetAgain === null ? "Skipped" : review.wouldMeetAgain ? "Yes" : "No"}</span>
        </div>
      </div>
    </article>
  );
}

function ParticipantTestimonyRow({ onClick, testimony }: { onClick?: () => void; testimony: DosAppParticipantTestimony }) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <Mic className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-[#0F172A]">Testimony</p>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(testimony.submittedAt)}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{testimony.whatChanged || testimony.story}</p>
        {testimony.publicDisplayName ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">{testimony.publicDisplayName}</p>
        ) : null}
      </div>
      {onClick ? <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className="flex w-full min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      {content}
    </article>
  );
}

function OutcomeDetailSheet({
  entry,
  meeting,
  onClose,
  person,
}: {
  entry: PersonOutcomeEntry;
  meeting?: DosAppMeeting | null;
  onClose: () => void;
  person: DosAppPerson;
}) {
  const isTestimony = entry.type === "testimony";
  const title = isTestimony ? "Testimony Shared" : entry.event.title || entry.event.fruitType;
  const date = isTestimony ? entry.testimony.submittedAt : entry.event.date;
  const description = isTestimony
    ? entry.testimony.whatChanged || entry.testimony.story || "Testimony shared."
    : fruitNarrative(entry.event);
  const source = isTestimony
    ? "Testimony"
    : entry.event.generatedBy || statusLabel(entry.event.sourceType);
  const peopleInvolved = meeting?.participantNames.length
    ? formatDosParticipantList(meeting.participantNames)
    : person.name;

  return (
    <MobileBottomSheet
      badge={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">{isTestimony ? <Mic className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /> : entry.type === "fruit" ? <FruitEventIcon event={entry.event} /> : null}</span>}
      onClose={onClose}
      subtitle={date ? formatDate(date) : "Date not recorded"}
      title={title}
    >
      <div className="grid gap-3">
        <DetailCard title="Outcome">
          <p className="whitespace-pre-line rounded-[18px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-sm leading-6 text-[#0F172A]">{description}</p>
        </DetailCard>
        <DetailCard title="Details">
          <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Date" value={date ? formatDate(date) : "Not recorded" } />
          {meeting ? <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Related Meeting" value={`${meetingActivityTitle(meeting)} · ${formatDate(meeting.date)}`} /> : null}
          <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="People Involved" value={peopleInvolved} />
          <DetailRow icon={<Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Source" value={source} />
        </DetailCard>
      </div>
    </MobileBottomSheet>
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
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]">{icon}</span> : null}
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
        className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
        href={href}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A]">
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
      <div className="mx-auto grid w-full grid-cols-5 gap-1 rounded-full border border-white/75 bg-white/82 p-1.5 shadow-[0_18px_48px_rgba(42,37,29,0.16)] backdrop-blur-xl">
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

function ContactActionRow({
  actions,
  icon,
  label,
  primaryHref,
  value,
}: {
  actions?: Array<{ href: string; label: string }>;
  icon: ReactNode;
  label: string;
  primaryHref: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]">{icon}</span>
      <a className="min-w-0 flex-1 transition-colors hover:text-[#1D4ED8]" href={primaryHref}>
        <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>{label}</span>
        <span className="mt-0.5 block truncate leading-5 text-[#0F172A]">{value}</span>
      </a>
      {actions?.length ? (
        <span className="flex shrink-0 gap-1.5 max-[350px]:gap-1">
          {actions.map((action) => (
            <a
              className="inline-flex min-h-8 items-center justify-center rounded-full bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8] transition-colors hover:bg-[#DBEAFE] max-[350px]:px-2.5"
              href={action.href}
              key={action.label}
            >
              {action.label}
            </a>
          ))}
        </span>
      ) : <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />}
    </div>
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
  items: CircleListItem[];
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
  circleGroups,
  latestMeetingDateByPersonId,
  onClose,
  onLogMeeting,
  onLogMeetingForPerson,
  onOpenPerson,
}: {
  activeCircle: CircleFocusView;
  circleGroups: CircleLayerGroups;
  latestMeetingDateByPersonId: Map<string, string | null>;
  onClose: () => void;
  onLogMeeting: () => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
}) {
  const details = circleLayerDetails(activeCircle, circleGroups);
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
  circleGroups,
  latestMeetingDateByPersonId,
  onBack,
  onLogMeeting,
  onLogMeetingForPerson,
  onOpenPerson,
  onSearch,
}: {
  circleGroups: CircleLayerGroups;
  latestMeetingDateByPersonId: Map<string, string | null>;
  onBack: () => void;
  onLogMeeting: () => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  onSearch: () => void;
}) {
  const [activeCircle, setActiveCircle] = useState<CircleFocusView>("three");
  const circleTabs: Array<SegmentedTabOption<CircleFocusView>> = [
    { label: "My 3", value: "three" },
    { label: "My 12", value: "twelve" },
    { label: "My 70", value: "seventy" },
  ];
  const circleContent = circleLayerDetails(activeCircle, circleGroups);
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
  calendarConnection,
  circleScore,
  fruitEvents,
  fruitItems,
  index,
  isCalendarDisconnecting,
  leaderReflections,
  meetings,
  reminders,
  onBack,
  onAddReminder,
  onDisconnectCalendar,
  onEditReminder,
  onEdit,
  onOpenMeeting,
  onLogMeeting,
  onScheduleMeeting,
  participantReviews,
  participantTestimonies,
  person,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  circleScore?: DosRelationshipScore | null;
  fruitEvents: DosAppFruitEvent[];
  fruitItems: DosAppFruit[];
  index: number;
  isCalendarDisconnecting?: boolean;
  leaderReflections: DosAppLeaderReflection[];
  meetings: DosAppMeeting[];
  reminders: DosAppRelationshipReminder[];
  onBack: () => void;
  onAddReminder: () => void;
  onDisconnectCalendar?: () => void;
  onEditReminder: (reminderId: string) => void;
  onEdit: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onLogMeeting: () => void;
  onScheduleMeeting: () => void;
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  person: DosAppPerson;
  workspaceId: string;
}) {
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"activity" | "fruit" | "overview">("overview");
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [selectedOutcomeEntry, setSelectedOutcomeEntry] = useState<PersonOutcomeEntry | null>(null);
  const defaults = personFormDefaults(person);
  const address = personAddressLine(defaults);
  const mapHref = address ? mapsHrefForAddress(address) : "";
  const hasHouseholdContext = hasHouseholdDetails(person);
  const relationshipScore = relationshipScoreFromEngagementLevel(person.engagementLevel);
  const engagementOverviewScore = relationshipScoreLabel(relationshipScore);
  const engagementOverviewLabel = overviewEngagementLabel(relationshipScore);
  const personMeetings = meetings.filter((meeting) => meeting.fieldPersonIds.includes(person.id));
  const personLoggedMeetings = personMeetings.filter((meeting) => meeting.meetingStatus === "logged");
  const personScheduledMeetings = personMeetings
    .filter((meeting) => meeting.meetingStatus === "scheduled" && isUpcomingDate(meeting.scheduledStartAt ?? meeting.date))
    .sort((first, second) => dateSortValue(first.scheduledStartAt ?? first.date) - dateSortValue(second.scheduledStartAt ?? second.date));
  const personReminders = reminders
    .filter((reminder) => reminder.personId === person.id)
    .sort((first, second) => dateSortValue(nextReminderDate(first)) - dateSortValue(nextReminderDate(second)));
  const upcomingReminders = personReminders.filter((reminder) => isUpcomingDate(nextReminderDate(reminder)));
  const upcomingTimelineItems = buildUpcomingTimelineItems({
    meetings,
    people: [person],
    person,
    reminders,
  });
  const upcomingTimelineGroups = groupedUpcomingTimelineItems(upcomingTimelineItems);
  const personParticipantReviews = participantReviews.filter((review) => review.personId === person.id || personMeetings.some((meeting) => meeting.id === review.meetingId));
  const personTestimonies = participantTestimonies.filter((testimony) => testimony.personId === person.id || personMeetings.some((meeting) => meeting.id === testimony.meetingId));
  const personFruitSummary = selectPersonDetailFruitSummary({
    fruitEvents,
    fruitItems,
    leaderReflections,
    meetings: meetings.filter((meeting) => meeting.meetingStatus === "logged"),
    person,
  });
  const personFruitEvents = personFruitSummary.fruitEvents;
  const personReflections = leaderReflections.filter((reflection) => reflection.personId === person.id || personLoggedMeetings.some((meeting) => meeting.id === reflection.meetingId));
  const personOutcomeFruitEvents = personFruitEvents.filter(isObservableFruitOutcome);
  const personOutcomeTestimonies = personTestimonies.filter((testimony) => isSubmittedStatus(testimony.status) && Boolean(testimony.story?.trim() || testimony.whatChanged?.trim()));
  const personOutcomeEntries: PersonOutcomeEntry[] = [
    ...personOutcomeFruitEvents.map((event) => ({
      date: event.date,
      event,
      id: `fruit-${event.id}`,
      type: "fruit" as const,
    })),
    ...personOutcomeTestimonies.map((testimony) => ({
      date: testimony.submittedAt,
      id: `testimony-${testimony.id}`,
      testimony,
      type: "testimony" as const,
    })),
  ].sort((first, second) => (parseDisplayDate(second.date)?.getTime() ?? 0) - (parseDisplayDate(first.date)?.getTime() ?? 0));
  const latestOutcomeEntry = personOutcomeEntries[0];
  const selectedOutcomeMeeting = selectedOutcomeEntry
    ? meetings.find((meeting) => meeting.id === (selectedOutcomeEntry.type === "fruit" ? selectedOutcomeEntry.event.meetingId : selectedOutcomeEntry.testimony.meetingId)) ?? null
    : null;
  const recentMeetings = personLoggedMeetings.slice(0, 3);
  const relationshipTypePill = relationshipTypePillLabel(person);
  const spiritualJourneyPill = deriveSpiritualJourney({
    fruitEvents: personFruitEvents,
    fruitSummary: personFruitSummary,
    meetings: personLoggedMeetings,
    participantReviews: personParticipantReviews,
    participantTestimonies: personTestimonies,
    person,
    reflections: personReflections,
  });
  const lastMeetingDate = personLoggedMeetings[0]?.date ?? person.lastActivityAt;
  const currentCircleLabel = circleScore ? circleDisplayName(circleScore.circle) : "Field";
  const overviewNotes = defaults.notes?.trim() ?? "";
  const completedGuidedMeetings = personLoggedMeetings.filter((meeting) => meeting.conversationFlowKey !== "none").length;
  const relationshipSnapshotReasons = Array.from(new Set([
    personLoggedMeetings.length ? `${personLoggedMeetings.length} meeting${personLoggedMeetings.length === 1 ? "" : "s"} logged` : "",
    completedGuidedMeetings ? `${completedGuidedMeetings} guided conversation${completedGuidedMeetings === 1 ? "" : "s"} completed` : "",
    relationshipTypePill !== "New" ? "Active discipleship relationship" : "",
    personFruitEvents.length ? `${personFruitEvents.length} fruit event${personFruitEvents.length === 1 ? "" : "s"} recorded` : "",
  ].filter((reason): reason is string => Boolean(reason)))).slice(0, 3);
  function scrollDetailToTop() {
    requestAnimationFrame(() => {
      const scrollContainer = detailScrollRef.current;

      if (!scrollContainer) {
        return;
      }

      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    });
  }

  useEffect(() => {
    setActiveDetailTab("overview");
    setIsSnapshotOpen(false);
    setSelectedOutcomeEntry(null);
    scrollDetailToTop();
  }, [person.id]);

  return (
    <div ref={detailScrollRef} className="absolute inset-0 overflow-y-auto bg-[#FAFBFD] px-4 pb-28 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to people">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
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
      </section>

      <div className="mt-5">
        <MeetingActionRow onLogMeeting={onLogMeeting} onScheduleMeeting={onScheduleMeeting} />
      </div>

      <div className="sticky top-0 z-20 -mx-4 mt-4 bg-[#FAFBFD]/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          {[
            { label: "Overview", value: "overview" },
            { label: "Activity", value: "activity" },
            { label: "Fruit", value: "fruit" },
          ].map((tab) => (
            <button
              aria-current={activeDetailTab === tab.value ? "page" : undefined}
              className={`min-h-9 rounded-full px-2 text-[11px] font-bold transition-colors ${
                activeDetailTab === tab.value ? "bg-[#EAF2FF] text-[#1D4ED8] shadow-[0_6px_14px_rgba(37,99,235,0.10)] ring-1 ring-[#CFE0FF]" : "text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
              key={tab.value}
              onClick={() => {
                const nextTab = tab.value as typeof activeDetailTab;
                setActiveDetailTab(nextTab);
                scrollDetailToTop();
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3">
        {activeDetailTab === "overview" ? (
          <>
            <div className="grid min-w-0 grid-cols-3 gap-2 max-[350px]:gap-1.5">
              <SnapshotMetricTile icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Relationship" value={relationshipTypePill} />
              <EngagementSnapshotTile label={engagementOverviewLabel} score={engagementOverviewScore} />
              <SnapshotMetricTile icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Last Meeting" value={lastMeetingDate ? formatRelativeDate(lastMeetingDate) : "Not yet"} />
            </div>

            <section className="rounded-[24px] border border-[#D7F3DD] bg-[#F7FEFA] p-4 shadow-[0_14px_34px_rgba(22,163,74,0.055)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]" style={{ fontFamily: font.rajdhani }}>
                Details
              </p>

              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 max-[350px]:gap-1.5">
                <DetailResultTile icon={<Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Spiritual Journey" value={spiritualJourneyPill} />
                <DetailResultTile icon={<User className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Current Circle" value={currentCircleLabel} />
              </div>

              <button
                aria-expanded={isSnapshotOpen}
                className="mt-3 flex min-h-10 w-full items-center justify-between rounded-2xl bg-white px-3 text-left text-xs font-bold text-[#0F172A] ring-1 ring-[#D7F3DD] transition-colors hover:bg-[#ECFDF3]"
                onClick={() => setIsSnapshotOpen((current) => !current)}
                type="button"
              >
                More Details
                <ChevronRight className={`h-4 w-4 text-[#16A34A] transition-transform ${isSnapshotOpen ? "rotate-90" : ""}`} aria-hidden="true" strokeWidth={1.8} />
              </button>

              {isSnapshotOpen ? (
                <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#D7F3DD]">
                  <p className="text-xs leading-5 text-[#475569]">Spiritual Journey and Current Circle are based on the activity and fruit recorded with this person.</p>
                  <div className="grid gap-2">
                    {relationshipSnapshotReasons.length ? relationshipSnapshotReasons.map((reason) => (
                      <p className="flex items-start gap-2 text-xs leading-5 text-[#475569]" key={reason}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" strokeWidth={1.9} />
                        <span>{reason}</span>
                      </p>
                    )) : (
                      <p className="flex items-start gap-2 text-xs leading-5 text-[#475569]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" strokeWidth={1.9} />
                        <span>Log meetings and discipleship activity to help DOS place this relationship.</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            <DetailCard icon={<Phone className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Contact Information">
              {person.phone ? (
                <ContactActionRow
                  actions={[
                    { href: phoneActionHref("tel", person.phone), label: "Call" },
                    { href: phoneActionHref("sms", person.phone), label: "Text" },
                  ]}
                  icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
                  label="Phone"
                  primaryHref={phoneActionHref("tel", person.phone)}
                  value={formatPhoneNumber(person.phone) || person.phone}
                />
              ) : null}
              {person.email ? (
                <ContactActionRow
                  actions={[
                    { href: `mailto:${person.email}`, label: "Email" },
                  ]}
                  icon={<Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
                  label="Email"
                  primaryHref={`mailto:${person.email}`}
                  value={person.email}
                />
              ) : null}
              {address ? (
                <DetailRow
                  ariaLabel={`Open map for ${address}`}
                  href={mapHref}
                  icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
                  label="Address"
                  onClick={(event) => handleAddressMapClick(event, address)}
                  value={address}
                />
              ) : null}
              {person.church ? <DetailRow icon={<Church className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Church" value={person.church} /> : null}
              {defaults.occupation ? <DetailRow icon={<Briefcase className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Occupation" value={defaults.occupation} /> : null}
              {defaults.birthday ? <DetailRow icon={<Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Birthday" value={formatDate(defaults.birthday)} /> : null}
              {!person.phone && !person.email && !address && !person.church && !defaults.occupation && !defaults.birthday ? <p className="text-sm text-[#64748B]">No contact details yet.</p> : null}
            </DetailCard>

            {overviewNotes ? (
              <DetailCard icon={<StickyNote className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Notes">
                <div className="flex min-w-0 gap-3 rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-sm text-[#0F172A]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]">
                    <StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>Note</span>
                    <span className="mt-1 block whitespace-pre-line leading-6 text-[#0F172A]">{overviewNotes}</span>
                  </span>
                </div>
              </DetailCard>
            ) : null}

            {hasHouseholdContext ? (
              <DetailCard icon={<Users className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Household">
                {person.spouseName ? <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Spouse" value={person.spouseName} /> : null}
                {person.childrenNames ? <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Children" value={person.childrenNames} /> : null}
                {person.householdNotes ? <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Household Notes" value={person.householdNotes} /> : null}
                <div>
                  <CompactButton icon="bell" onClick={onAddReminder}>Add Household Reminder</CompactButton>
                </div>
              </DetailCard>
            ) : null}
          </>
        ) : null}

        {activeDetailTab === "activity" ? (
          <>
            <DetailCard icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Activity">
              <div className="grid min-w-0 grid-cols-3 gap-2 max-[350px]:gap-1.5">
                <ActivityFilterCard
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Meetings"
                  value={personLoggedMeetings.length}
                />
                <ActivityFilterCard
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Scheduled"
                  value={personScheduledMeetings.length}
                />
                <ActivityFilterCard
                  icon={<Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Reminders"
                  value={upcomingReminders.length}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CompactButton icon="bell" onClick={onAddReminder}>Add Reminder</CompactButton>
                <CompactButton icon="calendar" onClick={onScheduleMeeting}>Schedule Meeting</CompactButton>
              </div>
            </DetailCard>

            <CalendarConnectionCard
              calendarConnection={calendarConnection}
              isDisconnecting={isCalendarDisconnecting}
              onDisconnect={onDisconnectCalendar}
              workspaceId={workspaceId}
            />

            <DetailCard icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Upcoming">
              {upcomingTimelineGroups.length ? upcomingTimelineGroups.map(({ group, items }) => (
                <section className="grid gap-2" key={group}>
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>{group}</p>
                  {items.map((item) => (
                    <UpcomingTimelineRow
                      item={item}
                      key={item.id}
                      onEditReminder={onEditReminder}
                      onOpenMeeting={onOpenMeeting}
                    />
                  ))}
                </section>
              )) : (
                <SectionEmptyState action={<CompactButton icon="calendar" onClick={onScheduleMeeting}>Schedule Meeting</CompactButton>} text="Scheduled meetings and reminders will appear here." title="Nothing upcoming." />
              )}
            </DetailCard>

            <DetailCard icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Recent Activity">
              {recentMeetings.length ? recentMeetings.map((meeting) => (
                <button className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]" key={meeting.id} type="button" onClick={() => onOpenMeeting(meeting.id)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-5 text-[#0F172A]">{meetingActivityTitle(meeting)}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#64748B]">{formatDate(meeting.date)}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{meeting.notes || "No summary added yet."}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
                </button>
              )) : <SectionEmptyState action={<CompactButton icon="log" onClick={onLogMeeting}>Log Meeting</CompactButton>} text="Log the next conversation when it happens." title="No meetings yet." />}
            </DetailCard>
          </>
        ) : null}

        {activeDetailTab === "fruit" ? (
          <>
            <DetailCard icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Fruit Summary">
              <div className="grid min-w-0 grid-cols-3 gap-2 max-[350px]:gap-1.5">
                <FruitSummaryCard icon={<Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Fruit Count" value={String(personOutcomeEntries.length)} />
                <FruitSummaryCard
                  icon={<Gift className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Latest Fruit"
                  value={latestOutcomeEntry ? latestOutcomeEntry.type === "testimony" ? "Testimony Shared" : fruitOutcomeLabel(latestOutcomeEntry.event) : "None Yet"}
                />
                <FruitSummaryCard icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Multiplication" value={fruitMultiplicationLabel(personFruitSummary.multiplicationStatus)} />
              </div>
            </DetailCard>

            <DetailCard icon={<Mic className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Testimonies & Outcomes">
              {personOutcomeEntries.length ? personOutcomeEntries.map((entry) => (
                entry.type === "testimony"
                  ? <ParticipantTestimonyRow key={entry.id} onClick={() => setSelectedOutcomeEntry(entry)} testimony={entry.testimony} />
                  : <FruitEventRow event={entry.event} key={entry.id} onClick={() => setSelectedOutcomeEntry(entry)} />
              )) : (
                <SectionEmptyState text="Observable outcomes and shared stories will appear here." title="No outcomes yet." />
              )}
            </DetailCard>
          </>
        ) : null}

      </div>
      {selectedOutcomeEntry ? (
        <OutcomeDetailSheet
          entry={selectedOutcomeEntry}
          meeting={selectedOutcomeMeeting}
          onClose={() => setSelectedOutcomeEntry(null)}
          person={person}
        />
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
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function RequestQuestionPreview({
  questions,
  title,
}: {
  questions: ReadonlyArray<string>;
  title: string;
}) {
  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </p>
      <ol className="mt-3 grid gap-2">
        {questions.map((question, index) => (
          <li className="flex items-start gap-2.5 rounded-2xl bg-white px-3 py-2 text-sm leading-5 text-[#0F172A] shadow-[0_8px_18px_rgba(37,99,235,0.035)]" key={question}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[11px] font-bold text-[#1D4ED8]">
              {index + 1}
            </span>
            <span>{question}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MeetingSendConfirmationSheet({
  isSending,
  onClose,
  onConfirm,
  people,
  action,
}: {
  action: PendingMeetingSendAction;
  isSending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  people: DosAppPerson[];
}) {
  const isTestimony = action.type === "testimony_request";
  const title = isTestimony ? "Send Testimony Request" : "Send Quick Review";
  const description = isTestimony
    ? "Invite them to share what changed from this meeting."
    : "Invite them to share a quick review of the meeting.";
  const recipientTitle = isTestimony
    ? meetingTestimonyRecipientTitle(action.meeting, people)
    : meetingParticipantTitle(action.meeting, people);
  const fallbackTitle = meetingFallbackTitle(action.meeting);
  const cannotSendTestimony = isTestimony && !recipientTitle;

  return (
    <Sheet description={description} onClose={onClose} showEyebrow={false} title={title}>
      <div className="grid gap-3">
        <div className="rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          {recipientTitle ? (
            <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Recipient" value={recipientTitle} />
          ) : (
            <DetailRow icon={<MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Meeting" value={fallbackTitle} />
          )}
          <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label={recipientTitle ? "Meeting" : "Date"} value={recipientTitle ? meetingMetadataLine(action.meeting) : formatDate(action.meeting.date)} />
          <DetailRow icon={<Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Request Type" value={isTestimony ? "Testimony Request" : "Quick Review"} />
        </div>
        <p className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs leading-5 text-[#64748B]">
          {cannotSendTestimony
            ? "Add a person to this meeting before sending a testimony request."
            : "DOS will create a share link for this request. You can use the phone share sheet or copy the link if sharing is not available."}
        </p>
          <RequestQuestionPreview
            questions={isTestimony ? testimonyQuestionPreview : quickReviewQuestionPreview}
            title={isTestimony ? "Testimony Questions" : "Review Questions"}
          />
        <div className="grid gap-2">
          <AppButton disabled={isSending || cannotSendTestimony} onClick={onConfirm} tone="black">
            {isSending ? "Preparing..." : isTestimony ? "Send Testimony Request" : "Send Review"}
          </AppButton>
          <AppButton disabled={isSending} onClick={onClose} tone="white">Cancel</AppButton>
        </div>
      </div>
    </Sheet>
  );
}

function MeetingNotesEditorSheet({
  defaultValue,
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  defaultValue?: string | null;
  errorMessage?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasNotes = Boolean(defaultValue?.trim());

  return (
    <Sheet onClose={onClose} showEyebrow={false} title={hasNotes ? "Edit Notes" : "Add Notes"}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <FieldLabel>Meeting Notes</FieldLabel>
          <textarea
            autoFocus
            className={`${FieldTextareaClass()} min-h-40 bg-white`}
            defaultValue={defaultValue ?? ""}
            name="notes"
            placeholder="What happened at the table?"
          />
        </label>
        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
        <div className="grid gap-2">
          <AppButton disabled={isSubmitting} tone="black" type="submit">
            {isSubmitting ? "Saving..." : "Save Notes"}
          </AppButton>
          <AppButton disabled={isSubmitting} onClick={onClose} tone="white">
            Cancel
          </AppButton>
        </div>
      </form>
    </Sheet>
  );
}

function MeetingDetailOverlay({
  fruitEvents,
  hasReviewRequestLink,
  hasTestimonyRequestLink,
  isSendingReview,
  isSendingTestimony,
  leaderReflections,
  meeting,
  onBack,
  onEdit,
  onDone,
  onEditNotes,
  onPrepareQuickReview,
  onPrepareTestimonyRequest,
  onScheduleNextMeeting,
  onSendReview,
  onSendTestimony,
  participantReviews,
  participantTestimonies,
  people,
  reviewShareMessage,
  showPostMeetingFollowUp,
  testimonyShareMessage,
}: {
  fruitEvents: DosAppFruitEvent[];
  hasReviewRequestLink?: boolean;
  hasTestimonyRequestLink?: boolean;
  isSendingReview?: boolean;
  isSendingTestimony?: boolean;
  leaderReflections: DosAppLeaderReflection[];
  meeting: DosAppMeeting;
  onBack: () => void;
  onDone: () => void;
  onEdit: () => void;
  onEditNotes: () => void;
  onPrepareQuickReview: () => void;
  onPrepareTestimonyRequest: () => void;
  onScheduleNextMeeting: () => void;
  onSendReview: () => void;
  onSendTestimony: () => void;
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  people: DosAppPerson[];
  reviewShareMessage?: string;
  showPostMeetingFollowUp?: boolean;
  testimonyShareMessage?: string;
}) {
  const isTableMeeting = meeting.source === "table";
  const isScheduledMeeting = meeting.meetingStatus === "scheduled";
  const isLoggedTableMeeting = isTableMeeting && !isScheduledMeeting;
  const temperature = meeting.conversationFlowKey === "kitchen_table_gospel"
    ? relationshipWithJesusTemperature(responseAsNumber(meeting.conversationResponses.relationshipWithJesus))
    : null;
  const avatarNames = meetingAvatarNames(meeting, people);
  const title = meetingDisplayTitle(meeting, people);
  const canSendTestimony = canSendMeetingTestimonyRequest(meeting, people);
  const meetingReflections = leaderReflections.filter((reflection) => reflection.meetingId === meeting.id);
  const meetingParticipantReviews = participantReviews.filter((review) => review.meetingId === meeting.id);
  const meetingTestimonies = participantTestimonies.filter((testimony) => testimony.meetingId === meeting.id);
  const meetingFruitEvents = fruitEvents.filter((event) => event.meetingId === meeting.id);
  const reviewIsCompleted = meeting.review.status === "approved" || meeting.review.status === "private" || meeting.review.status === "submitted";
  const reviewRequestSent = meeting.review.status === "pending" || Boolean(hasReviewRequestLink);
  const reviewDisplayTitle = reviewIsCompleted ? "Completed" : reviewRequestSent ? "Sent" : "Not sent";
  const reviewDisplayHelper = reviewIsCompleted
    ? meeting.review.submittedAt
      ? `Received ${formatDate(meeting.review.submittedAt)}.`
      : "Review received."
    : reviewRequestSent
      ? "Awaiting response."
      : "Send a quick review request when you are ready.";
  const storyIsCompleted = meetingTestimonies.length > 0;
  const storyRequestSent = Boolean(hasTestimonyRequestLink);
  const storyDisplayTitle = storyIsCompleted ? "Completed" : storyRequestSent ? "Sent" : "Not sent";
  const storyDisplayHelper = storyIsCompleted
    ? "Testimony received."
    : storyRequestSent
      ? "Awaiting response."
      : "Invite them to share how God worked in their life through this conversation.";

  if (showPostMeetingFollowUp && isLoggedTableMeeting) {
    return (
      <div className="absolute inset-0 z-40 overflow-y-auto bg-[#FAFBFD] px-4 pb-28 pt-7 [scrollbar-width:none]">
        <header className="flex items-center justify-between gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to meetings">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
          </button>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <section className="mt-16 rounded-[30px] border border-[#DCEBFF] bg-white p-5 text-center shadow-[0_18px_48px_rgba(37,99,235,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D] ring-1 ring-[#BBF7D0]">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-[30px] font-bold leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Meeting Saved
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">Meeting saved successfully.</p>

          <div className="mt-6 grid gap-2.5">
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]"
              disabled={isSendingReview}
              onClick={onPrepareQuickReview}
              type="button"
            >
              <Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Send Quick Review
            </button>
            {canSendTestimony ? (
              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB]"
                disabled={isSendingTestimony}
                onClick={onPrepareTestimonyRequest}
                type="button"
              >
                <Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                Send Testimony Request
              </button>
            ) : null}
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
              onClick={onScheduleNextMeeting}
              type="button"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Schedule Next Meeting
            </button>
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
              onClick={onDone}
              type="button"
            >
              Done
            </button>
          </div>
          {reviewShareMessage ? (
            <p className="mt-4 rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-[#1D4ED8]">{reviewShareMessage}</p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#FAFBFD] px-4 pb-28 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to meetings">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {isScheduledMeeting ? "Scheduled" : "Meeting"}
        </p>
        {isLoggedTableMeeting ? (
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
            {isScheduledMeeting ? "Scheduled" : conversationFlowLabel(meeting.conversationFlowKey)}
          </span>
          {meeting.googleSyncEnabled ? (
            <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#64748B]">
              {meeting.googleSyncStatus === "synced" ? "Google synced" : meeting.googleSyncStatus === "failed" ? "Google failed" : "Google pending"}
            </span>
          ) : null}
          {temperature ? (
            <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#64748B]">
              {temperature}
            </span>
          ) : null}
        </div>
      </section>

      <div className="mt-5 grid gap-3">
        {isLoggedTableMeeting ? (
          <DetailCard title="Quick Review">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{reviewDisplayTitle}</p>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{reviewDisplayHelper}</p>
            </div>
            {meeting.review.status !== "not_sent" && meeting.review.sharePermission ? (
              <span className="mt-3 inline-flex rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
                {reviewSharePermissionLabel(meeting.review.sharePermission)}
              </span>
            ) : null}
            {meeting.review.stoodOut ? (
              <p className="mt-3 line-clamp-3 rounded-2xl bg-[#F1F5F9] p-3 text-sm leading-6 text-[#0F172A]">{meeting.review.stoodOut}</p>
            ) : null}
            {meeting.review.status === "not_sent" && !hasReviewRequestLink ? (
              <div className="mt-3">
                <ReviewActionButton disabled={isSendingReview} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendReview}>
                  Send Review
                </ReviewActionButton>
              </div>
            ) : null}
            {reviewShareMessage ? (
              <p className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{reviewShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        {isLoggedTableMeeting && canSendTestimony ? (
          <DetailCard title="Testimony Request">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{storyDisplayTitle}</p>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{storyDisplayHelper}</p>
            </div>
            {!storyIsCompleted && !hasTestimonyRequestLink ? (
              <div className="mt-3">
              <ReviewActionButton disabled={isSendingTestimony} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendTestimony}>
                Send Testimony Request
              </ReviewActionButton>
            </div>
            ) : null}
            {testimonyShareMessage ? (
              <p className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{testimonyShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        <DetailCard title={isScheduledMeeting ? "Prep Notes" : "Meeting Notes"}>
          {meeting.notes ? (
            <div className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#0F172A]">
              {meeting.notes}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm leading-6 text-[#64748B]">{isScheduledMeeting ? "No prep notes were added." : "No meeting notes were added."}</p>
          )}
          {isTableMeeting ? (
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB]"
              onClick={onEditNotes}
              type="button"
            >
              <StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              {meeting.notes ? "Edit Notes" : "Add Notes"}
            </button>
          ) : null}
        </DetailCard>

        {!isScheduledMeeting ? <ConversationFlowDetail meeting={meeting} /> : null}

        {meetingReflections.length ? (
        <DetailCard title="Leader Reflections">
          {meetingReflections.length ? meetingReflections.map((reflection) => (
            <LeaderReflectionRow key={reflection.id} reflection={reflection} />
          )) : null}
        </DetailCard>
        ) : null}

        {meetingParticipantReviews.length ? (
        <DetailCard title="Reviews">
          {meetingParticipantReviews.length ? meetingParticipantReviews.map((review) => (
            <ParticipantReviewRow key={review.id} review={review} />
          )) : null}
        </DetailCard>
        ) : null}

        {meetingTestimonies.length ? (
        <DetailCard title="Testimonies">
          {meetingTestimonies.length ? meetingTestimonies.map((testimony) => (
            <ParticipantTestimonyRow key={testimony.id} testimony={testimony} />
          )) : null}
        </DetailCard>
        ) : null}

        {meetingFruitEvents.length ? (
        <DetailCard title="Fruit Feed">
          {meetingFruitEvents.length ? meetingFruitEvents.map((event) => (
            <FruitEventRow event={event} key={event.id} />
          )) : null}
        </DetailCard>
        ) : null}

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
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const appScrollRef = useRef<HTMLDivElement | null>(null);
  const isPreview = data.workspace.isPreview === true;
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [meetingsView, setMeetingsView] = useState<MeetingsView>("agenda");
  const [meetingsCalendarMonth, setMeetingsCalendarMonth] = useState(() => startOfCalendarMonth(new Date()));
  const [selectedMeetingsCalendarDate, setSelectedMeetingsCalendarDate] = useState(() => calendarDateKey(new Date()));
  const [errorMessage, setErrorMessage] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [circleSheetView, setCircleSheetView] = useState<CircleFocusView | null>(null);
  const [isCirclesOpen, setIsCirclesOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAdditionalPersonInfoOpen, setIsAdditionalPersonInfoOpen] = useState(false);
  const [isCreatingMeetingPerson, setIsCreatingMeetingPerson] = useState(false);
  const [isPeopleImportOpen, setIsPeopleImportOpen] = useState(false);
  const [isPeopleSearchOpen, setIsPeopleSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCalendarDisconnecting, setIsCalendarDisconnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversationResponses, setConversationResponses] = useState<DosConversationResponses>({});
  const [meetingPeopleQuery, setMeetingPeopleQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleCircleView, setPeopleCircleView] = useState<PeopleCircleView>("three");
  const [peopleImportMessage, setPeopleImportMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [meetingNotesOverrides, setMeetingNotesOverrides] = useState<Record<string, string | null>>({});
  const [pendingMeetingSendAction, setPendingMeetingSendAction] = useState<PendingMeetingSendAction | null>(null);
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
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [selectedRelationshipModel, setSelectedRelationshipModel] = useState<DosRelationshipModel>(defaultRelationshipModel);
  const [selectedRelationshipScore, setSelectedRelationshipScore] = useState<RelationshipScoreValue>(0);
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const [selectedScripture, setSelectedScripture] = useState<ScriptureQuickViewState | null>(null);
  const visibleFruit = useMemo(() => data.fruit.filter((fruit) => fruit.status !== "archived"), [data.fruit]);
  const [quickAddedPeople, setQuickAddedPeople] = useState<DosAppPerson[]>([]);
  const loggedMeetings = useMemo(() => data.meetings.filter((meeting) => meeting.meetingStatus === "logged"), [data.meetings]);
  const people = useMemo(() => {
    const loadedPersonIds = new Set(data.people.map((person) => person.id));

    return [
      ...data.people,
      ...quickAddedPeople.filter((person) => !loadedPersonIds.has(person.id)),
    ];
  }, [data.people, quickAddedPeople]);
  const fruitDashboardStories = useMemo(() => approvedFruitStories(data.fruit, data.fruitEvents, people), [data.fruit, data.fruitEvents, people]);
  const fruitMetrics = useMemo(() => kingdomFruitMetrics(fruitDashboardStories), [fruitDashboardStories]);
  const latestMeeting = loggedMeetings[0];
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
  const selectedMeeting = useMemo(() => {
    const meeting = data.meetings.find((item) => item.id === selectedMeetingId) ?? null;

    if (!meeting || !Object.prototype.hasOwnProperty.call(meetingNotesOverrides, meeting.id)) {
      return meeting;
    }

    return {
      ...meeting,
      notes: meetingNotesOverrides[meeting.id],
    };
  }, [data.meetings, meetingNotesOverrides, selectedMeetingId]);
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
  const selectedReminder = useMemo(() => data.reminders.find((reminder) => reminder.id === selectedReminderId) ?? null, [data.reminders, selectedReminderId]);
  const circlePeopleByLayer = useMemo<CircleLayerGroups>(() => {
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const mapScores = (scores: DosRelationshipScore[]) => uniqueCircleMembers(scores
      .map((score) => ({ person: peopleById.get(score.person.id), score }))
      .filter((item): item is CirclePersonItem => Boolean(item.person)));

    return {
      seventy: mapScores(data.circles?.my70 ?? []),
      three: mapScores(data.circles?.my3 ?? []),
      twelve: mapScores(data.circles?.my12 ?? []),
    };
  }, [data.circles, people]);
  const peopleCircleContent = useMemo(() => peopleCircleDetails(peopleCircleView, circlePeopleByLayer, people), [circlePeopleByLayer, people, peopleCircleView]);
  const visibleCirclePeople = useMemo(() => filterCircleItems(peopleCircleContent.items, peopleQuery), [peopleCircleContent.items, peopleQuery]);
  const latestMeetingDateByPersonId = useMemo(() => {
    const latestDates = new Map<string, string | null>();

    loggedMeetings.forEach((meeting) => {
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
  }, [loggedMeetings]);
  const latestPrayerActivity = useMemo(() => {
    const prayerMeetings = loggedMeetings
      .filter(isPrayerMeeting)
      .map((meeting) => ({
        date: meeting.date,
        label: `${meetingDisplayTitle(meeting, people)} · ${formatRelativeDate(meeting.date)}`,
        meetingId: meeting.id,
      }));
    const prayerReflections = data.leaderReflections
      .filter((reflection) => Boolean(normalizeText(reflection.prayerNeeds)))
      .map((reflection) => {
        const meeting = loggedMeetings.find((item) => item.id === reflection.meetingId) ?? null;

        return {
          date: reflection.createdAt,
          label: meeting ? `${meetingDisplayTitle(meeting, people)} · ${formatRelativeDate(reflection.createdAt)}` : `Prayer note · ${formatRelativeDate(reflection.createdAt)}`,
          meetingId: reflection.meetingId,
        };
      });

    return [...prayerMeetings, ...prayerReflections].sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    })[0] ?? null;
  }, [data.leaderReflections, loggedMeetings, people]);
  const todayFocusItems = useMemo(() => (
    buildUpcomingTimelineItems({
      meetings: data.meetings,
      people,
      reminders: data.reminders,
    }).filter((item) => isTodayDate(item.date)).slice(0, 4)
  ), [data.meetings, data.reminders, people]);
  const meetingCalendarItems = useMemo(() => (
    buildMeetingCalendarItems({
      meetings: data.meetings,
      month: meetingsCalendarMonth,
      people,
      reminders: data.reminders,
    })
  ), [data.meetings, data.reminders, meetingsCalendarMonth, people]);
  const thisWeekStats = useMemo(() => {
    const { end, start } = currentWeekRange();
    const meetingsThisWeek = loggedMeetings.filter((meeting) => isDateWithinRange(meeting.date, start, end));
    const prayerLogsThisWeek = (data.prayerLogs ?? []).filter((log: DosAppPrayerLog) => isDateWithinRange(log.prayedAt, start, end));

    return {
      label: formatWeekRangeCompact(start, end),
      meetings: meetingsThisWeek.length,
      newPeople: people.filter((person) => isDateWithinRange(person.createdAt, start, end)).length,
      prayed: prayerLogsThisWeek.length,
    };
  }, [data.prayerLogs, loggedMeetings, people]);
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

  function scrollAppToTop() {
    requestAnimationFrame(() => {
      const scrollContainer = appScrollRef.current;

      if (!scrollContainer) {
        return;
      }

      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    });
  }

  function selectMeetingsCalendarDate(date: Date) {
    setSelectedMeetingsCalendarDate(calendarDateKey(date));

    if (!isSameCalendarMonth(date, meetingsCalendarMonth)) {
      setMeetingsCalendarMonth(startOfCalendarMonth(date));
    }
  }

  function changeMeetingsCalendarMonth(offset: number) {
    const nextMonth = addCalendarMonths(meetingsCalendarMonth, offset);
    const selectedDate = dateFromCalendarKey(selectedMeetingsCalendarDate);
    const selectedDay = Math.min(selectedDate.getDate(), daysInCalendarMonth(nextMonth));

    setMeetingsCalendarMonth(nextMonth);
    setSelectedMeetingsCalendarDate(calendarDateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), selectedDay)));
  }

  function jumpMeetingsCalendarToToday() {
    const today = new Date();

    setMeetingsCalendarMonth(startOfCalendarMonth(today));
    setSelectedMeetingsCalendarDate(calendarDateKey(today));
  }

  function openScriptureQuickView(scripture: ScriptureReference, event: MouseEvent<HTMLButtonElement>) {
    const shell = appShellRef.current;
    const shellRect = shell?.getBoundingClientRect();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const shellHeight = shell?.clientHeight ?? window.innerHeight;
    const rawTop = shellRect ? triggerRect.bottom - shellRect.top + 8 : triggerRect.bottom + 8;
    const maxTop = Math.max(82, shellHeight - 250);

    setSelectedScripture({
      scripture,
      top: Math.min(Math.max(rawTop, 82), maxTop),
    });
  }

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
    setSelectedOutcomeTags([]);
  }

  function closeForm() {
    setErrorMessage("");
    setFormMode(null);
    setIsAdditionalPersonInfoOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setPendingMeetingSendAction(null);
    setSelectedReminderId(null);
    setSelectedRelationshipModel(defaultRelationshipModel);
    setSelectedRelationshipScore(0);
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
      setSelectedRelationshipScore(0);
    }
  }

  function handleConversationFlowChange(flowKey: DosConversationFlowKey) {
    setSelectedConversationFlow(flowKey);
    setConversationResponses({});
  }

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    scrollAppToTop();
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setPendingMeetingSendAction(null);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setSelectedPersonId(null);
    setPostMeetingFollowUpId(null);
    setPeopleImportMessage(null);
  }

  function openPeopleCircle(circle: PeopleCircleView = "three") {
    setActiveTab("people");
    scrollAppToTop();
    setPeopleCircleView(circle);
    setPeopleQuery("");
    setIsPeopleSearchOpen(false);
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setPendingMeetingSendAction(null);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setSelectedPersonId(null);
    setPostMeetingFollowUpId(null);
    setPeopleImportMessage(null);
  }

  function openPersonDetail(personId: string) {
    setActiveTab("people");
    scrollAppToTop();
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setPostMeetingFollowUpId(null);
    setSelectedPersonId(personId);
  }

  function openPersonEdit(person: DosAppPerson) {
    setErrorMessage("");
    setFormMode("editPerson");
    setIsAdditionalPersonInfoOpen(false);
    setSelectedRelationshipModel(relationshipModelForPerson(person));
    setSelectedRelationshipScore(relationshipScoreFromEngagementLevel(person.engagementLevel));
  }

  function openMeetingForPerson(personId: string) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setErrorMessage("");
    setFormMode("meeting");
    setIsAdditionalPersonInfoOpen(false);
    resetMeetingDraft([personId]);
  }

  function openScheduleMeeting(personId?: string | string[]) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setErrorMessage("");
    setFormMode("scheduleMeeting");
    setIsAdditionalPersonInfoOpen(false);
    resetMeetingDraft(Array.isArray(personId) ? personId : personId ? [personId] : []);
  }

  function openReminderForm(personId?: string) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedReminderId(null);
    setErrorMessage("");
    setFormMode("reminder");
    setSelectedMeetingPersonIds(personId ? [personId] : []);
  }

  function openReminderEdit(reminderId: string) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedReminderId(reminderId);
    setErrorMessage("");
    setFormMode("reminder");
  }

  function openScheduledDraftAsMeeting() {
    setErrorMessage("");
    setSelectedMeetingId(null);
    setFormMode("meeting");
  }

  function openMeetingDetail(meetingId: string) {
    setActiveTab("meetings");
    setErrorMessage("");
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setSelectedPersonId(null);
    setSelectedReminderId(null);
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

  function openMeetingNotesEdit(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return;
    }

    setErrorMessage("");
    setFormMode("meetingNotes");
    setSelectedMeetingId(meeting.id);
  }

  function personPayloadFromForm(formData: FormData, relationshipModel: DosRelationshipModel, relationshipScore: RelationshipScoreValue, id?: string, fallback: PersonFormDefaults = {}) {
    const formString = (name: string, fallbackValue = "") => (
      formData.has(name)
        ? String(formData.get(name) ?? "")
        : fallbackValue
    );

    return {
      birthday: formString("birthday", fallback.birthday ?? ""),
      childrenNames: formString("children_names", fallback.childrenNames ?? ""),
      church: formString("church", fallback.church ?? ""),
      discipleshipStage: relationshipModel.discipleshipStage,
      city: formString("city", fallback.city ?? ""),
      email: formString("email", fallback.email ?? ""),
      engagementScore: relationshipScoreLabel(relationshipScore),
      homeAddress: formString("home_address", fallback.homeAddress ?? ""),
      householdNotes: formString("household_notes", fallback.householdNotes ?? ""),
      id,
      name: String(formData.get("name") ?? ""),
      notes: formString("notes", fallback.notes ?? ""),
      occupation: formString("occupation", fallback.occupation ?? ""),
      phone: String(formData.get("phone") ?? ""),
      relationshipContext: relationshipModel.relationshipContext,
      relationshipType: relationshipModel.relationshipType,
      roleInMyLife: relationshipModel.roleInMyLife,
      spouseName: formString("spouse_name", fallback.spouseName ?? ""),
      state: formString("state", fallback.state ?? ""),
      zip: formString("zip", fallback.zip ?? ""),
    };
  }

  async function submitJson(endpoint: string, payload: Record<string, unknown>, method: "DELETE" | "PATCH" | "POST" = "POST", closeAfterSave = true) {
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

  function handleDisconnectCalendar() {
    setErrorMessage("");

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Google Calendar stays connected in the demo.");
      return;
    }

    if (!data.calendarConnection.connected || isCalendarDisconnecting) {
      return;
    }

    if (!window.confirm("Disconnect Google Calendar? DOS meetings and reminders will keep saving locally.")) {
      return;
    }

    setIsCalendarDisconnecting(true);

    void (async () => {
      try {
        const response = await fetch("/api/dos/app/calendar/google/disconnect", {
          body: JSON.stringify({
            workspaceId: data.workspace.id,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const result = await response.json().catch(() => ({})) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to disconnect Google Calendar.");
        }

        router.refresh();
      } catch {
        setErrorMessage("Unable to disconnect Google Calendar. Please try again.");
      } finally {
        setIsCalendarDisconnecting(false);
      }
    })();
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

  async function handleCreateMeetingPerson(rawName: string) {
    const nameParts = splitNameParts(rawName);
    const name = joinNameParts(nameParts.firstName, nameParts.lastName);

    if (!name || isCreatingMeetingPerson) {
      return;
    }

    setErrorMessage("");
    setIsCreatingMeetingPerson(true);

    try {
      const createdAt = new Date().toISOString();

      if (isPreview) {
        const previewPersonId = `preview-person-${Date.now()}`;

        setQuickAddedPeople((current) => [
          ...current,
          {
            church: null,
            createdAt,
            discipleshipStage: "not_started",
            email: null,
            engagementLevel: "0",
            id: previewPersonId,
            lastActivityAt: null,
            name,
            notes: null,
            phone: "",
            relationshipContext: "other",
            relationshipType: "new",
            roleInMyLife: "not_active",
            status: "new",
            updatedAt: createdAt,
          },
        ]);
        setSelectedMeetingPersonIds((current) => current.includes(previewPersonId) ? current : [...current, previewPersonId]);
        setMeetingPeopleQuery("");
        return;
      }

      const response = await fetch("/api/dos/app/people", {
        body: JSON.stringify({
          discipleshipStage: "not_started",
          engagementScore: 0,
          name,
          phone: "",
          relationshipContext: "other",
          relationshipType: "new",
          roleInMyLife: "not_active",
          workspaceId: data.workspace.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string; id?: string };

      if (!response.ok || !result.id) {
        throw new Error(result.error ?? "Unable to add person.");
      }

      setQuickAddedPeople((current) => [
        ...current,
        {
          church: null,
          createdAt,
          discipleshipStage: "not_started",
          email: null,
          engagementLevel: "0",
          id: result.id as string,
          lastActivityAt: null,
          name,
          notes: null,
          phone: "",
          relationshipContext: "other",
          relationshipType: "new",
          roleInMyLife: "not_active",
          status: "new",
          updatedAt: createdAt,
        },
      ]);
      setSelectedMeetingPersonIds((current) => current.includes(result.id as string) ? current : [...current, result.id as string]);
      setMeetingPeopleQuery("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add person.");
    } finally {
      setIsCreatingMeetingPerson(false);
    }
  }

  function handlePersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipModel, selectedRelationshipScore),
    });
  }

  function handleEditPersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedPerson) {
      return;
    }

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipModel, selectedRelationshipScore, selectedPerson.id, selectedPersonDefaults),
    }, "PATCH");
  }

  function handleDeletePerson() {
    if (!selectedPerson) {
      return;
    }

    if (!window.confirm("Delete this person? This cannot be undone.")) {
      return;
    }

    void (async () => {
      const result = await submitJson("/api/dos/app/people", {
        id: selectedPerson.id,
      }, "DELETE", false);

      if (result) {
        setQuickAddedPeople((current) => current.filter((person) => person.id !== selectedPerson.id));
        setSelectedPersonId(null);
        closeForm();
      }
    })();
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none";
    const meetingNotes = String(formData.get("notes") ?? "");
    const observedFruit = [...selectedOutcomeTags];
    const followUpNeeded = formData.get("follow_up_needed") === "on";
    const nextStep = String(formData.get("next_step") ?? "");
    const prayerNeeds = String(formData.get("prayer_needs") ?? "");
    const spiritualOpenness = String(formData.get("spiritual_openness") ?? "");
    const shouldSaveReflection = Boolean(
      meetingNotes.trim()
      || observedFruit.length
      || followUpNeeded
      || nextStep.trim()
      || prayerNeeds.trim()
      || spiritualOpenness.trim(),
    );

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
      conversationFlowKey,
      conversationResponses: conversationFlowKey !== "none" ? conversationResponses : {},
      fieldPersonIds: selectedMeetingPersonIds,
      notes: meetingNotes,
      tableDate: String(formData.get("table_date") ?? todayDateValue()),
      tableType: selectedMeetingContext,
      }, "POST", false);

      if (result?.id) {
        if (shouldSaveReflection) {
          const reflectionResult = await submitJson("/api/dos/app/reflections", {
            followUpNeeded,
            meetingId: result.id,
            nextStep,
            observedFruit,
            prayerNeeds,
            privateNotes: "",
            spiritualOpenness,
  function handleScheduleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const scheduledDate = String(formData.get("scheduled_date") ?? todayDateValue());
    const scheduledTime = String(formData.get("scheduled_time") ?? "");
    const scheduledStartAt = localDateTimeIso(scheduledDate, scheduledTime);

    if (!scheduledStartAt) {
      setErrorMessage("Choose a valid meeting date and time.");
      return;
    }

    const scheduledEndAt = new Date(new Date(scheduledStartAt).getTime() + formDurationMinutes(formData.get("duration_minutes")) * 60_000).toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
        conversationFlowKey: "none",
        conversationResponses: {},
        fieldPersonIds: selectedMeetingPersonIds,
        googleSyncEnabled: formData.get("google_sync_enabled") === "on",
        meetingStatus: "scheduled",
        notes: String(formData.get("notes") ?? ""),
        scheduledEndAt,
        scheduledStartAt,
        tableDate: scheduledDate,
        tableType: selectedMeetingContext,
        timezone,
      }, "POST", false);

      if (result?.id) {
        closeForm();
        setActiveTab("meetings");
        setSelectedMeetingId(result.id);
      }
    })();
  }

            whatHappened: meetingNotes,
          }, "POST", false);

          if (!reflectionResult) {
            return;
          }
        }

        closeForm();
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

  function handleMeetingNotesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    const notes = String(formData.get("notes") ?? "");
    const displayNotes = notes.trim() ? notes : null;

    void (async () => {
  function handleReminderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const personId = String(formData.get("person_id") ?? selectedMeetingPersonIds[0] ?? "");
    const reminderType = String(formData.get("reminder_type") ?? "custom");
    const rawRecurrence = String(formData.get("recurrence") ?? "none");
    const recurrence = ["anniversary", "baptism", "birthday", "salvation"].includes(reminderType) && rawRecurrence === "none"
      ? "yearly"
      : rawRecurrence;
    const googleSyncEnabled = formData.get("google_sync_enabled") === "on";
    const reminderDate = String(formData.get("reminder_date") ?? todayDateValue());
    const payload = {
      googleSyncEnabled,
      google_sync_enabled: googleSyncEnabled,
      id: selectedReminder?.id,
      notes: String(formData.get("notes") ?? ""),
      personId,
      person_id: personId,
      recurrence,
      reminderDate,
      reminder_date: reminderDate,
      reminderType,
      reminder_type: reminderType,
      title: String(formData.get("title") ?? ""),
    };

    void submitJson("/api/dos/app/reminders", payload, selectedReminder ? "PATCH" : "POST");
  }

  function handleDeleteReminder() {
    if (!selectedReminder) {
      return;
    }

    if (!window.confirm("Delete this reminder?")) {
      return;
    }

    void submitJson("/api/dos/app/reminders", {
      id: selectedReminder.id,
    }, "DELETE");
  }

      const result = await submitJson("/api/dos/app/meetings", {
        id: selectedMeeting.id,
        notes,
        notesOnly: true,
      }, "PATCH", false);

      if (result) {
        setMeetingNotesOverrides((current) => ({
          ...current,
          [selectedMeeting.id]: displayNotes,
        }));
        closeForm();
      }
    })();
  }

  function handleDeleteMeeting() {
    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    if (!window.confirm("Delete this meeting? This cannot be undone.")) {
      return;
    }

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
        id: selectedMeeting.id,
      }, "DELETE", false);

      if (result) {
        setActiveTab("meetings");
        setPostMeetingFollowUpId(null);
        setSelectedMeetingId(null);
        closeForm();
      }
    })();
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

    if (!canSendMeetingTestimonyRequest(meeting, people)) {
      throw new Error("Add a person to this meeting before sending a testimony request.");
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
      try {
        await navigator.clipboard.writeText(url);

        return true;
      } catch {
        return false;
      }
    }

    return false;
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
            title: "DOS Testimony Request",
            url,
          });
          setTestimonyShareMessage("Testimony request link shared.");
          return;
        } catch {
        }
      }

      const copied = await copyReviewUrl(url);

      setTestimonyShareMessage(copied ? "Testimony request link copied." : url);
    } catch (error) {
      setTestimonyShareMessage(error instanceof Error ? error.message : "Unable to share testimony request link.");
    } finally {
      setTestimonyLinkMeetingId(null);
    }
  }

  async function handleConfirmMeetingSendAction() {
    if (!pendingMeetingSendAction) {
      return;
    }

    const action = pendingMeetingSendAction;

    if (action.type === "quick_review") {
      await handleSendReview(action.meeting);
    } else if (!canSendMeetingTestimonyRequest(action.meeting, people)) {
      setPendingMeetingSendAction(null);
    } else {
      await handleShareTestimony(action.meeting);
    }

    setPendingMeetingSendAction(null);
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
    <div className={dosRootShellClassName}>
      <div ref={appShellRef} className={dosPhoneShellClassName}>
        <div ref={appScrollRef} className="h-full overflow-y-auto px-4 pb-28 pt-8 [scrollbar-width:none]">
          {activeTab === "home" ? (
            <header className="relative">
              <div className="min-w-0 pr-16">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                  DOS
                </p>
                <h1 className="mt-1 max-w-[270px] text-[32px] font-bold leading-tight tracking-tight text-[#0F172A]">
                  {timeGreeting}, {greetingName}.
                </h1>
                <span className="mt-2 inline-flex rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-[11px] font-semibold leading-none text-[#64748B] shadow-[0_6px_14px_rgba(37,99,235,0.045)]">
                  {homeSubtitle}
                </span>
              </div>
              <button
                aria-label="Open profile"
                className="absolute right-0 top-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                onClick={() => setIsProfileOpen(true)}
                type="button"
              >
                <UserProfileAvatar imageUrl={data.workspace.profileImageUrl} name={profileName} />
              </button>
            </header>
          ) : null}

          <main className={activeTab === "home" ? "mt-7" : undefined}>
            {activeTab === "home" ? (
              <div className="space-y-5">
                <CircleFocusHero
                  circleGroups={circlePeopleByLayer}
                  headline={circleHeadline}
                  onSelectCircle={openPeopleCircle}
                  onViewCircles={() => openPeopleCircle("three")}
                />

                <section className="grid grid-cols-3 gap-2">
                  <HomeActionPill icon="add" onClick={() => openForm("person")}>Add Person</HomeActionPill>
                  <HomeActionPill icon="log" onClick={() => openForm("meeting")}>Log Meeting</HomeActionPill>
                  <HomeActionPill icon="calendar" onClick={() => openScheduleMeeting()}>Schedule</HomeActionPill>
                </section>

                <TodayFocusCard
                  items={todayFocusItems}
                  onEditReminder={openReminderEdit}
                  onLogMeetingForPerson={openMeetingForPerson}
                  onOpenMeeting={openMeetingDetail}
                  onOpenPerson={openPersonDetail}
                  onScheduleForPerson={openScheduleMeeting}
                />

                <section>
                  <ThisWeekHeader label={thisWeekStats.label} />
                  <div className="grid grid-cols-3 gap-2">
                    <WeekStatTile icon="log" label="Meetings" value={thisWeekStats.meetings} />
                    <WeekStatTile icon="prayer" label="Prayed" value={thisWeekStats.prayed} />
                    <WeekStatTile icon="people" label="New People" value={thisWeekStats.newPeople} />
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
                        {meetingDisplayTitle(latestMeeting, people)} · {meetingActivityTitle(latestMeeting)} · {formatRelativeDate(latestMeeting.date)}
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
              <div className="space-y-4">
                <TabPageHeader title="People" />
                <TabHero
                  icon={<Users className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                  onScriptureClick={openScriptureQuickView}
                  scripture={scriptureReferences.luke1610}
                  subtitle="Steward the field God has entrusted to your care."
                  title="Faithful with a few."
                />
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-12 min-w-0 flex-[1.35] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.24)] transition-colors hover:brightness-[0.98] max-[350px]:flex-[1.2] max-[350px]:px-3 max-[350px]:text-[12px]"
                    onClick={() => openForm("person")}
                    type="button"
                  >
                    + Add Person
                  </button>
                  <button
                    aria-expanded={isPeopleSearchOpen}
                    aria-label="Search people"
                    className={`inline-flex h-12 min-w-0 flex-[0.9] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-bold text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.08)] transition-colors max-[350px]:flex-[0.88] max-[350px]:gap-1 max-[350px]:px-2 max-[350px]:text-[12px] ${
                      isPeopleSearchOpen
                        ? "border-[#2563EB] bg-[#EBF2FF]"
                        : "border-[#D7E3F8] bg-white hover:border-[#BFDBFE] hover:bg-[#EFF6FF]"
                    }`}
                    onClick={() => {
                      setIsPeopleSearchOpen((current) => {
                        if (current) {
                          setPeopleQuery("");
                        }

                        return !current;
                      });
                    }}
                    title="Search people"
                    type="button"
                  >
                    <Icon name="search" size={18} />
                    <span>Search</span>
                  </button>
                  <button
                    aria-label="Import CSV"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D7E3F8] bg-white text-[#2563EB] shadow-[0_6px_14px_rgba(15,23,42,0.06)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EFF6FF] max-[350px]:w-10"
                    onClick={() => setIsPeopleImportOpen(true)}
                    title="Import CSV"
                    type="button"
                  >
                    <Icon name="add" size={14} />
                  </button>
                </div>
                {isPeopleSearchOpen ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                      <Icon name="search" size={15} />
                    </span>
                    <input
                      autoFocus
                      className="min-h-11 w-full rounded-full border border-[#BFDBFE] bg-white pl-10 pr-4 text-sm text-[#0F172A] shadow-[0_8px_18px_rgba(37,99,235,0.06)] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                      onChange={(event) => setPeopleQuery(event.target.value)}
                      placeholder="Search by name, phone, or relationship"
                      type="search"
                      value={peopleQuery}
                    />
                  </div>
                ) : null}
                <div>
                  <PeopleCircleTabs onChange={setPeopleCircleView} value={peopleCircleView} />
                </div>
                {peopleImportMessage ? (
                  <p className={`mt-3 rounded-2xl border p-3 text-sm ${
                    peopleImportMessage.tone === "success"
                      ? "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}>
                    {peopleImportMessage.text}
                  </p>
                ) : null}
                <div className="mt-3">
                  {visibleCirclePeople.length ? (
                    <CircleLayerList
                      empty={peopleCircleContent.empty}
                      items={visibleCirclePeople}
                      latestMeetingDateByPersonId={latestMeetingDateByPersonId}
                      onLogMeeting={openMeetingForPerson}
                      onOpenPerson={openPersonDetail}
                      startIndex={peopleCircleContent.startIndex}
                    />
                  ) : people.length ? (
                    <EmptyState text={peopleQuery.trim() ? `Try a different search inside ${circleDisplayName(peopleCircleView)}.` : peopleCircleContent.empty} title={peopleQuery.trim() ? "No matching people." : `No people in ${circleDisplayName(peopleCircleView)}.`} />
                  ) : (
                    <EmptyState action={<CompactButton icon="add" onClick={() => openForm("person")}>Add Person</CompactButton>} text="Start by adding someone you are walking with." title="No people added yet." />
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "meetings" ? (
              <div className="space-y-4">
                <TabPageHeader title="Meetings" />
                <TabHero
                  icon={<MessageCircle className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                  onScriptureClick={openScriptureQuickView}
                  scripture={scriptureReferences.hebrews1025}
                  subtitle="Every conversation is an opportunity to motivate, encourage, and challenge."
                  title="Faithful at the table."
                />
                <div>
                  <MeetingActionRow onLogMeeting={() => openForm("meeting")} onScheduleMeeting={() => openScheduleMeeting()} />
                </div>
                <SegmentedTabs onChange={setMeetingsView} options={meetingsViewTabs} value={meetingsView} />
                <div>
                  {meetingsView === "agenda" ? (
                    data.meetings.length ? (
                      <div className="grid gap-3">{data.meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onClick={() => openMeetingDetail(meeting.id)} people={people} />)}</div>
                    ) : (
                      <EmptyState action={<CompactButton icon="log" onClick={() => openForm("meeting")}>Log Meeting</CompactButton>} text="Capture the next conversation, table, call, or prayer moment." title="No meetings logged yet." />
                    )
                  ) : (
                    <MeetingCalendarView
                      items={meetingCalendarItems}
                      month={meetingsCalendarMonth}
                      onChangeMonth={changeMeetingsCalendarMonth}
                      onOpenMeeting={openMeetingDetail}
                      onOpenReminder={openReminderEdit}
                      onScheduleMeeting={() => openScheduleMeeting()}
                      onSelectDate={selectMeetingsCalendarDate}
                      onToday={jumpMeetingsCalendarToToday}
                      selectedDateKey={selectedMeetingsCalendarDate}
                    />
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "fruit" ? (
              <div className="space-y-5">
                <TabPageHeader title="Fruit" />
                <TabHero
                  icon={<Icon name="fruit" size={20} />}
                  onScriptureClick={openScriptureQuickView}
                  scripture={scriptureReferences.matthew716}
                  title="“By their fruit you will recognize them.”"
                />
                <FruitTreeCard storyCount={fruitDashboardStories.length} />

                <section>
                  <SectionHeading title="Kingdom Fruit" />
                  <div className="grid grid-cols-2 gap-2">
                    {fruitMetrics.map((metric) => (
                      <KingdomFruitMetricTile key={metric.label} label={metric.label} value={metric.value} />
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "more" ? (
              <div className="space-y-5">
                <TabPageHeader title="Library" />
                <TabHero
                  icon={<BookOpen className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                  onScriptureClick={openScriptureQuickView}
                  scripture={scriptureReferences.secondPeter318}
                  subtitle="Resources for conversations, follow up, and discipleship."
                  title="Grow in truth."
                />
                <div className="space-y-6">
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

                  <LibrarySection
                    subtext="To send after a conversation."
                    title="Follow Up Resources"
                  >
                    <FollowUpGuideList />
                  </LibrarySection>
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
            circleGroups={circlePeopleByLayer}
            latestMeetingDateByPersonId={latestMeetingDateByPersonId}
            onBack={() => setIsCirclesOpen(false)}
            onLogMeeting={() => openForm("meeting")}
            onLogMeetingForPerson={openMeetingForPerson}
            onOpenPerson={openPersonDetail}
            onSearch={() => {
              setIsCirclesOpen(false);
              setActiveTab("people");
            }}
          />
        ) : null}

        {circleSheetView ? (
          <CircleLayerSheet
            activeCircle={circleSheetView}
            circleGroups={circlePeopleByLayer}
            latestMeetingDateByPersonId={latestMeetingDateByPersonId}
            onClose={() => setCircleSheetView(null)}
            onLogMeeting={() => openForm("meeting")}
            onLogMeetingForPerson={openMeetingForPerson}
            onOpenPerson={openPersonDetail}
          />
        ) : null}

        {selectedPerson ? (
            <PersonDetailOverlay
              calendarConnection={data.calendarConnection}
              fruitEvents={data.fruitEvents}
              fruitItems={data.fruit}
              index={Math.max(0, people.findIndex((person) => person.id === selectedPerson.id))}
              isCalendarDisconnecting={isCalendarDisconnecting}
              leaderReflections={data.leaderReflections}
              meetings={data.meetings}
              reminders={data.reminders}
            onBack={() => setSelectedPersonId(null)}
            onAddReminder={() => openReminderForm(selectedPerson.id)}
            onDisconnectCalendar={handleDisconnectCalendar}
            onEdit={() => openPersonEdit(selectedPerson)}
            onEditReminder={openReminderEdit}
            onLogMeeting={() => openMeetingForPerson(selectedPerson.id)}
            onOpenMeeting={openMeetingDetail}
            onScheduleMeeting={() => openScheduleMeeting(selectedPerson.id)}
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
            hasReviewRequestLink={Boolean(existingReviewUrl(selectedMeetingWithReview))}
            hasTestimonyRequestLink={Boolean(existingTestimonyUrl(selectedMeetingWithReview))}
            isSendingReview={reviewLinkMeetingId === selectedMeetingWithReview.id}
            isSendingTestimony={testimonyLinkMeetingId === selectedMeetingWithReview.id}
            leaderReflections={data.leaderReflections}
            meeting={selectedMeetingWithReview}
            onBack={() => {
              setPostMeetingFollowUpId(null);
              setSelectedMeetingId(null);
            }}
            onDone={() => {
              setPostMeetingFollowUpId(null);
              setSelectedMeetingId(null);
              setActiveTab("meetings");
            }}
            onEdit={() => openMeetingEdit(selectedMeetingWithReview)}
            onEditNotes={() => openMeetingNotesEdit(selectedMeetingWithReview)}
            onPrepareQuickReview={() => setPendingMeetingSendAction({ meeting: selectedMeetingWithReview, type: "quick_review" })}
            onPrepareTestimonyRequest={() => {
              if (canSendMeetingTestimonyRequest(selectedMeetingWithReview, people)) {
                setPendingMeetingSendAction({ meeting: selectedMeetingWithReview, type: "testimony_request" });
              }
            }}
            onScheduleNextMeeting={() => openScheduleMeeting(selectedMeetingWithReview.fieldPersonIds)}
            onSendReview={() => handleSendReview(selectedMeetingWithReview)}
            onSendTestimony={() => handleShareTestimony(selectedMeetingWithReview)}
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
              openPeopleCircle("three");
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

        {selectedScripture ? (
          <ScriptureQuickView onClose={() => setSelectedScripture(null)} state={selectedScripture} />
        ) : null}

        {pendingMeetingSendAction ? (
          <MeetingSendConfirmationSheet
            action={pendingMeetingSendAction}
            isSending={
              pendingMeetingSendAction.type === "quick_review"
                ? reviewLinkMeetingId === pendingMeetingSendAction.meeting.id
                : testimonyLinkMeetingId === pendingMeetingSendAction.meeting.id
            }
            onClose={() => setPendingMeetingSendAction(null)}
            onConfirm={handleConfirmMeetingSendAction}
            people={people}
          />
        ) : null}

        <BottomNavigation activeTab={activeTab} onSelect={selectTab} />
      </div>

      {formMode === "person" ? (
        <Sheet onClose={closeForm} showEyebrow={false} title="Add Person">
          <PersonFormContent
            buttonText="Add Person"
            detailsOpen={isAdditionalPersonInfoOpen}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onRelationshipChange={setSelectedRelationshipModel}
            onScoreChange={setSelectedRelationshipScore}
            onSubmit={handlePersonSubmit}
            onToggleDetails={() => setIsAdditionalPersonInfoOpen((current) => !current)}
            relationshipModel={selectedRelationshipModel}
            scoreValue={selectedRelationshipScore}
            submittingText="Saving..."
          />
        </Sheet>
      ) : null}

      {formMode === "editPerson" && selectedPerson ? (
        <Sheet onClose={closeForm} showEyebrow={false} title="Edit Person">
          <PersonFormContent
            additionalDefaults={selectedPersonDefaults}
            buttonText="Save Person"
            detailsOpen={isAdditionalPersonInfoOpen}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            nameDefault={selectedPerson.name}
            onDelete={handleDeletePerson}
            onRelationshipChange={setSelectedRelationshipModel}
            onScoreChange={setSelectedRelationshipScore}
            onSubmit={handleEditPersonSubmit}
            onToggleDetails={() => setIsAdditionalPersonInfoOpen((current) => !current)}
            phoneDefault={selectedPerson.phone}
            relationshipModel={selectedRelationshipModel}
            scoreValue={selectedRelationshipScore}
            showDetailsToggle={false}
            submittingText="Saving..."
          />
        </Sheet>
      ) : null}

      {formMode === "meeting" ? (
        <Sheet onClose={closeForm} title="Log Meeting">
          <MeetingFormContent
            allPeople={people}
            allowConversationFlows={data.workspace.isUsamWorkspace}
            buttonText="Log Meeting"
            conversationResponses={conversationResponses}
            dateDefault={todayDateValue()}
            errorMessage={errorMessage}
            includeReflectionFields
            isCreatingPerson={isCreatingMeetingPerson}
            isSubmitting={isSubmitting}
            meetingPeopleOptions={meetingPeopleOptions}
            meetingPeopleQuery={meetingPeopleQuery}
            onContextChange={setSelectedMeetingContext}
            onCreatePerson={handleCreateMeetingPerson}
            onConversationFlowChange={handleConversationFlowChange}
            onConversationResponse={handleConversationResponse}
            onPeopleQueryChange={setMeetingPeopleQuery}
            onSubmit={handleMeetingSubmit}
            onToggleFollowUpAction={handleConversationFollowUpAction}
            onToggleOutcomeTag={toggleOutcomeTag}
            onTogglePerson={toggleMeetingPersonId}
            recommendedResources={draftRecommendedResources}
            selectedConversationFlow={selectedConversationFlow}
            selectedMeetingContext={selectedMeetingContext}
            selectedOutcomeTags={selectedOutcomeTags}
            selectedPersonIds={selectedMeetingPersonIds}
            showDurationField
            submittingText="Saving..."
          />
        </Sheet>
      ) : null}

      {formMode === "scheduleMeeting" ? (
        <Sheet onClose={closeForm} showEyebrow={false} title="Schedule Meeting">
          <ScheduleMeetingForm
            allPeople={people}
            calendarConnection={data.calendarConnection}
            errorMessage={errorMessage}
            isCalendarDisconnecting={isCalendarDisconnecting}
            isCreatingPerson={isCreatingMeetingPerson}
            isSubmitting={isSubmitting}
            meetingPeopleOptions={meetingPeopleOptions}
            meetingPeopleQuery={meetingPeopleQuery}
            onContextChange={setSelectedMeetingContext}
            onCreatePerson={handleCreateMeetingPerson}
            onDisconnectCalendar={handleDisconnectCalendar}
            onPeopleQueryChange={setMeetingPeopleQuery}
            onStartLogMeeting={openScheduledDraftAsMeeting}
            onSubmit={handleScheduleMeetingSubmit}
            onTogglePerson={toggleMeetingPersonId}
            selectedMeetingContext={selectedMeetingContext}
            selectedPersonIds={selectedMeetingPersonIds}
            workspaceId={data.workspace.id}
          />
        </Sheet>
      ) : null}

      {formMode === "reminder" ? (
        <Sheet onClose={closeForm} showEyebrow={false} title={selectedReminder ? "Edit Reminder" : "Add Reminder"}>
          <ReminderFormContent
            calendarConnection={data.calendarConnection}
            defaultPersonId={selectedMeetingPersonIds[0] ?? selectedPerson?.id ?? null}
            errorMessage={errorMessage}
            householdPerson={selectedReminder ? people.find((person) => person.id === selectedReminder.personId) ?? null : selectedPerson}
            isCalendarDisconnecting={isCalendarDisconnecting}
            isSubmitting={isSubmitting}
            onDelete={selectedReminder ? handleDeleteReminder : undefined}
            onDisconnectCalendar={handleDisconnectCalendar}
            onSubmit={handleReminderSubmit}
            people={people}
            reminder={selectedReminder}
            workspaceId={data.workspace.id}
          />
        </Sheet>
      ) : null}

      {formMode === "editMeeting" && selectedMeeting ? (
        <Sheet onClose={closeForm} title="Edit Meeting">
          <div className="space-y-3">
            <MeetingFormContent
              allPeople={people}
              allowConversationFlows={data.workspace.isUsamWorkspace}
              buttonText="Save Meeting"
              conversationResponses={conversationResponses}
              dateDefault={selectedMeeting.date ?? todayDateValue()}
              errorMessage={errorMessage}
              isCreatingPerson={isCreatingMeetingPerson}
              isSubmitting={isSubmitting}
              meetingPeopleOptions={meetingPeopleOptions}
              meetingPeopleQuery={meetingPeopleQuery}
              notesDefault={selectedMeeting.notes}
              onContextChange={setSelectedMeetingContext}
              onCreatePerson={handleCreateMeetingPerson}
              onConversationFlowChange={handleConversationFlowChange}
              onConversationResponse={handleConversationResponse}
              onPeopleQueryChange={setMeetingPeopleQuery}
              onSubmit={handleEditMeetingSubmit}
              onToggleFollowUpAction={handleConversationFollowUpAction}
              onTogglePerson={toggleMeetingPersonId}
              recommendedResources={draftRecommendedResources}
              selectedConversationFlow={selectedConversationFlow}
              selectedMeetingContext={selectedMeetingContext}
              selectedPersonIds={selectedMeetingPersonIds}
              submittingText="Saving..."
            />
            <button
              className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleDeleteMeeting}
              type="button"
            >
              Delete Meeting
            </button>
          </div>
        </Sheet>
      ) : null}

      {formMode === "meetingNotes" && selectedMeeting ? (
        <MeetingNotesEditorSheet
          defaultValue={selectedMeeting.notes}
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onClose={closeForm}
          onSubmit={handleMeetingNotesSubmit}
        />
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
