import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminShell } from "../_components/AdminShell";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "National Command Center | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type InquiryStatus = "new" | "reviewed" | "follow_up" | "closed";
type MajorGiftStatus = "new" | "reviewed" | "contacted" | "closed" | "archived";

type DashboardInquiry = {
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  main_financial_burden: string | null;
  status: InquiryStatus;
  updated_at: string;
};

type DashboardProfile = {
  display_name: string;
  hero_image_url: string | null;
  id: string;
  location: string | null;
  profile_image_url: string | null;
  public_visible: boolean | null;
  show_prayer?: boolean | null;
  show_household?: boolean | null;
  show_support?: boolean | null;
  short_mission: string | null;
  slug: string;
  story: string | null;
  updated_at: string | null;
};

type DashboardSupportSettings = {
  household_id: string;
  monthly_committed?: number | string | null;
  monthly_goal?: number | string | null;
  monthly_received: number | string | null;
  show_support?: boolean | null;
  updated_at: string | null;
};

type DashboardMajorGiftInquiry = {
  created_at: string;
  donation_types: string[] | null;
  email: string;
  first_name: string;
  household_name: string | null;
  id: string;
  intended_for: string | null;
  last_name: string;
  phone: string | null;
  profile_slug: string | null;
  projected_amount_range: string | null;
  status: MajorGiftStatus;
  updated_at: string | null;
};

type DashboardInquiryItem = {
  created_at: string;
  detail: string;
  email: string;
  href: string;
  id: string;
  isNew: boolean;
  name: string;
  statusLabel: string;
  typeLabel: string;
};

type ActivityItem = {
  detail: string;
  href: string;
  label: string;
  timestamp: string;
  title: string;
};

type DashboardData = {
  activeMissionaries: number;
  activePrayerRequests: number;
  activeUsers: number;
  approvedFruit: number;
  connectionLogs: number;
  draftFruit: number;
  error?: string;
  incompleteProfiles: DashboardProfile[];
  latestInquiries: DashboardInquiryItem[];
  meetings: number;
  newMajorGiftInquiries: number;
  newInquiries: number;
  people: number;
  pendingReviews: number;
  prayerPartners: number;
  privateFruit: number;
  publishedProfiles: number;
  recentActivity: ActivityItem[];
  recentProfiles: DashboardProfile[];
  supportNeedsAttention: number;
  supportThisMonth: number;
  visiblePrayerProfiles: number;
  visibleSupportProfiles: number;
};

const emptyDashboardData: DashboardData = {
  activeMissionaries: 0,
  activePrayerRequests: 0,
  activeUsers: 0,
  approvedFruit: 0,
  connectionLogs: 0,
  draftFruit: 0,
  incompleteProfiles: [],
  latestInquiries: [],
  meetings: 0,
  newMajorGiftInquiries: 0,
  newInquiries: 0,
  people: 0,
  pendingReviews: 0,
  prayerPartners: 0,
  privateFruit: 0,
  publishedProfiles: 0,
  recentActivity: [],
  recentProfiles: [],
  supportNeedsAttention: 0,
  supportThisMonth: 0,
  visiblePrayerProfiles: 0,
  visibleSupportProfiles: 0,
};

function isMissing(value: string | null) {
  return !value || value.trim().length === 0;
}

function isIncompleteProfile(profile: DashboardProfile) {
  return (
    isMissing(profile.location) ||
    isMissing(profile.profile_image_url) ||
    isMissing(profile.short_mission) ||
    isMissing(profile.story)
  );
}

function getMissingProfileFields(profile: DashboardProfile) {
  const fields = [
    ["Location", profile.location],
    ["Profile photo", profile.profile_image_url],
    ["Short mission", profile.short_mission],
    ["Story", profile.story],
  ].filter(([, value]) => isMissing(value));

  return fields.map(([label]) => label).join(", ");
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMetric(value: number, fallback = "0") {
  return Number.isFinite(value) ? String(value) : fallback;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function statusLabel(status: InquiryStatus) {
  return status === "follow_up"
    ? "Follow Up"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function majorGiftStatusLabel(status: MajorGiftStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isMissingMajorGiftTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error
    && (
      error.code === "42P01"
      || error.message?.includes("major_gift_inquiries")
      || error.message?.toLowerCase().includes("could not find the table")
    ),
  );
}

function isMissingHouseholdVisibilityColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("show_household"));
}

function isMissingOptionalTable(error: { code?: string; message?: string } | null | undefined, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes(tableName)
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the table");
}

function isMissingOptionalColumn(error: { message?: string } | null | undefined, columnName: string) {
  return Boolean(error?.message?.includes(columnName));
}

function getMajorGiftName(inquiry: DashboardMajorGiftInquiry) {
  return `${inquiry.first_name} ${inquiry.last_name}`.trim();
}

function getMajorGiftDetail(inquiry: DashboardMajorGiftInquiry) {
  const amount = inquiry.projected_amount_range?.trim();
  const intendedFor = inquiry.intended_for?.trim();

  if (amount && intendedFor) {
    return `${amount} for ${intendedFor}`;
  }

  return amount || intendedFor || "Major gift inquiry";
}

async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ...emptyDashboardData,
      error: "Supabase admin environment variables are not configured yet.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const [
    initialHouseholdResult,
    supportResult,
    inquiryResult,
    majorGiftResult,
    fieldPeopleResult,
    tablesResult,
    connectionLogsResult,
    fruitResult,
    prayerRequestsResult,
    prayerPartnersResult,
    adminUsersResult,
  ] = await Promise.all([
    supabase
      .from("missionary_households")
      .select("id, slug, display_name, location, profile_image_url, hero_image_url, short_mission, story, public_visible, show_household, show_support, show_prayer, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("missionary_support_settings")
      .select("household_id, monthly_received, monthly_goal, monthly_committed, show_support, updated_at"),
    supabase
      .from("financial_freedom_inquiries")
      .select("id, full_name, email, status, created_at, updated_at, main_financial_burden")
      .order("created_at", { ascending: false }),
    supabase
      .from("major_gift_inquiries")
      .select("id, first_name, last_name, email, phone, household_name, profile_slug, donation_types, projected_amount_range, intended_for, status, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("missionary_field_people")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("missionary_tables")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("missionary_connection_logs")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("missionary_fruit_items")
      .select("id, cc_status, status"),
    supabase
      .from("prayer_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "covered"]),
    supabase
      .from("prayer_partners")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);
  const householdResult = initialHouseholdResult.error && isMissingHouseholdVisibilityColumn(initialHouseholdResult.error)
    ? await supabase
      .from("missionary_households")
      .select("id, slug, display_name, location, profile_image_url, hero_image_url, short_mission, story, public_visible, updated_at")
      .order("updated_at", { ascending: false })
    : initialHouseholdResult;

  const optionalErrors = [
    fieldPeopleResult.error && !isMissingOptionalTable(fieldPeopleResult.error, "missionary_field_people") ? fieldPeopleResult.error : null,
    tablesResult.error && !isMissingOptionalTable(tablesResult.error, "missionary_tables") ? tablesResult.error : null,
    connectionLogsResult.error && !isMissingOptionalTable(connectionLogsResult.error, "missionary_connection_logs") ? connectionLogsResult.error : null,
    fruitResult.error && !isMissingOptionalTable(fruitResult.error, "missionary_fruit_items") && !isMissingOptionalColumn(fruitResult.error, "cc_status") ? fruitResult.error : null,
    prayerRequestsResult.error && !isMissingOptionalTable(prayerRequestsResult.error, "prayer_requests") ? prayerRequestsResult.error : null,
    prayerPartnersResult.error && !isMissingOptionalTable(prayerPartnersResult.error, "prayer_partners") ? prayerPartnersResult.error : null,
    adminUsersResult.error && !isMissingOptionalTable(adminUsersResult.error, "admin_users") && !isMissingOptionalColumn(adminUsersResult.error, "is_active") ? adminUsersResult.error : null,
  ].find(Boolean);
  const majorGiftError = majorGiftResult.error && !isMissingMajorGiftTable(majorGiftResult.error)
    ? majorGiftResult.error
    : null;
  const firstError = householdResult.error ?? supportResult.error ?? inquiryResult.error ?? majorGiftError ?? optionalErrors;

  if (firstError) {
    return {
      ...emptyDashboardData,
      error: firstError.message,
    };
  }

  const profiles = ((householdResult.data ?? []) as DashboardProfile[]).map((profile) => ({
    ...profile,
    show_household: profile.show_household ?? profile.public_visible ?? true,
  }));
  const supportSettings = (supportResult.data ?? []) as DashboardSupportSettings[];
  const inquiries = (inquiryResult.data ?? []) as DashboardInquiry[];
  const majorGiftInquiries = majorGiftResult.error
    ? []
    : (majorGiftResult.data ?? []) as DashboardMajorGiftInquiry[];
  const fruitRows = fruitResult.error
    ? []
    : (fruitResult.data ?? []) as Array<{ cc_status: string | null; status: string | null }>;
  const activeProfiles = profiles.filter((profile) => profile.show_household !== false);
  const publishedProfiles = activeProfiles.filter((profile) => profile.public_visible !== false).length;
  const incompleteProfiles = activeProfiles.filter(isIncompleteProfile);
  const latestInquiries = [
    ...inquiries.map((inquiry) => ({
      created_at: inquiry.created_at,
      detail: inquiry.main_financial_burden || "Financial Freedom request",
      email: inquiry.email,
      href: `/admin/support-team?type=financial_freedom`,
      id: inquiry.id,
      isNew: inquiry.status === "new",
      name: inquiry.full_name,
      statusLabel: statusLabel(inquiry.status),
      typeLabel: "Financial Freedom",
    })),
    ...majorGiftInquiries.map((inquiry) => ({
      created_at: inquiry.created_at,
      detail: getMajorGiftDetail(inquiry),
      email: inquiry.email,
      href: `/admin/support-team?type=major_gift`,
      id: inquiry.id,
      isNew: inquiry.status === "new",
      name: getMajorGiftName(inquiry),
      statusLabel: majorGiftStatusLabel(inquiry.status),
      typeLabel: "Major Gift",
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentProfiles = profiles
    .filter((profile) => profile.updated_at)
    .slice(0, 4);
  const recentActivity = [
    ...latestInquiries.map((inquiry) => ({
      detail: `${inquiry.statusLabel} ${inquiry.typeLabel.toLowerCase()} inquiry`,
      href: inquiry.href,
      label: inquiry.typeLabel,
      timestamp: inquiry.created_at,
      title: inquiry.name,
    })),
    ...recentProfiles.map((profile) => ({
      detail: "Profile updated",
      href: "/admin/missionary-profiles",
      label: "Profile",
      timestamp: profile.updated_at ?? "",
      title: profile.display_name,
    })),
  ]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return {
    activeMissionaries: activeProfiles.length,
    activePrayerRequests: prayerRequestsResult.error ? 0 : prayerRequestsResult.count ?? 0,
    activeUsers: adminUsersResult.error ? 0 : adminUsersResult.count ?? 0,
    approvedFruit: fruitRows.filter((fruit) => fruit.cc_status === "approved").length,
    connectionLogs: connectionLogsResult.error ? 0 : connectionLogsResult.count ?? 0,
    draftFruit: fruitRows.filter((fruit) => fruit.cc_status === "draft").length,
    incompleteProfiles,
    latestInquiries,
    meetings: (tablesResult.error ? 0 : tablesResult.count ?? 0) + (connectionLogsResult.error ? 0 : connectionLogsResult.count ?? 0),
    newMajorGiftInquiries: majorGiftInquiries.filter((inquiry) => inquiry.status === "new").length,
    newInquiries: inquiries.filter((inquiry) => inquiry.status === "new").length,
    people: fieldPeopleResult.error ? 0 : fieldPeopleResult.count ?? 0,
    pendingReviews: inquiries.filter((inquiry) => inquiry.status === "new").length
      + majorGiftInquiries.filter((inquiry) => inquiry.status === "new").length
      + incompleteProfiles.length
      + fruitRows.filter((fruit) => fruit.cc_status === "draft").length,
    prayerPartners: prayerPartnersResult.error ? 0 : prayerPartnersResult.count ?? 0,
    privateFruit: fruitRows.filter((fruit) => fruit.cc_status === "private").length,
    publishedProfiles,
    recentActivity,
    recentProfiles,
    supportNeedsAttention: supportSettings.filter((setting) => toNumber(setting.monthly_goal) > toNumber(setting.monthly_committed)).length,
    supportThisMonth: supportSettings.reduce((total, setting) => total + toNumber(setting.monthly_received), 0),
    visiblePrayerProfiles: activeProfiles.filter((profile) => profile.show_prayer !== false).length,
    visibleSupportProfiles: activeProfiles.filter((profile) => profile.show_support !== false).length,
  };
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="border border-stone-800/80 bg-[#080808] p-4 text-sm leading-6 text-stone-300">
      {children}
    </div>
  );
}

function SectionHeader({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-stone-50">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      className="group flex min-h-20 flex-col justify-between border border-stone-800/80 bg-[#080808] p-3 transition-colors hover:border-[#C9A24A]/60 hover:bg-[#C9A24A]/[0.04]"
      href={href}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none text-stone-50">
          {value}
        </p>
        <span className="text-lg leading-none text-[#C9A24A] transition-transform group-hover:translate-x-0.5" aria-hidden>
          &rarr;
        </span>
      </div>
    </Link>
  );
}

function ActionButton({
  children,
  href,
  primary = false,
}: {
  children: ReactNode;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      className={`inline-flex min-h-9 items-center justify-center border px-3 text-xs uppercase tracking-[0.14em] transition-colors ${
        primary
          ? "border-[#C9A24A] bg-[#C9A24A] text-stone-950 hover:bg-[#D8B65D]"
          : "border-stone-700 text-stone-100 hover:border-[#C9A24A] hover:text-[#E4C465]"
      }`}
      href={href}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

function WorkCard({
  action,
  count,
  description,
  href,
  title,
}: {
  action: string;
  count?: number;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <article className="flex min-h-36 flex-col justify-between border border-[#C9A24A]/35 bg-[#C9A24A]/[0.055] p-4">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-stone-50">
            {title}
          </h3>
          {typeof count === "number" ? (
            <span className="text-2xl font-semibold leading-none text-[#E4C465]">
              {count}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-200">
          {description}
        </p>
      </div>
      <div className="mt-4">
        <ActionButton href={href} primary>
          {action}
        </ActionButton>
      </div>
    </article>
  );
}

function FocusCard({
  actionHref,
  actionLabel,
  details,
  eyebrow,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  details: Array<{ label: string; value: string }>;
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="flex min-h-56 flex-col justify-between border border-stone-800/80 bg-[#080808] p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {eyebrow}
        </p>
        <h3 className="mt-2 text-base font-semibold text-stone-50">
          {title}
        </h3>
        <dl className="mt-4 grid gap-2">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-4 border-t border-stone-900 pt-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                {detail.label}
              </dt>
              <dd className="text-sm font-semibold text-stone-100">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Link
        className="mt-5 inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-xs uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#C9A24A] hover:text-[#E4C465]"
        href={actionHref}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      >
        {actionLabel}
      </Link>
    </article>
  );
}

function StatusBadge({
  children,
  isNew,
}: {
  children: ReactNode;
  isNew: boolean;
}) {
  return (
    <span
      className={`inline-flex h-5 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.12em] ${
        isNew
          ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
          : "border-stone-700/70 bg-stone-900/60 text-stone-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Now" title="Recent Activity Feed" />
      {items.length > 0 ? (
        <div className="divide-y divide-stone-800/70 border border-stone-800/80 bg-[#080808]">
          {items.map((item) => (
            <Link
              key={`${item.label}-${item.title}-${item.timestamp}`}
              className="grid gap-2 p-4 transition-colors hover:bg-stone-950/70 sm:grid-cols-[110px_minmax(0,1fr)_80px] sm:items-center"
              href={item.href}
            >
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#D8B65D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                {item.label}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-stone-50">{item.title}</span>
                <span className="block text-sm text-stone-300">{item.detail}</span>
              </span>
              <span className="text-sm text-stone-300 sm:text-right">{formatDate(item.timestamp)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel>No recent activity needs action yet.</EmptyPanel>
      )}
    </section>
  );
}

function LatestInquiries({ inquiries }: { inquiries: DashboardInquiryItem[] }) {
  return (
    <section>
      <SectionHeader
        action={<ActionButton href="/admin/support-team">Open Queue</ActionButton>}
        eyebrow="Review"
        title="Latest Inquiries"
      />
      {inquiries.length > 0 ? (
        <div className="divide-y divide-stone-800/70 border border-stone-800/80 bg-[#080808]">
          {inquiries.map((inquiry) => (
            <Link
              key={inquiry.id}
              className="grid gap-3 p-4 transition-colors hover:bg-stone-950/70 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              href={inquiry.href}
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-stone-50">{inquiry.name}</span>
                  <StatusBadge isNew={inquiry.isNew}>{inquiry.statusLabel}</StatusBadge>
                  <span className="inline-flex h-5 items-center justify-center border border-stone-700/70 bg-stone-950 px-2 text-[9px] uppercase tracking-[0.12em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {inquiry.typeLabel}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-stone-300">{inquiry.email}</span>
                <span className="mt-1 block truncate text-xs text-stone-400">{inquiry.detail}</span>
              </span>
              <span className="text-sm text-stone-300">{formatDate(inquiry.created_at)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel>No inquiries are waiting in the queue.</EmptyPanel>
      )}
    </section>
  );
}

function IncompleteProfileAlerts({ profiles }: { profiles: DashboardProfile[] }) {
  return (
    <section>
      <SectionHeader
        action={<ActionButton href="/admin/missionary-profiles">Fix Profiles</ActionButton>}
        eyebrow="Alerts"
        title="Incomplete Profiles"
      />
      {profiles.length > 0 ? (
        <div className="divide-y divide-stone-800/70 border border-stone-800/80 bg-[#080808]">
          {profiles.slice(0, 5).map((profile) => (
            <Link
              key={profile.id}
              className="grid gap-2 p-4 transition-colors hover:bg-stone-950/70 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              href="/admin/missionary-profiles"
            >
              <span>
                <span className="block text-sm font-semibold text-stone-50">{profile.display_name}</span>
                <span className="mt-1 block text-sm text-stone-300">Missing: {getMissingProfileFields(profile)}</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#D8B65D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Fix Now
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanel>All active profiles have the essentials filled in.</EmptyPanel>
      )}
    </section>
  );
}

function QuickActionsPanel() {
  const actions = [
    { href: "/admin/missionary-profiles", label: "Open Workspaces" },
    { href: "/admin/missionary-profiles?tab=fruit", label: "Review Fruit" },
    { href: "/admin/prayer-team", label: "Prayer Requests" },
    { href: "/admin/support-team", label: "Support Overview" },
    { href: "/admin/settings", label: "Users & Permissions" },
  ] as const;

  return (
    <aside className="border border-stone-800/80 bg-[#080808] p-4 lg:sticky lg:top-24">
      <SectionHeader eyebrow="Next" title="Quick Actions" />
      <div className="grid gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            className="flex min-h-10 items-center justify-between border border-stone-800 px-3 text-sm font-medium text-stone-100 transition-colors hover:border-[#C9A24A]/70 hover:text-[#E4C465]"
            href={action.href}
          >
            {action.label}
            <span className="text-[#C9A24A]" aria-hidden>&rarr;</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default async function AdminDashboardPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const data = await getDashboardData();
  const hasDataError = Boolean(data.error);
  const metrics = [
    { href: "/admin/missionary-profiles", label: "Missionary Workspaces", value: hasDataError ? "-" : formatMetric(data.activeMissionaries) },
    { href: "/admin/missionary-profiles?tab=people", label: "People in Your Field", value: hasDataError ? "-" : formatMetric(data.people) },
    { href: "/admin/missionary-profiles?tab=meetings", label: "Meetings Logged", value: hasDataError ? "-" : formatMetric(data.meetings) },
    { href: "/admin/missionary-profiles?tab=fruit", label: "Fruit Pending Review", value: hasDataError ? "-" : formatMetric(data.draftFruit) },
    { href: "/admin/missionary-profiles?tab=fruit", label: "Approved Fruit", value: hasDataError ? "-" : formatMetric(data.approvedFruit) },
    { href: "/admin/support-team", label: "Support This Month", value: hasDataError ? "-" : formatMoney(data.supportThisMonth) },
    { href: "/admin/prayer-team", label: "Prayer Requests", value: hasDataError ? "-" : formatMetric(data.activePrayerRequests) },
    { href: "/admin/missionary-profiles?tab=features", label: "Profiles Missing Info", value: hasDataError ? "-" : formatMetric(data.incompleteProfiles.length) },
  ] as const;

  return (
    <AdminShell
      active="dashboard"
      description="USAM master dashboard for workspaces, fruit review, support, prayer, and publishing."
      title="National Command Center"
    >
      <div className="space-y-6">
        {data.error ? (
          <p className="border border-[#C9A24A]/35 bg-[#C9A24A]/10 p-4 text-sm leading-6 text-stone-100">
            {data.error}
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section>
          <SectionHeader eyebrow="NCC MVP" title="National Rollup" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FocusCard
              actionHref="/admin/missionary-profiles"
              actionLabel="Open Workspaces"
              details={[
                { label: "Published", value: hasDataError ? "-" : formatMetric(data.publishedProfiles) },
                { label: "Profile Alerts", value: hasDataError ? "-" : formatMetric(data.incompleteProfiles.length) },
                { label: "Active Users", value: hasDataError ? "-" : formatMetric(data.activeUsers) },
              ]}
              eyebrow="Workspaces"
              title="Missionary Workspace Health"
            />
            <FocusCard
              actionHref="/admin/missionary-profiles?tab=fruit"
              actionLabel="Review Fruit"
              details={[
                { label: "Pending", value: hasDataError ? "-" : formatMetric(data.draftFruit) },
                { label: "Approved", value: hasDataError ? "-" : formatMetric(data.approvedFruit) },
                { label: "Private", value: hasDataError ? "-" : formatMetric(data.privateFruit) },
              ]}
              eyebrow="Fruit"
              title="Review & Approval"
            />
            <FocusCard
              actionHref="/admin/prayer-team"
              actionLabel="Open Prayer"
              details={[
                { label: "Requests", value: hasDataError ? "-" : formatMetric(data.activePrayerRequests) },
                { label: "Partners", value: hasDataError ? "-" : formatMetric(data.prayerPartners) },
                { label: "Profiles On", value: hasDataError ? "-" : formatMetric(data.visiblePrayerProfiles) },
              ]}
              eyebrow="Prayer"
              title="Prayer Coverage"
            />
            <FocusCard
              actionHref="/admin/support-team"
              actionLabel="Open Support"
              details={[
                { label: "This Month", value: hasDataError ? "-" : formatMoney(data.supportThisMonth) },
                { label: "Needs Attention", value: hasDataError ? "-" : formatMetric(data.supportNeedsAttention) },
                { label: "Profiles On", value: hasDataError ? "-" : formatMetric(data.visibleSupportProfiles) },
              ]}
              eyebrow="Support"
              title="Support Overview"
            />
          </div>
        </section>

        <section id="todays-work" className="scroll-mt-24">
          <SectionHeader eyebrow="Oversight" title="NCC MVP Work Queues" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkCard
              action="Review Now"
              count={data.draftFruit}
              description="Approve public-safe outcomes only after raw Encounter, Review, and Assessment are ready."
              href="/admin/missionary-profiles?tab=fruit"
              title="Fruit Pending Review"
            />
            <WorkCard
              action="View People"
              count={data.people}
              description="See national People visibility while relationship details remain inside Missionary Workspaces."
              href="/admin/missionary-profiles?tab=people"
              title="People in Your Field"
            />
            <WorkCard
              action="View Meetings"
              count={data.meetings}
              description="Track Tables and quick touches without exposing private field activity publicly."
              href="/admin/missionary-profiles?tab=meetings"
              title="Meetings Visibility"
            />
            <WorkCard
              action="Fix Publishing"
              count={data.incompleteProfiles.length}
              description="Complete public Profile essentials and keep publishing controls curated."
              href="/admin/missionary-profiles?tab=features"
              title="Publishing Controls"
            />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
          <div id="recent-activity" className="space-y-5">
            <RecentActivityFeed items={data.recentActivity} />
            <LatestInquiries inquiries={data.latestInquiries} />
            <IncompleteProfileAlerts profiles={data.incompleteProfiles} />
          </div>
          <QuickActionsPanel />
        </div>
      </div>
    </AdminShell>
  );
}
