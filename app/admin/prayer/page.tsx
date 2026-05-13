import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import {
  approvePrayerPartnerApplication,
  approvePrayerTeamApplication,
  archivePrayerRequest,
  archivePrayerSubmission,
  assignPrayerRequestPartners,
  createPrayerRequest,
  deactivatePrayerPartner,
  declinePrayerPartnerApplication,
  declinePrayerTeamApplication,
  markPrayerRequestAnswered,
  markPrayerRequestCovered,
  markPrayerRequestPrayed,
  markPrayerSubmissionNeedsFollowUp,
  markPrayerSubmissionReviewed,
  updatePrayerPartner,
  updatePrayerRequest,
  updatePrayerSubmission,
} from "./actions";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Prayer Team | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const inputClassName = "mt-2 min-h-10 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
const toolbarInputClassName = "min-h-10 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
const secondaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-700 px-4 text-[11px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]";
const primaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-[#F5B942]";
const tabButtonClassName = "inline-flex h-10 w-[132px] shrink-0 items-center justify-center rounded-lg border px-3 text-center text-[10px] uppercase tracking-[0.15em] transition-colors";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "applications", label: "Applications" },
  { key: "partners", label: "Partners" },
  { key: "requests", label: "Requests" },
] as const;

const prayerCategories = [
  "Kitchen Table",
  "Missionary Couple",
  "Leadership",
  "City / State",
  "Finance",
  "Family",
  "Salvation",
  "Healing",
  "Deliverance",
  "Travel",
  "General",
] as const;

const requestStatuses = [
  { label: "Open", value: "open" },
  { label: "Covered", value: "covered" },
  { label: "Answered", value: "answered" },
  { label: "Archived", value: "archived" },
] as const;

const urgencies = [
  { label: "Normal", value: "normal" },
  { label: "Important", value: "important" },
  { label: "Urgent", value: "urgent" },
] as const;

const confidentialityLevels = [
  { label: "General", value: "general" },
  { label: "Missionary Couple", value: "missionary_couple" },
  { label: "Kitchen Table", value: "kitchen_table" },
  { label: "Confidential", value: "confidential" },
] as const;

const partnerStatuses = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "Declined", value: "declined" },
] as const;

const partnerPermissions = [
  "view_general_requests",
  "view_missionary_couple_requests",
  "view_kitchen_table_alerts",
  "view_confidential_requests",
  "receive_email_alerts",
  "receive_sms_alerts",
  "prayer_admin",
] as const;

const coverageRows = [
  "Kitchen Tables",
  "Missionary Couples",
  "Leaders",
  "States",
  "Major Cities",
  "Government",
  "Finances",
  "Families",
  "Salvation",
  "Deliverance",
] as const;

type PrayerAdminTab = (typeof tabs)[number]["key"];
type RequestStatus = (typeof requestStatuses)[number]["value"];
type RequestUrgency = (typeof urgencies)[number]["value"];
type ConfidentialityLevel = (typeof confidentialityLevels)[number]["value"];
type PartnerStatus = (typeof partnerStatuses)[number]["value"] | "archived";
type SubmissionStatus = "new" | "reviewed" | "needs_follow_up" | "follow_up" | "converted" | "archived";

type SearchParams = {
  category?: string;
  error?: string;
  household?: string;
  partner?: string;
  q?: string;
  region?: string;
  request?: string;
  saved?: string;
  state?: string;
  status?: string;
  submission?: string;
  tab?: string;
  urgency?: string;
};

type HouseholdRow = {
  display_name: string;
  id: string;
  primary_state: string | null;
  region: string | null;
  slug: string;
};

type PrayerPartnerRow = {
  assigned_coverage: Record<string, unknown> | null;
  approved_at: string | null;
  approved_by: string | null;
  availability: string[] | null;
  church_affiliation: string | null;
  city: string | null;
  created_at: string;
  date_joined: string | null;
  email: string | null;
  email_alerts: boolean | null;
  first_name: string | null;
  id: string;
  internal_notes: string | null;
  last_name: string | null;
  name: string | null;
  permissions: Record<string, unknown> | null;
  phone: string | null;
  recruited_by: string | null;
  recruited_by_household_id: string | null;
  recruited_by_household_name: string | null;
  recruited_by_profile_slug: string | null;
  region: string | null;
  sms_alerts: boolean | null;
  source: string | null;
  state: string | null;
  status: PartnerStatus;
  updated_at: string | null;
};

type PrayerRequestRow = {
  assigned_partner_ids: string[] | null;
  answered_at: string | null;
  category: string | null;
  confidentiality_level: ConfidentialityLevel;
  created_at: string;
  description: string | null;
  household_id: string | null;
  id: string;
  last_prayed_at: string | null;
  prayer_notes: string | null;
  prayed_count: number | null;
  related_household_id: string | null;
  related_missionary_profile_id: string | null;
  related_region: string | null;
  related_state: string | null;
  request: string;
  status: RequestStatus;
  title: string;
  updated_at: string | null;
  urgency: RequestUrgency;
};

type RawPrayerRequestRow = Omit<PrayerRequestRow, "status"> & {
  status: string | null;
};

type PrayerSubmissionRow = {
  assigned_team: "prayer_team" | "support_team" | null;
  assigned_to: string | null;
  created_at: string;
  email: string | null;
  first_name: string | null;
  form_type: "prayer_request" | "prayer_team_application";
  id: string;
  internal_notes: string | null;
  last_name: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  phone: string | null;
  source_page: string | null;
  status: SubmissionStatus;
};

type PrayerAdminData = {
  applications: PrayerSubmissionRow[];
  error?: string;
  households: HouseholdRow[];
  partners: PrayerPartnerRow[];
  requests: PrayerRequestRow[];
};

function getTab(value?: string): PrayerAdminTab {
  return tabs.some((tab) => tab.key === value) ? value as PrayerAdminTab : "overview";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

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

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function titleLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function permissionLabel(value: string) {
  return titleLabel(value).replace(/\bSms\b/g, "SMS");
}

function partnerName(partner: PrayerPartnerRow) {
  return partner.name
    || [partner.first_name, partner.last_name].filter(Boolean).join(" ").trim()
    || partner.email
    || "Unknown";
}

function submissionName(submission: PrayerSubmissionRow) {
  return [submission.first_name, submission.last_name].filter(Boolean).join(" ").trim()
    || submission.email
    || "Unknown";
}

function payloadValue(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];

  return typeof value === "string" ? value : "";
}

function payloadBoolean(payload: Record<string, unknown> | null, key: string) {
  return payload?.[key] === true;
}

function payloadArray(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

function requestText(request: PrayerRequestRow) {
  return request.request || request.description || "";
}

function relatedHouseholdId(request: PrayerRequestRow) {
  return request.related_household_id || request.household_id || request.related_missionary_profile_id;
}

function requestRelatedTo(request: PrayerRequestRow, householdById: Map<string, HouseholdRow>) {
  const householdId = relatedHouseholdId(request);

  if (householdId && householdById.has(householdId)) {
    return householdById.get(householdId)?.display_name ?? "Missionary household";
  }

  if (request.related_state || request.related_region) {
    return [request.related_state, request.related_region].filter(Boolean).join(" / ");
  }

  return "General";
}

function normalizeSubmissionStatus(status: SubmissionStatus) {
  return status === "follow_up" ? "needs_follow_up" : status;
}

function normalizeRequestStatus(status: string | null): RequestStatus {
  if (status === "active") {
    return "open";
  }

  return requestStatuses.some((option) => option.value === status)
    ? status as RequestStatus
    : "open";
}

function isOpenRequest(request: PrayerRequestRow) {
  return request.status === "open";
}

function isNeedsCoverage(request: PrayerRequestRow) {
  return isOpenRequest(request) && (request.assigned_partner_ids?.length ?? 0) === 0;
}

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "amber" | "blue" | "green" | "muted" | "red";
}) {
  const className = {
    amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]",
    blue: "border-blue-400/25 bg-blue-950/30 text-blue-300",
    green: "border-green-500/25 bg-green-950/30 text-green-300",
    muted: "border-stone-700 bg-stone-900/70 text-stone-300",
    red: "border-red-500/35 bg-red-950/25 text-red-200",
  }[tone];

  return (
    <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 text-[9px] uppercase tracking-[0.13em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status;
  const tone = normalizedStatus === "covered" || normalizedStatus === "active" || normalizedStatus === "converted"
    ? "green"
    : normalizedStatus === "new" || normalizedStatus === "open" || normalizedStatus === "needs_follow_up" || normalizedStatus === "pending"
      ? "amber"
      : normalizedStatus === "archived" || normalizedStatus === "answered" || normalizedStatus === "inactive" || normalizedStatus === "declined"
        ? "muted"
        : "blue";

  return <Badge tone={tone}>{titleLabel(normalizedStatus)}</Badge>;
}

function UrgencyBadge({ urgency }: { urgency: RequestUrgency }) {
  const tone = urgency === "urgent" ? "red" : urgency === "important" ? "amber" : "muted";

  return <Badge tone={tone}>{titleLabel(urgency)}</Badge>;
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "amber" | "green" | "red";
  value: number | string;
}) {
  const toneClassName = {
    amber: "text-[#E4C465]",
    green: "text-green-300",
    red: "text-red-200",
  } as const;

  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <p
        className="text-[10px] uppercase tracking-[0.15em] text-stone-400"
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-bold leading-none ${tone ? toneClassName[tone] : "text-stone-100"}`}
        style={{ fontFamily: font.oswald }}
      >
        {value}
      </p>
    </div>
  );
}

function Message({ children, tone = "info" }: { children: ReactNode; tone?: "error" | "info" | "success" }) {
  const className = {
    error: "border-l-red-400 bg-red-950/10 text-red-100",
    info: "border-l-stone-500 bg-stone-950/60 text-stone-300",
    success: "border-l-green-400 bg-green-950/15 text-green-200",
  }[tone];

  return <div className={`rounded-xl border border-stone-800/75 border-l-2 px-4 py-3 text-sm leading-6 ${className}`}>{children}</div>;
}

function SystemNotice({
  detail,
  title,
  tone = "error",
}: {
  detail?: string;
  title: string;
  tone?: "error" | "info" | "success";
}) {
  return (
    <Message tone={tone}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p>{title}</p>
        {detail ? (
          <details className="shrink-0 text-xs text-stone-400">
            <summary className="cursor-pointer uppercase tracking-[0.14em] text-[#E4C465]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              View Details
            </summary>
            <p className="mt-2 max-w-2xl text-left leading-6 text-stone-400">{detail}</p>
          </details>
        ) : null}
      </div>
    </Message>
  );
}

function TabNav({ activeTab }: { activeTab: PrayerAdminTab }) {
  return (
    <nav className="flex max-w-full flex-wrap gap-2 border-b border-stone-800/80 pb-4" aria-label="Prayer Team admin tabs">
      {tabs.map((tab) => (
        <Link
          className={`${tabButtonClassName} ${
            activeTab === tab.key
              ? "border-[#D4A63D] bg-[#D4A63D] text-black"
              : "border-stone-800 bg-[#090909] text-stone-300 hover:border-stone-600 hover:bg-stone-900/80 hover:text-stone-100"
          }`}
          href={`/admin/prayer-team?tab=${tab.key}`}
          key={tab.key}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.13em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 truncate text-sm text-stone-300">{value || "-"}</div>
    </div>
  );
}

function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-6">
      <p className="text-sm font-semibold text-stone-100">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function DetailFrame({
  badges,
  children,
  closeHref,
  eyebrow,
  title,
}: {
  badges?: ReactNode;
  children: ReactNode;
  closeHref: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
      <aside className="ml-auto h-full w-full max-w-2xl overflow-y-auto border-l border-stone-800 bg-[#070707] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-800/70 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{title}</h2>
            {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}
          </div>
          <Link className={secondaryButtonClassName} href={closeHref} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Close
          </Link>
        </div>
        {children}
      </aside>
    </div>
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

function ActionForm({
  action,
  children,
  fieldName,
  id,
  tone = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  children: string;
  fieldName: string;
  id: string;
  tone?: "amber" | "green" | "outline" | "red";
}) {
  const className = tone === "amber"
    ? "border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
    : tone === "green"
      ? "border-green-500/30 bg-green-950/25 text-green-200 hover:border-green-300"
      : tone === "red"
        ? "border-red-500/30 text-red-200 hover:bg-red-950/25"
        : "border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]";

  return (
    <form action={action}>
      <input name={fieldName} type="hidden" value={id} />
      <button className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg border px-4 text-[11px] uppercase tracking-[0.14em] transition-colors ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
        {children}
      </button>
    </form>
  );
}

function PayloadFields({ payload }: { payload: Record<string, unknown> | null }) {
  const entries = Object.entries(payload ?? {});

  if (entries.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">No extra payload fields were submitted.</p>;
  }

  return (
    <div className="grid gap-2">
      {entries.map(([key, value]) => (
        <div className="rounded-lg border border-stone-900 bg-[#050505] p-3" key={key}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {titleLabel(key).replace(/\bSms\b/g, "SMS").replace(/\bUsa\b/g, "USA")}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-300">{formatPayloadValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function SelectField({
  children,
  defaultValue,
  label,
  name,
}: {
  children: ReactNode;
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select className={inputClassName} defaultValue={defaultValue ?? ""} name={name}>
        {children}
      </select>
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  required,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input className={inputClassName} defaultValue={defaultValue ?? ""} name={name} required={required} />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
  required,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea className="mt-2 min-h-28 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]" defaultValue={defaultValue ?? ""} name={name} required={required} />
    </label>
  );
}

async function loadPrayerAdminData(): Promise<PrayerAdminData> {
  if (!isSupabaseAdminConfigured()) {
    return {
      applications: [],
      error: "Supabase admin environment variables are not configured.",
      households: [],
      partners: [],
      requests: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const [householdsResult, partnersResult, requestsResult] = await Promise.all([
    supabase
      .from("missionary_households")
      .select("id, display_name, slug, primary_state, region")
      .order("display_name", { ascending: true }),
    supabase
      .from("prayer_partners")
      .select("id, first_name, last_name, name, email, phone, city, state, region, church_affiliation, availability, email_alerts, sms_alerts, status, permissions, assigned_coverage, internal_notes, recruited_by, recruited_by_household_id, recruited_by_household_name, recruited_by_profile_slug, source, approved_at, approved_by, date_joined, created_at, updated_at")
      .order("date_joined", { ascending: false }),
    supabase
      .from("prayer_requests")
      .select("id, title, request, description, category, urgency, status, confidentiality_level, household_id, related_household_id, related_missionary_profile_id, related_state, related_region, assigned_partner_ids, prayer_notes, prayed_count, last_prayed_at, answered_at, created_at, updated_at")
      .order("created_at", { ascending: false }),
  ]);

  const error = partnersResult.error?.message
    ?? requestsResult.error?.message
    ?? householdsResult.error?.message;

  if (error) {
    console.error("[Prayer Team Admin] Failed to load prayer team data:", {
      households: householdsResult.error,
      partners: partnersResult.error,
      requests: requestsResult.error,
    });
  }

  return {
    applications: [],
    error: error ? "Prayer Team data could not be loaded." : undefined,
    households: (householdsResult.data ?? []) as HouseholdRow[],
    partners: (partnersResult.data ?? []) as PrayerPartnerRow[],
    requests: ((requestsResult.data ?? []) as RawPrayerRequestRow[]).map((request) => ({
      ...request,
      status: normalizeRequestStatus(request.status),
    })),
  };
}

function SummaryCards({
  households,
  partners,
  requests,
}: {
  households: readonly HouseholdRow[];
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const pendingApplications = partners.filter((partner) => partner.status === "pending").length;
  const activePartners = partners.filter((partner) => partner.status === "active").length;
  const openRequests = requests.filter(isOpenRequest).length;
  const coverageGaps = requests.filter(isNeedsCoverage).length;
  void households;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Pending Applications" tone={pendingApplications > 0 ? "amber" : "green"} value={pendingApplications} />
      <MetricCard label="Active Partners" tone="green" value={activePartners} />
      <MetricCard label="Open Requests" value={openRequests} />
      <MetricCard label="Coverage Gaps" tone={coverageGaps > 0 ? "amber" : "green"} value={coverageGaps} />
    </div>
  );
}

function OverviewTab({
  partners,
  requests,
}: {
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const pendingApplications = partners.filter((partner) => partner.status === "pending").slice(0, 4);
  const activePartners = partners.filter((partner) => partner.status === "active");
  const openRequests = requests.filter(isOpenRequest).slice(0, 4);
  const recentPartnerActivity = partners
    .filter((partner) => partner.status === "active" || partner.status === "pending")
    .slice(0, 4);
  const regionsActive = new Set(
    activePartners.map((partner) => partner.state || partner.region).filter(Boolean),
  ).size;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              New Applications
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-100">Pending review</h2>
          </div>
          <Link className={secondaryButtonClassName} href="/admin/prayer-team?tab=applications" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Review All
          </Link>
        </div>
        <div className="mt-4 grid gap-2">
          {pendingApplications.length > 0 ? pendingApplications.map((partner) => (
            <Link className="rounded-lg border border-stone-800 bg-black/30 p-3 transition-colors hover:border-[#D4A63D]/55" href={`/admin/prayer-team?tab=applications&partner=${partner.id}`} key={partner.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-100">{partnerName(partner)}</p>
                  <p className="mt-0.5 truncate text-xs text-stone-500">{partner.email || "No email"}</p>
                </div>
                <StatusBadge status={partner.status} />
              </div>
            </Link>
          )) : (
            <EmptyState title="No pending applications." />
          )}
        </div>
      </section>

      <div className="grid gap-4">
        <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Open Prayer Requests
              </p>
              <p className="mt-1 text-3xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                {requests.filter(isOpenRequest).length}
              </p>
            </div>
            <Link className={secondaryButtonClassName} href="/admin/prayer-team?tab=requests" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Open
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {openRequests.length > 0 ? openRequests.map((request) => (
              <Link className="rounded-lg border border-stone-800 bg-black/30 p-3 transition-colors hover:border-[#D4A63D]/55" href={`/admin/prayer-team?tab=requests&request=${request.id}`} key={request.id}>
                <p className="truncate text-sm font-semibold text-stone-100">{request.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{requestText(request)}</p>
              </Link>
            )) : (
              <p className="text-sm text-stone-500">All clear.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Recent Partner Activity
              </p>
              <p className="mt-1 text-sm text-stone-400">{regionsActive} active region{regionsActive === 1 ? "" : "s"}</p>
            </div>
            <Link className={secondaryButtonClassName} href="/admin/prayer-team?tab=partners" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Partners
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {recentPartnerActivity.length > 0 ? recentPartnerActivity.map((partner) => (
              <div className="rounded-lg border border-stone-800 bg-black/30 p-3" key={partner.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-100">{partnerName(partner)}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {partner.status === "pending" ? "Applied to join prayer team" : "Approved prayer partner"}
                    </p>
                  </div>
                  <StatusBadge status={partner.status} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-stone-500">No prayer partner activity yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RequestCreateForm({
  households,
  partners,
}: {
  households: readonly HouseholdRow[];
  partners: readonly PrayerPartnerRow[];
}) {
  return (
    <details className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4" id="create-prayer-request">
      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.16em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Create Prayer Request
      </summary>
      <form action={createPrayerRequest} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Title" name="title" required />
          <SelectField label="Category" name="category">
            {prayerCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </SelectField>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Related Household" name="related_household_id">
            <option value="">General / unassigned</option>
            {households.map((household) => <option key={household.id} value={household.id}>{household.display_name}</option>)}
          </SelectField>
          <TextField label="Related State" name="related_state" />
          <TextField label="Related Region" name="related_region" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Urgency" name="urgency">
            {urgencies.map((urgency) => <option key={urgency.value} value={urgency.value}>{urgency.label}</option>)}
          </SelectField>
          <SelectField label="Confidentiality" name="confidentiality_level">
            {confidentialityLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
          </SelectField>
          <SelectField label="Initial Partner" name="partner_ids">
            <option value="">Unassigned</option>
            {partners.filter((partner) => partner.status === "active").map((partner) => <option key={partner.id} value={partner.id}>{partnerName(partner)}</option>)}
          </SelectField>
        </div>
        <TextAreaField label="Prayer Request" name="request" required />
        <TextAreaField label="Prayer Notes" name="prayer_notes" />
        <button className={`${primaryButtonClassName} w-full md:w-auto`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Create Request
        </button>
      </form>
    </details>
  );
}

function filterRequests(requests: readonly PrayerRequestRow[], params: SearchParams, householdById: Map<string, HouseholdRow>) {
  const q = normalize(params.q);

  return requests.filter((request) => {
    const relatedTo = requestRelatedTo(request, householdById);
    const partnerFilter = params.partner;
    const searchable = [
      request.title,
      requestText(request),
      request.category,
      relatedTo,
      request.related_state,
      request.related_region,
    ].filter(Boolean).join(" ").toLowerCase();

    return (!q || searchable.includes(q))
      && (!params.status || request.status === params.status)
      && (!params.urgency || request.urgency === params.urgency)
      && (!params.category || request.category === params.category)
      && (!partnerFilter || request.assigned_partner_ids?.includes(partnerFilter));
  });
}

function RequestsTab({
  households,
  params,
  partners,
  requests,
}: {
  households: readonly HouseholdRow[];
  params: SearchParams;
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const householdById = new Map(households.map((household) => [household.id, household]));
  const partnerById = new Map(partners.map((partner) => [partner.id, partner]));
  const filteredRequests = filterRequests(requests, params, householdById);
  const selectedRequest = params.request
    ? requests.find((request) => request.id === params.request) ?? null
    : null;

  return (
    <div className="space-y-5">
      <form className="grid min-w-0 gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-start" action="/admin/prayer-team" method="get">
        <input name="tab" type="hidden" value="requests" />
        <input className={toolbarInputClassName} defaultValue={params.q ?? ""} name="q" placeholder="Search requests" />
        <details className="rounded-lg border border-stone-800 bg-[#050505] px-3 py-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.14em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Filters
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select className={toolbarInputClassName} defaultValue={params.status ?? ""} name="status">
              <option value="">All Statuses</option>
              {requestStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select className={toolbarInputClassName} defaultValue={params.urgency ?? ""} name="urgency">
              <option value="">All Urgency</option>
              {urgencies.map((urgency) => <option key={urgency.value} value={urgency.value}>{urgency.label}</option>)}
            </select>
            <select className={toolbarInputClassName} defaultValue={params.category ?? ""} name="category">
              <option value="">All Categories</option>
              {prayerCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </details>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button className={primaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Apply
          </button>
          <a className={secondaryButtonClassName} href="#create-prayer-request" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Create Request
          </a>
        </div>
      </form>

      <RequestCreateForm households={households} partners={partners} />

      <section className="grid gap-3">
        {filteredRequests.length > 0 ? filteredRequests.map((request) => {
          const assignedNames = (request.assigned_partner_ids ?? [])
            .map((id) => partnerById.get(id))
            .filter((partner): partner is PrayerPartnerRow => Boolean(partner))
            .map(partnerName);

          return (
            <Link
              className={`min-w-0 rounded-xl border p-4 text-sm transition-colors hover:border-stone-700 hover:bg-stone-950/80 ${
                selectedRequest?.id === request.id
                  ? "border-[#D4A63D]/55 bg-[#C9A24A]/[0.07]"
                  : "border-stone-800/75 bg-[#080808]/90"
              }`}
              href={`/admin/prayer-team?tab=requests&request=${request.id}`}
              key={request.id}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-stone-100">{request.title}</p>
                    <UrgencyBadge urgency={request.urgency} />
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{requestText(request)}</p>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <MetaItem label="Related" value={requestRelatedTo(request, householdById)} />
                  <MetaItem label="Category" value={request.category || "General"} />
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <MetaItem label="Coverage" value={assignedNames.length > 0 ? assignedNames.join(", ") : "Unassigned"} />
                  <MetaItem label="Last Prayed" value={formatDate(request.last_prayed_at)} />
                </div>
                <span className={secondaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Manage</span>
              </div>
            </Link>
          );
        }) : (
          <EmptyState
            action={<a className={primaryButtonClassName} href="#create-prayer-request" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Create Request</a>}
            description="Prayer requests submitted through DOS or public forms will appear here."
            title="No active prayer requests yet."
          />
        )}
      </section>

      <RequestDetailDrawer households={households} partners={partners} request={selectedRequest} />
    </div>
  );
}

function RequestDetailDrawer({
  households,
  partners,
  request,
}: {
  households: readonly HouseholdRow[];
  partners: readonly PrayerPartnerRow[];
  request: PrayerRequestRow | null;
}) {
  if (!request) {
    return null;
  }

  const householdById = new Map(households.map((household) => [household.id, household]));
  const assignedPartnerIds = new Set(request.assigned_partner_ids ?? []);
  const activePartners = partners.filter((partner) => partner.status === "active");
  const assignedPartners = activePartners.filter((partner) => assignedPartnerIds.has(partner.id));

  return (
    <DetailFrame
      badges={(
        <>
          <UrgencyBadge urgency={request.urgency} />
          <StatusBadge status={request.status} />
          <Badge tone="amber">{request.category || "General"}</Badge>
        </>
      )}
      closeHref="/admin/prayer-team?tab=requests"
      eyebrow="Prayer Request"
      title={request.title}
    >

      <div className="mt-5 space-y-5">
        <DetailItem label="Full Prayer Request" value={<p className="whitespace-pre-wrap">{requestText(request)}</p>} />
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Confidentiality" value={titleLabel(request.confidentiality_level)} />
          <DetailItem label="Related To" value={requestRelatedTo(request, householdById)} />
          <DetailItem label="Related State / Region" value={[request.related_state, request.related_region].filter(Boolean).join(" / ") || "-"} />
          <DetailItem label="Assigned Prayer Partners" value={assignedPartners.length > 0 ? assignedPartners.map(partnerName).join(", ") : "Unassigned"} />
          <DetailItem label="Prayed Count" value={String(request.prayed_count ?? 0)} />
          <DetailItem label="Last Prayed Date" value={formatDate(request.last_prayed_at)} />
        </div>
      </div>

      <form action={updatePrayerRequest} className="mt-6 border-y border-stone-800/70 py-5">
        <input name="request_id" type="hidden" value={request.id} />
        <div className="grid gap-4">
          <TextField defaultValue={request.title} label="Title" name="title" required />
          <TextAreaField defaultValue={requestText(request)} label="Full Prayer Request" name="request" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField defaultValue={request.category ?? "General"} label="Category" name="category">
              {prayerCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </SelectField>
            <SelectField defaultValue={request.status} label="Status" name="status">
              {requestStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </SelectField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField defaultValue={request.urgency} label="Urgency" name="urgency">
              {urgencies.map((urgency) => <option key={urgency.value} value={urgency.value}>{urgency.label}</option>)}
            </SelectField>
            <SelectField defaultValue={request.confidentiality_level} label="Confidentiality" name="confidentiality_level">
              {confidentialityLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
            </SelectField>
          </div>
          <SelectField defaultValue={relatedHouseholdId(request) ?? ""} label="Related Missionary Household" name="related_household_id">
            <option value="">General / unassigned</option>
            {households.map((household) => <option key={household.id} value={household.id}>{household.display_name}</option>)}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField defaultValue={request.related_state} label="Related State" name="related_state" />
            <TextField defaultValue={request.related_region} label="Related Region" name="related_region" />
          </div>
          <TextAreaField defaultValue={request.prayer_notes} label="Prayer Notes" name="prayer_notes" />
          <button className={`${primaryButtonClassName} w-full`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Save Request
          </button>
        </div>
      </form>

      <form action={assignPrayerRequestPartners} className="mt-5 border-b border-stone-800/70 pb-5">
        <input name="request_id" type="hidden" value={request.id} />
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Assign Partners
        </p>
        <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-stone-900 bg-[#050505] p-3">
          {activePartners.length > 0 ? activePartners.map((partner) => (
            <label className="flex items-center gap-2 text-sm text-stone-300" key={partner.id}>
              <input className="accent-[#D4A63D]" defaultChecked={assignedPartnerIds.has(partner.id)} name="partner_ids" type="checkbox" value={partner.id} />
              <span>{partnerName(partner)}</span>
            </label>
          )) : (
            <p className="text-sm text-stone-500">No active prayer partners are available yet.</p>
          )}
        </div>
        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={request.prayer_notes ?? ""} name="prayer_notes" placeholder="Coverage notes" />
        <button className={`${secondaryButtonClassName} mt-3 w-full`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Assign Partners
        </button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ActionForm action={markPrayerRequestPrayed} fieldName="request_id" id={request.id}>Mark Prayed</ActionForm>
        <ActionForm action={markPrayerRequestCovered} fieldName="request_id" id={request.id} tone="green">Mark Covered</ActionForm>
        <ActionForm action={markPrayerRequestAnswered} fieldName="request_id" id={request.id}>Mark Answered</ActionForm>
        <ActionForm action={archivePrayerRequest} fieldName="request_id" id={request.id} tone="red">Archive</ActionForm>
      </div>
    </DetailFrame>
  );
}

function filterPartners(partners: readonly PrayerPartnerRow[], params: SearchParams) {
  const q = normalize(params.q);

  return partners.filter((partner) => {
    const searchable = [
      partnerName(partner),
      partner.email,
      partner.phone,
      partner.city,
      partner.state,
      partner.region,
      partner.church_affiliation,
    ].filter(Boolean).join(" ").toLowerCase();

    return (!q || searchable.includes(q))
      && (!params.status || partner.status === params.status)
      && (!params.state || normalize(partner.state) === normalize(params.state))
      && (!params.region || normalize(partner.region) === normalize(params.region));
  });
}

function PartnersTab({
  params,
  partners,
  requests,
}: {
  params: SearchParams;
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const partnerPool = params.status ? partners : partners.filter((partner) => partner.status === "active");
  const filteredPartners = filterPartners(partnerPool, params);
  const selectedPartner = params.partner
    ? partners.find((partner) => partner.id === params.partner) ?? null
    : null;
  const states = Array.from(new Set(partnerPool.map((partner) => partner.state).filter(Boolean) as string[])).sort();
  const regions = Array.from(new Set(partnerPool.map((partner) => partner.region).filter(Boolean) as string[])).sort();

  return (
    <div className="space-y-5">
      <form className="grid min-w-0 gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-start" action="/admin/prayer-team" method="get">
        <input name="tab" type="hidden" value="partners" />
        <input className={toolbarInputClassName} defaultValue={params.q ?? ""} name="q" placeholder="Search partners" />
        <details className="rounded-lg border border-stone-800 bg-[#050505] px-3 py-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.14em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Filters
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select className={toolbarInputClassName} defaultValue={params.state ?? ""} name="state">
              <option value="">All States</option>
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <select className={toolbarInputClassName} defaultValue={params.region ?? ""} name="region">
              <option value="">All Regions</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
            <select className={toolbarInputClassName} defaultValue={params.status ?? ""} name="status">
              <option value="">All Statuses</option>
              {partnerStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
        </details>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button className={primaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Apply
          </button>
        </div>
      </form>

      <section className="grid gap-3">
        {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
          <Link
            className={`min-w-0 rounded-xl border p-4 text-sm transition-colors hover:border-stone-700 hover:bg-stone-950/80 ${
              selectedPartner?.id === partner.id
                ? "border-[#D4A63D]/55 bg-[#C9A24A]/[0.07]"
                : "border-stone-800/75 bg-[#080808]/90"
            }`}
            href={`/admin/prayer-team?tab=partners&partner=${partner.id}`}
            key={partner.id}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-stone-100">{partnerName(partner)}</p>
                  <StatusBadge status={partner.status} />
                </div>
                <p className="mt-1 truncate text-xs text-stone-500">{partner.church_affiliation || "Prayer partner"}</p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <MetaItem label="Email" value={partner.email || "-"} />
                <MetaItem label="Phone" value={partner.phone || "-"} />
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <MetaItem label="City" value={partner.city || "-"} />
                <MetaItem label="Region" value={partner.region || partner.state || "-"} />
              </div>
              <span className={secondaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Manage</span>
            </div>
          </Link>
        )) : (
          <EmptyState
            description="Approved prayer partners will appear here after applications are converted."
            title="No prayer partners yet."
          />
        )}
      </section>

      <PartnerDetailDrawer partner={selectedPartner} requests={requests} />
    </div>
  );
}

function PartnerDetailDrawer({
  partner,
  requests,
}: {
  partner: PrayerPartnerRow | null;
  requests: readonly PrayerRequestRow[];
}) {
  if (!partner) {
    return null;
  }

  const assignedRequests = requests.filter((request) => request.assigned_partner_ids?.includes(partner.id));
  const permissions = partner.permissions ?? {};
  const assignedCoverage = JSON.stringify(partner.assigned_coverage ?? {}, null, 2);

  return (
    <DetailFrame
      badges={(
        <>
          <StatusBadge status={partner.status} />
          {partner.email_alerts ? <Badge tone="green">Email Alerts</Badge> : null}
          {partner.sms_alerts ? <Badge tone="green">SMS Alerts</Badge> : null}
        </>
      )}
      closeHref="/admin/prayer-team?tab=partners"
      eyebrow="Prayer Partner"
      title={partnerName(partner)}
    >

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Email" value={partner.email ? <a className="hover:text-[#F5B942]" href={`mailto:${partner.email}`}>{partner.email}</a> : "-"} />
        <DetailItem label="Phone" value={partner.phone || "-"} />
        <DetailItem label="City / State" value={[partner.city, partner.state].filter(Boolean).join(", ") || "-"} />
        <DetailItem label="Region" value={partner.region || "-"} />
        <DetailItem label="Church" value={partner.church_affiliation || "-"} />
        <DetailItem label="Date Joined" value={formatDate(partner.date_joined || partner.created_at)} />
        <DetailItem label="Availability" value={(partner.availability ?? []).join(", ") || "-"} />
        <DetailItem label="Assigned Requests" value={String(assignedRequests.length)} />
      </div>

      <form action={updatePrayerPartner} className="mt-6 border-y border-stone-800/70 py-5">
        <input name="partner_id" type="hidden" value={partner.id} />
        <SelectField defaultValue={partner.status} label="Status" name="status">
          {partnerStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </SelectField>
        <div className="mt-4 grid gap-2">
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input className="accent-[#D4A63D]" defaultChecked={Boolean(partner.email_alerts)} name="email_alerts" type="checkbox" />
            Email alerts
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input className="accent-[#D4A63D]" defaultChecked={Boolean(partner.sms_alerts)} name="sms_alerts" type="checkbox" />
            SMS alerts
          </label>
        </div>
        <div className="mt-4 grid gap-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Permissions
          </p>
          {partnerPermissions.map((permission) => (
            <label className="flex items-center gap-2 text-sm text-stone-300" key={permission}>
              <input className="accent-[#D4A63D]" defaultChecked={permissions[permission] === true} name="permissions" type="checkbox" value={permission} />
              {permissionLabel(permission)}
            </label>
          ))}
        </div>
        <TextAreaField defaultValue={assignedCoverage} label="Assigned Coverage Areas JSON" name="assigned_coverage" />
        <TextAreaField defaultValue={partner.internal_notes} label="Internal Notes" name="internal_notes" />
        <button className={`${primaryButtonClassName} mt-4 w-full`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Edit Partner
        </button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ActionForm action={deactivatePrayerPartner} fieldName="partner_id" id={partner.id} tone="red">Deactivate</ActionForm>
        <Link className={secondaryButtonClassName} href={`/admin/prayer-team?tab=requests&partner=${partner.id}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          View Assigned Requests
        </Link>
      </div>
    </DetailFrame>
  );
}

function ApplicationsTab({
  params,
  partners,
}: {
  params: SearchParams;
  partners: readonly PrayerPartnerRow[];
}) {
  const applications = partners.filter((partner) => partner.status === "pending");
  const filteredApplications = filterPartners(applications, params);
  const selectedApplication = params.partner
    ? applications.find((partner) => partner.id === params.partner) ?? null
    : null;

  return (
    <div className="space-y-5">
      <form className="grid min-w-0 gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-3 lg:grid-cols-[minmax(260px,1fr)_auto]" action="/admin/prayer-team" method="get">
        <input name="tab" type="hidden" value="applications" />
        <input className={toolbarInputClassName} defaultValue={params.q ?? ""} name="q" placeholder="Search applications" />
        <button className={primaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Search
        </button>
      </form>

      <section className="grid gap-3">
        {filteredApplications.length > 0 ? filteredApplications.map((application) => (
          <article
            className={`min-w-0 rounded-xl border p-4 text-sm transition-colors hover:border-stone-700 hover:bg-stone-950/80 ${
              selectedApplication?.id === application.id
                ? "border-[#D4A63D]/55 bg-[#C9A24A]/[0.07]"
                : "border-stone-800/75 bg-[#080808]/90"
            }`}
            key={application.id}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-stone-100">{partnerName(application)}</p>
                  <StatusBadge status={application.status} />
                </div>
                <p className="mt-1 truncate text-xs text-stone-500">{application.recruited_by_household_name || application.recruited_by || "Public profile application"}</p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <MetaItem label="Email" value={application.email || "-"} />
                <MetaItem label="Phone" value={application.phone || "-"} />
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <MetaItem label="Location" value={[application.city, application.state || application.region].filter(Boolean).join(", ") || "-"} />
                <MetaItem label="Submitted" value={formatDate(application.created_at)} />
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link className={secondaryButtonClassName} href={`/admin/prayer-team?tab=applications&partner=${application.id}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Manage
                </Link>
                <ActionForm action={approvePrayerPartnerApplication} fieldName="partner_id" id={application.id} tone="green">Approve</ActionForm>
                <ActionForm action={declinePrayerPartnerApplication} fieldName="partner_id" id={application.id} tone="red">Decline</ActionForm>
              </div>
            </div>
          </article>
        )) : (
          <EmptyState
            title="No pending applications."
          />
        )}
      </section>

      <ApplicationDetailDrawer application={selectedApplication} />
    </div>
  );
}

function ApplicationDetailDrawer({ application }: { application: PrayerPartnerRow | null }) {
  if (!application) {
    return null;
  }

  return (
    <DetailFrame
      badges={(
        <>
          <StatusBadge status={application.status} />
          <Badge tone="amber">Application</Badge>
        </>
      )}
      closeHref="/admin/prayer-team?tab=applications"
      eyebrow="Prayer Application"
      title={partnerName(application)}
    >

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Email" value={application.email ? <a className="hover:text-[#F5B942]" href={`mailto:${application.email}`}>{application.email}</a> : "-"} />
        <DetailItem label="Phone" value={application.phone || "-"} />
        <DetailItem label="City / State" value={[application.city, application.state].filter(Boolean).join(", ") || "-"} />
        <DetailItem label="Region" value={application.region || "-"} />
        <DetailItem label="Household" value={application.recruited_by_household_name || application.recruited_by || "-"} />
        <DetailItem label="Source" value={titleLabel(application.source || "public_profile")} />
        <DetailItem label="Submitted" value={formatDate(application.created_at)} />
        <DetailItem label="Email Alerts" value={application.email_alerts ? "Yes" : "No"} />
      </div>

      <div className="mt-5 grid gap-3">
        <ActionForm action={approvePrayerPartnerApplication} fieldName="partner_id" id={application.id} tone="green">Approve</ActionForm>
        <ActionForm action={declinePrayerPartnerApplication} fieldName="partner_id" id={application.id} tone="red">Decline</ActionForm>
      </div>
    </DetailFrame>
  );
}

function coverageMatches(row: string, request: PrayerRequestRow) {
  const text = `${request.category ?? ""} ${request.title} ${requestText(request)}`.toLowerCase();

  switch (row) {
    case "Kitchen Tables":
      return text.includes("kitchen");
    case "Missionary Couples":
      return text.includes("missionary") || request.confidentiality_level === "missionary_couple";
    case "Leaders":
      return text.includes("leader") || text.includes("leadership");
    case "States":
      return Boolean(request.related_state) || text.includes("state");
    case "Major Cities":
      return text.includes("city");
    case "Government":
      return text.includes("government");
    case "Finances":
      return text.includes("finance") || text.includes("financial");
    case "Families":
      return text.includes("family");
    case "Salvation":
      return text.includes("salvation");
    case "Deliverance":
      return text.includes("deliverance");
    default:
      return false;
  }
}

function getCoverageStatus(rowRequests: readonly PrayerRequestRow[]) {
  if (rowRequests.length === 0) {
    return "Covered";
  }

  const activeRequests = rowRequests.filter((request) => request.status === "open" || request.status === "covered");

  if (activeRequests.length === 0) {
    return "Completed";
  }

  if (activeRequests.some((request) => request.urgency === "urgent")) {
    return "Needs Coverage";
  }

  if (activeRequests.some(isNeedsCoverage)) {
    return "Needs Coverage";
  }

  if (activeRequests.every((request) => request.status === "covered")) {
    return "Covered";
  }

  return "Active";
}

function CoverageBadge({ status }: { status: string }) {
  const tone = status === "Covered"
    ? "green"
    : status === "Needs Coverage"
      ? "amber"
      : status === "Completed"
        ? "muted"
        : "blue";

  return <Badge tone={tone}>{status}</Badge>;
}

function CoverageBoardTab({
  partners,
  requests,
}: {
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const activePartners = partners.filter((partner) => partner.status === "active");

  return (
    <div className="grid gap-3">
      {coverageRows.map((row) => {
        const rowRequests = requests.filter((request) => coverageMatches(row, request));
        const openRequests = rowRequests.filter((request) => request.status === "open");
        const assignedPartnerIds = new Set(rowRequests.flatMap((request) => request.assigned_partner_ids ?? []));
        const assignedPartners = activePartners.filter((partner) => assignedPartnerIds.has(partner.id));
        const lastPrayed = rowRequests
          .map((request) => request.last_prayed_at)
          .filter((value): value is string => Boolean(value))
          .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];
        const coverageStatus = getCoverageStatus(rowRequests);
        const urgent = rowRequests.some((request) => request.urgency === "urgent" && request.status === "open");

        return (
          <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4" key={row}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-stone-100">{row}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CoverageBadge status={coverageStatus} />
                  {urgent ? <Badge tone="red">Urgent</Badge> : null}
                  {coverageStatus === "Needs Coverage" ? <Badge tone="amber">Needs Action</Badge> : <Badge tone="green">Stable</Badge>}
                </div>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <MetaItem label="Open Requests" value={openRequests.length} />
                <MetaItem label="Last Prayed" value={formatDate(lastPrayed)} />
              </div>
              <MetaItem label="Assigned Partners" value={assignedPartners.length > 0 ? assignedPartners.map(partnerName).join(", ") : "Unassigned"} />
              <Link className={secondaryButtonClassName} href={`/admin/prayer-team?tab=requests&q=${encodeURIComponent(row)}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                View Requests
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RegionsTab({
  households,
  partners,
  requests,
}: {
  households: readonly HouseholdRow[];
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const labels = new Set<string>();

  partners.forEach((partner) => {
    if (partner.state) labels.add(partner.state);
    if (partner.region) labels.add(partner.region);
  });
  households.forEach((household) => {
    if (household.primary_state) labels.add(household.primary_state);
    if (household.region) labels.add(household.region);
  });
  requests.forEach((request) => {
    if (request.related_state) labels.add(request.related_state);
    if (request.related_region) labels.add(request.related_region);
  });

  const rows = Array.from(labels).sort((first, second) => first.localeCompare(second));

  return (
    <div className="grid gap-3">
      {rows.length > 0 ? rows.map((label) => {
        const assignedPartners = partners.filter((partner) => partner.status === "active" && (partner.state === label || partner.region === label));
        const activeHouseholds = households.filter((household) => household.primary_state === label || household.region === label);
        const relatedRequests = requests.filter((request) => request.related_state === label || request.related_region === label);
        const openRequests = relatedRequests.filter(isOpenRequest);
        const lastPrayed = relatedRequests
          .map((request) => request.last_prayed_at)
          .filter((value): value is string => Boolean(value))
          .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];
        const coverageStatus = getCoverageStatus(relatedRequests);

        return (
          <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4" key={label}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-stone-100">{label}</p>
                <div className="mt-2">
                  <CoverageBadge status={coverageStatus} />
                </div>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <MetaItem label="Partners" value={assignedPartners.length} />
                <MetaItem label="Households" value={activeHouseholds.length} />
                <MetaItem label="Requests" value={openRequests.length} />
              </div>
              <MetaItem label="Last Prayed" value={formatDate(lastPrayed)} />
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link className={secondaryButtonClassName} href="/admin/prayer-team?tab=partners" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Partners</Link>
                <Link className={secondaryButtonClassName} href={`/admin/prayer-team?tab=requests&q=${encodeURIComponent(label)}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Requests</Link>
              </div>
            </div>
          </div>
        );
      }) : (
        <EmptyState
          description="State and regional prayer coverage will appear as partners, households, and prayer requests are assigned."
          title="No regions yet."
        />
      )}
    </div>
  );
}

function EmailPreviewTab({ requests }: { requests: readonly PrayerRequestRow[] }) {
  const previewRequest = requests.find((request) => request.status === "open") ?? requests[0];
  const subject = previewRequest
    ? `Prayer Alert: ${previewRequest.title}`
    : "Prayer Alert: New USA Missionaries request";
  const body = previewRequest
    ? `Hi Prayer Team,\n\nPlease cover this request in prayer.\n\nTitle: ${previewRequest.title}\nCategory: ${previewRequest.category || "General"}\nUrgency: ${titleLabel(previewRequest.urgency)}\n\n${requestText(previewRequest)}\n\nThank you for standing with USA Missionaries.`
    : "Hi Prayer Team,\n\nA future prayer alert will appear here once a request is selected.\n\nThank you for standing with USA Missionaries.";

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Recipient Segment
        </p>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-stone-300">
          <DetailItem label="Segment" value="Approved prayer partners" />
          <DetailItem label="Merge Fields" value="{first_name}, {request_title}, {category}, {urgency}, {profile_url}" />
          <DetailItem label="Delivery" value="Preview only" />
        </div>
        <div className="mt-5 grid gap-3">
          <button className={primaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Preview Alert
          </button>
          <button className={secondaryButtonClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Copy Email Text
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-stone-800/75 bg-stone-100 p-6 text-stone-950">
        <p className="text-xs uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Subject Preview
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{subject}</h2>
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Email Body Preview
        </p>
        <pre className="mt-3 whitespace-pre-wrap border-t border-stone-300 pt-5 text-sm leading-6">{body}</pre>
      </div>
    </div>
  );
}

function PermissionBlocked() {
  return (
    <SystemNotice title="Prayer Team access is not enabled for this admin account." />
  );
}

export default async function PrayerTeamAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = getTab(params.tab);
  const authorization = await getAdminAuthorization();
  const canManagePrayer = hasPrayerAdminAccess(authorization);
  const data: PrayerAdminData = canManagePrayer
    ? await loadPrayerAdminData()
    : { applications: [], households: [], partners: [], requests: [] };

  return (
    <AdminShell
      active="prayer"
      title="Prayer Team"
    >
      <div className="space-y-5">
        {!canManagePrayer ? (
          <PermissionBlocked />
        ) : (
          <>
            {data.error ? (
              <SystemNotice
                title={data.error}
              />
            ) : null}
            {params.saved ? <SystemNotice title="Prayer Team changes saved." tone="success" /> : null}
            {params.error ? <SystemNotice detail={params.error} title="Prayer Team action could not be completed." /> : null}

            <SummaryCards households={data.households} partners={data.partners} requests={data.requests} />
            <TabNav activeTab={activeTab} />

            {activeTab === "overview" ? (
              <OverviewTab partners={data.partners} requests={data.requests} />
            ) : null}
            {activeTab === "applications" ? (
              <ApplicationsTab params={params} partners={data.partners} />
            ) : null}
            {activeTab === "partners" ? (
              <PartnersTab params={params} partners={data.partners} requests={data.requests} />
            ) : null}
            {activeTab === "requests" ? (
              <RequestsTab households={data.households} params={params} partners={data.partners} requests={data.requests} />
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}
