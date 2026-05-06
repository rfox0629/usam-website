import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import {
  approveFieldReportAccessRequest,
  archiveSupportSubmission,
  createGivingFollowUp,
  markSupportSubmissionFollowUp,
  markSupportSubmissionPersonalFollowUp,
  markSupportSubmissionReviewed,
  markSystemWaitlistContacted,
  updateSupportSubmission,
} from "./actions";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Support Team | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const prayerFormTypes = new Set(["prayer_team_application", "prayer_request"]);

const statuses = [
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Needs Follow Up", value: "needs_follow_up" },
  { label: "Contacted", value: "contacted" },
  { label: "Converted", value: "converted" },
  { label: "Archived", value: "archived" },
] as const;

const priorities = [
  { label: "Normal", value: "normal" },
  { label: "Important", value: "important" },
  { label: "High", value: "high" },
] as const;

const supportFormTypes = [
  { label: "All Types", value: "" },
  { label: "Financial Freedom", value: "financial_freedom" },
  { label: "Field Reports Access", value: "field_report_access" },
  { label: "Major Gifts", value: "major_gift" },
  { label: "Contact", value: "contact" },
  { label: "Support / Giving", value: "support_giving" },
  { label: "Missionary Profile Review", value: "missionary_profile_review" },
  { label: "Join the Mission Interest", value: "join_mission_interest" },
  { label: "System Waitlist", value: "system_waitlist" },
  { label: "DOS Walkthrough Request", value: "dos_walkthrough_request" },
  { label: "Missionary Application", value: "missionary_application" },
  { label: "General", value: "general" },
] as const;

type SubmissionStatus = (typeof statuses)[number]["value"];
type SubmissionPriority = (typeof priorities)[number]["value"];

type SearchParams = {
  assigned_to?: string;
  error?: string;
  priority?: string;
  q?: string;
  saved?: string;
  status?: string;
  submission?: string;
  type?: string;
};

type RawFormSubmission = {
  assigned_team: "prayer_team" | "support_team" | null;
  assigned_to: string | null;
  created_at: string;
  email: string | null;
  first_name: string | null;
  form_type: string;
  id: string;
  internal_notes: string | null;
  last_name: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  phone: string | null;
  priority: string | null;
  source_page: string | null;
  status: string | null;
  updated_at: string | null;
};

type FormSubmission = Omit<RawFormSubmission, "priority" | "status"> & {
  priority: SubmissionPriority;
  status: SubmissionStatus;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formTypeLabel(value: string) {
  switch (value) {
    case "financial_freedom":
      return "Financial Freedom";
    case "major_gift":
      return "Major Gift";
    case "support_giving":
      return "Support / Giving";
    case "missionary_profile_review":
      return "Missionary Profile Review";
    case "join_mission_interest":
      return "Join the Mission Interest";
    case "field_report_access":
      return "Field Reports Access";
    case "system_waitlist":
      return "System Waitlist";
    case "dos_walkthrough_request":
      return "DOS Walkthrough Request";
    case "missionary_application":
      return "Missionary Application";
    default:
      return labelFromValue(value);
  }
}

function fullName(submission: Pick<FormSubmission, "first_name" | "last_name">) {
  return [submission.first_name, submission.last_name].filter(Boolean).join(" ").trim() || "Unknown";
}

function normalizeStatus(status: string | null): SubmissionStatus {
  if (status === "follow_up") {
    return "needs_follow_up";
  }

  return statuses.some((option) => option.value === status)
    ? status as SubmissionStatus
    : "new";
}

function normalizePriority(priority: string | null): SubmissionPriority {
  if (priority === "urgent") {
    return "high";
  }

  if (priority === "low") {
    return "normal";
  }

  return priorities.some((option) => option.value === priority)
    ? priority as SubmissionPriority
    : "normal";
}

function normalizeSubmission(submission: RawFormSubmission): FormSubmission {
  return {
    ...submission,
    priority: normalizePriority(submission.priority),
    status: normalizeStatus(submission.status),
  };
}

function statusClassName(status: SubmissionStatus) {
  switch (status) {
    case "new":
    case "needs_follow_up":
      return "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]";
    case "contacted":
      return "border-sky-400/25 bg-sky-950/25 text-sky-300";
    case "converted":
      return "border-green-500/25 bg-green-950/30 text-green-300";
    case "archived":
      return "border-stone-800 bg-stone-950 text-stone-500";
    default:
      return "border-stone-700 bg-stone-900/70 text-stone-300";
  }
}

function priorityClassName(priority: SubmissionPriority) {
  switch (priority) {
    case "high":
      return "border-red-500/35 bg-red-950/25 text-red-200";
    case "important":
      return "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]";
    default:
      return "border-stone-700 bg-stone-900/70 text-stone-300";
  }
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

function InlineStatBar({
  stats,
}: {
  stats: Array<{ label: string; tone?: "amber" | "green" | "red"; value: number }>;
}) {
  const toneClassName = {
    amber: "text-[#E4C465]",
    green: "text-green-300",
    red: "text-red-200",
  } as const;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {stats.map((stat, index) => (
        <div className="flex items-baseline gap-2" key={stat.label}>
          {index > 0 ? <span className="hidden h-4 w-px bg-stone-800 sm:inline-block" /> : null}
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-stone-500"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {stat.label}
          </span>
          <span
            className={`text-xl font-bold leading-none ${stat.tone ? toneClassName[stat.tone] : "text-stone-100"}`}
            style={{ fontFamily: font.oswald }}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function buildHref(params: SearchParams, overrides: Record<string, string | undefined>) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (value && key !== "error" && key !== "saved") {
      nextParams.set(key, value);
    }
  });

  const query = nextParams.toString();

  return query ? `/admin/support-team?${query}` : "/admin/support-team";
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function payloadSearchText(payload: Record<string, unknown> | null) {
  if (!payload) {
    return "";
  }

  return Object.values(payload)
    .map((value) => formatPayloadValue(value))
    .join(" ");
}

function getOrganization(submission: FormSubmission) {
  const payload = submission.payload ?? {};
  const value = payload.organization
    ?? payload.organization_church
    ?? payload.church_affiliation
    ?? payload.church
    ?? payload.company
    ?? payload.ministry;

  return typeof value === "string" ? value : "";
}

function filterSubmissions(submissions: readonly FormSubmission[], params: SearchParams) {
  const q = normalize(params.q);
  const type = params.type ?? "";
  const status = normalizeStatus(params.status ?? null);
  const hasStatusFilter = Boolean(params.status);
  const priority = normalizePriority(params.priority ?? null);
  const hasPriorityFilter = Boolean(params.priority);
  const assignedTo = params.assigned_to ?? "";

  return submissions.filter((submission) => {
    const searchable = [
      fullName(submission),
      submission.email,
      submission.phone,
      submission.message,
      submission.source_page,
      formTypeLabel(submission.form_type),
      getOrganization(submission),
      payloadSearchText(submission.payload),
    ].filter(Boolean).join(" ").toLowerCase();

    return (!q || searchable.includes(q))
      && (!type || submission.form_type === type)
      && (!hasStatusFilter || submission.status === status)
      && (!hasPriorityFilter || submission.priority === priority)
      && (!assignedTo || (assignedTo === "__unassigned" ? !submission.assigned_to : submission.assigned_to === assignedTo));
  });
}

async function loadSupportSubmissions() {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      submissions: [] as FormSubmission[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, form_type, source_page, first_name, last_name, email, phone, message, payload, status, priority, assigned_team, assigned_to, internal_notes, created_at, updated_at")
    .eq("assigned_team", "support_team")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: error.message,
      submissions: [] as FormSubmission[],
    };
  }

  return {
    error: undefined,
    submissions: ((data ?? []) as RawFormSubmission[])
      .filter((submission) => !prayerFormTypes.has(submission.form_type))
      .map(normalizeSubmission),
  };
}

function FilterBar({
  assignedToOptions,
  params,
}: {
  assignedToOptions: readonly string[];
  params: SearchParams;
}) {
  return (
    <form className="grid gap-3 border border-stone-800 bg-[#080808]/85 p-4 lg:grid-cols-[1.35fr_0.9fr_0.75fr_0.75fr_0.85fr_auto]" action="/admin/support-team" method="get">
      <label className="block">
        <span className="sr-only">Search submissions</span>
        <input
          className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
          defaultValue={params.q ?? ""}
          name="q"
          placeholder="Search name, email, or organization"
        />
      </label>
      <label className="block">
        <span className="sr-only">Form type</span>
        <select className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={params.type ?? ""} name="type">
          {supportFormTypes.map((type) => <option key={type.value || "all"} value={type.value}>{type.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Status</span>
        <select className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={params.status ?? ""} name="status">
          <option value="">All Statuses</option>
          {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Priority</span>
        <select className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={params.priority ?? ""} name="priority">
          <option value="">All Priorities</option>
          {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Assigned to</span>
        <select className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={params.assigned_to ?? ""} name="assigned_to">
          <option value="">All Assignees</option>
          <option value="__unassigned">Unassigned</option>
          {assignedToOptions.map((assignedTo) => <option key={assignedTo} value={assignedTo}>{assignedTo}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          className="inline-flex min-h-10 flex-1 items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942] lg:flex-none"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="submit"
        >
          Filter
        </button>
        <Link
          className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
          href="/admin/support-team"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function InboxList({
  params,
  submissions,
}: {
  params: SearchParams;
  submissions: readonly FormSubmission[];
}) {
  return (
    <section className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="flex items-center justify-between gap-4 border-b border-stone-800/70 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Submission Inbox
          </p>
          <p className="mt-1 text-xs text-stone-500">{submissions.length} visible</p>
        </div>
      </div>
      <div className="hidden border-b border-stone-800/70 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-stone-500 md:grid md:grid-cols-[minmax(160px,1.05fr)_140px_minmax(180px,1fr)_140px_90px_90px_100px] md:gap-3" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        <span>Name</span>
        <span>Form Type</span>
        <span>Email</span>
        <span>Source Page</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Date</span>
      </div>
      <div className="divide-y divide-stone-900">
        {submissions.length > 0 ? submissions.map((submission) => {
          const isActive = params.submission === submission.id;

          return (
            <Link
              className={`grid gap-2 px-4 py-3 text-sm transition-colors hover:bg-stone-950/80 md:grid-cols-[minmax(160px,1.05fr)_140px_minmax(180px,1fr)_140px_90px_90px_100px] md:items-center md:gap-3 ${
                isActive ? "bg-[#C9A24A]/5" : ""
              }`}
              href={buildHref(params, { submission: submission.id })}
              key={submission.id}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-100">{fullName(submission)}</p>
                {getOrganization(submission) ? <p className="truncate text-xs text-stone-500">{getOrganization(submission)}</p> : null}
              </div>
              <p className="text-xs text-stone-300 md:text-sm">{formTypeLabel(submission.form_type)}</p>
              <p className="truncate text-xs text-stone-400 md:text-sm">{submission.email || "No email"}</p>
              <p className="truncate text-xs text-stone-500 md:text-sm">{submission.source_page || "Unknown"}</p>
              <Badge className={statusClassName(submission.status)}>{labelFromValue(submission.status)}</Badge>
              <Badge className={priorityClassName(submission.priority)}>{labelFromValue(submission.priority)}</Badge>
              <p className="text-xs text-stone-500 md:text-sm">{formatDate(submission.created_at)}</p>
            </Link>
          );
        }) : (
          <div className="px-4 py-10">
            <p className="text-sm leading-6 text-stone-400">
              {params.q || params.type || params.status || params.priority || params.assigned_to
                ? "No support submissions match these filters."
                : "No submissions yet. Once forms are submitted, they will appear here for review."}
            </p>
            {!params.q && !params.type && !params.status && !params.priority && !params.assigned_to ? (
              <Link
                className="mt-5 inline-flex min-h-10 items-center justify-center border border-[#D4A63D] bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942]"
                href="/admin/public-experience?tab=forms"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                View Forms
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function FormSelect({
  children,
  defaultValue,
  label,
  name,
}: {
  children: ReactNode;
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select className="mt-2 min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={defaultValue} name={name}>
        {children}
      </select>
    </label>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-stone-300">{value || "-"}</div>
    </div>
  );
}

function formatPayloadKey(key: string) {
  return labelFromValue(key).replace(/\bSms\b/g, "SMS").replace(/\bUsa\b/g, "USA");
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatPayloadValue(item)).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function PayloadFields({ payload }: { payload: Record<string, unknown> | null }) {
  const entries = Object.entries(payload ?? {});

  if (entries.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">No payload fields submitted.</p>;
  }

  return (
    <div className="grid gap-2">
      {entries.map(([key, value]) => (
        <div className="border border-stone-900 bg-[#050505] p-3" key={key}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {formatPayloadKey(key)}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-300">{formatPayloadValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function ActionForm({
  action,
  children,
  submissionId,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  children: string;
  submissionId: string;
  variant?: "amber" | "blue" | "outline" | "danger";
}) {
  const className = variant === "amber"
    ? "border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
    : variant === "blue"
      ? "border-blue-400/25 bg-blue-950/30 text-blue-200 hover:border-blue-300/60"
      : variant === "danger"
        ? "border-red-500/30 text-red-200 hover:bg-red-950/25"
        : "border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]";

  return (
    <form action={action}>
      <input name="submission_id" type="hidden" value={submissionId} />
      <button
        className={`inline-flex min-h-10 w-full items-center justify-center border px-4 text-[11px] uppercase tracking-[0.16em] transition-colors ${className}`}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

function SpecialAction({ submission }: { submission: FormSubmission }) {
  switch (submission.form_type) {
    case "major_gift":
      return <ActionForm action={markSupportSubmissionPersonalFollowUp} submissionId={submission.id} variant="blue">Mark for Personal Follow Up</ActionForm>;
    case "support_giving":
      return <ActionForm action={createGivingFollowUp} submissionId={submission.id} variant="blue">Create Giving Follow Up</ActionForm>;
    case "field_report_access":
      return <ActionForm action={approveFieldReportAccessRequest} submissionId={submission.id} variant="blue">Approve Access Request</ActionForm>;
    case "system_waitlist":
      return <ActionForm action={markSystemWaitlistContacted} submissionId={submission.id} variant="blue">Mark as Waitlist Contacted</ActionForm>;
    default:
      return null;
  }
}

function SubmissionDetail({ submission }: { submission: FormSubmission | null }) {
  if (!submission) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Submission Detail
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a submission to review details, notes, and next steps.
        </p>
      </aside>
    );
  }

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
      <div className="border-b border-stone-800/70 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Submission Detail
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{fullName(submission)}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className={statusClassName(submission.status)}>{labelFromValue(submission.status)}</Badge>
          <Badge className={priorityClassName(submission.priority)}>{labelFromValue(submission.priority)}</Badge>
          <Badge className="border-blue-400/25 bg-blue-950/30 text-blue-300">Support Team</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Email" value={submission.email ? <a className="hover:text-[#F5B942]" href={`mailto:${submission.email}`}>{submission.email}</a> : "-"} />
        <DetailItem label="Phone" value={submission.phone || "-"} />
        <DetailItem label="Source Page" value={submission.source_page || "-"} />
        <DetailItem label="Form Type" value={formTypeLabel(submission.form_type)} />
        <DetailItem label="Assigned To" value={submission.assigned_to || "Unassigned"} />
        <DetailItem label="Created Date" value={formatDate(submission.created_at)} />
      </div>

      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Message
        </p>
        <div className="mt-2 min-h-20 border border-stone-900 bg-[#050505] p-3 text-sm leading-6 text-stone-300">
          {submission.message || "No message submitted."}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Submitted Payload Fields
        </p>
        <div className="mt-2">
          <PayloadFields payload={submission.payload} />
        </div>
      </div>

      <form action={updateSupportSubmission} className="mt-6 border-t border-stone-800/70 pt-5">
        <input name="submission_id" type="hidden" value={submission.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect defaultValue={submission.status} label="Status" name="status">
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </FormSelect>
          <FormSelect defaultValue={submission.priority} label="Priority" name="priority">
            {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </FormSelect>
        </div>
        <label className="mt-4 block">
          <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Assigned To
          </span>
          <input
            className="mt-2 min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
            defaultValue={submission.assigned_to ?? ""}
            name="assigned_to"
            placeholder="Team member name or email"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Internal Notes
          </span>
          <textarea
            className="mt-2 min-h-28 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
            defaultValue={submission.internal_notes ?? ""}
            name="internal_notes"
            placeholder="Add next steps, context, or follow-up notes for the support team."
          />
        </label>
        <button
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="submit"
        >
          Save Changes
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ActionForm action={markSupportSubmissionReviewed} submissionId={submission.id}>Mark Reviewed</ActionForm>
        <ActionForm action={markSupportSubmissionFollowUp} submissionId={submission.id}>Mark Needs Follow Up</ActionForm>
        <SpecialAction submission={submission} />
        <ActionForm action={archiveSupportSubmission} submissionId={submission.id} variant="danger">Archive</ActionForm>
      </div>

      <p className="mt-5 border-t border-stone-800/70 pt-4 text-xs leading-6 text-stone-500">
        Future notifications, CRM follow-up automation, and assignment alerts can connect here without changing the inbox workflow.
      </p>
    </aside>
  );
}

export default async function SupportTeamAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { error, submissions } = await loadSupportSubmissions();
  const filteredSubmissions = filterSubmissions(submissions, params);
  const selectedSubmission = params.submission
    ? submissions.find((submission) => submission.id === params.submission) ?? null
    : null;
  const assignedToOptions = Array.from(new Set(submissions.map((submission) => submission.assigned_to).filter((value): value is string => Boolean(value)))).sort((first, second) => first.localeCompare(second));
  const newCount = submissions.filter((submission) => submission.status === "new").length;
  const followUpCount = submissions.filter((submission) => submission.status === "needs_follow_up").length;
  const majorGiftCount = submissions.filter((submission) => submission.form_type === "major_gift" && submission.status !== "archived").length;
  const highPriorityCount = submissions.filter((submission) => submission.priority === "high").length;

  return (
    <AdminShell
      active="support-team"
      description="Review giving interest, major gifts, financial freedom requests, contact forms, field report access, and system waitlist submissions."
      title="Support Team"
    >
      <div className="space-y-5">
        {error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Support Team data is not ready: {error}. Apply the form_submissions migration to the usam-website Supabase project.
          </p>
        ) : null}

        {params.saved ? (
          <p className="border border-green-500/25 bg-green-950/20 p-3 text-sm text-green-200">
            Support submission updated.
          </p>
        ) : null}

        {params.error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-100">
            Unable to update submission: {params.error}
          </p>
        ) : null}

        <InlineStatBar
          stats={[
            { label: "New", value: newCount },
            { label: "Needs Follow Up", tone: "amber", value: followUpCount },
            { label: "Major Gifts", value: majorGiftCount },
            { label: "High Priority", tone: "red", value: highPriorityCount },
          ]}
        />

        <FilterBar assignedToOptions={assignedToOptions} params={params} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <InboxList params={params} submissions={filteredSubmissions} />
          <SubmissionDetail submission={selectedSubmission} />
        </div>
      </div>
    </AdminShell>
  );
}
