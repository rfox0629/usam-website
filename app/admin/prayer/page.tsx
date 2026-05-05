import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import {
  approvePrayerTeamApplication,
  archivePrayerRequest,
  archivePrayerSubmission,
  assignPrayerRequestPartners,
  createPrayerRequest,
  deactivatePrayerPartner,
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

const tabs = [
  { key: "requests", label: "Prayer Requests" },
  { key: "partners", label: "Prayer Partners" },
  { key: "applications", label: "Applications" },
  { key: "coverage", label: "Coverage Board" },
  { key: "regions", label: "States / Regions" },
  { key: "email", label: "Email Preview" },
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
  region: string | null;
  sms_alerts: boolean | null;
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
  return tabs.some((tab) => tab.key === value) ? value as PrayerAdminTab : "requests";
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

function isThisWeek(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return date >= weekAgo;
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
    <span className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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

function MetricCard({ label, value }: { label: string; value: number | string }) {
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

function Message({ children, tone = "info" }: { children: ReactNode; tone?: "error" | "info" | "success" }) {
  const className = {
    error: "border-red-500/30 bg-red-950/20 text-red-100",
    info: "border-stone-800 bg-stone-950/60 text-stone-300",
    success: "border-green-500/25 bg-green-950/20 text-green-200",
  }[tone];

  return <p className={`border p-4 text-sm leading-6 ${className}`}>{children}</p>;
}

function TabNav({ activeTab }: { activeTab: PrayerAdminTab }) {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-stone-800/80 pb-3" aria-label="Prayer Team admin tabs">
      {tabs.map((tab) => (
        <Link
          className={`shrink-0 border px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
            activeTab === tab.key
              ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
              : "border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100"
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
      <button className={`inline-flex min-h-10 w-full items-center justify-center border px-4 text-[11px] uppercase tracking-[0.16em] transition-colors ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
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
        <div className="border border-stone-900 bg-[#050505] p-3" key={key}>
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
      <select className="mt-2 min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={defaultValue ?? ""} name={name}>
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
      <input className="mt-2 min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]" defaultValue={defaultValue ?? ""} name={name} required={required} />
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
      <textarea className="mt-2 min-h-28 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]" defaultValue={defaultValue ?? ""} name={name} required={required} />
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
  const [householdsResult, partnersResult, requestsResult, applicationsResult] = await Promise.all([
    supabase
      .from("missionary_households")
      .select("id, display_name, slug, primary_state, region")
      .order("display_name", { ascending: true }),
    supabase
      .from("prayer_partners")
      .select("id, first_name, last_name, name, email, phone, city, state, region, church_affiliation, availability, email_alerts, sms_alerts, status, permissions, assigned_coverage, internal_notes, recruited_by, date_joined, created_at, updated_at")
      .order("date_joined", { ascending: false }),
    supabase
      .from("prayer_requests")
      .select("id, title, request, description, category, urgency, status, confidentiality_level, household_id, related_household_id, related_missionary_profile_id, related_state, related_region, assigned_partner_ids, prayer_notes, prayed_count, last_prayed_at, answered_at, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("form_submissions")
      .select("id, form_type, source_page, first_name, last_name, email, phone, message, payload, status, assigned_team, assigned_to, internal_notes, created_at")
      .eq("assigned_team", "prayer_team")
      .in("form_type", ["prayer_team_application", "prayer_request"])
      .order("created_at", { ascending: false }),
  ]);

  const error = partnersResult.error?.message
    ?? requestsResult.error?.message
    ?? applicationsResult.error?.message
    ?? householdsResult.error?.message;

  return {
    applications: (applicationsResult.data ?? []) as PrayerSubmissionRow[],
    error,
    households: (householdsResult.data ?? []) as HouseholdRow[],
    partners: (partnersResult.data ?? []) as PrayerPartnerRow[],
    requests: ((requestsResult.data ?? []) as RawPrayerRequestRow[]).map((request) => ({
      ...request,
      status: normalizeRequestStatus(request.status),
    })),
  };
}

function SummaryCards({
  applications,
  households,
  partners,
  requests,
}: {
  applications: readonly PrayerSubmissionRow[];
  households: readonly HouseholdRow[];
  partners: readonly PrayerPartnerRow[];
  requests: readonly PrayerRequestRow[];
}) {
  const activePartners = partners.filter((partner) => partner.status === "active").length;
  const pendingApplications = applications.filter((submission) => submission.form_type === "prayer_team_application" && !["converted", "archived"].includes(submission.status)).length;
  const openRequests = requests.filter(isOpenRequest).length;
  const needsCoverage = requests.filter(isNeedsCoverage).length;
  const coveredThisWeek = requests.filter((request) => isThisWeek(request.last_prayed_at)).length;
  const coverageKeys = new Set([
    ...partners.filter((partner) => partner.status === "active").map((partner) => partner.state || partner.region).filter(Boolean),
    ...households.map((household) => household.primary_state || household.region).filter(Boolean),
  ]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <MetricCard label="Active Prayer Partners" value={activePartners} />
      <MetricCard label="Pending Applications" value={pendingApplications} />
      <MetricCard label="Open Prayer Requests" value={openRequests} />
      <MetricCard label="Needs Coverage" value={needsCoverage} />
      <MetricCard label="Covered This Week" value={coveredThisWeek} />
      <MetricCard label="States / Regions Covered" value={coverageKeys.size} />
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
    <details className="border border-stone-800/75 bg-[#080808]/85 p-4">
      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
        <button className="inline-flex min-h-10 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] md:w-auto" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
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
      <form className="grid gap-3 border border-stone-800 bg-[#080808]/85 p-4 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_auto]" action="/admin/prayer-team" method="get">
        <input name="tab" type="hidden" value="requests" />
        <input className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]" defaultValue={params.q ?? ""} name="q" placeholder="Search requests, category, household, state" />
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.status ?? ""} name="status">
          <option value="">All Statuses</option>
          {requestStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.urgency ?? ""} name="urgency">
          <option value="">All Urgency</option>
          {urgencies.map((urgency) => <option key={urgency.value} value={urgency.value}>{urgency.label}</option>)}
        </select>
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.category ?? ""} name="category">
          <option value="">All Categories</option>
          {prayerCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <button className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Filter
        </button>
      </form>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div className="hidden grid-cols-[1.3fr_0.7fr_1fr_0.55fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {["Request", "Category", "Related To", "Urgency", "Status", "Assigned Partners", "Last Prayed", "Actions"].map((heading) => <span key={heading}>{heading}</span>)}
          </div>
          <div className="divide-y divide-stone-900">
            {filteredRequests.length > 0 ? filteredRequests.map((request) => {
              const assignedNames = (request.assigned_partner_ids ?? [])
                .map((id) => partnerById.get(id))
                .filter((partner): partner is PrayerPartnerRow => Boolean(partner))
                .map(partnerName);

              return (
                <Link
                  className={`grid gap-3 px-4 py-3 text-sm transition-colors hover:bg-stone-950/80 lg:grid-cols-[1.3fr_0.7fr_1fr_0.55fr_0.55fr_0.8fr_0.7fr_0.45fr] lg:items-center ${
                    selectedRequest?.id === request.id ? "bg-[#C9A24A]/5" : ""
                  }`}
                  href={`/admin/prayer-team?tab=requests&request=${request.id}`}
                  key={request.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-100">{request.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{requestText(request)}</p>
                  </div>
                  <p className="text-xs text-stone-300 md:text-sm">{request.category || "General"}</p>
                  <p className="truncate text-xs text-stone-400 md:text-sm">{requestRelatedTo(request, householdById)}</p>
                  <UrgencyBadge urgency={request.urgency} />
                  <StatusBadge status={request.status} />
                  <p className="text-xs text-stone-400 md:text-sm">{assignedNames.length > 0 ? assignedNames.join(", ") : "Unassigned"}</p>
                  <p className="text-xs text-stone-500 md:text-sm">{formatDate(request.last_prayed_at)}</p>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Open</span>
                </Link>
              );
            }) : (
              <p className="p-6 text-sm leading-6 text-stone-400">Prayer requests will appear here when prayer forms, DOS, or prayer leaders create them.</p>
            )}
          </div>
        </section>

        <RequestDetailDrawer households={households} partners={partners} request={selectedRequest} />
      </div>

      <RequestCreateForm households={households} partners={partners} />
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
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Prayer Request Detail
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a prayer request to manage coverage, notes, and next steps.
        </p>
      </aside>
    );
  }

  const householdById = new Map(households.map((household) => [household.id, household]));
  const assignedPartnerIds = new Set(request.assigned_partner_ids ?? []);
  const activePartners = partners.filter((partner) => partner.status === "active");
  const assignedPartners = activePartners.filter((partner) => assignedPartnerIds.has(partner.id));

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="border-b border-stone-800/70 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Prayer Request Detail
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{request.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <UrgencyBadge urgency={request.urgency} />
          <StatusBadge status={request.status} />
          <Badge tone="amber">{request.category || "General"}</Badge>
        </div>
      </div>

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
          <button className="inline-flex min-h-10 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Save Request
          </button>
        </div>
      </form>

      <form action={assignPrayerRequestPartners} className="mt-5 border-b border-stone-800/70 pb-5">
        <input name="request_id" type="hidden" value={request.id} />
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Assign Partners
        </p>
        <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto border border-stone-900 bg-[#050505] p-3">
          {activePartners.length > 0 ? activePartners.map((partner) => (
            <label className="flex items-center gap-2 text-sm text-stone-300" key={partner.id}>
              <input className="accent-[#D4A63D]" defaultChecked={assignedPartnerIds.has(partner.id)} name="partner_ids" type="checkbox" value={partner.id} />
              <span>{partnerName(partner)}</span>
            </label>
          )) : (
            <p className="text-sm text-stone-500">No active prayer partners are available yet.</p>
          )}
        </div>
        <textarea className="mt-3 min-h-20 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors focus:border-[#D4A63D]" defaultValue={request.prayer_notes ?? ""} name="prayer_notes" placeholder="Coverage notes" />
        <button className="mt-3 inline-flex min-h-10 w-full items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Assign Partners
        </button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ActionForm action={markPrayerRequestPrayed} fieldName="request_id" id={request.id}>Mark Prayed</ActionForm>
        <ActionForm action={markPrayerRequestCovered} fieldName="request_id" id={request.id} tone="green">Mark Covered</ActionForm>
        <ActionForm action={markPrayerRequestAnswered} fieldName="request_id" id={request.id}>Mark Answered</ActionForm>
        <ActionForm action={archivePrayerRequest} fieldName="request_id" id={request.id} tone="red">Archive</ActionForm>
      </div>
    </aside>
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
  const filteredPartners = filterPartners(partners, params);
  const selectedPartner = params.partner
    ? partners.find((partner) => partner.id === params.partner) ?? null
    : null;
  const states = Array.from(new Set(partners.map((partner) => partner.state).filter(Boolean) as string[])).sort();
  const regions = Array.from(new Set(partners.map((partner) => partner.region).filter(Boolean) as string[])).sort();

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="space-y-4">
        <form className="grid gap-3 border border-stone-800 bg-[#080808]/85 p-4 lg:grid-cols-[1.3fr_0.65fr_0.65fr_0.75fr_auto]" action="/admin/prayer-team" method="get">
          <input name="tab" type="hidden" value="partners" />
          <input className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]" defaultValue={params.q ?? ""} name="q" placeholder="Search partner, email, city, church" />
          <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.state ?? ""} name="state">
            <option value="">All States</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.region ?? ""} name="region">
            <option value="">All Regions</option>
            {regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
          <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.status ?? ""} name="status">
            <option value="">All Statuses</option>
            {partnerStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <button className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
            Filter
          </button>
        </form>

        <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div className="hidden grid-cols-[1fr_1.15fr_0.7fr_0.65fr_0.55fr_0.7fr_0.8fr_0.45fr] gap-3 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {["Name", "Email", "Phone", "City", "State", "Region", "Status", "Actions"].map((heading) => <span key={heading}>{heading}</span>)}
          </div>
          <div className="divide-y divide-stone-900">
            {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
              <Link
                className={`grid gap-3 px-4 py-3 text-sm transition-colors hover:bg-stone-950/80 lg:grid-cols-[1fr_1.15fr_0.7fr_0.65fr_0.55fr_0.7fr_0.8fr_0.45fr] lg:items-center ${
                  selectedPartner?.id === partner.id ? "bg-[#C9A24A]/5" : ""
                }`}
                href={`/admin/prayer-team?tab=partners&partner=${partner.id}`}
                key={partner.id}
              >
                <p className="font-semibold text-stone-100">{partnerName(partner)}</p>
                <p className="truncate text-stone-400">{partner.email || "-"}</p>
                <p className="text-stone-400">{partner.phone || "-"}</p>
                <p className="text-stone-400">{partner.city || "-"}</p>
                <p className="text-stone-400">{partner.state || "-"}</p>
                <p className="text-stone-400">{partner.region || "-"}</p>
                <StatusBadge status={partner.status} />
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Open</span>
              </Link>
            )) : (
              <p className="p-6 text-sm leading-6 text-stone-400">Approved prayer partners will appear here after applications are converted.</p>
            )}
          </div>
        </div>
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
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Prayer Partner Detail
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a partner to review contact information, availability, permissions, coverage, and assigned requests.
        </p>
      </aside>
    );
  }

  const assignedRequests = requests.filter((request) => request.assigned_partner_ids?.includes(partner.id));
  const permissions = partner.permissions ?? {};
  const assignedCoverage = JSON.stringify(partner.assigned_coverage ?? {}, null, 2);

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="border-b border-stone-800/70 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Prayer Partner Detail
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{partnerName(partner)}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={partner.status} />
          {partner.email_alerts ? <Badge tone="green">Email Alerts</Badge> : null}
          {partner.sms_alerts ? <Badge tone="green">SMS Alerts</Badge> : null}
        </div>
      </div>

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
        <button className="mt-4 inline-flex min-h-10 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Edit Partner
        </button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ActionForm action={deactivatePrayerPartner} fieldName="partner_id" id={partner.id} tone="red">Deactivate</ActionForm>
        <Link className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]" href={`/admin/prayer-team?tab=requests&partner=${partner.id}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          View Assigned Requests
        </Link>
      </div>
      <p className="mt-3 text-xs leading-6 text-stone-500">
        Assign Coverage is saved through the coverage JSON field for now. A guided picker can replace this once coverage rules mature.
      </p>
    </aside>
  );
}

function ApplicationsTab({
  applications,
  params,
}: {
  applications: readonly PrayerSubmissionRow[];
  params: SearchParams;
}) {
  const filteredApplications = applications.filter((submission) => submission.form_type === "prayer_team_application");
  const selectedApplication = params.submission
    ? filteredApplications.find((submission) => submission.id === params.submission) ?? null
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
        <div className="hidden grid-cols-[1fr_1fr_0.7fr_0.7fr_1fr_0.65fr_0.75fr] gap-3 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {["Name", "Email", "City", "State", "Church", "Status", "Submitted Date"].map((heading) => <span key={heading}>{heading}</span>)}
        </div>
        <div className="divide-y divide-stone-900">
          {filteredApplications.length > 0 ? filteredApplications.map((submission) => (
            <Link
              className={`grid gap-3 px-4 py-3 text-sm transition-colors hover:bg-stone-950/80 lg:grid-cols-[1fr_1fr_0.7fr_0.7fr_1fr_0.65fr_0.75fr] lg:items-center ${
                selectedApplication?.id === submission.id ? "bg-[#C9A24A]/5" : ""
              }`}
              href={`/admin/prayer-team?tab=applications&submission=${submission.id}`}
              key={submission.id}
            >
              <p className="font-semibold text-stone-100">{submissionName(submission)}</p>
              <p className="truncate text-stone-400">{submission.email || "-"}</p>
              <p className="text-stone-400">{payloadValue(submission.payload, "city") || "-"}</p>
              <p className="text-stone-400">{payloadValue(submission.payload, "state") || "-"}</p>
              <p className="truncate text-stone-400">{payloadValue(submission.payload, "church_affiliation") || "-"}</p>
              <StatusBadge status={normalizeSubmissionStatus(submission.status)} />
              <p className="text-stone-500">{formatDate(submission.created_at)}</p>
            </Link>
          )) : (
            <p className="p-6 text-sm leading-6 text-stone-400">Prayer team applications will appear here after the public prayer application form is connected to Supabase.</p>
          )}
        </div>
      </section>

      <ApplicationDetailDrawer application={selectedApplication} />
    </div>
  );
}

function ApplicationDetailDrawer({ application }: { application: PrayerSubmissionRow | null }) {
  if (!application) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Application Detail
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select an application to review the full submission, notes, and approval workflow.
        </p>
      </aside>
    );
  }

  const payload = application.payload ?? {};

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="border-b border-stone-800/70 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Prayer Application
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{submissionName(application)}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={normalizeSubmissionStatus(application.status)} />
          <Badge tone="amber">Prayer Team</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Email" value={application.email ? <a className="hover:text-[#F5B942]" href={`mailto:${application.email}`}>{application.email}</a> : "-"} />
        <DetailItem label="Phone" value={application.phone || "-"} />
        <DetailItem label="City / State" value={[payloadValue(payload, "city"), payloadValue(payload, "state")].filter(Boolean).join(", ") || "-"} />
        <DetailItem label="Church" value={payloadValue(payload, "church_affiliation") || "-"} />
        <DetailItem label="Availability" value={payloadArray(payload, "availability").join(", ") || "-"} />
        <DetailItem label="Submitted" value={formatDate(application.created_at)} />
        <DetailItem label="Email Alerts" value={payloadBoolean(payload, "email_alerts") ? "Yes" : "No"} />
        <DetailItem label="SMS Alerts" value={payloadBoolean(payload, "sms_alerts") ? "Yes" : "No"} />
        <DetailItem label="Confidentiality Agreement" value={payloadBoolean(payload, "confidentiality_agreement") ? "Accepted" : "Not accepted"} />
      </div>

      <div className="mt-6 space-y-5">
        <DetailItem label="Why They Want To Join" value={<p className="whitespace-pre-wrap">{application.message || payloadValue(payload, "motivation") || "-"}</p>} />
        <DetailItem label="How They Heard About USAM" value={payloadValue(payload, "referral_source") || "-"} />
      </div>

      <form action={updatePrayerSubmission} className="mt-6 border-y border-stone-800/70 py-5">
        <input name="submission_id" type="hidden" value={application.id} />
        <SelectField defaultValue={normalizeSubmissionStatus(application.status)} label="Status" name="status">
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="needs_follow_up">Needs Follow Up</option>
          <option value="converted">Converted</option>
          <option value="archived">Archived</option>
        </SelectField>
        <TextField defaultValue={application.assigned_to} label="Assigned To" name="assigned_to" />
        <TextAreaField defaultValue={application.internal_notes} label="Internal Notes" name="internal_notes" />
        <button className="mt-4 inline-flex min-h-10 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Save Application
        </button>
      </form>

      <div className="mt-5 grid gap-3">
        <ActionForm action={approvePrayerTeamApplication} fieldName="submission_id" id={application.id} tone="green">Approve as Prayer Partner</ActionForm>
        <ActionForm action={declinePrayerTeamApplication} fieldName="submission_id" id={application.id} tone="red">Decline</ActionForm>
        <ActionForm action={markPrayerSubmissionNeedsFollowUp} fieldName="submission_id" id={application.id}>Mark Needs Follow Up</ActionForm>
        <ActionForm action={markPrayerSubmissionReviewed} fieldName="submission_id" id={application.id}>Mark Reviewed</ActionForm>
        <ActionForm action={archivePrayerSubmission} fieldName="submission_id" id={application.id} tone="red">Archive</ActionForm>
      </div>

      <div className="mt-6 border-t border-stone-800/70 pt-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Full Submitted Application
        </p>
        <PayloadFields payload={payload} />
      </div>
    </aside>
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
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="hidden grid-cols-[1fr_0.8fr_0.6fr_0.8fr_0.75fr_0.8fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {["Coverage Area", "Coverage Status", "Open Requests", "Assigned Partners", "Last Prayed", "Needs Action"].map((heading) => <span key={heading}>{heading}</span>)}
      </div>
      <div className="divide-y divide-stone-900">
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
            <div className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[1fr_0.8fr_0.6fr_0.8fr_0.75fr_0.8fr] lg:items-center" key={row}>
              <p className="font-semibold text-stone-100">{row}</p>
              <CoverageBadge status={coverageStatus} />
              <p className="text-stone-300">{openRequests.length}</p>
              <p className="text-stone-400">{assignedPartners.length > 0 ? assignedPartners.map(partnerName).join(", ") : "Unassigned"}</p>
              <p className="text-stone-500">{formatDate(lastPrayed)}</p>
              <div className="flex flex-wrap gap-2">
                {urgent ? <Badge tone="red">Urgent</Badge> : null}
                {coverageStatus === "Needs Coverage" ? <Badge tone="amber">Needs Action</Badge> : <Badge tone="green">Stable</Badge>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t border-stone-800/70 px-4 py-3 text-xs leading-6 text-stone-500">
        Future DOS alerts can create rows here when a Kitchen Table is scheduled, a missionary submits a prayer request, a household needs coverage, or a regional leader triggers a prayer alert.
      </p>
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
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="hidden grid-cols-[1fr_0.85fr_0.85fr_0.85fr_0.75fr_0.8fr_1fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {["State / Region", "Assigned Partners", "Active Households", "Open Requests", "Last Prayed", "Coverage Status", "Actions"].map((heading) => <span key={heading}>{heading}</span>)}
      </div>
      <div className="divide-y divide-stone-900">
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
            <div className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[1fr_0.85fr_0.85fr_0.85fr_0.75fr_0.8fr_1fr] lg:items-center" key={label}>
              <p className="font-semibold text-stone-100">{label}</p>
              <p className="text-stone-300">{assignedPartners.length}</p>
              <p className="text-stone-300">{activeHouseholds.length}</p>
              <p className="text-stone-300">{openRequests.length}</p>
              <p className="text-stone-500">{formatDate(lastPrayed)}</p>
              <CoverageBadge status={coverageStatus} />
              <div className="flex flex-wrap gap-2">
                <Link className="text-[10px] uppercase tracking-[0.16em] text-[#F5B942]" href="/admin/prayer-team?tab=partners" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Assign Partner</Link>
                <Link className="text-[10px] uppercase tracking-[0.16em] text-[#F5B942]" href={`/admin/prayer-team?tab=requests&q=${encodeURIComponent(label)}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>View Requests</Link>
                <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Mark Covered</span>
              </div>
            </div>
          );
        }) : (
          <p className="p-6 text-sm leading-6 text-stone-400">State and regional prayer coverage will appear as partners, households, and prayer requests are assigned.</p>
        )}
      </div>
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
      <div className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Recipient Segment Preview
        </p>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-stone-300">
          <DetailItem label="Segment" value="Approved prayer partners" />
          <DetailItem label="Merge Fields" value="{first_name}, {request_title}, {category}, {urgency}, {profile_url}" />
          <DetailItem label="Delivery" value="Preview only. Email and SMS are not connected yet." />
        </div>
        <div className="mt-5 grid gap-3">
          <button className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Preview Alert
          </button>
          <button className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Copy Email Text
          </button>
        </div>
        <p className="mt-5 text-xs leading-6 text-stone-500">
          Future email/SMS notification integration can send this preview after approval and segmentation rules are built.
        </p>
      </div>

      <div className="border border-stone-800/75 bg-stone-100 p-6 text-stone-950">
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
    <Message tone="error">
      Prayer Team access is not enabled for this admin account.
    </Message>
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
      description="Manage prayer partners, prayer requests, household coverage, state coverage, and future DOS prayer alerts."
      title="Prayer Team"
    >
      <div className="space-y-5">
        {!canManagePrayer ? (
          <PermissionBlocked />
        ) : (
          <>
            {data.error ? (
              <Message tone="error">
                Prayer Team data is not ready: {data.error}. Apply the Prayer Team migration to the usam-website Supabase project.
              </Message>
            ) : null}
            {params.saved ? <Message tone="success">Prayer Team changes saved.</Message> : null}
            {params.error ? <Message tone="error">Prayer Team action could not be completed: {params.error}</Message> : null}

            <SummaryCards applications={data.applications} households={data.households} partners={data.partners} requests={data.requests} />
            <TabNav activeTab={activeTab} />

            {activeTab === "requests" ? (
              <RequestsTab households={data.households} params={params} partners={data.partners} requests={data.requests} />
            ) : null}
            {activeTab === "partners" ? (
              <PartnersTab params={params} partners={data.partners} requests={data.requests} />
            ) : null}
            {activeTab === "applications" ? (
              <ApplicationsTab applications={data.applications} params={params} />
            ) : null}
            {activeTab === "coverage" ? (
              <CoverageBoardTab partners={data.partners} requests={data.requests} />
            ) : null}
            {activeTab === "regions" ? (
              <RegionsTab households={data.households} partners={data.partners} requests={data.requests} />
            ) : null}
            {activeTab === "email" ? (
              <EmailPreviewTab requests={data.requests} />
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}
