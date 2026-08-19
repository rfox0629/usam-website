import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  PLANNING_CENTER_GIVING_BASE_URL,
  getPlanningCenterGivingConfigStatus,
} from "@/src/lib/planning-center/giving-sync";
import {
  asArray,
  asRecord,
  cleanText,
  normalizePerson,
  type JsonRecord,
  type NormalizedPerson,
} from "./people-normalize";

export { donorLabel } from "./people-normalize";

const PAGE_SIZE = 100;
const MAX_PAGES = 500;

export type PlanningCenterPeopleSyncResult = {
  durationMs: number;
  errors: string[];
  inserted: number;
  named: number;
  runId: string | null;
  seen: number;
  skipped: number;
  status: "succeeded" | "failed";
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
    headers: { Accept: "application/json", Authorization: authorization },
  });

  if (!response.ok) {
    throw new Error(`Planning Center people request failed (${response.status} ${response.statusText}).`);
  }

  return asRecord(await response.json());
}

/**
 * Syncs Planning Center Giving people into the pco_people cache.
 *
 * Deliberately separate from runPlanningCenterGivingSync: the donation import
 * is proven and is not touched here. This writes only pco_people, upserting on
 * the stable Planning Center person id so repeat runs update in place.
 */
export async function runPlanningCenterPeopleSync(): Promise<PlanningCenterPeopleSyncResult> {
  const startedAt = Date.now();
  const empty: PlanningCenterPeopleSyncResult = {
    durationMs: 0,
    errors: [],
    inserted: 0,
    named: 0,
    runId: null,
    seen: 0,
    skipped: 0,
    status: "failed",
    updated: 0,
  };

  const authorization = authHeader();

  if (!authorization) {
    const { missing } = getPlanningCenterGivingConfigStatus();

    return { ...empty, errors: [`Planning Center is not configured in this environment. Missing: ${missing.join(", ")}.`] };
  }

  if (!isSupabaseAdminConfigured()) {
    return { ...empty, errors: ["Supabase admin environment variables are not configured."] };
  }

  const supabase = createSupabaseAdminClient();
  const { data: runRow, error: runError } = await supabase
    .from("pco_giving_sync_runs")
    .insert({ scope: "people", status: "running", sync_type: "manual" })
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
  let named = 0;

  try {
    let next: string | null = `/people?per_page=${PAGE_SIZE}`;

    for (let page = 0; page < MAX_PAGES && next; page += 1) {
      const body: JsonRecord = await pcoFetch(next, authorization);
      const rows = asArray(body.data).map(asRecord);
      seen += rows.length;

      const people = rows
        .map(normalizePerson)
        .filter((person): person is NormalizedPerson => person !== null);
      skipped += rows.length - people.length;

      if (people.length > 0) {
        const ids = people.map((person) => person.pco_person_id);
        const { data: existingRows } = await supabase
          .from("pco_people")
          .select("pco_person_id")
          .in("pco_person_id", ids);
        const existing = new Set(
          ((existingRows ?? []) as { pco_person_id: string }[]).map((row) => row.pco_person_id),
        );

        const { error: upsertError } = await supabase
          .from("pco_people")
          .upsert(
            people.map((person) => ({
              ...person,
              last_synced_at: new Date().toISOString(),
              sync_run_id: runId,
            })),
            { onConflict: "pco_person_id" },
          );

        if (upsertError) {
          errors.push(upsertError.message);
          skipped += people.length;
        } else {
          for (const person of people) {
            if (existing.has(person.pco_person_id)) {
              updated += 1;
            } else {
              inserted += 1;
            }

            if (person.display_name) {
              named += 1;
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
        metadata: { duration_ms: durationMs, inserted, named, skipped, updated },
        records_imported: inserted + updated,
        records_seen: seen,
        status,
      })
      .eq("id", runId);

    return { durationMs, errors, inserted, named, runId, seen, skipped, status, updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Planning Center people sync failed.";
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
      inserted,
      named,
      runId,
      seen,
      skipped,
      status: "failed",
      updated,
    };
  }
}

/** Donor identity for a set of gifts, resolved strictly by person id. */
export async function loadDonorIdentities(personIds: (string | null)[]) {
  const ids = Array.from(new Set(personIds.filter((id): id is string => Boolean(id))));

  if (ids.length === 0 || !isSupabaseAdminConfigured()) {
    return new Map<string, { displayName: string | null; email: string | null }>();
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("pco_people")
    .select("pco_person_id, display_name, email")
    .in("pco_person_id", ids);

  return new Map(
    ((data ?? []) as { display_name: string | null; email: string | null; pco_person_id: string }[])
      .map((row) => [row.pco_person_id, { displayName: row.display_name, email: row.email }]),
  );
}
