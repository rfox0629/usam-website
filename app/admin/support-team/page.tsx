import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import {
  archiveSupportSubmission,
  markSupportSubmissionReviewed,
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
  { label: "Follow Up", value: "follow_up" },
  { label: "Converted", value: "converted" },
  { label: "Archived", value: "archived" },
] as const;

const priorities = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
] as const;

const supportFormTypes = [
  { label: "All Types", value: "" },
  { label: "Financial Freedom", value: "financial_freedom" },
  { label: "Major Gifts", value: "major_gift" },
  { label: "Contact", value: "contact" },
  { label: "Support / Giving", value: "support_giving" },
  { label: "Missionary Application", value: "missionary_application" },
  { label: "General", value: "general" },
] as const;

type SubmissionStatus = (typeof statuses)[number]["value"];
type SubmissionPriority = (typeof priorities)[number]["value"];

type SearchParams = {
  error?: string;
  priority?: string;
  q?: string;
  saved?: string;
  status?: string;
  submission?: string;
  type?: string;
};

type FormSubmission = {
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
  priority: SubmissionPriority;
  source_page: string | null;
  status: SubmissionStatus;
  updated_at: string | null;
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
    case "missionary_application":
      return "Missionary Application";
    default:
      return labelFromValue(value);
  }
}

function fullName(submission: FormSubmission) {
  return [submission.first_name, submission.last_name].filter(Boolean).join(" ").trim() || "Unknown";
}

function statusClassName(status: string) {
  if (status === "new") {
    return "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]";
  }

  if (status === "converted") {
    return "border-green-500/25 bg-green-950/30 text-green-300";
  }

  if (status === "follow_up") {
    return "border-blue-400/25 bg-blue-950/30 text-blue-300";
  }

  return "border-stone-700 bg-stone-900/70 text-stone-300";
}

function priorityClassName(priority: string) {
  if (priority === "urgent") {
    return "border-red-500/35 bg-red-950/25 text-red-200";
  }

  if (priority === "high") {
    return "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]";
  }

  return "border-stone-700 bg-stone-900/70 text-stone-300";
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-stone-800/75 bg-[#080808]/85 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
    </div>
  );
}

function buildHref(params: SearchParams, overrides: Record<string, string | undefined>) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (value) {
      nextParams.set(key, value);
    }
  });

  const query = nextParams.toString();

  return query ? `/admin/support-team?${query}` : "/admin/support-team";
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function filterSubmissions(submissions: readonly FormSubmission[], params: SearchParams) {
  const q = normalize(params.q);
  const type = params.type ?? "";
  const status = params.status ?? "";
  const priority = params.priority ?? "";

  return submissions.filter((submission) => {
    const searchable = [
      fullName(submission),
      submission.email,
      submission.phone,
      submission.message,
      submission.source_page,
      formTypeLabel(submission.form_type),
    ].filter(Boolean).join(" ").toLowerCase();

    return (!q || searchable.includes(q))
      && (!type || submission.form_type === type)
      && (!status || submission.status === status)
      && (!priority || submission.priority === priority);
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
    .select("id, form_type, source_page, first_name, last_name, email, phone, message, payload, status, priority, assigned_to, internal_notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: error.message,
      submissions: [] as FormSubmission[],
    };
  }

  return {
    error: undefined,
    submissions: ((data ?? []) as FormSubmission[]).filter((submission) => !prayerFormTypes.has(submission.form_type)),
  };
}

function FilterBar({ params }: { params: SearchParams }) {
  return (
    <form className="grid gap-3 border border-stone-800 bg-[#080808]/85 p-4 lg:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_auto]" action="/admin/support-team" method="get">
      <input
        className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]"
        defaultValue={params.q ?? ""}
        name="q"
        placeholder="Search name, email, message"
      />
      <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.type ?? ""} name="type">
        {supportFormTypes.map((type) => <option key={type.value || "all"} value={type.value}>{type.label}</option>)}
      </select>
      <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.status ?? ""} name="status">
        <option value="">All Statuses</option>
        {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
      <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.priority ?? ""} name="priority">
        <option value="">All Priorities</option>
        {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
      </select>
      <button className="min-h-10 border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
        Filter
      </button>
    </form>
  );
}

function SubmissionList({
  params,
  selectedId,
  submissions,
}: {
  params: SearchParams;
  selectedId?: string;
  submissions: readonly FormSubmission[];
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="hidden grid-cols-[1fr_0.9fr_1.1fr_0.6fr_0.55fr_0.65fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        <span>Name</span>
        <span>Form Type</span>
        <span>Email</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Created</span>
      </div>
      <div className="divide-y divide-stone-900">
        {submissions.length > 0 ? submissions.map((submission) => (
          <Link
            className={`grid gap-3 p-4 transition-colors hover:bg-stone-950/70 lg:grid-cols-[1fr_0.9fr_1.1fr_0.6fr_0.55fr_0.65fr] lg:items-center ${
              selectedId === submission.id ? "bg-[#C9A24A]/5" : ""
            }`}
            href={buildHref(params, { submission: submission.id })}
            key={submission.id}
          >
            <div>
              <p className="font-medium text-stone-100">{fullName(submission)}</p>
              <p className="mt-1 text-xs text-stone-500 lg:hidden">{submission.email || "No email"}</p>
            </div>
            <p className="text-sm text-stone-300">{formTypeLabel(submission.form_type)}</p>
            <p className="hidden truncate text-sm text-stone-400 lg:block">{submission.email || "—"}</p>
            <Badge className={statusClassName(submission.status)}>{labelFromValue(submission.status)}</Badge>
            <Badge className={priorityClassName(submission.priority)}>{submission.priority}</Badge>
            <p className="text-sm text-stone-400">{formatDate(submission.created_at)}</p>
          </Link>
        )) : (
          <div className="p-6 text-sm leading-6 text-stone-400">
            No support submissions match this view yet.
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-stone-300">{value || "—"}</div>
    </div>
  );
}

function SubmissionDetail({ submission }: { submission?: FormSubmission }) {
  if (!submission) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 text-sm leading-7 text-stone-400 xl:sticky xl:top-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Detail View
        </p>
        <p className="mt-4">
          Select a support submission to review the message, payload, status, priority, notes, and follow-up actions.
        </p>
      </aside>
    );
  }

  const payload = submission.payload ?? {};

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 md:p-6 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {formTypeLabel(submission.form_type)}
          </p>
          <h2 className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {fullName(submission)}
          </h2>
        </div>
        <Badge className={statusClassName(submission.status)}>{labelFromValue(submission.status)}</Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Email" value={submission.email ? <a className="hover:text-[#D4A63D]" href={`mailto:${submission.email}`}>{submission.email}</a> : "—"} />
        <DetailItem label="Phone" value={submission.phone} />
        <DetailItem label="Source Page" value={submission.source_page} />
        <DetailItem label="Form Type" value={formTypeLabel(submission.form_type)} />
        <DetailItem label="Created" value={formatDate(submission.created_at)} />
        <DetailItem label="Assigned To" value={submission.assigned_to} />
      </div>

      <div className="mt-6 border-t border-stone-800/70 pt-5">
        <DetailItem label="Full Message" value={submission.message || "No message provided."} />
      </div>

      <form action={updateSupportSubmission} className="mt-6 space-y-4 border-y border-stone-800/70 py-5">
        <input name="submission_id" type="hidden" value={submission.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Status
            </span>
            <select className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={submission.status} name="status">
              {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Priority
            </span>
            <select className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={submission.priority} name="priority">
              {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Assigned To
          </span>
          <input className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={submission.assigned_to ?? ""} name="assigned_to" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Internal Notes
          </span>
          <textarea className="mt-2 min-h-28 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={submission.internal_notes ?? ""} name="internal_notes" />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 text-xs uppercase tracking-[0.2em] text-black hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Save Detail
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form action={markSupportSubmissionReviewed}>
          <input name="submission_id" type="hidden" value={submission.id} />
          <button className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Mark Reviewed
          </button>
        </form>
        <form action={archiveSupportSubmission}>
          <input name="submission_id" type="hidden" value={submission.id} />
          <button className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-red-400 hover:text-red-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Archive
          </button>
        </form>
      </div>

      <div className="mt-7 border-t border-stone-800/70 pt-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Full Payload
        </p>
        <pre className="mt-3 max-h-80 overflow-auto border border-stone-800 bg-[#050505] p-4 text-xs leading-6 text-stone-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </aside>
  );
}

export default async function SupportTeamPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { error, submissions } = await loadSupportSubmissions();
  const filteredSubmissions = filterSubmissions(submissions, params);
  const selectedSubmission = params.submission
    ? submissions.find((submission) => submission.id === params.submission)
    : filteredSubmissions[0];
  const newSubmissions = submissions.filter((submission) => submission.status === "new").length;
  const followUp = submissions.filter((submission) => submission.status === "follow_up").length;
  const highValueLeads = submissions.filter((submission) => submission.priority === "high" || submission.priority === "urgent" || submission.form_type === "major_gift").length;

  return (
    <AdminShell
      active="support-team"
      description="Review and follow up on non-prayer website submissions, giving interest, major gifts, and support conversations."
      title="Support Team"
    >
      <div className="space-y-5">
        {error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Support Team data is not ready: {error}. Apply the form_submissions migration to the usam-website Supabase project.
          </p>
        ) : null}
        {params.saved ? (
          <p className="border border-green-500/25 bg-green-950/25 p-4 text-sm text-green-200">
            Submission updated.
          </p>
        ) : null}
        {params.error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Action could not be completed: {params.error}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="New Submissions" value={newSubmissions} />
          <MetricCard label="Needs Follow Up" value={followUp} />
          <MetricCard label="High Value Leads" value={highValueLeads} />
        </div>

        <FilterBar params={params} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <SubmissionList params={params} selectedId={selectedSubmission?.id} submissions={filteredSubmissions} />
          <SubmissionDetail submission={selectedSubmission} />
        </div>
      </div>
    </AdminShell>
  );
}
