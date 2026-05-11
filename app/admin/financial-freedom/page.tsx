import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "../_components/AdminShell";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";
import { updateFinancialFreedomInquiryStatus, updateMajorGiftInquiryStatus } from "./actions";

export const metadata: Metadata = {
  title: "Financial Freedom Admin | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const statusOptions = [
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Follow Up", value: "follow_up" },
  { label: "Closed", value: "closed" },
] as const;

const majorGiftStatusOptions = [
  { label: "New", value: "new" },
  { label: "Needs Follow Up", value: "needs_follow_up" },
  { label: "Contacted", value: "contacted" },
  { label: "Closed", value: "closed" },
  { label: "Archived", value: "archived" },
] as const;

type InquiryStatus = (typeof statusOptions)[number]["value"];
type MajorGiftStatus = (typeof majorGiftStatusOptions)[number]["value"];

type FinancialFreedomInquiry = {
  created_at: string;
  current_savings: number | string | null;
  desired_12_month_outcome: string | null;
  email: string;
  full_name: string;
  help_budget: boolean | null;
  help_debt: boolean | null;
  help_generosity: boolean | null;
  help_overall_plan: boolean | null;
  help_retirement: boolean | null;
  help_savings: boolean | null;
  id: string;
  main_financial_burden: string | null;
  monthly_debt_payments: number | string | null;
  monthly_expenses: number | string | null;
  monthly_giving: number | string | null;
  monthly_income: number | string | null;
  phone: string | null;
  status: InquiryStatus;
  total_debt: number | string | null;
};

type MajorGiftInquiry = {
  best_time_to_contact: string | null;
  created_at: string;
  donation_types: string[] | null;
  email: string;
  first_name: string;
  household_name: string | null;
  id: string;
  intended_for: string | null;
  last_name: string;
  message: string | null;
  phone: string | null;
  profile_slug: string | null;
  projected_amount_range: string | null;
  status: MajorGiftStatus;
};

type SearchParams = {
  error?: string;
  inquiry?: string;
  majorGift?: string;
  saved?: string;
  status?: string;
  type?: string;
};

async function getInquiries() {
  if (!isSupabaseServerConfigured()) {
    return {
      error: "Supabase Auth environment variables are not configured.",
      inquiries: [] as FinancialFreedomInquiry[],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_freedom_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: error.message,
      inquiries: [] as FinancialFreedomInquiry[],
    };
  }

  return {
    inquiries: (data ?? []) as FinancialFreedomInquiry[],
  };
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

async function getMajorGiftInquiries() {
  if (!isSupabaseServerConfigured()) {
    return {
      error: "Supabase Auth environment variables are not configured.",
      inquiries: [] as MajorGiftInquiry[],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("major_gift_inquiries")
    .select("id, first_name, last_name, email, phone, household_name, profile_slug, donation_types, projected_amount_range, intended_for, message, best_time_to_contact, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: isMissingMajorGiftTable(error)
        ? "Apply the major gift inquiries migration before this queue can receive submissions."
        : error.message,
      inquiries: [] as MajorGiftInquiry[],
    };
  }

  return {
    inquiries: (data ?? []) as MajorGiftInquiry[],
  };
}

function formatMoney(value: number | string | null) {
  if (value === null || value === "") {
    return "—";
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(numberValue);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: InquiryStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function majorGiftStatusLabel(status: MajorGiftStatus) {
  return majorGiftStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function getStatusFilter(status?: string): InquiryStatus | undefined {
  return statusOptions.some((option) => option.value === status)
    ? (status as InquiryStatus)
    : undefined;
}

function getMajorGiftStatusFilter(status?: string): MajorGiftStatus | undefined {
  return majorGiftStatusOptions.some((option) => option.value === status)
    ? (status as MajorGiftStatus)
    : undefined;
}

function formatList(values: string[] | null) {
  return values?.length ? values.join(", ") : "—";
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const className = status === "new"
    ? "border-[#C9A24A]/25 bg-[#C9A24A]/10 text-[#D8B65D]"
    : status === "follow_up"
      ? "border-blue-400/20 bg-blue-950/30 text-blue-300/90"
      : status === "reviewed"
        ? "border-green-500/20 bg-green-950/35 text-green-300/90"
        : "border-stone-700/60 bg-stone-900/60 text-stone-400";

  return (
    <span
      className={`inline-flex h-7 items-center justify-center border px-2.5 text-[10px] uppercase tracking-[0.14em] ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {statusLabel(status)}
    </span>
  );
}

function MajorGiftStatusBadge({ status }: { status: MajorGiftStatus }) {
  const className = status === "new"
    ? "border-[#C9A24A]/25 bg-[#C9A24A]/10 text-[#D8B65D]"
    : status === "needs_follow_up"
      ? "border-amber-400/20 bg-amber-950/30 text-amber-200/90"
    : status === "contacted"
      ? "border-blue-400/20 bg-blue-950/30 text-blue-300/90"
      : "border-stone-700/60 bg-stone-900/60 text-stone-400";

  return (
    <span
      className={`inline-flex h-7 items-center justify-center border px-2.5 text-[10px] uppercase tracking-[0.14em] ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {majorGiftStatusLabel(status)}
    </span>
  );
}

function EmptyState({ error }: { error?: string }) {
  return (
    <div className="border border-stone-800/75 bg-[#080808]/85 p-7 text-sm leading-7 text-stone-400">
      <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
        No inquiries
      </p>
      <p className="mt-4">
        {error ?? "Submitted Financial Freedom inquiries will appear here once the public form receives responses."}
      </p>
    </div>
  );
}

function InquiryTabs({ activeType }: { activeType: "financial-freedom" | "major-gift" }) {
  const tabs = [
    { href: "/admin/financial-freedom", label: "Financial Freedom", value: "financial-freedom" },
    { href: "/admin/financial-freedom?type=major-gift", label: "Major Gifts", value: "major-gift" },
  ] as const;

  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-stone-800/70 pb-4">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          className={`inline-flex min-h-10 items-center justify-center border px-4 text-xs uppercase tracking-[0.16em] transition-colors ${
            activeType === tab.value
              ? "border-[#C9A24A]/45 bg-[#C9A24A]/10 text-[#E4C465]"
              : "border-stone-800 text-stone-300 hover:border-[#C9A24A]/60 hover:text-stone-50"
          }`}
          href={tab.href}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function HelpAreas({ inquiry }: { inquiry: FinancialFreedomInquiry }) {
  const areas = [
    ["Budget", inquiry.help_budget],
    ["Debt", inquiry.help_debt],
    ["Savings", inquiry.help_savings],
    ["Retirement", inquiry.help_retirement],
    ["Generosity", inquiry.help_generosity],
    ["Overall Plan", inquiry.help_overall_plan],
  ].filter(([, active]) => active);

  if (areas.length === 0) {
    return <p className="text-sm text-stone-500">No help areas selected.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {areas.map(([label]) => (
        <span key={label as string} className="border border-stone-800 bg-stone-950 px-3 py-2 text-xs uppercase tracking-[0.14em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {label}
        </span>
      ))}
    </div>
  );
}

function DetailGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-stone-800/70 pt-6">
      <h3 className="text-2xl uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
      <div className="mt-1 text-sm leading-7 text-stone-300">
        {value || "—"}
      </div>
    </div>
  );
}

function InquiryDetail({
  inquiry,
  saved,
  statusError,
}: {
  inquiry?: FinancialFreedomInquiry;
  saved: boolean;
  statusError: boolean;
}) {
  if (!inquiry) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-7 text-sm leading-7 text-stone-400">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Detail View
        </p>
        <p className="mt-4">
          Select an inquiry to review contact information, financial snapshot, goals, and follow up status.
        </p>
      </aside>
    );
  }

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 md:p-7 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Detail View
          </p>
          <h2 className="mt-3 text-3xl uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {inquiry.full_name}
          </h2>
        </div>
        <StatusBadge status={inquiry.status} />
      </div>

      {saved ? (
        <p className="mt-5 border border-green-500/20 bg-green-950/20 p-3 text-sm text-green-200">
          Status saved.
        </p>
      ) : null}
      {statusError ? (
        <p className="mt-5 border border-red-500/25 bg-red-950/20 p-3 text-sm text-red-200">
          Status could not be saved. Confirm the database migration is applied and this admin email is allowlisted.
        </p>
      ) : null}

      <form action={updateFinancialFreedomInquiryStatus} className="mt-7 border-y border-stone-800/70 py-5">
        <input type="hidden" name="inquiryId" value={inquiry.id} />
        <label htmlFor="status" className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Status
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <select
            id="status"
            name="status"
            defaultValue={inquiry.status}
            className="min-h-11 flex-1 border border-stone-700 bg-[#050505] px-4 text-sm uppercase tracking-[0.12em] text-stone-100 outline-none focus:border-[#D4A63D]"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center border border-stone-700/85 px-5 py-3 text-xs uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:bg-[#D4A63D]/5 hover:text-[#D4A63D]"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Save
          </button>
        </div>
      </form>

      <div className="mt-7 space-y-7">
        <DetailGroup title="Contact">
          <DetailItem label="Name" value={inquiry.full_name} />
          <DetailItem label="Email" value={<a className="transition-colors hover:text-[#D4A63D]" href={`mailto:${inquiry.email}`}>{inquiry.email}</a>} />
          <DetailItem label="Phone" value={inquiry.phone} />
          <DetailItem label="Created" value={formatDate(inquiry.created_at)} />
        </DetailGroup>

        <DetailGroup title="Help Areas">
          <HelpAreas inquiry={inquiry} />
        </DetailGroup>

        <DetailGroup title="Snapshot">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Monthly Income" value={formatMoney(inquiry.monthly_income)} />
            <DetailItem label="Monthly Expenses" value={formatMoney(inquiry.monthly_expenses)} />
            <DetailItem label="Current Savings" value={formatMoney(inquiry.current_savings)} />
            <DetailItem label="Monthly Giving" value={formatMoney(inquiry.monthly_giving)} />
          </div>
        </DetailGroup>

        <DetailGroup title="Debt">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Total Debt" value={formatMoney(inquiry.total_debt)} />
            <DetailItem label="Monthly Debt Payments" value={formatMoney(inquiry.monthly_debt_payments)} />
          </div>
        </DetailGroup>

        <DetailGroup title="Goals">
          <DetailItem label="Main Financial Burden" value={inquiry.main_financial_burden} />
          <DetailItem label="Desired 12 Month Outcome" value={inquiry.desired_12_month_outcome} />
        </DetailGroup>
      </div>
    </aside>
  );
}

function MajorGiftDetail({
  inquiry,
  saved,
  statusError,
}: {
  inquiry?: MajorGiftInquiry;
  saved: boolean;
  statusError: boolean;
}) {
  if (!inquiry) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-7 text-sm leading-7 text-stone-400">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Major Gift Detail
        </p>
        <p className="mt-4">
          Select a major gift inquiry to review the household, gift intent, and follow-up status.
        </p>
      </aside>
    );
  }

  const fullName = `${inquiry.first_name} ${inquiry.last_name}`.trim();

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 md:p-7 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Major Gift Detail
          </p>
          <h2 className="mt-3 text-3xl uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {fullName}
          </h2>
        </div>
        <MajorGiftStatusBadge status={inquiry.status} />
      </div>

      {saved ? (
        <p className="mt-5 border border-green-500/20 bg-green-950/20 p-3 text-sm text-green-200">
          Status saved.
        </p>
      ) : null}
      {statusError ? (
        <p className="mt-5 border border-red-500/25 bg-red-950/20 p-3 text-sm text-red-200">
          Status could not be saved. Confirm the major gift migration is applied and your admin account can update inquiries.
        </p>
      ) : null}

      <form action={updateMajorGiftInquiryStatus} className="mt-7 border-y border-stone-800/70 py-5">
        <input type="hidden" name="inquiryId" value={inquiry.id} />
        <label htmlFor="major-gift-status" className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Status
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <select
            id="major-gift-status"
            name="status"
            defaultValue={inquiry.status}
            className="min-h-11 flex-1 border border-stone-700 bg-[#050505] px-4 text-sm uppercase tracking-[0.12em] text-stone-100 outline-none focus:border-[#D4A63D]"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {majorGiftStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center border border-stone-700/85 px-5 py-3 text-xs uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:bg-[#D4A63D]/5 hover:text-[#D4A63D]"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Save
          </button>
        </div>
      </form>

      <div className="mt-7 space-y-7">
        <DetailGroup title="Contact">
          <DetailItem label="Name" value={fullName} />
          <DetailItem label="Email" value={<a className="transition-colors hover:text-[#D4A63D]" href={`mailto:${inquiry.email}`}>{inquiry.email}</a>} />
          <DetailItem label="Phone" value={inquiry.phone} />
          <DetailItem label="Best Time To Contact" value={inquiry.best_time_to_contact} />
          <DetailItem label="Submitted" value={formatDate(inquiry.created_at)} />
        </DetailGroup>

        <DetailGroup title="Gift Intent">
          <DetailItem label="Household / Profile" value={inquiry.household_name || inquiry.profile_slug} />
          <DetailItem label="Donation Types" value={formatList(inquiry.donation_types)} />
          <DetailItem label="Projected Amount" value={inquiry.projected_amount_range} />
          <DetailItem label="Intended For" value={inquiry.intended_for} />
        </DetailGroup>

        <DetailGroup title="Notes">
          <DetailItem label="Message" value={inquiry.message} />
        </DetailGroup>
      </div>
    </aside>
  );
}

function InquiryList({
  inquiries,
  selectedId,
  statusFilter,
}: {
  inquiries: FinancialFreedomInquiry[];
  selectedId?: string;
  statusFilter?: InquiryStatus;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="border-b border-stone-800/70 p-5 md:p-6">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Submitted Inquiries
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-3xl uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {statusFilter ? `${statusLabel(statusFilter)} Inquiries` : "Review Queue"}
          </h2>
          {statusFilter ? (
            <Link
              className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-xs uppercase tracking-[0.14em] text-stone-200 transition-colors hover:border-[#C9A24A] hover:text-[#E4C465]"
              href="/admin/financial-freedom"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              Clear Filter
            </Link>
          ) : null}
        </div>
      </div>

      <div className="hidden grid-cols-[1.25fr_1.35fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-stone-800/70 px-5 py-4 text-[11px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        <span>Name</span>
        <span>Email</span>
        <span>Monthly Income</span>
        <span>Total Debt</span>
        <span>Status</span>
        <span>Created</span>
      </div>

      <div className="divide-y divide-stone-900/90">
        {inquiries.map((inquiry) => {
          const isSelected = inquiry.id === selectedId;

          return (
            <Link
              key={inquiry.id}
              href={`/admin/financial-freedom?inquiry=${inquiry.id}`}
              className={`grid gap-4 p-5 transition-colors hover:bg-stone-950/80 lg:grid-cols-[1.25fr_1.35fr_0.9fr_0.9fr_0.8fr_0.8fr] lg:items-center ${
                isSelected ? "bg-[#C9A24A]/5" : ""
              }`}
            >
              <div>
                <p className="text-base font-medium text-stone-100">{inquiry.full_name}</p>
                <p className="mt-1 text-xs text-stone-500 lg:hidden">{inquiry.email}</p>
              </div>
              <p className="hidden truncate text-sm text-stone-400 lg:block">{inquiry.email}</p>
              <p className="text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase lg:hidden" style={{ fontFamily: font.rajdhani }}>Income</span>
                {formatMoney(inquiry.monthly_income)}
              </p>
              <p className="text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase lg:hidden" style={{ fontFamily: font.rajdhani }}>Debt</span>
                {formatMoney(inquiry.total_debt)}
              </p>
              <StatusBadge status={inquiry.status} />
              <p className="text-sm text-stone-400">{formatDate(inquiry.created_at)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MajorGiftList({
  inquiries,
  selectedId,
  statusFilter,
}: {
  inquiries: MajorGiftInquiry[];
  selectedId?: string;
  statusFilter?: MajorGiftStatus;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="border-b border-stone-800/70 p-5 md:p-6">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Major Gift Inquiries
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-3xl uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
            {statusFilter ? `${majorGiftStatusLabel(statusFilter)} Gifts` : "Gift Review Queue"}
          </h2>
          {statusFilter ? (
            <Link
              className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-xs uppercase tracking-[0.14em] text-stone-200 transition-colors hover:border-[#C9A24A] hover:text-[#E4C465]"
              href="/admin/financial-freedom?type=major-gift"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              Clear Filter
            </Link>
          ) : null}
        </div>
      </div>

      <div className="hidden grid-cols-[1fr_1.2fr_0.8fr_1fr_1fr_0.9fr_1fr_0.7fr_0.8fr] gap-3 border-b border-stone-800/70 px-5 py-4 text-[11px] uppercase tracking-[0.16em] text-stone-500 xl:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        <span>Name</span>
        <span>Email</span>
        <span>Phone</span>
        <span>Household</span>
        <span>Types</span>
        <span>Amount</span>
        <span>Intended For</span>
        <span>Status</span>
        <span>Date</span>
      </div>

      <div className="divide-y divide-stone-900/90">
        {inquiries.map((inquiry) => {
          const isSelected = inquiry.id === selectedId;
          const fullName = `${inquiry.first_name} ${inquiry.last_name}`.trim();

          return (
            <Link
              key={inquiry.id}
              href={`/admin/financial-freedom?type=major-gift&majorGift=${inquiry.id}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className={`grid gap-4 p-5 transition-colors hover:bg-stone-950/80 xl:grid-cols-[1fr_1.2fr_0.8fr_1fr_1fr_0.9fr_1fr_0.7fr_0.8fr] xl:items-center ${
                isSelected ? "bg-[#C9A24A]/5" : ""
              }`}
            >
              <div>
                <p className="text-base font-medium text-stone-100">{fullName}</p>
                <p className="mt-1 text-xs text-stone-500 xl:hidden">{inquiry.email}</p>
              </div>
              <p className="hidden truncate text-sm text-stone-400 xl:block">{inquiry.email}</p>
              <p className="text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase xl:hidden" style={{ fontFamily: font.rajdhani }}>Phone</span>
                {inquiry.phone || "—"}
              </p>
              <p className="truncate text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase xl:hidden" style={{ fontFamily: font.rajdhani }}>Household</span>
                {inquiry.household_name || inquiry.profile_slug || "—"}
              </p>
              <p className="truncate text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase xl:hidden" style={{ fontFamily: font.rajdhani }}>Types</span>
                {formatList(inquiry.donation_types)}
              </p>
              <p className="text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase xl:hidden" style={{ fontFamily: font.rajdhani }}>Amount</span>
                {inquiry.projected_amount_range || "—"}
              </p>
              <p className="truncate text-sm text-stone-300">
                <span className="tactical-label mr-2 uppercase xl:hidden" style={{ fontFamily: font.rajdhani }}>For</span>
                {inquiry.intended_for || "—"}
              </p>
              <MajorGiftStatusBadge status={inquiry.status} />
              <p className="text-sm text-stone-400">{formatDate(inquiry.created_at)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function FinancialFreedomAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const isMajorGiftView = params.type === "major-gift";

  if (isMajorGiftView) {
    const statusFilter = getMajorGiftStatusFilter(params.status);
    const { error, inquiries } = await getMajorGiftInquiries();
    const filteredInquiries = statusFilter
      ? inquiries.filter((inquiry) => inquiry.status === statusFilter)
      : inquiries;
    const selectedInquiry = params.majorGift
      ? filteredInquiries.find((inquiry) => inquiry.id === params.majorGift)
      : filteredInquiries[0];

    return (
      <AdminShell
        active="financial-freedom"
        description="Review Financial Freedom requests that need follow-up."
        title="Financial Freedom"
      >
        <InquiryTabs activeType="major-gift" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          {filteredInquiries.length > 0 ? (
            <MajorGiftList inquiries={filteredInquiries} selectedId={selectedInquiry?.id} statusFilter={statusFilter} />
          ) : (
            <EmptyState error={error ?? (statusFilter ? `No ${majorGiftStatusLabel(statusFilter).toLowerCase()} major gift inquiries are waiting right now.` : "Major gift inquiries will appear here when visitors submit the profile form.")} />
          )}

          <MajorGiftDetail
            inquiry={selectedInquiry}
            saved={params.saved === "1"}
            statusError={params.error === "status" || params.error === "config"}
          />
        </div>
      </AdminShell>
    );
  }

  const statusFilter = getStatusFilter(params.status);
  const { error, inquiries } = await getInquiries();
  const filteredInquiries = statusFilter
    ? inquiries.filter((inquiry) => inquiry.status === statusFilter)
    : inquiries;
  const selectedInquiry = params.inquiry
    ? filteredInquiries.find((inquiry) => inquiry.id === params.inquiry)
    : filteredInquiries[0];

  return (
    <AdminShell
      active="financial-freedom"
      description="Review Financial Freedom requests that need follow-up."
      title="Financial Freedom"
    >
      <InquiryTabs activeType="financial-freedom" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        {filteredInquiries.length > 0 ? (
          <InquiryList inquiries={filteredInquiries} selectedId={selectedInquiry?.id} statusFilter={statusFilter} />
        ) : (
          <EmptyState error={error ?? (statusFilter ? `No ${statusLabel(statusFilter).toLowerCase()} inquiries are waiting right now.` : undefined)} />
        )}

        <InquiryDetail
          inquiry={selectedInquiry}
          saved={params.saved === "1"}
          statusError={params.error === "status" || params.error === "config"}
        />
      </div>
    </AdminShell>
  );
}
