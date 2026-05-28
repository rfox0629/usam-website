import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Flame,
  Heart,
  Home,
  Import,
  Mail,
  Phone,
  Plus,
  Search,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminBadge, AdminEmptyState, adminFont } from "../../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadWorkspacePreviewData } from "@/src/lib/admin/organization-data";
import type { WorkspacePreviewData } from "@/src/lib/admin/organization-shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace Preview | National Command Center",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatLongDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
    : name.slice(0, 2);

  return initials.toUpperCase() || "W";
}

type WorkspacePreviewSection = "fruit" | "home" | "meetings" | "more" | "people";

function normalizeSection(value: string | undefined): WorkspacePreviewSection {
  if (value === "field" || value === "people") {
    return "people";
  }

  if (value === "meetings") {
    return "meetings";
  }

  if (value === "fruit") {
    return "fruit";
  }

  if (value === "prayer" || value === "more") {
    return "more";
  }

  return "home";
}

function formatLabel(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatConversationFlow(value: string | null) {
  if (!value || value === "none") {
    return "No flow";
  }

  return value === "kitchen_table_gospel" ? "Kitchen Table Gospel" : formatLabel(value);
}

function participantLine(names: string[]) {
  if (names.length === 0) {
    return "No participants";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} + ${names[1]}`;
  }

  return `${names[0]} + ${names.length - 1} others`;
}

function searchText(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

function buildSectionHref(
  basePath: string,
  section: WorkspacePreviewSection,
  params: Record<string, string | null | undefined> = {},
  hash = "",
) {
  const searchParams = new URLSearchParams({ viewAs: "workspace_user" });

  if (section !== "home") {
    searchParams.set("section", section);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  return `${basePath}?${searchParams.toString()}${hash}`;
}

function SignalCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]" style={{ fontFamily: adminFont.rajdhani }}>
          {label}
        </p>
        <p className="text-2xl font-bold leading-none text-[#2563EB]">{value}</p>
      </div>
      <p className="mt-1 text-sm text-[#64748B]">{detail}</p>
    </div>
  );
}

function MissionFocusRow({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
      <div>
        <p className="text-sm font-bold text-[#0F172A]">{label}</p>
        <p className="mt-0.5 text-xs text-[#64748B]">{detail}</p>
      </div>
      <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[#EBF2FF] px-3 text-sm font-bold text-[#2563EB]">
        {value}
      </span>
    </div>
  );
}

function MissionFocusCard({
  my3,
  my12,
  my70,
}: {
  my3: number;
  my12: number;
  my70: number;
}) {
  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
            Mission Focus
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
            Your circles
          </h2>
        </div>
        <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB]">
          User view
        </span>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[210px_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto flex h-[210px] w-[210px] items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#BFDBFE] bg-[#EFF6FF]" />
          <div className="absolute inset-[34px] rounded-full border border-[#93C5FD] bg-[#DBEAFE]" />
          <div className="absolute inset-[70px] rounded-full border border-[#60A5FA] bg-[#2563EB] shadow-[0_18px_42px_rgba(37,99,235,0.28)]" />
          <span className="absolute top-5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">My 70</span>
          <span className="absolute right-8 top-[86px] rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">My 12</span>
          <span className="relative z-10 grid justify-items-center leading-none text-white">
            <span className="text-4xl font-bold">{my3}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]">My 3</span>
          </span>
        </div>

        <div className="space-y-2">
          <MissionFocusRow detail="Top priority follow ups" label="My 3" value={my3} />
          <MissionFocusRow detail="Active relationships" label="My 12" value={my12} />
          <MissionFocusRow detail="Total field contacts" label="My 70" value={my70} />
        </div>
      </div>
    </section>
  );
}

function QuickAction({
  disabled = false,
  href,
  icon: Icon,
  label,
  meta,
}: {
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  meta: string;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#0F172A]">{label}</span>
        <span className="mt-0.5 block text-xs text-[#64748B]">{disabled ? "Coming soon" : meta}</span>
      </span>
    </>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex min-h-[78px] items-center gap-3 rounded-[22px] border border-[#E2E8F0] bg-white/65 px-3 py-3 opacity-70"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      className="flex min-h-[78px] items-center gap-3 rounded-[22px] border border-[#E2E8F0] bg-white px-3 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#2563EB]"
      href={href}
    >
      {content}
    </Link>
  );
}

function SecondaryTool({
  disabled = false,
  href,
  icon: Icon,
  label,
}: {
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  const className = "flex items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB]";
  const content = (
    <>
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
        <span>{label}</span>
      </span>
      <span className="text-xs text-[#94A3B8]">{disabled ? "Soon" : "Open"}</span>
    </>
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} opacity-65`}>
        {content}
      </span>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}

function BottomNavItem({
  active = false,
  href,
  icon: Icon,
  label,
}: {
  active?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link className={`grid justify-items-center gap-1 text-[10px] font-semibold ${active ? "text-[#2563EB]" : "text-[#94A3B8]"}`} href={href}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

function SectionTabs({
  activeSection,
  basePath,
}: {
  activeSection: WorkspacePreviewSection;
  basePath: string;
}) {
  const tabs: Array<{ icon: LucideIcon; label: string; section: WorkspacePreviewSection }> = [
    { icon: Home, label: "Home", section: "home" },
    { icon: Users, label: "People", section: "people" },
    { icon: CalendarDays, label: "Meetings", section: "meetings" },
    { icon: Flame, label: "Fruit", section: "fruit" },
    { icon: BookOpen, label: "More", section: "more" },
  ];

  return (
    <nav className="mb-5 hidden grid-cols-5 gap-1.5 rounded-[22px] border border-[#E2E8F0] bg-white/75 p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] backdrop-blur lg:grid" aria-label="Workspace sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeSection === tab.section;

        return (
          <Link
            className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition sm:gap-2 sm:text-sm ${
              active ? "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]" : "text-[#64748B] hover:bg-[#EBF2FF] hover:text-[#2563EB]"
            }`}
            href={buildSectionHref(basePath, tab.section)}
            key={tab.section}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function FieldPersonCard({
  href,
  person,
  selected,
}: {
  href: string;
  person: WorkspacePreviewData["field"]["people"][number];
  selected: boolean;
}) {
  return (
    <Link
      className={`group block rounded-2xl border p-3 transition hover:border-[#2563EB] ${
        selected ? "border-[#2563EB] bg-[#EBF2FF]" : "border-[#E2E8F0] bg-[#F8FAFC]"
      }`}
      href={href}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-sm font-bold text-[#2563EB]">
          {initialsFor(person.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#0F172A]">{person.name}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
              {formatLabel(person.relationshipType)}
            </span>
            <span className="rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
              {formatLabel(person.status)}
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition group-hover:text-[#2563EB]" aria-hidden="true" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
        <span>{person.meetingCount} meetings</span>
        <span>Last {formatDate(person.lastActivityAt)}</span>
      </div>
    </Link>
  );
}

function FieldMeetingCard({
  meeting,
}: {
  meeting: WorkspacePreviewData["field"]["meetings"][number];
}) {
  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[#0F172A]">{participantLine(meeting.participantNames)}</h3>
          <p className="mt-1 text-xs text-[#64748B]">
            {formatLabel(meeting.type)} • {formatLongDate(meeting.date)}
          </p>
        </div>
        <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[11px] font-semibold text-[#2563EB]">
          {formatConversationFlow(meeting.conversationFlow)}
        </span>
      </div>
      {meeting.notes ? (
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#64748B]">{meeting.notes}</p>
      ) : null}
      {meeting.movementStep || meeting.followUpNeeded ? (
        <p className="mt-3 rounded-xl border border-[#BFDBFE] bg-white px-3 py-2 text-xs text-[#475569]">
          {meeting.movementStep ? `Next: ${meeting.movementStep}` : meeting.followUpNeeded}
        </p>
      ) : null}
    </article>
  );
}

function PersonQuickView({
  dosHref,
  meetings,
  person,
  prayerHref,
  workspaceHref,
}: {
  dosHref: string;
  meetings: WorkspacePreviewData["field"]["meetings"];
  person: WorkspacePreviewData["field"]["people"][number] | undefined;
  prayerHref: string;
  workspaceHref: string;
}) {
  if (!person) {
    return (
      <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
          Person
        </p>
        <p className="mt-3 text-sm text-[#64748B]">Select a person to view details.</p>
      </section>
    );
  }

  return (
    <section className="scroll-mt-24 rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5" id="person-detail">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-base font-bold text-[#2563EB]">
          {initialsFor(person.name)}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
            Person
          </p>
          <h2 className="mt-1 break-words text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
            {person.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
              {formatLabel(person.relationshipType)}
            </span>
            <span className="rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
              {formatLabel(person.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-[#0F172A]">
        {person.phone ? (
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            {person.phone}
          </p>
        ) : null}
        {person.email ? (
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            {person.email}
          </p>
        ) : null}
        {person.church ? (
          <p className="flex items-center gap-2">
            <Home className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
            {person.church}
          </p>
        ) : null}
      </div>

      {person.notes ? (
        <p className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm leading-5 text-[#64748B]">{person.notes}</p>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-semibold text-white" href={`${workspaceHref}&tab=meetings`}>
          Log Meeting
        </Link>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A]" href={prayerHref}>
          Prayer Request
        </Link>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A]" href={dosHref} target="_blank" rel="noreferrer">
          Open in DOS
        </Link>
      </div>

      <div className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
          Recent Meetings
        </p>
        <div className="mt-3 space-y-2">
          {meetings.length > 0 ? meetings.slice(0, 3).map((meeting) => (
            <FieldMeetingCard key={meeting.id} meeting={meeting} />
          )) : (
            <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">No meetings yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function PeopleSection({
  basePath,
  dosHref,
  filteredPeople,
  preview,
  searchQuery,
  selectedPerson,
  selectedPersonMeetings,
  statusFilter,
  workspaceHref,
}: {
  basePath: string;
  dosHref: string;
  filteredPeople: WorkspacePreviewData["field"]["people"];
  preview: WorkspacePreviewData;
  searchQuery: string;
  selectedPerson: WorkspacePreviewData["field"]["people"][number] | undefined;
  selectedPersonMeetings: WorkspacePreviewData["field"]["meetings"];
  statusFilter: string;
  workspaceHref: string;
}) {
  const statusOptions = ["", "new", "active", "follow_up", "discipleship"];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
              People
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
              People
            </h2>
          </div>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-semibold text-white" href={`${workspaceHref}&tab=people`}>
            Add Person
          </Link>
        </div>

        <form action={basePath} className="mt-5" method="get">
          <input name="viewAs" type="hidden" value="workspace_user" />
          <input name="section" type="hidden" value="people" />
          {statusFilter ? <input name="status" type="hidden" value={statusFilter} /> : null}
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <input
              className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:bg-white"
              defaultValue={searchQuery}
              name="q"
              placeholder="Search people"
              type="search"
            />
          </label>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const active = statusFilter === status;

            return (
              <Link
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-[#2563EB] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
                }`}
                href={buildSectionHref(basePath, "people", { q: searchQuery, status })}
                key={status || "all"}
              >
                {status ? formatLabel(status) : "All"}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 space-y-2">
          {filteredPeople.length > 0 ? filteredPeople.map((person) => (
            <FieldPersonCard
              href={buildSectionHref(basePath, "people", { person: person.id, q: searchQuery, status: statusFilter }, "#person-detail")}
              key={person.id}
              person={person}
              selected={selectedPerson?.id === person.id}
            />
          )) : (
            <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
              {preview.field.people.length === 0
                ? "Your field is empty. Add the first person you're walking with."
                : "No people match this search."}
            </p>
          )}
        </div>
      </section>

      <PersonQuickView
        dosHref={dosHref}
        meetings={selectedPersonMeetings}
        person={selectedPerson}
        prayerHref="/admin/prayer-team"
        workspaceHref={workspaceHref}
      />
    </div>
  );
}

function MeetingsSection({
  preview,
  workspaceHref,
}: {
  preview: WorkspacePreviewData;
  workspaceHref: string;
}) {
  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
            Meetings
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
            Recent meetings
          </h2>
        </div>
        <Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.18)] transition hover:bg-[#1D4ED8]" href={`${workspaceHref}&tab=meetings`}>
          Log Meeting
        </Link>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {preview.field.meetings.length > 0 ? preview.field.meetings.slice(0, 12).map((meeting) => (
          <FieldMeetingCard key={meeting.id} meeting={meeting} />
        )) : (
          <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B] md:col-span-2">
            Log a meeting to begin building this workspace history.
          </p>
        )}
      </div>
    </section>
  );
}

function FruitSection({
  preview,
  workspaceHref,
}: {
  preview: WorkspacePreviewData;
  workspaceHref: string;
}) {
  const fruitActivity = preview.activity.filter((item) => item.label === "Fruit" || item.label === "Review");

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
            Fruit
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
            Reviews and outcomes
          </h2>
        </div>
        <Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.18)] transition hover:bg-[#1D4ED8]" href={`${workspaceHref}&tab=fruit`}>
          Open Fruit
        </Link>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <SignalCard detail="Private and reviewed outcomes" label="Fruit items" value={preview.counts.fruit} />
        <SignalCard detail="Reviews waiting in the feed" label="Recent reviews" value={fruitActivity.filter((item) => item.label === "Review").length} />
        <SignalCard detail="Visible when publishing is enabled" label="Publishing" value={preview.features.publishingEnabled ? 1 : 0} />
      </div>
      <div className="mt-5 space-y-2">
        {fruitActivity.length > 0 ? fruitActivity.map((item) => (
          <Link
            className="group flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition hover:border-[#2563EB] hover:bg-white"
            href={item.href}
            key={item.id}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#0F172A]">{item.title}</span>
              <span className="mt-1 block text-xs text-[#94A3B8]">{item.label} · {formatDate(item.timestamp)}</span>
              <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#64748B]">{item.detail}</span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8] transition group-hover:text-[#2563EB]" aria-hidden="true" />
          </Link>
        )) : (
          <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
            Fruit will appear here as reviews are submitted and outcomes are recorded.
          </p>
        )}
      </div>
    </section>
  );
}

function availabilityToneClass(tone: "admin" | "off" | "ready" | "soon") {
  if (tone === "ready") {
    return "bg-[#EBF2FF] text-[#2563EB]";
  }

  if (tone === "admin") {
    return "bg-[#F1F5F9] text-[#475569]";
  }

  if (tone === "off") {
    return "bg-[#F1F5F9] text-[#64748B]";
  }

  return "bg-[#F8FAFC] text-[#64748B]";
}

function MoreToolRow({
  description,
  disabled = false,
  href,
  icon: Icon,
  label,
  status,
  tone = "ready",
}: {
  description: string;
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  status: string;
  tone?: "admin" | "off" | "ready" | "soon";
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#0F172A]">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[#64748B]">{description}</span>
      </span>
      <span className={`max-w-[9.5rem] shrink-0 rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-tight ${availabilityToneClass(tone)}`}>
        {status}
      </span>
    </>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 opacity-80"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      className="group flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition hover:border-[#2563EB] hover:bg-white"
      href={href}
    >
      {content}
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-[#94A3B8] transition group-hover:text-[#2563EB] sm:block" aria-hidden="true" />
    </Link>
  );
}

function SettingsRow({
  label,
  value,
  active,
}: {
  active?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] py-3 last:border-b-0">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${active === undefined ? "bg-[#F1F5F9] text-[#475569]" : active ? "bg-[#EBF2FF] text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
        {value}
      </span>
    </div>
  );
}

function TeamMemberPreview({
  member,
}: {
  member: WorkspacePreviewData["members"][number];
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-sm font-bold text-[#2563EB]">
        {initialsFor(member.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[#0F172A]">{member.name}</span>
        <span className="mt-0.5 block truncate text-xs text-[#64748B]">{member.role ?? "Team member"}</span>
      </span>
    </div>
  );
}

function MoreSection({
  preview,
  publicProfileHref,
  workspaceHref,
}: {
  preview: WorkspacePreviewData;
  publicProfileHref: string;
  workspaceHref: string;
}) {
  const tools = [
    ...(preview.features.publicProfileEnabled
      ? [{
        description: "Visible public page for partners and visitors.",
        href: publicProfileHref,
        icon: Home,
        label: "Public Profile",
        status: "Open",
        tone: "ready" as const,
      }]
      : []),
    {
      description: "Requests and prayer partners.",
      href: "/admin/prayer-team",
      icon: Heart,
      label: "Prayer Team",
      status: preview.prayer.teamEnabled ? "Open" : "Not enabled",
      tone: preview.prayer.teamEnabled ? "ready" as const : "off" as const,
    },
    {
      description: "Teaching frameworks and current focus.",
      href: `${workspaceHref}&tab=library`,
      icon: BookOpen,
      label: "Resources / Library",
      status: "Opens in Command Center",
      tone: "admin" as const,
    },
    {
      description: "Bring contacts into the field list.",
      href: `${workspaceHref}&tab=people`,
      icon: Import,
      label: "Imports / CSV",
      status: "Opens in Command Center",
      tone: "admin" as const,
    },
    {
      description: "Review testimonies and fruit drafts.",
      href: `${workspaceHref}&tab=fruit`,
      icon: Heart,
      label: "Reviews / Fruit",
      status: "Opens in Command Center",
      tone: "admin" as const,
    },
    {
      description: "Profile, publishing, and workspace controls.",
      href: `${workspaceHref}&tab=features`,
      icon: Settings,
      label: "Workspace Settings",
      status: "Opens in Command Center",
      tone: "admin" as const,
    },
    {
      description: "Missionary, family, and support team roster.",
      href: `${workspaceHref}&tab=team`,
      icon: Users,
      label: "Team Members",
      status: "Opens in Command Center",
      tone: "admin" as const,
    },
    ...(preview.features.supportEnabled
      ? [{
        description: "Giving and support settings.",
        href: `${workspaceHref}&tab=support`,
        icon: Heart,
        label: "Support / Giving",
        status: "Opens in Command Center",
        tone: "admin" as const,
      }]
      : []),
    {
      description: "Return to the operational admin workspace.",
      href: workspaceHref,
      icon: ArrowLeft,
      label: "Command Center",
      status: "Admin only",
      tone: "admin" as const,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
          More
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
          Workspace tools
        </h2>
        <div className="mt-5 space-y-2">
          {tools.map((tool) => (
            <MoreToolRow
              description={tool.description}
              href={tool.href}
              icon={tool.icon}
              key={tool.label}
              label={tool.label}
              status={tool.status}
              tone={tool.tone}
            />
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
            Settings
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
            Workspace status
          </h2>
          <div className="mt-4">
            <SettingsRow label="Workspace" value={preview.workspace.displayName} />
            <SettingsRow label="Organization" value={preview.organizationName} />
            <SettingsRow active={preview.features.publicProfileEnabled} label="Public profile" value={preview.features.publicProfileEnabled ? "Visible" : "Hidden"} />
            <SettingsRow active={preview.features.dosEnabled} label="DOS" value={preview.features.dosEnabled ? "Enabled" : "Off"} />
            <SettingsRow active={preview.features.prayerEnabled} label="Prayer" value={preview.features.prayerEnabled ? "Enabled" : "Off"} />
            <SettingsRow active={preview.features.publishingEnabled} label="Publishing" value={preview.features.publishingEnabled ? "Enabled" : "Off"} />
            <SettingsRow active={preview.features.supportEnabled} label="Support" value={preview.features.supportEnabled ? "Enabled" : "Hidden"} />
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
                Team
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
                Team members
              </h2>
            </div>
            <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB]">
              {preview.members.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {preview.members.length > 0 ? preview.members.map((member) => (
              <TeamMemberPreview key={member.id} member={member} />
            )) : (
              <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                Team members will appear here when added.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}


export default async function WorkspacePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ person?: string; q?: string; section?: string; status?: string; viewAs?: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const query = await searchParams;
  const { error, preview } = await loadWorkspacePreviewData(id);

  if (!preview && !error) {
    notFound();
  }

  if (error || !preview) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-6 text-stone-100">
        <section className="mx-auto max-w-2xl">
          <AdminEmptyState
            description={error ?? "Workspace not found."}
            title="Preview unavailable"
          />
        </section>
      </main>
    );
  }

  const workspaceHref = `/admin/missionary-profiles?profile=${preview.workspace.slug}`;
  const dosHref = `/dos/app?workspace=${encodeURIComponent(preview.workspace.slug)}`;
  const publicProfileHref = `/missionaries/${preview.workspace.slug}`;
  const basePath = `/admin/workspaces/${preview.workspace.id}/preview`;
  const activeSection = normalizeSection(query.section);
  const searchQuery = query.q?.trim() ?? "";
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const statusFilter = query.status?.trim() ?? "";
  const filteredPeople = preview.field.people.filter((person) => {
    const matchesSearch = !normalizedSearchQuery || [
      person.name,
      person.phone,
      person.email,
      person.church,
      person.relationshipType,
      person.status,
    ].some((value) => searchText(value).includes(normalizedSearchQuery));
    const matchesStatus = !statusFilter || person.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const selectedPerson = preview.field.people.find((person) => person.id === query.person)
    ?? filteredPeople[0]
    ?? preview.field.people[0];
  const selectedPersonMeetings = selectedPerson
    ? preview.field.meetings.filter((meeting) => (
      meeting.personIds.includes(selectedPerson.id)
      || meeting.participantNames.some((name) => name.toLowerCase() === selectedPerson.name.toLowerCase())
    ))
    : [];
  const quickActions = [
    { href: `${workspaceHref}&tab=people`, icon: UserPlus, label: "Add Person", meta: "People" },
    { href: `${workspaceHref}&tab=meetings`, icon: Plus, label: "Log Meeting", meta: "Meetings" },
    { href: buildSectionHref(basePath, "people"), icon: Search, label: "Search", meta: "Find someone" },
    { href: `${workspaceHref}&tab=fruit`, icon: Flame, label: "Record Fruit", meta: "Outcomes" },
  ];
  const visibleMembers = preview.members.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <section className="border-b border-stone-800/80 bg-[#060606] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-400 transition-colors hover:text-[#E4C465]"
            href="/admin/organizations"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Command Center
          </Link>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone="amber">Workspace v2</AdminBadge>
            <AdminBadge tone="muted">User view</AdminBadge>
            <AdminBadge tone="muted">Preview mode</AdminBadge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="overflow-hidden rounded-[34px] border border-[#E2E8F0] bg-[#FAFBFD] text-[#0F172A] shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-[#FAFBFD]/95 px-4 py-4 backdrop-blur lg:static lg:px-7 lg:py-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
                    Workspace v2
                  </p>
                  <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#64748B]">
                    Preview mode
                  </span>
                </div>
                <h1 className="mt-2 max-w-3xl break-words text-[2.35rem] font-bold leading-none text-[#0F172A] sm:text-5xl" style={{ fontFamily: adminFont.oswald }}>
                  {preview.workspace.displayName}
                </h1>
                <p className="mt-2 text-sm text-[#64748B]">{preview.organizationName}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleMembers.length > 0 ? (
                    visibleMembers.map((member) => (
                      <span
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F172A]"
                        key={member.id}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[10px] text-[#2563EB]">
                          {initialsFor(member.name)}
                        </span>
                        <span className="truncate">{member.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748B]">
                      {preview.counts.members} members
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[330px]">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
                  href={dosHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open DOS
                </Link>
                {preview.features.publicProfileEnabled ? (
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-5 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB]"
                    href={publicProfileHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public Profile
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          <div className="px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-8 lg:pt-7">
            <SectionTabs activeSection={activeSection} basePath={basePath} />

            {activeSection === "home" ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_360px]">
                <div className="space-y-5">
              <MissionFocusCard
                my3={preview.missionFocus.my3}
                my12={preview.missionFocus.my12}
                my70={preview.missionFocus.my70}
              />

              <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
                      This Week&apos;s Mission
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#0F172A]" style={{ fontFamily: adminFont.oswald }}>
                      What needs attention
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB]">
                    Preview mode
                  </span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <SignalCard detail="Open people priorities" label="Follow ups" value={preview.counts.followUps} />
                  <SignalCard detail="Requests in this workspace" label="Prayer requests" value={preview.counts.prayerRequests} />
                  <SignalCard detail="Logged in the last 7 days" label="Recent meetings" value={preview.counts.recentMeetings} />
                  <SignalCard detail="Movement steps recorded" label="Ready for next step" value={preview.counts.readyForNextStep} />
                </div>
              </section>
            </div>

            <aside>
              <section>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <QuickAction
                      href={action.href}
                      icon={action.icon}
                      key={action.label}
                      label={action.label}
                      meta={action.meta}
                    />
                  ))}
                </div>
              </section>
            </aside>

            <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
                  Mission Feed
                </p>
                <span className="text-xs font-semibold text-[#94A3B8]">{preview.activity.length} items</span>
              </div>
              <div className="mt-4 space-y-2">
                {preview.activity.length > 0 ? (
                  preview.activity.map((item) => (
                    <Link
                      className="group flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition hover:border-[#2563EB]"
                      href={item.href}
                      key={item.id}
                    >
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2563EB]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
                          <span className="text-xs text-[#94A3B8]">{formatDate(item.timestamp)}</span>
                        </span>
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: adminFont.rajdhani }}>
                          {item.label}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#64748B]">{item.detail}</span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8] transition group-hover:text-[#2563EB]" aria-hidden="true" />
                    </Link>
                  ))
                ) : (
                  <p className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                    Start by adding your first person to the field.
                  </p>
                )}
              </div>
            </section>

            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]" style={{ fontFamily: adminFont.rajdhani }}>
                Tools
              </p>
              <div className="space-y-2">
                <SecondaryTool href={buildSectionHref(basePath, "people")} icon={Users} label="People" />
                <SecondaryTool href={buildSectionHref(basePath, "meetings")} icon={CalendarDays} label="Meetings" />
                <SecondaryTool href={buildSectionHref(basePath, "fruit")} icon={Flame} label="Fruit" />
                {preview.features.publicProfileEnabled ? (
                  <SecondaryTool href={publicProfileHref} icon={Home} label="Public Profile" />
                ) : null}
                <SecondaryTool disabled href="#" icon={BookOpen} label="Resources" />
                <SecondaryTool href={`${workspaceHref}&tab=people`} icon={Import} label="Imports" />
                <SecondaryTool href={`${workspaceHref}&tab=features`} icon={Settings} label="Settings" />
              </div>
            </section>
              </div>
            ) : activeSection === "people" ? (
              <PeopleSection
                basePath={basePath}
                dosHref={dosHref}
                filteredPeople={filteredPeople}
                preview={preview}
                searchQuery={searchQuery}
                selectedPerson={selectedPerson}
                selectedPersonMeetings={selectedPersonMeetings}
                statusFilter={statusFilter}
                workspaceHref={workspaceHref}
              />
            ) : activeSection === "meetings" ? (
              <MeetingsSection preview={preview} workspaceHref={workspaceHref} />
            ) : activeSection === "fruit" ? (
              <FruitSection preview={preview} workspaceHref={workspaceHref} />
            ) : (
              <MoreSection
                preview={preview}
                publicProfileHref={publicProfileHref}
                workspaceHref={workspaceHref}
              />
            )}
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-[#E2E8F0] bg-white/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="Workspace preview navigation">
            <BottomNavItem active={activeSection === "home"} href={buildSectionHref(basePath, "home")} icon={Home} label="Home" />
            <BottomNavItem active={activeSection === "people"} href={buildSectionHref(basePath, "people")} icon={Users} label="People" />
            <BottomNavItem active={activeSection === "meetings"} href={buildSectionHref(basePath, "meetings")} icon={CalendarDays} label="Meetings" />
            <BottomNavItem active={activeSection === "fruit"} href={buildSectionHref(basePath, "fruit")} icon={Flame} label="Fruit" />
            <BottomNavItem active={activeSection === "more"} href={buildSectionHref(basePath, "more")} icon={BookOpen} label="More" />
          </nav>
        </div>
      </section>
    </main>
  );
}
