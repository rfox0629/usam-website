import "server-only";

import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleUserInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
const googleCalendarApiBase = "https://www.googleapis.com/calendar/v3";
const tokenPrefix = "dos-gcal-v1";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type ConnectedCalendarRow = {
  access_token: string | null;
  calendar_id: string;
  expires_at: string | null;
  google_account_email: string | null;
  id: string;
  refresh_token: string;
  workspace_id: string;
};

export type CalendarSyncSourceType = "important_date" | "meeting" | "reminder";

export type DosCalendarEventInput = {
  allDay?: boolean;
  description?: string | null;
  endAt?: string | null;
  reminderMinutes?: number[];
  recurrence?: "monthly" | "none" | "weekly" | "yearly";
  sourceId: string;
  sourceType: CalendarSyncSourceType;
  startAt: string;
  timezone?: string | null;
  title: string;
  workspaceId: string;
};

export function isGoogleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleCalendarScopes() {
  return (process.env.GOOGLE_CALENDAR_SCOPES?.trim()
    || "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email openid")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function googleRedirectUri(origin?: string) {
  return process.env.GOOGLE_REDIRECT_URI?.trim()
    || `${origin?.replace(/\/$/, "") ?? ""}/api/dos/app/calendar/google/callback`;
}

function encryptionSecret() {
  return process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SYSTEM_ACCESS_CODE
    || "";
}

function encryptionKey() {
  const secret = encryptionSecret();

  if (!secret) {
    throw new Error("Add GOOGLE_TOKEN_ENCRYPTION_KEY or another server secret before connecting Google Calendar.");
  }

  return createHash("sha256").update(secret).digest();
}

function stateSecret() {
  const secret = encryptionSecret();

  if (!secret) {
    throw new Error("Calendar OAuth state signing is not configured.");
  }

  return secret;
}

export function encryptCalendarToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    tokenPrefix,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptCalendarToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [prefix, ivValue, authTagValue, encryptedValue] = value.split(".");

  if (prefix !== tokenPrefix || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Calendar token is not encrypted with the expected format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));

  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signCalendarOAuthState(payload: Record<string, string>) {
  const encodedPayload = Buffer.from(JSON.stringify({
    ...payload,
    createdAt: new Date().toISOString(),
  })).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyCalendarOAuthState(value: string | null) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", stateSecret()).update(encodedPayload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      createdAt?: string;
      next?: string;
      userId?: string;
      workspaceId?: string;
    };
  } catch {
    return null;
  }
}

export function googleAuthorizationUrl({
  origin,
  state,
}: {
  origin: string;
  state: string;
}) {
  const params = new URLSearchParams({
    access_type: "offline",
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: googleCalendarScopes(),
    state,
  });

  return `${googleAuthUrl}?${params.toString()}`;
}

async function readGoogleResponse<T>(response: Response) {
  const body = await response.json().catch(() => ({})) as T & { error?: { message?: string } | string; error_description?: string };

  if (!response.ok) {
    const errorMessage = typeof body.error === "string"
      ? body.error_description ?? body.error
      : body.error?.message ?? "Google Calendar request failed.";

    throw new Error(errorMessage);
  }

  return body;
}

export async function exchangeGoogleCodeForTokens(code: string, origin: string) {
  const response = await fetch(googleTokenUrl, {
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri(origin),
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return readGoogleResponse<GoogleTokenResponse>(response);
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch(googleTokenUrl, {
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return readGoogleResponse<GoogleTokenResponse>(response);
}

export async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await readGoogleResponse<{ email?: string }>(response);

  return data.email ?? null;
}

export async function upsertConnectedGoogleCalendar({
  accessToken,
  calendarId = "primary",
  expiresIn,
  googleAccountEmail,
  refreshToken,
  supabase = createSupabaseAdminClient(),
  userId,
  workspaceId,
}: {
  accessToken: string;
  calendarId?: string;
  expiresIn?: number;
  googleAccountEmail: string | null;
  refreshToken: string;
  supabase?: SupabaseAdminClient;
  userId: string;
  workspaceId: string;
}) {
  const now = new Date();
  const expiresAt = expiresIn ? new Date(now.getTime() + expiresIn * 1000).toISOString() : null;

  await supabase
    .from("connected_calendars")
    .update({ disconnected_at: now.toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("disconnected_at", null);

  const { data, error } = await supabase
    .from("connected_calendars")
    .insert({
      access_token: encryptCalendarToken(accessToken),
      calendar_id: calendarId,
      connected_at: now.toISOString(),
      expires_at: expiresAt,
      google_account_email: googleAccountEmail,
      provider: "google",
      refresh_token: encryptCalendarToken(refreshToken),
      user_id: userId,
      workspace_id: workspaceId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ? String(data.id) : null;
}

async function loadConnectedCalendar(supabase: SupabaseAdminClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("connected_calendars")
    .select("id, workspace_id, google_account_email, calendar_id, access_token, refresh_token, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("disconnected_at", null)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("connected_calendars") || message.includes("schema cache")) {
      return null;
    }

    throw new Error(error.message);
  }

  return data as ConnectedCalendarRow | null;
}

async function calendarAccessToken(supabase: SupabaseAdminClient, calendar: ConnectedCalendarRow) {
  const existingAccessToken = decryptCalendarToken(calendar.access_token);
  const expiresAt = calendar.expires_at ? new Date(calendar.expires_at).getTime() : 0;

  if (existingAccessToken && expiresAt > Date.now() + 5 * 60 * 1000) {
    return existingAccessToken;
  }

  const refreshToken = decryptCalendarToken(calendar.refresh_token);

  if (!refreshToken) {
    throw new Error("Google Calendar refresh token is unavailable.");
  }

  const tokenResponse = await refreshGoogleAccessToken(refreshToken);

  if (!tokenResponse.access_token) {
    throw new Error(tokenResponse.error_description ?? tokenResponse.error ?? "Unable to refresh Google Calendar access.");
  }

  const expiresAtIso = tokenResponse.expires_in
    ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
    : null;

  await supabase
    .from("connected_calendars")
    .update({
      access_token: encryptCalendarToken(tokenResponse.access_token),
      expires_at: expiresAtIso,
      refresh_token: tokenResponse.refresh_token ? encryptCalendarToken(tokenResponse.refresh_token) : calendar.refresh_token,
    })
    .eq("id", calendar.id);

  return tokenResponse.access_token;
}

function googleEventBody(input: DosCalendarEventInput) {
  const recurrence = input.recurrence && input.recurrence !== "none"
    ? [`RRULE:FREQ=${input.recurrence.toUpperCase()}`]
    : undefined;
  const reminders = input.reminderMinutes?.length
    ? {
      overrides: input.reminderMinutes.map((minutes) => ({
        method: "popup",
        minutes,
      })),
      useDefault: false,
    }
    : undefined;

  if (input.allDay) {
    const startDate = input.startAt.slice(0, 10);
    const fallbackEnd = new Date(`${startDate}T00:00:00.000Z`);

    fallbackEnd.setUTCDate(fallbackEnd.getUTCDate() + 1);

    const endDate = input.endAt?.slice(0, 10) || fallbackEnd.toISOString().slice(0, 10);

    return {
      description: input.description ?? undefined,
      end: { date: endDate },
      recurrence,
      reminders,
      start: { date: startDate },
      summary: input.title,
    };
  }

  return {
    description: input.description ?? undefined,
    end: { dateTime: input.endAt ?? input.startAt, timeZone: input.timezone ?? undefined },
    recurrence,
    reminders,
    start: { dateTime: input.startAt, timeZone: input.timezone ?? undefined },
    summary: input.title,
  };
}

async function loadEventLink(supabase: SupabaseAdminClient, input: Pick<DosCalendarEventInput, "sourceId" | "sourceType" | "workspaceId">) {
  const { data, error } = await supabase
    .from("calendar_event_links")
    .select("id, calendar_id, external_event_id")
    .eq("workspace_id", input.workspaceId)
    .eq("source_type", input.sourceType)
    .eq("source_id", input.sourceId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("calendar_event_links") || message.includes("schema cache")) {
      return null;
    }

    throw new Error(error.message);
  }

  return data as { calendar_id: string; external_event_id: string | null; id: string } | null;
}

export async function recordCalendarSyncFailure({
  error,
  sourceId,
  sourceType,
  supabase = createSupabaseAdminClient(),
  workspaceId,
}: Pick<DosCalendarEventInput, "sourceId" | "sourceType" | "workspaceId"> & {
  error: string;
  supabase?: SupabaseAdminClient;
}) {
  await supabase
    .from("calendar_event_links")
    .upsert({
      last_error: error,
      provider: "google",
      source_id: sourceId,
      source_type: sourceType,
      sync_status: "failed",
      workspace_id: workspaceId,
    }, {
      onConflict: "workspace_id,source_type,source_id,provider",
    });
}

export async function syncGoogleCalendarEvent(input: DosCalendarEventInput, supabase = createSupabaseAdminClient()) {
  if (!input.startAt) {
    return { status: "skipped" as const };
  }

  const connectedCalendar = await loadConnectedCalendar(supabase, input.workspaceId);

  if (!connectedCalendar) {
    await recordCalendarSyncFailure({
      error: "Google Calendar is not connected.",
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      supabase,
      workspaceId: input.workspaceId,
    }).catch(() => undefined);

    return { status: "not_connected" as const };
  }

  const accessToken = await calendarAccessToken(supabase, connectedCalendar);
  const existingLink = await loadEventLink(supabase, input);
  const calendarId = existingLink?.calendar_id || connectedCalendar.calendar_id || "primary";
  const eventBody = googleEventBody(input);
  const encodedCalendarId = encodeURIComponent(calendarId);
  const requestUrl = existingLink?.external_event_id
    ? `${googleCalendarApiBase}/calendars/${encodedCalendarId}/events/${encodeURIComponent(existingLink.external_event_id)}`
    : `${googleCalendarApiBase}/calendars/${encodedCalendarId}/events`;
  const response = await fetch(requestUrl, {
    body: JSON.stringify(eventBody),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: existingLink?.external_event_id ? "PATCH" : "POST",
  });
  const event = await readGoogleResponse<{ id?: string }>(response);
  const externalEventId = event.id ?? existingLink?.external_event_id;

  if (!externalEventId) {
    throw new Error("Google Calendar did not return an event id.");
  }

  await supabase
    .from("calendar_event_links")
    .upsert({
      calendar_id: calendarId,
      external_event_id: externalEventId,
      last_error: null,
      last_synced_at: new Date().toISOString(),
      provider: "google",
      source_id: input.sourceId,
      source_type: input.sourceType,
      sync_status: "synced",
      workspace_id: input.workspaceId,
    }, {
      onConflict: "workspace_id,source_type,source_id,provider",
    });

  return { externalEventId, status: "synced" as const };
}
