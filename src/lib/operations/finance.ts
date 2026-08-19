import "server-only";

import {
  canAccessOperationsModule,
  type OperationsAuthorization,
} from "@/src/lib/operations/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { donorLabel, loadDonorIdentities } from "@/src/lib/planning-center/people-sync";

type PcoGivingRecordRow = {
  attributed_missionary_profile_id: string | null;
  attribution_kind: string | null;
  attribution_source: string | null;
  campaign_name: string | null;
  designation_name: string | null;
  donation_date: string | null;
  donor_email: string | null;
  donor_first_name: string | null;
  donor_last_name: string | null;
  donor_display_name: string | null;
  fund_name: string | null;
  pco_person_id: string | null;
  gift_status: string | null;
  gift_type: string | null;
  gross_amount: number | string | null;
  id: string;
  is_recurring: boolean | null;
  pco_donation_id: string | null;
  pco_fund_id: string | null;
  pco_recurring_source_id: string | null;
  received_at: string | null;
  refunded: boolean | null;
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

export type OperationsFinanceAttribution = "general" | "missionary" | "unmapped" | "ignored";

export type OperationsFinanceGivingRecord = {
  amountLabel: string;
  attribution: OperationsFinanceAttribution;
  attributionLabel: string;
  date: string | null;
  designation: string | null;
  donor: string;
  email: string | null;
  giftType: string;
  id: string;
  planningCenterId: string | null;
  recurringId: string | null;
  refunded: boolean;
  status: string;
};

export type OperationsFinanceUnmappedDesignation = {
  amountLabel: string;
  count: number;
  fundId: string | null;
  label: string;
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
  generalTotalLabel: string;
  missionaryTotalLabel: string;
  refundedCount: number;
  sourceLabel: string;
  syncRuns: OperationsFinanceSyncRun[];
  totalRecordCount: number;
  unmappedCount: number;
  unmappedDesignations: OperationsFinanceUnmappedDesignation[];
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

function donorName(row: PcoGivingRecordRow, identity?: { displayName: string | null }) {
  return donorLabel({
    cachedDisplayName: identity?.displayName,
    personId: row.pco_person_id,
    recordFallback: row.donor_display_name
      || [row.donor_first_name, row.donor_last_name].filter(Boolean).join(" ").trim()
      || null,
  });
}

const attributionLabels: Record<OperationsFinanceAttribution, string> = {
  general: "General / USAM",
  ignored: "Ignored",
  missionary: "Missionary",
  unmapped: "Unmapped",
};

function attributionOf(row: PcoGivingRecordRow): OperationsFinanceAttribution {
  const kind = row.attribution_kind ?? "unmapped";

  return kind === "general" || kind === "missionary" || kind === "ignored" ? kind : "unmapped";
}

function givingRecordFromRow(
  row: PcoGivingRecordRow,
  identity?: { displayName: string | null; email: string | null },
): OperationsFinanceGivingRecord {
  const attribution = attributionOf(row);

  return {
    amountLabel: moneyLabel(row.gross_amount),
    attribution,
    attributionLabel: attributionLabels[attribution],
    date: row.donation_date ?? row.received_at,
    designation: row.designation_name ?? row.fund_name ?? row.campaign_name,
    donor: donorName(row, identity),
    email: identity?.email ?? row.donor_email,
    giftType: row.is_recurring ? "Recurring" : titleFromValue(row.gift_type),
    id: row.id,
    planningCenterId: row.pco_donation_id,
    recurringId: row.pco_recurring_source_id,
    refunded: row.refunded === true,
    status: titleFromValue(row.gift_status ?? row.status),
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

type AttributionTotals = {
  general: number;
  missionary: number;
  refundedCount: number;
  unmapped: Map<string, OperationsFinanceUnmappedDesignation & { amount: number }>;
  unmappedCount: number;
};

/**
 * Totals are computed over every imported gift, not just the 100 shown in the
 * table, so the header numbers describe the whole ledger.
 */
async function loadAttributionTotals(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<AttributionTotals> {
  const pageSize = 1000;
  const totals: AttributionTotals = {
    general: 0,
    missionary: 0,
    refundedCount: 0,
    unmapped: new Map(),
    unmappedCount: 0,
  };

  for (let page = 0; page < 50; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("pco_giving_records")
      .select("gross_amount, attribution_kind, refunded, fund_name, campaign_name, pco_fund_id")
      .range(from, from + pageSize - 1);

    if (error) {
      return totals;
    }

    const rows = (data ?? []) as {
      attribution_kind: string | null;
      campaign_name: string | null;
      fund_name: string | null;
      gross_amount: number | string | null;
      pco_fund_id: string | null;
      refunded: boolean | null;
    }[];

    for (const row of rows) {
      const amount = asNumber(row.gross_amount);

      if (row.refunded === true) {
        totals.refundedCount += 1;
        continue;
      }

      if (row.attribution_kind === "general") {
        totals.general += amount;
      } else if (row.attribution_kind === "missionary") {
        totals.missionary += amount;
      } else if (row.attribution_kind !== "ignored") {
        totals.unmappedCount += 1;

        const label = row.fund_name ?? row.campaign_name ?? "No designation";
        const key = row.pco_fund_id ?? label.toLowerCase();
        const bucket = totals.unmapped.get(key)
          ?? { amount: 0, amountLabel: "$0", count: 0, fundId: row.pco_fund_id, label };
        bucket.count += 1;
        bucket.amount += amount;
        totals.unmapped.set(key, bucket);
      }
    }

    if (rows.length < pageSize) {
      break;
    }
  }

  return totals;
}

export async function loadOperationsFinanceOverview({
  authorization,
}: {
  authorization: OperationsAuthorization;
}): Promise<OperationsFinanceOverview> {
  const emptyOverview: OperationsFinanceOverview = {
    currentMonthGrossLabel: "$0",
    generalTotalLabel: "$0",
    missionaryTotalLabel: "$0",
    refundedCount: 0,
    unmappedCount: 0,
    unmappedDesignations: [],
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
      .select("id, pco_donation_id, pco_recurring_source_id, pco_fund_id, pco_person_id, donor_first_name, donor_last_name, donor_display_name, donor_email, gross_amount, gift_type, is_recurring, designation_name, fund_name, campaign_name, donation_date, received_at, status, gift_status, refunded, attribution_kind, attribution_source, attributed_missionary_profile_id")
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

  const recordRows = (givingRecordsResult.data ?? []) as PcoGivingRecordRow[];
  // Donor identity is resolved strictly by stable Planning Center person id.
  // The giving records themselves are never rewritten by this lookup.
  const identities = await loadDonorIdentities(recordRows.map((row) => row.pco_person_id));
  const records = recordRows.map((row) => givingRecordFromRow(
    row,
    row.pco_person_id ? identities.get(row.pco_person_id) : undefined,
  ));
  const syncRuns = syncRunsResult.error && !isMissingTableError(syncRunsResult.error, "pco_giving_sync_runs")
    ? []
    : ((syncRunsResult.data ?? []) as PcoGivingSyncRunRow[]).map(syncRunFromRow);
  const recentMatches = matchesResult.error && !isMissingTableError(matchesResult.error, "support_commitment_matches")
    ? []
    : ((matchesResult.data ?? []) as SupportCommitmentMatchRow[]).map(matchFromRow);
  const [currentMonthGross, attributionTotals] = await Promise.all([
    loadCurrentMonthGross(supabase, monthStart),
    loadAttributionTotals(supabase),
  ]);
  const unmappedDesignations = Array.from(attributionTotals.unmapped.values())
    .map((entry) => ({
      amountLabel: moneyLabel(entry.amount),
      count: entry.count,
      fundId: entry.fundId,
      label: entry.label,
    }))
    .sort((a, b) => b.count - a.count);
  const financeError = countResult.error && !isMissingTableError(countResult.error, "pco_giving_records")
    ? countResult.error.message
    : currentMonthGross.error;

  return {
    currentMonthGrossLabel: moneyLabel(currentMonthGross.total),
    error: financeError,
    generalTotalLabel: moneyLabel(attributionTotals.general),
    missionaryTotalLabel: moneyLabel(attributionTotals.missionary),
    refundedCount: attributionTotals.refundedCount,
    unmappedCount: attributionTotals.unmappedCount,
    unmappedDesignations,
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

export type OperationsMissionaryFunding = {
  approvedMonthlyGoal: number | null;
  connected: boolean;
  excessLabel: string | null;
  fundedPercent: number | null;
  gapLabel: string | null;
  giftCount: number;
  oneTimeTotalLabel: string;
  recurringMonthlyLabel: string;
  reliable: boolean;
};

/**
 * Funding numbers are built only from gifts an explicit mapping already
 * attributed to this missionary. With no mapping the summary reports that it is
 * not connected rather than showing a misleading $0.
 */
export async function loadMissionaryGivingSummary({
  approvedMonthlyGoal,
  authorization,
  missionaryProfileId,
}: {
  approvedMonthlyGoal: number | null;
  authorization: OperationsAuthorization;
  missionaryProfileId: string | null;
}): Promise<OperationsMissionaryFunding> {
  const empty: OperationsMissionaryFunding = {
    approvedMonthlyGoal,
    connected: false,
    excessLabel: null,
    fundedPercent: null,
    gapLabel: null,
    giftCount: 0,
    oneTimeTotalLabel: moneyLabel(0),
    recurringMonthlyLabel: moneyLabel(0),
    reliable: false,
  };

  if (
    !missionaryProfileId
    || authorization.status !== "authorized"
    || !canAccessOperationsModule(authorization, "finance")
    || !isSupabaseAdminConfigured()
  ) {
    return empty;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pco_giving_records")
    .select("gross_amount, is_recurring, refunded, donation_date")
    .eq("attribution_kind", "missionary")
    .eq("attributed_missionary_profile_id", missionaryProfileId)
    .limit(5000);

  if (error) {
    return empty;
  }

  const rows = ((data ?? []) as {
    donation_date: string | null;
    gross_amount: number | string | null;
    is_recurring: boolean | null;
    refunded: boolean | null;
  }[]).filter((row) => row.refunded !== true);

  if (rows.length === 0) {
    return { ...empty, connected: true };
  }

  const recurringMonthly = rows
    .filter((row) => row.is_recurring === true && isCurrentMonth(row.donation_date))
    .reduce((sum, row) => sum + asNumber(row.gross_amount), 0);
  const oneTimeTotal = rows
    .filter((row) => row.is_recurring !== true)
    .reduce((sum, row) => sum + asNumber(row.gross_amount), 0);

  const goal = approvedMonthlyGoal && approvedMonthlyGoal > 0 ? approvedMonthlyGoal : null;
  const fundedPercent = goal ? Math.round((recurringMonthly / goal) * 100) : null;
  const gap = goal ? Math.max(goal - recurringMonthly, 0) : null;
  const excess = goal ? Math.max(recurringMonthly - goal, 0) : null;

  return {
    approvedMonthlyGoal,
    connected: true,
    excessLabel: excess !== null && excess > 0 ? moneyLabel(excess) : null,
    fundedPercent,
    gapLabel: gap !== null ? moneyLabel(gap) : null,
    giftCount: rows.length,
    oneTimeTotalLabel: moneyLabel(oneTimeTotal),
    recurringMonthlyLabel: moneyLabel(recurringMonthly),
    reliable: true,
  };
}
