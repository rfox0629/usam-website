import "server-only";

import {
  canAccessOperationsModule,
  type OperationsAuthorization,
} from "@/src/lib/operations/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PcoGivingRecordRow = {
  designation_name: string | null;
  donation_date: string | null;
  donor_email: string | null;
  donor_first_name: string | null;
  donor_last_name: string | null;
  fund_name: string | null;
  gift_type: string | null;
  gross_amount: number | string | null;
  id: string;
  pco_donation_id: string | null;
  pco_recurring_donation_id: string | null;
  received_at: string | null;
  status: string | null;
};

type PcoGivingSyncRunRow = {
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  id: string;
  records_imported: number | null;
  records_seen: number | null;
  started_at: string | null;
  status: string | null;
  sync_type: string | null;
};

type SupportCommitmentMatchRow = {
  confidence: number | string | null;
  created_at: string;
  id: string;
  match_status: string | null;
  pco_giving_record_id: string;
  support_commitment_id: string;
};

export type OperationsFinanceGivingRecord = {
  amountLabel: string;
  date: string | null;
  designation: string | null;
  donor: string;
  email: string | null;
  giftType: string;
  id: string;
  planningCenterId: string | null;
  recurringId: string | null;
  status: string;
};

type CurrentMonthGrossResult = {
  error?: string;
  total: number;
};

export type OperationsFinanceSyncRun = {
  completedAt: string | null;
  errorMessage: string | null;
  id: string;
  imported: number;
  seen: number;
  startedAt: string | null;
  status: string;
  syncType: string;
};

export type OperationsFinanceMatch = {
  confidenceLabel: string;
  createdAt: string;
  id: string;
  status: string;
};

export type OperationsFinanceOverview = {
  currentMonthGrossLabel: string;
  error?: string;
  lastSync: OperationsFinanceSyncRun | null;
  matchCount: number;
  needsReviewCount: number;
  records: OperationsFinanceGivingRecord[];
  recentMatches: OperationsFinanceMatch[];
  sourceLabel: string;
  syncRuns: OperationsFinanceSyncRun[];
  totalRecordCount: number;
};

function isMissingTableError(error: { code?: string; message?: string } | null | undefined, table: string) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes(table)
    || message.includes("does not exist")
    || message.includes("schema cache");
}

function asNumber(value: unknown) {
  const amount = typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(String(value ?? "").replace(/[$,]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function moneyLabel(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(asNumber(value));
}

function titleFromValue(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function donorName(row: PcoGivingRecordRow) {
  return [row.donor_first_name, row.donor_last_name].filter(Boolean).join(" ").trim()
    || row.donor_email
    || "Unknown donor";
}

function givingRecordFromRow(row: PcoGivingRecordRow): OperationsFinanceGivingRecord {
  return {
    amountLabel: moneyLabel(row.gross_amount),
    date: row.donation_date ?? row.received_at,
    designation: row.designation_name ?? row.fund_name,
    donor: donorName(row),
    email: row.donor_email,
    giftType: titleFromValue(row.gift_type),
    id: row.id,
    planningCenterId: row.pco_donation_id,
    recurringId: row.pco_recurring_donation_id,
    status: titleFromValue(row.status),
  };
}

function syncRunFromRow(row: PcoGivingSyncRunRow): OperationsFinanceSyncRun {
  return {
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    id: row.id,
    imported: row.records_imported ?? 0,
    seen: row.records_seen ?? 0,
    startedAt: row.started_at,
    status: titleFromValue(row.status),
    syncType: titleFromValue(row.sync_type),
  };
}

function matchFromRow(row: SupportCommitmentMatchRow): OperationsFinanceMatch {
  return {
    confidenceLabel: `${Math.round(asNumber(row.confidence))}%`,
    createdAt: row.created_at,
    id: row.id,
    status: titleFromValue(row.match_status),
  };
}

function isCurrentMonth(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();

  return !Number.isNaN(date.getTime())
    && date.getUTCFullYear() === now.getUTCFullYear()
    && date.getUTCMonth() === now.getUTCMonth();
}

async function loadCurrentMonthGross(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  monthStart: string,
): Promise<CurrentMonthGrossResult> {
  const pageSize = 1000;
  let total = 0;

  for (let page = 0; page < 50; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("pco_giving_records")
      .select("gross_amount, donation_date, received_at")
      .or(`donation_date.gte.${monthStart},received_at.gte.${monthStart}`)
      .range(from, to);

    if (error) {
      return {
        error: isMissingTableError(error, "pco_giving_records")
          ? undefined
          : error.message,
        total: 0,
      };
    }

    const rows = (data ?? []) as Pick<PcoGivingRecordRow, "donation_date" | "gross_amount" | "received_at">[];
    total += rows
      .filter((record) => isCurrentMonth(record.donation_date ?? record.received_at))
      .reduce((sum, record) => sum + asNumber(record.gross_amount), 0);

    if (rows.length < pageSize) {
      break;
    }
  }

  return { total };
}

export async function loadOperationsFinanceOverview({
  authorization,
}: {
  authorization: OperationsAuthorization;
}): Promise<OperationsFinanceOverview> {
  const emptyOverview: OperationsFinanceOverview = {
    currentMonthGrossLabel: "$0",
    lastSync: null,
    matchCount: 0,
    needsReviewCount: 0,
    records: [],
    recentMatches: [],
    sourceLabel: "Planning Center Giving",
    syncRuns: [],
    totalRecordCount: 0,
  };

  if (authorization.status !== "authorized" || !canAccessOperationsModule(authorization, "finance")) {
    return emptyOverview;
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      ...emptyOverview,
      error: "Supabase admin environment variables are not configured.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [
    givingRecordsResult,
    countResult,
    needsReviewResult,
    syncRunsResult,
    matchesResult,
  ] = await Promise.all([
    supabase
      .from("pco_giving_records")
      .select("id, pco_donation_id, pco_recurring_donation_id, donor_first_name, donor_last_name, donor_email, gross_amount, gift_type, designation_name, fund_name, donation_date, received_at, status")
      .order("donation_date", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from("pco_giving_records")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("pco_giving_records")
      .select("id", { count: "exact", head: true })
      .eq("status", "needs_review"),
    supabase
      .from("pco_giving_sync_runs")
      .select("id, status, sync_type, started_at, completed_at, records_seen, records_imported, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("support_commitment_matches")
      .select("id, support_commitment_id, pco_giving_record_id, match_status, confidence, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (givingRecordsResult.error) {
    return {
      ...emptyOverview,
      error: isMissingTableError(givingRecordsResult.error, "pco_giving_records")
        ? "Planning Center Giving records are not connected yet."
        : givingRecordsResult.error.message,
    };
  }

  const records = ((givingRecordsResult.data ?? []) as PcoGivingRecordRow[]).map(givingRecordFromRow);
  const syncRuns = syncRunsResult.error && !isMissingTableError(syncRunsResult.error, "pco_giving_sync_runs")
    ? []
    : ((syncRunsResult.data ?? []) as PcoGivingSyncRunRow[]).map(syncRunFromRow);
  const recentMatches = matchesResult.error && !isMissingTableError(matchesResult.error, "support_commitment_matches")
    ? []
    : ((matchesResult.data ?? []) as SupportCommitmentMatchRow[]).map(matchFromRow);
  const currentMonthGross = await loadCurrentMonthGross(supabase, monthStart);
  const financeError = countResult.error && !isMissingTableError(countResult.error, "pco_giving_records")
    ? countResult.error.message
    : currentMonthGross.error;

  return {
    currentMonthGrossLabel: moneyLabel(currentMonthGross.total),
    error: financeError,
    lastSync: syncRuns[0] ?? null,
    matchCount: recentMatches.length,
    needsReviewCount: needsReviewResult.count ?? 0,
    records,
    recentMatches,
    sourceLabel: "Planning Center Giving",
    syncRuns,
    totalRecordCount: countResult.count ?? records.length,
  };
}
