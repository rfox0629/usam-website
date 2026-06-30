import type { SupabaseClient } from "@supabase/supabase-js";
import type { MissionaryPrayerRequest } from "@/src/data/missionaries";

const publicPrayerStatuses = ["active", "open"] as const;
const publicPrayerRequestSelect = [
  "id",
  "title",
  "request",
  "description",
  "category",
  "visibility",
  "status",
  "created_at",
  "answered_at",
  "answer_testimony",
  "person_tags",
  "workspace_id",
  "household_id",
  "related_household_id",
  "related_missionary_profile_id",
  "source",
].join(", ");
const legacyPrayerRequestSelect = "id, title, description, category, visibility, status, created_at, household_id, related_household_id";

type SupabaseLike = SupabaseClient<any, "public", any>;

type PublicPrayerRequestRow = {
  answer_testimony?: string | null;
  answered_at?: string | null;
  category: string | null;
  created_at: string;
  description?: string | null;
  household_id?: string | null;
  id: string;
  person_tags?: string[] | null;
  related_household_id?: string | null;
  related_missionary_profile_id?: string | null;
  request?: string | null;
  source?: string | null;
  status?: string | null;
  title: string | null;
  visibility: string | null;
  workspace_id?: string | null;
};

type PrayerPartnerCountRow = {
  email?: string | null;
  field_person_id?: string | null;
  id: string;
};

export type PublicProfilePrayerData = {
  internalOpenRequestCount: number;
  prayerRequests: MissionaryPrayerRequest[];
  prayerTeamCount: number;
  publicOpenRequestCount: number;
  source: "dos" | "legacy" | "none";
};

function hasMissingPrayerBridgeColumn(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return [
    "answer_testimony",
    "field_person_id",
    "person_tags",
    "related_missionary_profile_id",
    "schema cache",
    "workspace_id",
  ].some((columnName) => message.includes(columnName));
}

function normalizeRequestText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function prayerPartnerCountKey(row: PrayerPartnerCountRow) {
  const linkedPersonId = row.field_person_id?.trim();
  const email = row.email?.trim().toLowerCase();

  if (linkedPersonId) {
    return `person:${linkedPersonId}`;
  }

  if (email) {
    return `email:${email}`;
  }

  return `row:${row.id}`;
}

export function prayerRequestScopeFilter(profileId: string) {
  return [
    `workspace_id.eq.${profileId}`,
    `household_id.eq.${profileId}`,
    `related_household_id.eq.${profileId}`,
    `related_missionary_profile_id.eq.${profileId}`,
  ].join(",");
}

export function legacyPrayerRequestScopeFilter(profileId: string) {
  return [
    `household_id.eq.${profileId}`,
    `related_household_id.eq.${profileId}`,
  ].join(",");
}

function prayerPartnerScopeFilters(profileId: string, profileSlugs: readonly string[]) {
  const slugFilters = uniqueStrings([...profileSlugs]).flatMap((slug) => [
    `missionary_profile_slug.eq.${slug}`,
    `recruited_by_profile_slug.eq.${slug}`,
  ]);

  return [
    [
      `workspace_id.eq.${profileId}`,
      `recruited_by_household_id.eq.${profileId}`,
      `missionary_profile_id.eq.${profileId}`,
      ...slugFilters,
    ].join(","),
    [
      `recruited_by_household_id.eq.${profileId}`,
      ...slugFilters,
    ].join(","),
    `recruited_by_household_id.eq.${profileId}`,
  ];
}

function mapPublicPrayerRequest(row: PublicPrayerRequestRow): MissionaryPrayerRequest | null {
  if (row.visibility !== "public" || !publicPrayerStatuses.includes(row.status as typeof publicPrayerStatuses[number])) {
    return null;
  }

  const description = normalizeRequestText(row.request) || normalizeRequestText(row.description);
  const title = normalizeRequestText(row.title) || description.slice(0, 80) || "Prayer request";

  if (!description) {
    return null;
  }

  return {
    category: row.category,
    date: row.created_at,
    description,
    id: row.id,
    title,
    visibility: "public",
  };
}

async function loadPublicPrayerRequests(client: SupabaseLike, profileId: string) {
  const scopedResult = await client
    .from("prayer_requests")
    .select(publicPrayerRequestSelect)
    .or(prayerRequestScopeFilter(profileId))
    .in("status", [...publicPrayerStatuses])
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  const result = scopedResult.error && hasMissingPrayerBridgeColumn(scopedResult.error)
    ? await client
      .from("prayer_requests")
      .select(legacyPrayerRequestSelect)
      .or(legacyPrayerRequestScopeFilter(profileId))
      .in("status", [...publicPrayerStatuses])
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
    : scopedResult;

  if (result.error) {
    return { error: result.error, requests: [] as MissionaryPrayerRequest[], source: "none" as const };
  }

  const rows = (result.data ?? []) as PublicPrayerRequestRow[];
  const requests = rows
    .map(mapPublicPrayerRequest)
    .filter((request): request is MissionaryPrayerRequest => Boolean(request));
  const source: PublicProfilePrayerData["source"] = rows.some((row) => row.source === "dos" || row.workspace_id === profileId)
    ? "dos"
    : requests.length > 0
      ? "legacy"
      : "none";

  return { error: null, requests, source };
}

async function loadPrayerTeamCount(client: SupabaseLike, profileId: string, profileSlugs: readonly string[]) {
  for (const scopeFilter of prayerPartnerScopeFilters(profileId, profileSlugs)) {
    const result = await client
      .from("prayer_partners")
      .select("id, field_person_id, email")
      .or(scopeFilter)
      .eq("status", "active")
      .limit(10000);

    if (!result.error) {
      return new Set(((result.data ?? []) as PrayerPartnerCountRow[]).map(prayerPartnerCountKey)).size;
    }

    if (hasMissingPrayerBridgeColumn(result.error)) {
      const fallbackResult = await client
        .from("prayer_partners")
        .select("id", { count: "exact", head: true })
        .or(scopeFilter)
        .eq("status", "active");

      if (!fallbackResult.error) {
        return fallbackResult.count ?? 0;
      }
    } else {
      return 0;
    }
  }

  return 0;
}

async function loadPrayerRequestCounts(client: SupabaseLike, profileId: string) {
  const scopedResult = await client
    .from("prayer_requests")
    .select("id, status, visibility", { count: "exact" })
    .or(prayerRequestScopeFilter(profileId))
    .in("status", [...publicPrayerStatuses]);

  const result = scopedResult.error && hasMissingPrayerBridgeColumn(scopedResult.error)
    ? await client
      .from("prayer_requests")
      .select("id, status, visibility", { count: "exact" })
      .or(legacyPrayerRequestScopeFilter(profileId))
      .in("status", [...publicPrayerStatuses])
    : scopedResult;

  if (result.error) {
    return { internalOpenRequestCount: 0, publicOpenRequestCount: 0 };
  }

  const rows = (result.data ?? []) as Array<{ visibility: string | null }>;

  return {
    internalOpenRequestCount: rows.filter((row) => row.visibility !== "public").length,
    publicOpenRequestCount: rows.filter((row) => row.visibility === "public").length,
  };
}

export async function loadPublicProfilePrayerData({
  privateClient,
  profileId,
  profileSlugs = [],
  publicClient,
}: {
  privateClient?: SupabaseLike | null;
  profileId: string;
  profileSlugs?: readonly string[];
  publicClient: SupabaseLike;
}): Promise<PublicProfilePrayerData> {
  const readClient = privateClient ?? publicClient;
  const [requestsResult, prayerTeamCount, counts] = await Promise.all([
    loadPublicPrayerRequests(readClient, profileId),
    loadPrayerTeamCount(readClient, profileId, profileSlugs),
    loadPrayerRequestCounts(readClient, profileId),
  ]);

  return {
    internalOpenRequestCount: counts.internalOpenRequestCount,
    prayerRequests: requestsResult.requests,
    prayerTeamCount,
    publicOpenRequestCount: counts.publicOpenRequestCount,
    source: requestsResult.source,
  };
}
