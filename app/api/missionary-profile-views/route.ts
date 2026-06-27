import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type ProfileViewPayload = {
  missionaryProfileId?: unknown;
  pagePath?: unknown;
  profileSlug?: unknown;
  referrer?: unknown;
  sessionId?: unknown;
  visitorId?: unknown;
};

type HouseholdRow = {
  id: string;
  public_slug?: string | null;
  public_slug_aliases?: string[] | null;
  public_visible: boolean | null;
  show_household?: boolean | null;
  slug: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const nextValue = asString(value);

  return nextValue ? nextValue : null;
}

function asNullableUuid(value: unknown) {
  const valueString = asString(value);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valueString)
    ? valueString
    : null;
}

function truncate(value: string | null, maxLength: number) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function hashFingerprint(value: string | null) {
  if (!value) {
    return null;
  }

  const salt = process.env.PROFILE_ANALYTICS_SALT
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || "usam-profile-analytics";

  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function getDeviceType(userAgent: string | null) {
  const normalized = userAgent?.toLowerCase() ?? "";

  if (!normalized) {
    return "unknown";
  }

  if (/(bot|crawler|spider|slurp|preview|facebookexternalhit|linkedinbot)/.test(normalized)) {
    return "bot";
  }

  if (/(ipad|tablet|kindle|silk)/.test(normalized)) {
    return "tablet";
  }

  if (/(mobile|iphone|android|phone)/.test(normalized)) {
    return "mobile";
  }

  return "desktop";
}

function isMissingProfileAnalyticsSchema(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find the table");

  return missingRelation && message.includes("missionary_profile_page_views");
}

export async function POST(request: Request) {
  let payload: ProfileViewPayload;

  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (!isSupabaseAdminConfigured()) {
    return new NextResponse(null, { status: 204 });
  }

  const missionaryProfileId = asNullableUuid(payload.missionaryProfileId);
  const profileSlug = asString(payload.profileSlug);
  const pagePath = asString(payload.pagePath);

  if (!missionaryProfileId || !profileSlug || !pagePath.startsWith(`/missionaries/${profileSlug}`)) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createSupabaseAdminClient();
  const householdResult = await supabase
    .from("missionary_households")
    .select("id, slug, public_slug, public_slug_aliases, public_visible, show_household")
    .eq("id", missionaryProfileId)
    .eq("public_visible", true)
    .limit(1)
    .maybeSingle();

  if (householdResult.error) {
    console.error("[Profile Analytics API] Failed to verify missionary profile:", householdResult.error);

    return new NextResponse(null, { status: 204 });
  }

  const household = householdResult.data as HouseholdRow | null;

  if (!household || household.show_household === false) {
    return new NextResponse(null, { status: 204 });
  }

  const allowedSlugs = new Set([
    household.slug,
    household.public_slug?.trim() || household.slug,
    ...(household.public_slug_aliases ?? []),
  ]);

  if (!allowedSlugs.has(profileSlug)) {
    return new NextResponse(null, { status: 204 });
  }

  const userAgent = request.headers.get("user-agent");
  const insertResult = await supabase
    .from("missionary_profile_page_views")
    .insert({
      device_type: getDeviceType(userAgent),
      missionary_profile_id: household.id,
      page_path: truncate(pagePath, 500),
      referrer: truncate(asNullableString(payload.referrer) ?? request.headers.get("referer"), 1000),
      session_fingerprint: hashFingerprint(asNullableString(payload.sessionId)),
      user_agent: truncate(userAgent, 1000),
      visitor_fingerprint: hashFingerprint(asNullableString(payload.visitorId)),
    });

  if (insertResult.error && !isMissingProfileAnalyticsSchema(insertResult.error)) {
    console.error("[Profile Analytics API] Failed to insert profile view:", insertResult.error);
  }

  return new NextResponse(null, { status: 204 });
}
