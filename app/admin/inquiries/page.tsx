import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import {
  approvePrayerTeamApplication,
  archiveFormSubmission,
  markFormSubmissionReviewed,
  updateFormSubmission,
} from "./actions";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Forms & Inquiries | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const tabs = [
  { label: "All", value: "all" },
  { label: "Financial Freedom", value: "financial_freedom" },
  { label: "Major Gifts", value: "major_gift" },
  { label: "Contact", value: "contact" },
  { label: "Support / Giving", value: "support_giving" },
  { label: "Prayer Team Applications", value: "prayer_team_application" },
  { label: "Archived", value: "archived" },
] as const;

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

type InboxTab = (typeof tabs)[number]["value"];
type SubmissionStatus = (typeof statuses)[number]["value"];
type SubmissionPriority = (typeof priorities)[number]["value"];

type SearchParams = {
  error?: string;
  saved?: string;
  submission?: string;
  tab?: string;
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

function getTab(value?: string): InboxTab {
  return tabs.some((tab) => tab.value === value) ? value as InboxTab : "all";
}

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
    case "prayer_team_application":
      return "Prayer Team Application";
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

function filterSubmissions(submissions: readonly FormSubmission[], activeTab: InboxTab) {
  if (activeTab === "archived") {
    return submissions.filter((submission) => submission.status === "archived");
  }

  const activeSubmissions = submissions.filter((submission) => submission.status !== "archived");

  if (activeTab === "all") {
    return activeSubmissions;
  }

  return activeSubmissions.filter((submission) => submission.form_type === activeTab);
}

async function loadSubmissions() {
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
    submissions: (data ?? []) as FormSubmission[],
  };
}

function TabNav({ activeTab }: { activeTab: InboxTab }) {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-stone-800/80 pb-3" aria-label="Forms and inquiries tabs">
      {tabs.map((tab) => (
        <Link
          className={`shrink-0 border px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
            activeTab === tab.value
              ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
              : "border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100"
          }`}
          href={`/admin/inquiries?tab=${tab.value}`}
          key={tab.value}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function SubmissionList({
  activeTab,
  selectedId,
  submissions,
}: {
  activeTab: InboxTab;
  selectedId?: string;
  submissions: readonly FormSubmission[];
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="hidden grid-cols-[1fr_0.9fr_1.2fr_0.6fr_0.55fr_0.65fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
            className={`grid gap-3 p-4 transition-colors hover:bg-stone-950/70 lg:grid-cols-[1fr_0.9fr_1.2fr_0.6fr_0.55fr_0.65fr] lg:items-center ${
              selectedId === submission.id ? "bg-[#C9A24A]/5" : ""
            }`}
            href={`/admin/inquiries?tab=${activeTab}&submission=${submission.id}`}
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
            No submissions match this view yet.
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
          Select a submission to review the full message, payload, status, priority, notes, and conversion actions.
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

      <form action={updateFormSubmission} className="mt-6 space-y-4 border-y border-stone-800/70 py-5">
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
        <form action={markFormSubmissionReviewed}>
          <input name="submission_id" type="hidden" value={submission.id} />
          <button className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Mark Reviewed
          </button>
        </form>
        <form action={archiveFormSubmission}>
          <input name="submission_id" type="hidden" value={submission.id} />
          <button className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-red-400 hover:text-red-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Archive
          </button>
        </form>
        {submission.form_type === "prayer_team_application" && submission.status !== "converted" ? (
          <form action={approvePrayerTeamApplication}>
            <input name="submission_id" type="hidden" value={submission.id} />
            <button className="inline-flex min-h-10 items-center justify-center border border-green-500/40 bg-green-950/25 px-4 text-[11px] uppercase tracking-[0.18em] text-green-200 hover:border-green-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
              Approve as Prayer Partner
            </button>
          </form>
        ) : null}
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

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = getTab(params.tab);
  const { error, submissions } = await loadSubmissions();
  const filteredSubmissions = filterSubmissions(submissions, activeTab);
  const selectedSubmission = params.submission
    ? submissions.find((submission) => submission.id === params.submission)
    : filteredSubmissions[0];
  const newSubmissions = submissions.filter((submission) => submission.status === "new").length;
  const followUp = submissions.filter((submission) => submission.status === "follow_up").length;
  const majorGifts = submissions.filter((submission) => submission.form_type === "major_gift" && submission.status !== "archived").length;
  const prayerApplications = submissions.filter((submission) => submission.form_type === "prayer_team_application" && submission.status !== "archived").length;

  return (
    <AdminShell
      active="inquiries"
      description="Review website form submissions, giving interest, financial requests, prayer team applications, and follow up conversations."
      title="Forms & Inquiries"
    >
      <div className="space-y-5">
        {error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Forms & Inquiries data is not ready: {error}. Apply the form_submissions migration to the usam-website Supabase project.
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="New Submissions" value={newSubmissions} />
          <MetricCard label="Needs Follow Up" value={followUp} />
          <MetricCard label="Major Gifts" value={majorGifts} />
          <MetricCard label="Prayer Team Applications" value={prayerApplications} />
        </div>

        <TabNav activeTab={activeTab} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <SubmissionList activeTab={activeTab} selectedId={selectedSubmission?.id} submissions={filteredSubmissions} />
          <SubmissionDetail submission={selectedSubmission} />
        </div>
      </div>
    </AdminShell>
  );
}
