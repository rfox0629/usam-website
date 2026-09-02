import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  asArray,
  asRecord,
  cleanText,
  normalizeDonation,
  resolveAttribution,
  type DesignationMappingRow,
  type JsonRecord,
  type NormalizedGift,
} from "./giving-normalize";

export { normalizeDonation, resolveAttribution };
export type { DesignationMappingRow, NormalizedGift };

// Canonical server-only credential names. These already exist encrypted in the
// Vercel project for Preview and Production; no duplicate PLANNING_CENTER_*
// variables are introduced.
export const planningCenterGivingEnvVars = ["PCO_APP_ID", "PCO_SECRET"] as const;

// Fixed server-side default. There is no operational reason to make the Giving
// API host configurable, so it is not an env var.
export const PLANNING_CENTER_GIVING_BASE_URL = "https://api.planningcenteronline.com/giving/v2";

const PAGE_SIZE = 100;
const MAX_PAGES = 500;

export type PlanningCenterGivingConfigStatus = {
  configured: boolean;
  missing: string[];
};

export function getPlanningCenterGivingConfigStatus(): PlanningCenterGivingConfigStatus {
  const missing = planningCenterGivingEnvVars.filter((key) => !process.env[key]?.trim());

  return {
    configured: missing.length === 0,
    missing: [...missing],
  };
}

export function getPlanningCenterGivingSyncNotes() {
  return [
    "Sync runs on demand from Operations Finance and is safe to repeat; gifts upsert on the Planning Center donation id.",
    "Missionary attribution comes only from explicit fund, campaign, or designation mappings. Donor and fund names are never fuzzy-matched.",
    "Gifts with no mapping stay Unmapped and wait for a founder decision rather than being guessed into a missionary's totals.",
  ];
}

export type PlanningCenterSyncResult = {
  durationMs: number;
  errors: string[];
  fundsSeen: { id: string; name: string }[];
  inserted: number;
  runId: string | null;
  seen: number;
  skipped: number;
  status: "succeeded" | "failed";
  unmappedDesignations: { amountTotal: number; count: number; fundId: string | null; label: string }[];
  updated: number;
};

function authHeader() {
  const appId = process.env.PCO_APP_ID?.trim();
  const secret = process.env.PCO_SECRET?.trim();

  if (!appId || !secret) {
    return null;
  }

  return `Basic ${Buffer.from(`${appId}:${secret}`).toString("base64")}`;
}

async function pcoFetch(path: string, authorization: string): Promise<JsonRecord> {
  const url = path.startsWith("http") ? path : `${PLANNING_CENTER_GIVING_BASE_URL}${path}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    // Never echo the URL's credentials or the response body verbatim; Planning
    // Center error payloads can repeat request context.
    throw new Error(`Planning Center Giving request failed (${response.status} ${response.statusText}).`);
  }

  return asRecord(await response.json());
}

async function fetchFundNames(authorization: string) {
  const funds = new Map<string, string>();
  let next: string | null = `/funds?per_page=${PAGE_SIZE}`;

  for (let page = 0; page < MAX_PAGES && next; page += 1) {
    const body: JsonRecord = await pcoFetch(next, authorization);

    for (const entry of asArray(body.data)) {
      const row = asRecord(entry);
      const id = cleanText(row.id);
      const name = cleanText(asRecord(row.attributes).name);

      if (id) {
        funds.set(id, name ?? `Fund ${id}`);
      }
    }

    next = cleanText(asRecord(asRecord(body.links).next).href) ?? cleanText(asRecord(body.links).next);
  }

  return funds;
}

export async function runPlanningCenterGivingSync({
  syncType = "manual",
}: {
  syncType?: "manual" | "daily_poll" | "webhook";
} = {}): Promise<PlanningCenterSyncResult> {
  const startedAt = Date.now();
  const empty: PlanningCenterSyncResult = {
    durationMs: 0,
    errors: [],
    fundsSeen: [],
    inserted: 0,
    runId: null,
    seen: 0,
    skipped: 0,
    status: "failed",
    unmappedDesignations: [],
    updated: 0,
  };

  const authorization = authHeader();

  if (!authorization) {
    return { ...empty, errors: ["PCO_APP_ID and PCO_SECRET are not configured in this environment."] };
  }

  if (!isSupabaseAdminConfigured()) {
    return { ...empty, errors: ["Supabase admin environment variables are not configured."] };
  }

  const supabase = createSupabaseAdminClient();
  const { data: runRow, error: runError } = await supabase
    .from("pco_giving_sync_runs")
    .insert({ status: "running", sync_type: syncType })
    .select("id")
    .single();

  if (runError || !runRow) {
    return { ...empty, errors: [runError?.message ?? "Could not open a sync run record."] };
  }

  const runId = runRow.id as string;
  const errors: string[] = [];
  let seen = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const unmapped = new Map<string, { amountTotal: number; count: number; fundId: string | null; label: string }>();

  try {
    const { data: mappingRows } = await supabase
      .from("pco_designation_mappings")
      .select("pco_fund_id, fund_name, pco_campaign_id, campaign_name, designation_name, target_kind, missionary_profile_id");
    const mappings = (mappingRows ?? []) as DesignationMappingRow[];
    const fundNames = await fetchFundNames(authorization);

    let next: string | null = `/donations?per_page=${PAGE_SIZE}&include=designations,person,campaign,payment_source&order=-created_at`;

    for (let page = 0; page < MAX_PAGES && next; page += 1) {
      const body: JsonRecord = await pcoFetch(next, authorization);
      const included = new Map<string, JsonRecord>();

      for (const entry of asArray(body.included)) {
        const row = asRecord(entry);
        const id = cleanText(row.id);
        const type = cleanText(row.type);

        if (id && type) {
          included.set(`${type}:${id}`, row);
        }
      }

      const donations = asArray(body.data).map(asRecord);
      seen += donations.length;

      const gifts = donations
        .map((donation) => normalizeDonation({ donation, fundNames, included, mappings }))
        .filter((gift): gift is NormalizedGift => gift !== null);

      skipped += donations.length - gifts.length;

      if (gifts.length > 0) {
        const ids = gifts.map((gift) => gift.pco_donation_id);
        const { data: existingRows } = await supabase
          .from("pco_giving_records")
          .select("pco_donation_id")
          .in("pco_donation_id", ids);
        const existing = new Set(((existingRows ?? []) as { pco_donation_id: string }[]).map((row) => row.pco_donation_id));

        // Upsert on the Planning Center donation id. Re-running the sync
        // updates in place instead of writing a second copy of the gift.
        const { error: upsertError } = await supabase
          .from("pco_giving_records")
          .upsert(
            gifts.map((gift) => ({
              ...gift,
              last_synced_at: new Date().toISOString(),
              sync_run_id: runId,
            })),
            { onConflict: "pco_donation_id" },
          );

        if (upsertError) {
          errors.push(upsertError.message);
          skipped += gifts.length;
        } else {
          for (const gift of gifts) {
            if (existing.has(gift.pco_donation_id)) {
              updated += 1;
            } else {
              inserted += 1;
            }

            if (gift.attribution_kind === "unmapped") {
              const label = gift.fund_name ?? gift.campaign_name ?? "No designation";
              const key = gift.pco_fund_id ?? label.toLowerCase();
              const bucket = unmapped.get(key) ?? { amountTotal: 0, count: 0, fundId: gift.pco_fund_id, label };
              bucket.count += 1;
              bucket.amountTotal += gift.gross_amount ?? 0;
              unmapped.set(key, bucket);
            }
          }
        }
      }

      next = cleanText(asRecord(asRecord(body.links).next).href) ?? cleanText(asRecord(body.links).next);
    }

    const durationMs = Date.now() - startedAt;
    const status = errors.length > 0 ? "failed" : "succeeded";

    await supabase
      .from("pco_giving_sync_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_message: errors[0] ?? null,
        metadata: {
          duration_ms: durationMs,
          funds_seen: fundNames.size,
          inserted,
          skipped,
          unmapped_designations: Array.from(unmapped.values()),
          updated,
        },
        records_imported: inserted + updated,
        records_seen: seen,
        status,
      })
      .eq("id", runId);

    return {
      durationMs,
      errors,
      fundsSeen: Array.from(fundNames.entries()).map(([id, name]) => ({ id, name })),
      inserted,
      runId,
      seen,
      skipped,
      status,
      unmappedDesignations: Array.from(unmapped.values()),
      updated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Planning Center sync failed.";
    errors.push(message);

    await supabase
      .from("pco_giving_sync_runs")
      .update({
        completed_at: new Date().toISOString(),
        error_message: message,
        records_imported: inserted + updated,
        records_seen: seen,
        status: "failed",
      })
      .eq("id", runId);

    return {
      durationMs: Date.now() - startedAt,
      errors,
      fundsSeen: [],
      inserted,
      runId,
      seen,
      skipped,
      status: "failed",
      unmappedDesignations: Array.from(unmapped.values()),
      updated,
    };
  }
}
