import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import { archivePrayerRequest, createPrayerRequest, updatePrayerRequest } from "./actions";
import { buildPrayerTeamWelcomeEmail } from "@/src/lib/prayer/email";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import type { MissionaryPrayerRequest } from "@/src/data/missionaries";

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
  { key: "partners", label: "Prayer Partners" },
  { key: "requests", label: "Prayer Requests" },
  { key: "regions", label: "States / Regions" },
  { key: "email", label: "Email Preview" },
] as const;

const visibilityOptions = [
  { label: "Public", value: "public" },
  { label: "Team", value: "team" },
  { label: "Private", value: "private" },
] as const;

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Archived", value: "archived" },
] as const;

type PrayerAdminTab = (typeof tabs)[number]["key"];

type SearchParams = {
  error?: string;
  household?: string;
  q?: string;
  region?: string;
  request?: string;
  saved?: string;
  state?: string;
  status?: string;
  tab?: string;
};

type HouseholdRow = {
  display_name: string;
  id: string;
  location: string | null;
  slug: string;
};

type PrayerPartnerRow = {
  created_at: string;
  email: string;
  id: string;
  name: string;
  recruited_by_household_id: string | null;
  recruited_by_household_name: string | null;
  recruited_by_profile_slug: string | null;
  region: string | null;
  source: string | null;
  state: string | null;
  status: "active" | "inactive" | "archived";
};

type PrayerRequestRow = {
  category: string | null;
  created_at: string;
  description: string;
  household_id: string | null;
  id: string;
  status: "active" | "archived";
  title: string;
  updated_at: string | null;
  visibility: "public" | "team" | "private";
};

type PrayerAdminData = {
  error?: string;
  households: HouseholdRow[];
  partners: PrayerPartnerRow[];
  requests: PrayerRequestRow[];
};

function getTab(value?: string): PrayerAdminTab {
  return tabs.some((tab) => tab.key === value) ? value as PrayerAdminTab : "partners";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
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

function sourceLabel(value: string | null) {
  switch (value) {
    case "invited_by_household":
      return "Invited by this household";
    case "friend":
      return "From a friend";
    case "church_ministry_partner":
      return "Church or ministry partner";
    case "social_media":
      return "Social media";
    case "other":
      return "Other";
    default:
      return "—";
  }
}

function statusLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        isActive
          ? "border-[#C9A24A]/30 bg-[#C9A24A]/10 text-[#E4C465]"
          : "border-stone-700 bg-stone-900/70 text-stone-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {statusLabel(status)}
    </span>
  );
}

function Field({
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
      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input
        className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      />
    </label>
  );
}

function TextArea({
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
      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea
        className="mt-2 min-h-32 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none focus:border-[#D4A63D]"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select
        className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-800/75 bg-[#080808]/80 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
    </div>
  );
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
          href={`/admin/prayer?tab=${tab.key}`}
          key={tab.key}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function Message({ children, tone = "info" }: { children: ReactNode; tone?: "error" | "info" | "success" }) {
  const className = {
    error: "border-red-500/30 bg-red-950/20 text-red-100",
    info: "border-stone-800 bg-stone-950/60 text-stone-300",
    success: "border-[#D4A63D]/30 bg-[#D4A63D]/10 text-stone-100",
  }[tone];

  return (
    <p className={`border p-4 text-sm leading-6 ${className}`}>
      {children}
    </p>
  );
}

async function loadPrayerAdminData(): Promise<PrayerAdminData> {
  if (!isSupabaseAdminConfigured()) {
    return {
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
      .select("id, display_name, slug, location")
      .order("display_name", { ascending: true }),
    supabase
      .from("prayer_partners")
      .select("id, name, email, state, region, recruited_by_household_id, recruited_by_household_name, recruited_by_profile_slug, source, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("prayer_requests")
      .select("id, household_id, title, description, category, visibility, status, created_at, updated_at")
      .order("created_at", { ascending: false }),
  ]);

  const error = partnersResult.error?.message ?? requestsResult.error?.message ?? householdsResult.error?.message;

  return {
    error,
    households: (householdsResult.data ?? []) as HouseholdRow[],
    partners: (partnersResult.data ?? []) as PrayerPartnerRow[],
    requests: (requestsResult.data ?? []) as PrayerRequestRow[],
  };
}

function filterPartners(partners: readonly PrayerPartnerRow[], params: SearchParams) {
  const q = normalize(params.q);
  const household = params.household ?? "";
  const state = normalize(params.state);
  const region = normalize(params.region);
  const status = params.status ?? "";

  return partners.filter((partner) => {
    const matchesQuery = !q
      || partner.name.toLowerCase().includes(q)
      || partner.email.toLowerCase().includes(q);
    const matchesHousehold = !household || partner.recruited_by_household_id === household;
    const matchesState = !state || normalize(partner.state) === state;
    const matchesRegion = !region || normalize(partner.region) === region;
    const matchesStatus = !status || partner.status === status;

    return matchesQuery && matchesHousehold && matchesState && matchesRegion && matchesStatus;
  });
}

function PartnersTab({
  households,
  partners,
  params,
}: {
  households: readonly HouseholdRow[];
  partners: readonly PrayerPartnerRow[];
  params: SearchParams;
}) {
  const filteredPartners = filterPartners(partners, params);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = partners.filter((partner) => new Date(partner.created_at) >= monthStart).length;
  const activePartners = partners.filter((partner) => partner.status === "active").length;
  const stateCount = new Set(partners.map((partner) => partner.state).filter(Boolean)).size;
  const states = Array.from(new Set(partners.map((partner) => partner.state).filter(Boolean) as string[])).sort();
  const regions = Array.from(new Set(partners.map((partner) => partner.region).filter(Boolean) as string[])).sort();

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Partners" value={String(partners.length)} />
        <MetricCard label="New This Month" value={String(newThisMonth)} />
        <MetricCard label="Active This Month" value={String(activePartners)} />
        <MetricCard label="States / Regions" value={String(stateCount)} />
      </div>

      <form className="grid gap-3 border border-stone-800 bg-[#080808]/80 p-4 lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr_auto_auto]" action="/admin/prayer" method="get">
        <input name="tab" type="hidden" value="partners" />
        <input
          className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]"
          defaultValue={params.q ?? ""}
          name="q"
          placeholder="Search name or email"
        />
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.household ?? ""} name="household">
          <option value="">All households</option>
          {households.map((household) => (
            <option key={household.id} value={household.id}>{household.display_name}</option>
          ))}
        </select>
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.state ?? ""} name="state">
          <option value="">All states</option>
          {states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.region ?? ""} name="region">
          <option value="">All regions</option>
          {regions.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
        <select className="min-h-10 border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" defaultValue={params.status ?? ""} name="status">
          <option value="">All statuses</option>
          {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <button className="min-h-10 border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Filter
        </button>
        <Link className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]" href="/admin/prayer/export" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Export CSV
        </Link>
      </form>

      <div className="overflow-hidden border border-stone-800 bg-[#080808]/80">
        <div className="hidden grid-cols-[1fr_1.25fr_0.55fr_0.6fr_1fr_0.75fr_0.55fr] gap-4 border-b border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {["Name", "Email", "State", "Region", "Recruited By", "Date Joined", "Status"].map((heading) => <span key={heading}>{heading}</span>)}
        </div>
        <div className="divide-y divide-stone-900">
          {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
            <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1.25fr_0.55fr_0.6fr_1fr_0.75fr_0.55fr] lg:items-center" key={partner.id}>
              <p className="font-medium text-stone-100">{partner.name}</p>
              <p className="text-sm text-stone-300">{partner.email}</p>
              <p className="text-sm text-stone-300">{partner.state || "—"}</p>
              <p className="text-sm text-stone-300">{partner.region || "—"}</p>
              <div>
                <p className="text-sm text-stone-200">{partner.recruited_by_household_name || sourceLabel(partner.source)}</p>
                <p className="mt-1 text-xs text-stone-500">{sourceLabel(partner.source)}</p>
              </div>
              <p className="text-sm text-stone-400">{formatDate(partner.created_at)}</p>
              <StatusBadge status={partner.status} />
            </div>
          )) : (
            <div className="p-6 text-sm text-stone-400">No prayer partners match these filters yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestForm({
  households,
  request,
}: {
  households: readonly HouseholdRow[];
  request?: PrayerRequestRow;
}) {
  const isEditing = Boolean(request);

  return (
    <form action={isEditing ? updatePrayerRequest : createPrayerRequest} className="space-y-4 border border-stone-800 bg-[#080808]/80 p-5">
      {request ? <input name="request_id" type="hidden" value={request.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field defaultValue={request?.title} label="Title" name="title" required />
        <Field defaultValue={request?.category} label="Category" name="category" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          defaultValue={request?.household_id ?? ""}
          label="Household"
          name="household_id"
          options={[
            { label: "General / unassigned", value: "" },
            ...households.map((household) => ({ label: household.display_name, value: household.id })),
          ]}
        />
        <SelectField
          defaultValue={request?.visibility ?? "team"}
          label="Visibility"
          name="visibility"
          options={visibilityOptions.map((option) => ({ label: option.label, value: option.value }))}
        />
        {isEditing ? (
          <SelectField
            defaultValue={request?.status ?? "active"}
            label="Status"
            name="status"
            options={[
              { label: "Active", value: "active" },
              { label: "Archived", value: "archived" },
            ]}
          />
        ) : null}
      </div>
      <TextArea defaultValue={request?.description} label="Short Description" name="description" required />
      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 text-xs uppercase tracking-[0.2em] text-black hover:bg-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          {isEditing ? "Save Request" : "Create Request"}
        </button>
      </div>
    </form>
  );
}

function RequestsTab({
  households,
  params,
  requests,
}: {
  households: readonly HouseholdRow[];
  params: SearchParams;
  requests: readonly PrayerRequestRow[];
}) {
  const selectedRequest = params.request
    ? requests.find((request) => request.id === params.request)
    : requests[0];
  const householdById = new Map(households.map((household) => [household.id, household]));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="overflow-hidden border border-stone-800 bg-[#080808]/80">
        <div className="hidden grid-cols-[1.3fr_1fr_0.6fr_0.6fr_0.7fr_0.45fr] gap-4 border-b border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {["Title", "Household", "Visibility", "Status", "Created", "Action"].map((heading) => <span key={heading}>{heading}</span>)}
        </div>
        <div className="divide-y divide-stone-900">
          {requests.length > 0 ? requests.map((request) => {
            const household = request.household_id ? householdById.get(request.household_id) : null;

            return (
              <Link
                className={`grid gap-3 p-4 transition-colors hover:bg-stone-950/70 lg:grid-cols-[1.3fr_1fr_0.6fr_0.6fr_0.7fr_0.45fr] lg:items-center ${selectedRequest?.id === request.id ? "bg-[#D4A63D]/5" : ""}`}
                href={`/admin/prayer?tab=requests&request=${request.id}`}
                key={request.id}
              >
                <div>
                  <p className="font-medium text-stone-100">{request.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{request.description}</p>
                </div>
                <p className="text-sm text-stone-300">{household?.display_name ?? "General"}</p>
                <StatusBadge status={request.visibility} />
                <StatusBadge status={request.status} />
                <p className="text-sm text-stone-400">{formatDate(request.created_at)}</p>
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Open</span>
              </Link>
            );
          }) : (
            <div className="p-6 text-sm text-stone-400">No prayer requests have been created yet.</div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {selectedRequest ? "Edit Request" : "Create Request"}
          </p>
          <h2 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            Prayer Details
          </h2>
        </div>
        <RequestForm households={households} request={selectedRequest} />
        {selectedRequest ? (
          <form action={archivePrayerRequest}>
            <input name="request_id" type="hidden" value={selectedRequest.id} />
            <button className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-red-400 hover:text-red-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
              Archive Request
            </button>
          </form>
        ) : null}
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            New Request
          </p>
          <RequestForm households={households} />
        </div>
      </div>
    </div>
  );
}

function RegionsTab({ partners }: { partners: readonly PrayerPartnerRow[] }) {
  const counts = new Map<string, { active: number; region: string; state: string; total: number }>();

  partners.forEach((partner) => {
    const state = partner.state || "Unknown";
    const key = `${state}__${partner.region || ""}`;
    const current = counts.get(key) ?? {
      active: 0,
      region: partner.region || "Unassigned",
      state,
      total: 0,
    };

    current.total += 1;
    current.active += partner.status === "active" ? 1 : 0;
    counts.set(key, current);
  });

  const rows = Array.from(counts.values()).sort((first, second) => second.total - first.total);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {rows.slice(0, 6).map((row) => (
          <MetricCard key={`${row.state}-${row.region}`} label={`${row.state} ${row.region !== "Unassigned" ? row.region : ""}`.trim()} value={String(row.total)} />
        ))}
      </div>
      <div className="overflow-hidden border border-stone-800 bg-[#080808]/80">
        <div className="grid grid-cols-[1fr_1fr_0.55fr_0.55fr] gap-4 border-b border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          <span>State</span>
          <span>Region</span>
          <span>Total</span>
          <span>Active</span>
        </div>
        <div className="divide-y divide-stone-900">
          {rows.length > 0 ? rows.map((row) => (
            <div className="grid grid-cols-[1fr_1fr_0.55fr_0.55fr] gap-4 px-4 py-3 text-sm" key={`${row.state}-${row.region}`}>
              <p className="text-stone-100">{row.state}</p>
              <p className="text-stone-300">{row.region}</p>
              <p className="text-stone-300">{row.total}</p>
              <p className="text-stone-300">{row.active}</p>
            </div>
          )) : (
            <div className="p-6 text-sm text-stone-400">State and region counts will appear after partners join.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailPreviewTab({
  households,
  params,
  requests,
}: {
  households: readonly HouseholdRow[];
  params: SearchParams;
  requests: readonly PrayerRequestRow[];
}) {
  const selectedHousehold = params.household
    ? households.find((household) => household.id === params.household)
    : households[0];
  const previewRequests: MissionaryPrayerRequest[] = requests
    .filter((request) => request.household_id === selectedHousehold?.id)
    .filter((request) => request.status === "active" && (request.visibility === "public" || request.visibility === "team"))
    .slice(0, 5)
    .map((request) => ({
      category: request.category,
      date: request.created_at,
      description: request.description,
      id: request.id,
      title: request.title,
      visibility: request.visibility as "public" | "team",
    }));
  const preview = selectedHousehold
    ? buildPrayerTeamWelcomeEmail({
      householdName: selectedHousehold.display_name,
      name: "Prayer Partner",
      prayerRequests: previewRequests,
      profileSlug: selectedHousehold.slug,
    })
    : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <form className="border border-stone-800 bg-[#080808]/80 p-5" action="/admin/prayer" method="get">
        <input name="tab" type="hidden" value="email" />
        <SelectField
          defaultValue={selectedHousehold?.id ?? ""}
          label="Preview Household"
          name="household"
          options={households.map((household) => ({ label: household.display_name, value: household.id }))}
        />
        <button className="mt-4 inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="submit">
          Preview
        </button>
      </form>
      <div className="border border-stone-800 bg-stone-100 p-6 text-stone-950">
        {preview ? (
          <>
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Subject
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{preview.subject}</h2>
            <pre className="mt-5 whitespace-pre-wrap border-t border-stone-300 pt-5 text-sm leading-6">{preview.text}</pre>
          </>
        ) : (
          <p className="text-sm">Add a household to preview the welcome email.</p>
        )}
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
    : { households: [], partners: [], requests: [] };

  return (
    <AdminShell
      active="prayer"
      description="Manage prayer partners, household prayer requests, state coverage, and the welcome email."
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
            {params.saved ? (
              <Message tone="success">Prayer Team changes saved.</Message>
            ) : null}
            {params.error ? (
              <Message tone="error">Prayer Team action could not be completed: {params.error}</Message>
            ) : null}

            <TabNav activeTab={activeTab} />

            {activeTab === "partners" ? (
              <PartnersTab households={data.households} partners={data.partners} params={params} />
            ) : null}
            {activeTab === "requests" ? (
              <RequestsTab households={data.households} params={params} requests={data.requests} />
            ) : null}
            {activeTab === "regions" ? (
              <RegionsTab partners={data.partners} />
            ) : null}
            {activeTab === "email" ? (
              <EmailPreviewTab households={data.households} params={params} requests={data.requests} />
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}
