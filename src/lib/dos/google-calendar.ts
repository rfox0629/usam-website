import "server-only";

import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleUserInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
const googleCalendarApiBase = "https://www.googleapis.com/calendar/v3";
const tokenPrefix = "dos-gcal-v1";
const googleCalendarReconnectError = "Calendar permissions need to be updated.";

export type GoogleCalendarConnectionHealthStatus = "connected" | "needs_reconnect" | "not_connected";

export const googleCalendarReconnectMessage = googleCalendarReconnectError;

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

type CalendarSourceRow = {
  external_calendar_id: string;
  selected_for_availability: boolean | null;
  selected_for_display: boolean | null;
  selected_for_import: boolean | null;
};

type GoogleCalendarListItem = {
  accessRole?: string;
  backgroundColor?: string;
  description?: string;
  foregroundColor?: string;
  id?: string;
  primary?: boolean;
  selected?: boolean;
  summary?: string;
  timeZone?: string;
};

type GoogleCalendarEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  description?: string;
  end?: GoogleCalendarEventDate;
  etag?: string;
  htmlLink?: string;
  iCalUID?: string;
  id?: string;
  location?: string;
  recurringEventId?: string;
  start?: GoogleCalendarEventDate;
  status?: string;
  summary?: string;
  transparency?: string;
  updated?: string;
  visibility?: string;
};

type ExternalCalendarEventRow = {
  all_day: boolean | null;
  description: string | null;
  end_at: string | null;
  etag: string | null;
  external_event_id: string;
  html_link: string | null;
  i_cal_uid: string | null;
  location: string | null;
  raw: Record<string, unknown> | null;
  recurring_event_id: string | null;
  start_at: string | null;
  status: string | null;
  summary: string | null;
  timezone: string | null;
  transparency: string | null;
  updated_external_at: string | null;
  visibility: string | null;
};

type GoogleEventsListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
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
    || "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.calendarlist.readonly")
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
  const body = await response.json().catch(() => ({})) as T & {
    error?: {
      code?: number;
      errors?: Array<{ reason?: string }>;
      message?: string;
      status?: string;
    } | string;
    error_description?: string;
  };

  if (!response.ok) {
    const errorMessage = typeof body.error === "string"
      ? body.error_description ?? body.error
      : body.error?.message ?? "Google Calendar request failed.";
    const error = new Error(errorMessage) as Error & {
      googleReason?: string;
      googleStatus?: string;
      status?: number;
    };

    error.status = response.status;

    if (typeof body.error === "string") {
      error.googleReason = body.error;
      error.googleStatus = body.error;
    } else {
      error.googleReason = body.error?.errors?.[0]?.reason;
      error.googleStatus = body.error?.status;
    }

    throw error;
  }

  return body;
}

export function isGoogleCalendarScopeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const scopedError = error as Error & { googleReason?: string; googleStatus?: string; status?: number };
  const message = error.message.toLowerCase();

  return scopedError.status === 403
    && (scopedError.googleReason === "insufficientPermissions"
      || scopedError.googleStatus === "PERMISSION_DENIED"
      || message.includes("insufficient authentication scopes")
      || message.includes("insufficient permission"));
}

export function isGoogleCalendarReconnectError(error: unknown) {
  if (isGoogleCalendarScopeError(error)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const scopedError = error as Error & { googleReason?: string; googleStatus?: string; status?: number };
  const message = error.message.toLowerCase();
  const googleReason = scopedError.googleReason?.toLowerCase() ?? "";
  const googleStatus = scopedError.googleStatus?.toLowerCase() ?? "";

  return [400, 401].includes(scopedError.status ?? 0)
    && (
      googleReason.includes("invalid_grant")
      || googleStatus.includes("invalid_grant")
      || message.includes("invalid_grant")
      || message.includes("invalid token")
      || message.includes("token has been expired")
      || message.includes("token has been revoked")
      || message.includes("unauthorized")
    );
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

  await recordWorkspaceCalendarScopeState({
    error: null,
    supabase,
    workspaceId,
  }).catch(() => undefined);

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

function allDayGoogleDateIso(value: string | undefined) {
  return value ? `${value}T12:00:00.000Z` : null;
}

function googleCalendarDateBounds(event: GoogleCalendarEvent, existingEvent?: ExternalCalendarEventRow | null) {
  const start = event.start?.dateTime ?? allDayGoogleDateIso(event.start?.date) ?? existingEvent?.start_at ?? null;
  const end = event.end?.dateTime ?? allDayGoogleDateIso(event.end?.date) ?? existingEvent?.end_at ?? null;

  return {
    allDay: typeof event.start?.date === "string" ? true : existingEvent?.all_day === true,
    endAt: end ? new Date(end).toISOString() : null,
    startAt: start ? new Date(start).toISOString() : null,
    timezone: event.start?.timeZone ?? event.end?.timeZone ?? existingEvent?.timezone ?? null,
  };
}

function isGoogleCalendarSyncTokenExpired(error: unknown) {
  return error instanceof Error && (error as Error & { status?: number }).status === 410;
}

function googleCalendarEventRecord({
  event,
  existingEvent,
  externalCalendarId,
  sourceId,
  workspaceId,
}: {
  event: GoogleCalendarEvent;
  existingEvent?: ExternalCalendarEventRow | null;
  externalCalendarId: string;
  sourceId: string;
  workspaceId: string;
}) {
  const bounds = googleCalendarDateBounds(event, existingEvent);
  const status = event.status ?? existingEvent?.status ?? "confirmed";

  return {
    all_day: bounds.allDay,
    calendar_source_id: sourceId,
    description: event.description ?? existingEvent?.description ?? null,
    deleted_at: null,
    end_at: bounds.endAt,
    etag: event.etag ?? existingEvent?.etag ?? null,
    external_calendar_id: externalCalendarId,
    external_event_id: event.id as string,
    html_link: event.htmlLink ?? existingEvent?.html_link ?? null,
    i_cal_uid: event.iCalUID ?? existingEvent?.i_cal_uid ?? null,
    location: event.location ?? existingEvent?.location ?? null,
    provider: "google",
    raw: event as unknown as Record<string, unknown>,
    recurring_event_id: event.recurringEventId ?? existingEvent?.recurring_event_id ?? null,
    start_at: bounds.startAt,
    status,
    summary: event.summary ?? existingEvent?.summary ?? (status === "cancelled" ? "Cancelled Google Calendar event" : "Google Calendar event"),
    timezone: bounds.timezone,
    transparency: event.transparency ?? existingEvent?.transparency ?? null,
    updated_external_at: event.updated ? new Date(event.updated).toISOString() : existingEvent?.updated_external_at ?? null,
    visibility: event.visibility ?? existingEvent?.visibility ?? null,
    workspace_id: workspaceId,
  };
}

async function loadExistingExternalCalendarEvents({
  eventIds,
  externalCalendarId,
  supabase,
  workspaceId,
}: {
  eventIds: string[];
  externalCalendarId: string;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));

  if (!uniqueIds.length) {
    return new Map<string, ExternalCalendarEventRow>();
  }

  const { data, error } = await supabase
    .from("external_calendar_events")
    .select("external_event_id, i_cal_uid, etag, status, summary, description, location, html_link, start_at, end_at, all_day, timezone, recurring_event_id, visibility, transparency, updated_external_at, raw")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .eq("external_calendar_id", externalCalendarId)
    .in("external_event_id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(((data ?? []) as ExternalCalendarEventRow[]).map((event) => [event.external_event_id, event]));
}

async function fetchGoogleCalendarEventPages({
  accessToken,
  end,
  externalCalendarId,
  start,
  syncToken,
}: {
  accessToken: string;
  end?: Date;
  externalCalendarId: string;
  start?: Date;
  syncToken?: string | null;
}) {
  const events: GoogleCalendarEvent[] = [];
  let nextSyncToken: string | null = null;
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({
      maxResults: "2500",
      showDeleted: "true",
      singleEvents: "true",
    });

    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      params.set("orderBy", "startTime");
      if (end) {
        params.set("timeMax", end.toISOString());
      }
      if (start) {
        params.set("timeMin", start.toISOString());
      }
    }

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(`${googleCalendarApiBase}/calendars/${encodeURIComponent(externalCalendarId)}/events?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await readGoogleResponse<GoogleEventsListResponse>(response);

    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? null;
    nextSyncToken = data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

async function persistGoogleCalendarEvents({
  events,
  externalCalendarId,
  sourceId,
  supabase,
  workspaceId,
}: {
  events: GoogleCalendarEvent[];
  externalCalendarId: string;
  sourceId: string;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const syncableEvents = events.filter((event) => event.id);
  const existingByEventId = await loadExistingExternalCalendarEvents({
    eventIds: syncableEvents.map((event) => event.id as string),
    externalCalendarId,
    supabase,
    workspaceId,
  });
  const records = syncableEvents.map((event) => googleCalendarEventRecord({
    event,
    existingEvent: existingByEventId.get(event.id as string) ?? null,
    externalCalendarId,
    sourceId,
    workspaceId,
  }));

  if (!records.length) {
    return 0;
  }

  const { error } = await supabase
    .from("external_calendar_events")
    .upsert(records, {
      onConflict: "workspace_id,provider,external_calendar_id,external_event_id",
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data: linkedEvents } = await supabase
    .from("calendar_event_links")
    .select("source_id, source_type, external_event_id")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .eq("calendar_id", externalCalendarId)
    .in("external_event_id", records.map((record) => record.external_event_id));

  await Promise.all((linkedEvents ?? [])
    .filter((link) => link.external_event_id && link.source_id && link.source_type)
    .map((link) => supabase
      .from("external_calendar_events")
      .update({
        imported_dos_source_id: link.source_id,
        imported_dos_source_type: link.source_type,
      })
      .eq("workspace_id", workspaceId)
      .eq("provider", "google")
      .eq("external_calendar_id", externalCalendarId)
      .eq("external_event_id", link.external_event_id)));

  return records.length;
}

async function upsertCalendarSources({
  calendars,
  connectedCalendar,
  supabase,
  workspaceId,
}: {
  calendars: GoogleCalendarListItem[];
  connectedCalendar: ConnectedCalendarRow;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const existingResult = await supabase
    .from("calendar_sources")
    .select("external_calendar_id, selected_for_display, selected_for_import, selected_for_availability")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google");
  const existingRows = (existingResult.error ? [] : existingResult.data ?? []) as CalendarSourceRow[];
  const existingByCalendarId = new Map(existingRows.map((row) => [row.external_calendar_id, row]));
  const sourceRecords = calendars
    .filter((calendar) => calendar.id && calendar.summary)
    .map((calendar) => {
      const existing = existingByCalendarId.get(calendar.id as string);

      return {
        access_role: calendar.accessRole ?? null,
        background_color: calendar.backgroundColor ?? null,
        connected_calendar_id: connectedCalendar.id,
        description: calendar.description ?? null,
        external_calendar_id: calendar.id as string,
        foreground_color: calendar.foregroundColor ?? null,
        is_active: true,
        is_primary: calendar.primary === true || calendar.id === connectedCalendar.calendar_id,
        name: calendar.summary as string,
        provider: "google",
        selected_for_availability: existing?.selected_for_availability ?? true,
        selected_for_display: existing?.selected_for_display ?? (calendar.selected !== false),
        selected_for_import: existing?.selected_for_import ?? true,
        time_zone: calendar.timeZone ?? null,
        workspace_id: workspaceId,
      };
    });

  if (!sourceRecords.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("calendar_sources")
    .upsert(sourceRecords, {
      onConflict: "workspace_id,provider,external_calendar_id",
    })
    .select("id, external_calendar_id, name, selected_for_display, selected_for_import, selected_for_availability, is_primary, time_zone, access_role, last_synced_at");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function recordWorkspaceCalendarScopeState({
  error,
  supabase,
  workspaceId,
}: {
  error: string | null;
  supabase: SupabaseAdminClient;
  workspaceId: string;
}) {
  const now = new Date().toISOString();
  const { data: existingRows, error: readError } = await supabase
    .from("calendar_sync_cursors")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .is("calendar_source_id", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (readError) {
    return;
  }

  const existingId = existingRows?.[0]?.id;

  if (existingId) {
    await supabase
      .from("calendar_sync_cursors")
      .update({
        last_error: error,
        last_finished_at: now,
        last_started_at: now,
      })
      .eq("workspace_id", workspaceId)
      .eq("provider", "google")
      .is("calendar_source_id", null);
    return;
  }

  if (!error) {
    return;
  }

  await supabase
    .from("calendar_sync_cursors")
    .insert({
      last_error: error,
      last_finished_at: now,
      last_started_at: now,
      provider: "google",
      workspace_id: workspaceId,
    });
}

export async function syncGoogleCalendarSources(workspaceId: string, supabase = createSupabaseAdminClient()) {
  const connectedCalendar = await loadConnectedCalendar(supabase, workspaceId);

  if (!connectedCalendar) {
    return { sources: [], status: "not_connected" as const };
  }

  try {
    const accessToken = await calendarAccessToken(supabase, connectedCalendar);
    const calendars: GoogleCalendarListItem[] = [];
    let pageToken: string | null = null;

    do {
      const params = new URLSearchParams({
        maxResults: "250",
        minAccessRole: "reader",
        showDeleted: "false",
        showHidden: "false",
      });

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(`${googleCalendarApiBase}/users/me/calendarList?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await readGoogleResponse<{ items?: GoogleCalendarListItem[]; nextPageToken?: string }>(response);

      calendars.push(...(data.items ?? []));
      pageToken = data.nextPageToken ?? null;
    } while (pageToken);

    const sources = await upsertCalendarSources({
      calendars,
      connectedCalendar,
      supabase,
      workspaceId,
    });

    await recordWorkspaceCalendarScopeState({
      error: null,
      supabase,
      workspaceId,
    }).catch(() => undefined);

    return { sources, status: "synced" as const };
  } catch (error) {
    if (isGoogleCalendarReconnectError(error)) {
      await recordWorkspaceCalendarScopeState({
        error: googleCalendarReconnectError,
        supabase,
        workspaceId,
      }).catch(() => undefined);

      return { sources: [], status: "needs_reconnect" as const };
    }

    throw error;
  }
}

export async function pullGoogleCalendarEvents({
  supabase = createSupabaseAdminClient(),
  timeMax,
  timeMin,
  workspaceId,
}: {
  supabase?: SupabaseAdminClient;
  timeMax?: string;
  timeMin?: string;
  workspaceId: string;
}) {
  const connectedCalendar = await loadConnectedCalendar(supabase, workspaceId);

  if (!connectedCalendar) {
    return { eventCount: 0, sourceCount: 0, status: "not_connected" as const };
  }

  const sourceSync = await syncGoogleCalendarSources(workspaceId, supabase);

  if (sourceSync.status !== "synced") {
    return { eventCount: 0, sourceCount: 0, status: sourceSync.status };
  }

  const start = timeMin ? new Date(timeMin) : new Date();
  const end = timeMax ? new Date(timeMax) : new Date(start.getTime() + 120 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid calendar sync window.");
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("calendar_sources")
    .select("id, external_calendar_id, name")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google")
    .eq("is_active", true)
    .eq("selected_for_import", true);

  if (sourcesError) {
    throw new Error(sourcesError.message);
  }

  let accessToken: string;

  try {
    accessToken = await calendarAccessToken(supabase, connectedCalendar);
  } catch (error) {
    if (isGoogleCalendarReconnectError(error)) {
      await recordWorkspaceCalendarScopeState({
        error: googleCalendarReconnectError,
        supabase,
        workspaceId,
      }).catch(() => undefined);

      return { eventCount: 0, sourceCount: (sources ?? []).length, status: "needs_reconnect" as const };
    }

    throw error;
  }

  let eventCount = 0;

  for (const source of sources ?? []) {
    const sourceId = String(source.id);
    const externalCalendarId = String(source.external_calendar_id);
    const syncStartedAt = new Date().toISOString();
    const cursorResult = await supabase
      .from("calendar_sync_cursors")
      .select("sync_token")
      .eq("workspace_id", workspaceId)
      .eq("calendar_source_id", sourceId)
      .eq("provider", "google")
      .maybeSingle();
    const existingSyncToken = cursorResult.error ? null : cursorResult.data?.sync_token ?? null;

    await supabase
      .from("calendar_sync_cursors")
      .upsert({
        calendar_source_id: sourceId,
        last_error: null,
        last_started_at: syncStartedAt,
        provider: "google",
        sync_token: existingSyncToken,
        time_max: end.toISOString(),
        time_min: start.toISOString(),
        workspace_id: workspaceId,
      }, {
        onConflict: "workspace_id,calendar_source_id,provider",
      });

    try {
      let syncResult: Awaited<ReturnType<typeof fetchGoogleCalendarEventPages>>;

      try {
        syncResult = await fetchGoogleCalendarEventPages({
          accessToken,
          externalCalendarId,
          syncToken: existingSyncToken,
        });
      } catch (error) {
        if (!existingSyncToken || !isGoogleCalendarSyncTokenExpired(error)) {
          throw error;
        }

        syncResult = await fetchGoogleCalendarEventPages({
          accessToken,
          end,
          externalCalendarId,
          start,
        });
      }

      eventCount += await persistGoogleCalendarEvents({
        events: syncResult.events,
        externalCalendarId,
        sourceId,
        supabase,
        workspaceId,
      });

      const syncedAt = new Date().toISOString();

      await Promise.all([
        supabase
          .from("calendar_sources")
          .update({ last_synced_at: syncedAt })
          .eq("id", sourceId),
        supabase
          .from("calendar_sync_cursors")
          .upsert({
            calendar_source_id: sourceId,
            last_error: null,
            last_finished_at: syncedAt,
            provider: "google",
            sync_token: syncResult.nextSyncToken ?? existingSyncToken,
            time_max: end.toISOString(),
            time_min: start.toISOString(),
            workspace_id: workspaceId,
          }, {
            onConflict: "workspace_id,calendar_source_id,provider",
          }),
      ]);

    } catch (error) {
      if (isGoogleCalendarReconnectError(error)) {
        await recordWorkspaceCalendarScopeState({
          error: googleCalendarReconnectError,
          supabase,
          workspaceId,
        }).catch(() => undefined);

        return { eventCount, sourceCount: (sources ?? []).length, status: "needs_reconnect" as const };
      }

      await supabase
        .from("calendar_sync_cursors")
        .upsert({
          calendar_source_id: sourceId,
          last_error: "Unable to sync Google Calendar events.",
          last_finished_at: new Date().toISOString(),
          provider: "google",
          sync_token: existingSyncToken,
          time_max: end.toISOString(),
          time_min: start.toISOString(),
          workspace_id: workspaceId,
        }, {
          onConflict: "workspace_id,calendar_source_id,provider",
        });

      throw error;
    }
  }

  return { eventCount, sourceCount: (sources ?? []).length, status: "synced" as const };
}

export async function checkGoogleCalendarConnectionHealth(workspaceId: string, supabase = createSupabaseAdminClient()) {
  const connectedCalendar = await loadConnectedCalendar(supabase, workspaceId);

  if (!connectedCalendar) {
    return { message: null, status: "not_connected" as const };
  }

  try {
    const accessToken = await calendarAccessToken(supabase, connectedCalendar);
    const params = new URLSearchParams({
      maxResults: "1",
      minAccessRole: "reader",
      showDeleted: "false",
      showHidden: "false",
    });
    const response = await fetch(`${googleCalendarApiBase}/users/me/calendarList?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await readGoogleResponse<{ items?: GoogleCalendarListItem[] }>(response);
    await recordWorkspaceCalendarScopeState({
      error: null,
      supabase,
      workspaceId,
    }).catch(() => undefined);

    return { message: null, status: "connected" as const };
  } catch (error) {
    if (isGoogleCalendarReconnectError(error)) {
      await recordWorkspaceCalendarScopeState({
        error: googleCalendarReconnectError,
        supabase,
        workspaceId,
      }).catch(() => undefined);

      return { message: googleCalendarReconnectError, status: "needs_reconnect" as const };
    }

    throw error;
  }
}

export async function deleteGoogleCalendarEventForSource(
  input: Pick<DosCalendarEventInput, "sourceId" | "sourceType" | "workspaceId">,
  supabase = createSupabaseAdminClient(),
) {
  const existingLink = await loadEventLink(supabase, input);

  if (!existingLink?.external_event_id) {
    return { status: "no_link" as const };
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

  try {
    const accessToken = await calendarAccessToken(supabase, connectedCalendar);
    const response = await fetch(
      `${googleCalendarApiBase}/calendars/${encodeURIComponent(existingLink.calendar_id)}/events/${encodeURIComponent(existingLink.external_event_id)}?sendUpdates=none`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "DELETE",
      },
    );

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      await readGoogleResponse<Record<string, never>>(response);
    }

    await supabase
      .from("calendar_event_links")
      .delete()
      .eq("id", existingLink.id);

    return { status: "deleted" as const };
  } catch (error) {
    await recordCalendarSyncFailure({
      error: "Unable to delete Google Calendar event.",
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      supabase,
      workspaceId: input.workspaceId,
    }).catch(() => undefined);

    return { status: isGoogleCalendarReconnectError(error) ? "needs_reconnect" as const : "failed" as const };
  }
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
