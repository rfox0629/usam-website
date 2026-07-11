import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export type RecordEventActorType = "public" | "admin" | "system";

export type NotificationStatus = "failed" | "sent" | "skipped";

export type RecordEventInput = {
  actorId?: string | null;
  actorType?: RecordEventActorType;
  eventType: string;
  organizationId?: string | null;
  payload?: Record<string, unknown>;
  subjectId: string;
  subjectType: string;
};

export type RecordEventResult =
  | { eventId: string; recorded: true }
  | { reason: string; recorded: false };

export type NotificationResultPayload = {
  notificationAttempted: boolean;
  notificationErrorCode?: string;
  notificationProvider: string;
  notificationStatus: NotificationStatus;
};

let cachedUsamOrganizationId: string | null = null;

/**
 * Resolves the existing seeded USA Missionaries organization row -- never a
 * hardcoded UUID. Cached in-process because this is a stable, effectively-static
 * lookup in the current single-organization system; a future multi-organization
 * caller should pass organizationId explicitly instead of relying on this fallback.
 */
async function resolveUsamOrganizationId(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<string | null> {
  if (cachedUsamOrganizationId) {
    return cachedUsamOrganizationId;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .or("branding_mode.eq.usam,slug.eq.usa-missionaries")
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  cachedUsamOrganizationId = data.id;

  return cachedUsamOrganizationId;
}

/**
 * Records a meaningful domain fact to platform_events. This is a thin, append-only
 * write -- not the permanent audit log for every administrative action, document
 * access, permission change, notification delivery, or automated consumer action.
 *
 * Never throws: a failed or skipped event write must never block the caller's
 * actual submission, which is always persisted before this is called. Callers
 * should await this without wrapping it in their own try/catch.
 */
export async function recordEvent(input: RecordEventInput): Promise<RecordEventResult> {
  if (!isSupabaseAdminConfigured()) {
    return { reason: "supabase_not_configured", recorded: false };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const organizationId = input.organizationId ?? await resolveUsamOrganizationId(supabase);

    if (!organizationId) {
      return { reason: "organization_not_resolved", recorded: false };
    }

    const { data, error } = await supabase
      .from("platform_events")
      .insert({
        actor_id: input.actorId ?? null,
        actor_type: input.actorType ?? "public",
        event_type: input.eventType,
        organization_id: organizationId,
        payload: input.payload ?? {},
        subject_id: input.subjectId,
        subject_type: input.subjectType,
      })
      .select("id")
      .single();

    if (error) {
      // A duplicate event for the same subject + event_type is expected under a
      // double-submit or retry, not a real failure -- the dedupe constraint already
      // did its job, so treat this the same as a successful record.
      if ((error as { code?: string }).code === "23505") {
        return { eventId: "duplicate", recorded: true };
      }

      return { reason: error.message, recorded: false };
    }

    return { eventId: (data as { id: string }).id, recorded: true };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : "unknown_error", recorded: false };
  }
}

/**
 * Records the outcome of an attempted notification as its own small event, rather
 * than updating the original event row (platform_events is append-only) or
 * introducing a separate notifications table. The payload is intentionally limited
 * to a status, a provider name, and a sanitized error category -- never a full
 * email body, provider response, or secret.
 */
export async function recordNotificationResult(
  input: Omit<RecordEventInput, "payload"> & { result: NotificationResultPayload },
): Promise<RecordEventResult> {
  return recordEvent({
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: input.eventType,
    organizationId: input.organizationId,
    payload: {
      notification_attempted: input.result.notificationAttempted,
      notification_error_code: input.result.notificationErrorCode,
      notification_provider: input.result.notificationProvider,
      notification_status: input.result.notificationStatus,
    },
    subjectId: input.subjectId,
    subjectType: input.subjectType,
  });
}
