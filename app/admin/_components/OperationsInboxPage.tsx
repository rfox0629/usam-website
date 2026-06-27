import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell, type AdminNavKey } from "./AdminShell";
import { AdminActionLink, AdminBadge, AdminEmptyState, AdminMetricCard, adminFont, type AdminBadgeTone } from "./AdminUI";
import { assignFinanceSubmissionProfile } from "../finance/actions";
import { getPublicSupportProfileOptions } from "@/src/lib/missionaries/support-profile-options";
import type { PublicSupportProfileOption } from "@/src/lib/missionaries/support-profile-types";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type OperationBucket = "completed" | "follow_up" | "new" | "pending";

type OperationSourceForm = {
  name: string;
  route: string;
};

type OperationRecord = {
  assignmentType?: "major_gift_inquiry" | "support_commitment";
  createdAt: string;
  detail: string;
  href?: string;
  id: string;
  linkedMissionary?: string;
  missionaryProfileId?: string | null;
  profileMatchStatus?: string | null;
  source: string;
  status: string;
  title: string;
};

export type OperationInboxConfig = {
  active: AdminNavKey;
  description: string;
  emptyDescription: string;
  formTypes?: readonly string[];
  includeMajorGiftInquiries?: boolean;
  includeProfileAssignment?: boolean;
  includeSupportCommitments?: boolean;
  includeUsamApplications?: boolean;
  sourceForms: readonly OperationSourceForm[];
  title: string;
};

type FormSubmissionRow = {
  created_at: string;
  email: string | null;
  first_name: string | null;
  form_type: string;
  id: string;
  last_name: string | null;
  message: string | null;
  phone: string | null;
  source_page: string | null;
  status: string | null;
};

type SupportCommitmentRow = {
  created_at: string | null;
  email: string | null;
  first_name: string | null;
  gift_type: string | null;
  gross_amount: number | string | null;
  household_id: string | null;
  household_name: string | null;
  id: string;
  last_name: string | null;
  missionary_profile_id: string | null;
  phone: string | null;
  profile_match_status: string | null;
  profile_slug: string | null;
  selected_amount: string | null;
  status: string | null;
  submitted_at: string | null;
};

type MajorGiftInquiryRow = {
  created_at: string | null;
  donation_types: string[] | null;
  email: string | null;
  first_name: string | null;
  household_id: string | null;
  household_name: string | null;
  id: string;
  last_name: string | null;
  missionary_profile_id: string | null;
  phone: string | null;
  profile_match_status: string | null;
  profile_slug: string | null;
  projected_amount_range: string | null;
  status: string | null;
};

type UsamApplicationRow = {
  applicant_email: string | null;
  applicant_name: string;
  applicant_phone: string | null;
  created_at: string;
  id: string;
  status: string | null;
  submitted_at: string | null;
};

function titleFromValue(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function displayName(firstName?: string | null, lastName?: string | null, fallback = "Unknown") {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
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

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(String(value).replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(numberValue);
}

function bucketForStatus(status: string | null | undefined): OperationBucket {
  const normalized = status?.toLowerCase() ?? "";

  if (normalized === "new") {
    return "new";
  }

  if (
    normalized === "needs_follow_up"
    || normalized === "follow_up"
    || normalized === "pending_giving_setup"
    || normalized === "incomplete"
  ) {
    return "follow_up";
  }

  if (
    normalized === "closed"
    || normalized === "converted"
    || normalized === "completed"
    || normalized === "approved"
    || normalized === "active"
    || normalized === "answered"
    || normalized === "archived"
  ) {
    return "completed";
  }

  return "pending";
}

function bucketLabel(bucket: OperationBucket) {
  return {
    completed: "Completed",
    follow_up: "Follow Up",
    new: "New",
    pending: "Pending",
  }[bucket];
}

function bucketTone(bucket: OperationBucket) {
  const tones: Record<OperationBucket, AdminBadgeTone> = {
    completed: "green",
    follow_up: "amber",
    new: "blue",
    pending: "muted",
  };

  return tones[bucket];
}

function formRecord(row: FormSubmissionRow): OperationRecord {
  const name = displayName(row.first_name, row.last_name, row.email || row.phone || "Unknown");

  return {
    createdAt: row.created_at,
    detail: row.message || row.email || row.phone || row.source_page || "Form submission",
    id: row.id,
    source: titleFromValue(row.form_type),
    status: row.status ?? "new",
    title: name,
  };
}

function linkedMissionaryLabel(row: {
  household_id?: string | null;
  household_name?: string | null;
  missionary_profile_id?: string | null;
  profile_slug?: string | null;
}, profileNameById: Map<string, string>) {
  const profileId = row.missionary_profile_id ?? row.household_id ?? null;

  return profileId
    ? profileNameById.get(profileId) ?? row.household_name ?? row.profile_slug ?? "Linked profile"
    : "Unassigned";
}

function supportCommitmentRecord(row: SupportCommitmentRow, profileNameById: Map<string, string>): OperationRecord {
  const amount = formatMoney(row.gross_amount) ?? row.selected_amount ?? "Amount pending";
  const linkedMissionary = linkedMissionaryLabel(row, profileNameById);

  return {
    assignmentType: "support_commitment",
    createdAt: row.submitted_at ?? row.created_at ?? "",
    detail: `${row.gift_type ? titleFromValue(row.gift_type) : "Support commitment"} · ${amount} · ${linkedMissionary}`,
    href: "/admin/support?view=reconciliation",
    id: row.id,
    linkedMissionary,
    missionaryProfileId: row.missionary_profile_id ?? row.household_id ?? null,
    profileMatchStatus: row.profile_match_status,
    source: "Giving Commitments",
    status: row.status ?? "new",
    title: displayName(row.first_name, row.last_name, row.email || row.phone || "Unknown donor"),
  };
}

function majorGiftInquiryRecord(row: MajorGiftInquiryRow, profileNameById: Map<string, string>): OperationRecord {
  const giftTypes = row.donation_types?.length ? row.donation_types.join(", ") : "Major gift";
  const linkedMissionary = linkedMissionaryLabel(row, profileNameById);

  return {
    assignmentType: "major_gift_inquiry",
    createdAt: row.created_at ?? "",
    detail: `${giftTypes} · ${row.projected_amount_range ?? "Range pending"} · ${linkedMissionary}`,
    href: "/admin/financial-freedom?type=major-gift",
    id: row.id,
    linkedMissionary,
    missionaryProfileId: row.missionary_profile_id ?? row.household_id ?? null,
    profileMatchStatus: row.profile_match_status,
    source: "Major Gift",
    status: row.status ?? "new",
    title: displayName(row.first_name, row.last_name, row.email || row.phone || "Unknown donor"),
  };
}

function usamApplicationRecord(row: UsamApplicationRow): OperationRecord {
  return {
    createdAt: row.submitted_at ?? row.created_at,
    detail: row.applicant_email || row.applicant_phone || "USA Missionary Application",
    href: "/admin/organizations/usa-missionaries?tab=applications",
    id: row.id,
    source: "USA Missionary Application",
    status: row.status ?? "application_started",
    title: row.applicant_name || row.applicant_email || "Applicant",
  };
}

function isMissingTable(error: { code?: string; message?: string } | null | undefined, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes(tableName)
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the table");
}

async function loadOperationRecords(config: OperationInboxConfig) {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      records: [] as OperationRecord[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const records: OperationRecord[] = [];
  const errors: string[] = [];
  const profileOptions = config.includeProfileAssignment
    ? await getPublicSupportProfileOptions()
    : [];
  const profileNameById = new Map(profileOptions.map((profile) => [profile.id, profile.displayName]));

  if (config.formTypes?.length) {
    const { data, error } = await supabase
      .from("form_submissions")
      .select("id, form_type, source_page, first_name, last_name, email, phone, message, status, created_at")
      .in("form_type", [...config.formTypes])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      errors.push(error.message);
    } else {
      records.push(...((data ?? []) as FormSubmissionRow[]).map(formRecord));
    }
  }

  if (config.includeSupportCommitments) {
    const { data, error } = await supabase
      .from("support_commitments")
      .select("id, household_id, household_name, missionary_profile_id, profile_slug, profile_match_status, first_name, last_name, email, phone, gift_type, selected_amount, gross_amount, status, submitted_at, created_at")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error && !isMissingTable(error, "support_commitments")) {
      if (error.message?.includes("missionary_profile_id") || error.message?.includes("profile_match_status")) {
        const fallbackResult = await supabase
          .from("support_commitments")
          .select("id, household_id, household_name, profile_slug, first_name, last_name, email, phone, gift_type, selected_amount, gross_amount, status, submitted_at, created_at")
          .order("submitted_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (fallbackResult.error && !isMissingTable(fallbackResult.error, "support_commitments")) {
          errors.push(fallbackResult.error.message);
        } else if (!fallbackResult.error) {
          records.push(...((fallbackResult.data ?? []) as SupportCommitmentRow[]).map((row) => supportCommitmentRecord(row, profileNameById)));
        }
      } else {
        errors.push(error.message);
      }
    } else if (!error) {
      records.push(...((data ?? []) as SupportCommitmentRow[]).map((row) => supportCommitmentRecord(row, profileNameById)));
    }
  }

  if (config.includeMajorGiftInquiries) {
    const { data, error } = await supabase
      .from("major_gift_inquiries")
      .select("id, household_id, household_name, missionary_profile_id, profile_slug, profile_match_status, first_name, last_name, email, phone, donation_types, projected_amount_range, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error && !isMissingTable(error, "major_gift_inquiries")) {
      if (error.message?.includes("missionary_profile_id") || error.message?.includes("profile_match_status")) {
        const fallbackResult = await supabase
          .from("major_gift_inquiries")
          .select("id, household_id, household_name, profile_slug, first_name, last_name, email, phone, donation_types, projected_amount_range, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (fallbackResult.error && !isMissingTable(fallbackResult.error, "major_gift_inquiries")) {
          errors.push(fallbackResult.error.message);
        } else if (!fallbackResult.error) {
          records.push(...((fallbackResult.data ?? []) as MajorGiftInquiryRow[]).map((row) => majorGiftInquiryRecord(row, profileNameById)));
        }
      } else {
        errors.push(error.message);
      }
    } else if (!error) {
      records.push(...((data ?? []) as MajorGiftInquiryRow[]).map((row) => majorGiftInquiryRecord(row, profileNameById)));
    }
  }

  if (config.includeUsamApplications) {
    const { data, error } = await supabase
      .from("usam_missionary_applications")
      .select("id, applicant_name, applicant_email, applicant_phone, status, submitted_at, created_at")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error && !isMissingTable(error, "usam_missionary_applications")) {
      errors.push(error.message);
    } else if (!error) {
      records.push(...((data ?? []) as UsamApplicationRow[]).map(usamApplicationRecord));
    }
  }

  return {
    error: errors[0],
    profileOptions,
    records: records.sort((first, second) => {
      return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
    }),
  };
}

function SourceForms({ sourceForms }: { sourceForms: readonly OperationSourceForm[] }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <p
        className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        Source Forms
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sourceForms.map((source) => (
          <Link
            className="inline-flex min-h-8 items-center rounded-full border border-stone-700 px-3 text-xs text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
            href={source.route}
            key={`${source.name}-${source.route}`}
          >
            {source.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssignmentControl({
  profileOptions,
  record,
}: {
  profileOptions: readonly PublicSupportProfileOption[];
  record: OperationRecord;
}) {
  if (!record.assignmentType) {
    return <MetaCell label="Linked Missionary" value={record.linkedMissionary ?? "-"} />;
  }

  return (
    <form action={assignFinanceSubmissionProfile} className="grid gap-2">
      <input name="assignmentType" type="hidden" value={record.assignmentType} />
      <input name="submissionId" type="hidden" value={record.id} />
      <HeaderCell>Linked Missionary</HeaderCell>
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <select
          className="min-h-9 w-full rounded-md border border-stone-700 bg-[#050505] px-2.5 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
          defaultValue={record.missionaryProfileId ?? ""}
          name="missionaryProfileId"
        >
          <option value="">Unassigned</option>
          {profileOptions.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.displayName}
            </option>
          ))}
        </select>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-stone-700 bg-stone-950 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          type="submit"
        >
          Save
        </button>
      </div>
      {record.profileMatchStatus === "needs_review" ? (
        <p className="text-xs text-[#E4C465]">Needs review</p>
      ) : null}
    </form>
  );
}

function RecordsList({
  profileOptions,
  records,
  showProfileAssignment,
}: {
  profileOptions: readonly PublicSupportProfileOption[];
  records: readonly OperationRecord[];
  showProfileAssignment: boolean;
}) {
  const gridClassName = showProfileAssignment
    ? "lg:grid-cols-[minmax(0,1fr)_150px_150px_120px_130px]"
    : "lg:grid-cols-[minmax(0,1fr)_170px_130px_130px]";

  return (
    <section className="overflow-hidden rounded-xl border border-stone-800/75 bg-[#080808]/90">
      <div className={`hidden border-b border-stone-800/70 bg-[#050505]/65 px-4 py-3 lg:grid ${gridClassName} lg:gap-4`}>
        <HeaderCell>Submission</HeaderCell>
        <HeaderCell>Source</HeaderCell>
        {showProfileAssignment ? <HeaderCell>Linked Missionary</HeaderCell> : null}
        <HeaderCell>Status</HeaderCell>
        <HeaderCell>Last Activity</HeaderCell>
      </div>
      <div className="divide-y divide-stone-900/95">
        {records.map((record) => {
          const bucket = bucketForStatus(record.status);
          const content = (
            <div className={`grid gap-4 px-4 py-4 transition-colors hover:bg-stone-950/40 ${gridClassName} lg:items-center`}>
              <div className="min-w-0">
                <HeaderCell>Submission</HeaderCell>
                <p className="mt-1 truncate font-semibold text-stone-100">{record.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-400">{record.detail}</p>
              </div>
              <MetaCell label="Source" value={record.source} />
              {showProfileAssignment ? (
                <AssignmentControl profileOptions={profileOptions} record={record} />
              ) : null}
              <div>
                <HeaderCell>Status</HeaderCell>
                <div className="mt-1"><AdminBadge tone={bucketTone(bucket)}>{bucketLabel(bucket)}</AdminBadge></div>
              </div>
              <MetaCell label="Last Activity" value={formatDate(record.createdAt)} />
            </div>
          );

          return record.href && !showProfileAssignment ? (
            <Link href={record.href} key={record.id}>
              {content}
            </Link>
          ) : (
            <div key={record.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[9px] uppercase tracking-[0.16em] text-stone-500"
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </p>
  );
}

function MetaCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <HeaderCell>{label}</HeaderCell>
      <div className="mt-1 truncate text-sm text-stone-300">{value || "-"}</div>
    </div>
  );
}

export async function OperationsInboxPage({ config }: { config: OperationInboxConfig }) {
  const { error, profileOptions = [], records } = await loadOperationRecords(config);
  const counts = records.reduce(
    (acc, record) => {
      acc[bucketForStatus(record.status)] += 1;
      return acc;
    },
    { completed: 0, follow_up: 0, new: 0, pending: 0 },
  );

  return (
    <AdminShell
      active={config.active}
      description={config.description}
      title={config.title}
    >
      <div className="space-y-5">
        <SourceForms sourceForms={config.sourceForms} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="New" value={counts.new} />
          <AdminMetricCard label="Pending" value={counts.pending} />
          <AdminMetricCard label="Follow Up" value={counts.follow_up} />
          <AdminMetricCard label="Completed" value={counts.completed} />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Operations data is not ready: {error}
          </p>
        ) : null}

        {records.length > 0 ? (
          <RecordsList
            profileOptions={profileOptions}
            records={records}
            showProfileAssignment={config.includeProfileAssignment === true}
          />
        ) : (
          <AdminEmptyState
            action={config.sourceForms[0] ? (
              <AdminActionLink href={config.sourceForms[0].route} variant="outline">
                Open Source
              </AdminActionLink>
            ) : undefined}
            description={config.emptyDescription}
            title="No Submissions"
          />
        )}
      </div>
    </AdminShell>
  );
}
