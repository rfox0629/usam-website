import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  canAccessOperationsModule,
  type OperationsAuthorization,
} from "@/src/lib/operations/auth";
import { newsletterFromEmail, TEST_SEND_RECIPIENT } from "@/src/lib/communications/config";

/**
 * Newsletter review workflow. Ordered: a newsletter moves forward through these
 * and may only be sent from `approved` or `scheduled`.
 */
export const newsletterStatuses = [
  "draft",
  "ready_for_review",
  "test_sent",
  "approved",
  "scheduled",
  "sent",
  "cancelled",
] as const;

export type NewsletterStatus = typeof newsletterStatuses[number];

export const newsletterStatusLabels: Record<string, string> = {
  approved: "Approved",
  archived: "Archived",
  cancelled: "Cancelled",
  draft: "Draft",
  published: "Published",
  ready_for_review: "Ready for Review",
  scheduled: "Scheduled",
  sent: "Sent",
  test_sent: "Test Sent",
};

/**
 * Only these subscriber statuses receive mail. `pending` is excluded because an
 * unconfirmed address has not opted in; bounced and complained are suppression
 * states and must never be mailed again.
 */
export const eligibleSubscriberStatuses = ["subscribed"] as const;
export const suppressedSubscriberStatuses = ["bounced", "complained"] as const;

export const subscriberStatusLabels: Record<string, string> = {
  bounced: "Suppressed (bounced)",
  complained: "Suppressed (complaint)",
  pending: "Pending",
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
};

export type AudienceContact = {
  createdAt: string;
  email: string;
  firstName: string | null;
  id: string;
  isEligible: boolean;
  lastEventAt: string | null;
  lastEventType: string | null;
  lastName: string | null;
  source: string;
  status: string;
  statusLabel: string;
};

export type AudienceSummary = {
  eligible: number;
  pending: number;
  suppressed: number;
  total: number;
  unsubscribed: number;
};

export type NewsletterSendSummary = {
  bounced: number;
  clicked: number;
  delivered: number;
  failed: number;
  opened: number;
  sent: number;
  unsubscribed: number;
};

export type NewsletterRecord = {
  approvedAt: string | null;
  approvedByEmail: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  id: string;
  lastTestSentAt: string | null;
  plannedSendAt: string | null;
  preheader: string | null;
  sections: { body: string; heading: string }[];
  sentAt: string | null;
  slug: string;
  status: string;
  statusLabel: string;
  subject: string;
  summary: string | null;
  title: string;
  updatedAt: string;
};

function statusLabel(status: string) {
  return newsletterStatusLabels[status] ?? status;
}

function normalizeSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const section = item as Record<string, unknown>;
      const heading = typeof section.heading === "string" ? section.heading.trim() : "";
      const body = typeof section.body === "string" ? section.body.trim() : "";

      return heading && body ? { body, heading } : null;
    })
    .filter((item): item is { body: string; heading: string } => Boolean(item));
}

export function canAccessCommunications(authorization: OperationsAuthorization) {
  return canAccessOperationsModule(authorization, "communications");
}

/** Counts by status. Eligible is the only number a production send may use. */
export async function loadAudienceSummary(): Promise<AudienceSummary> {
  const empty: AudienceSummary = { eligible: 0, pending: 0, suppressed: 0, total: 0, unsubscribed: 0 };

  if (!isSupabaseAdminConfigured()) {
    return empty;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("communication_subscribers")
    .select("status")
    .limit(50000);

  if (error) {
    return empty;
  }

  const rows = (data ?? []) as { status: string }[];

  return {
    eligible: rows.filter((row) => row.status === "subscribed").length,
    pending: rows.filter((row) => row.status === "pending").length,
    suppressed: rows.filter((row) => row.status === "bounced" || row.status === "complained").length,
    total: rows.length,
    unsubscribed: rows.filter((row) => row.status === "unsubscribed").length,
  };
}

export async function loadAudienceContacts({
  search,
  status,
}: {
  search?: string;
  status?: string;
} = {}): Promise<{ contacts: AudienceContact[]; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { contacts: [], error: "Supabase admin environment variables are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("communication_subscribers")
    .select("id, email, first_name, last_name, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status && status !== "all") {
    query = status === "suppressed"
      ? query.in("status", suppressedSubscriberStatuses as unknown as string[])
      : query.eq("status", status);
  }

  if (search?.trim()) {
    const term = search.trim().replace(/[%,]/g, " ");
    query = query.or(`email.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { contacts: [], error: error.message };
  }

  const rows = (data ?? []) as {
    created_at: string;
    email: string;
    first_name: string | null;
    id: string;
    last_name: string | null;
    source: string;
    status: string;
  }[];

  // Last event per contact, for the "last email event" column.
  const { data: eventRows } = await supabase
    .from("communication_subscriber_events")
    .select("subscriber_id, event_type, created_at")
    .in("subscriber_id", rows.map((row) => row.id))
    .order("created_at", { ascending: false })
    .limit(2000);

  const lastEvent = new Map<string, { created_at: string; event_type: string }>();

  for (const event of (eventRows ?? []) as { created_at: string; event_type: string; subscriber_id: string }[]) {
    if (!lastEvent.has(event.subscriber_id)) {
      lastEvent.set(event.subscriber_id, event);
    }
  }

  return {
    contacts: rows.map((row) => ({
      createdAt: row.created_at,
      email: row.email,
      firstName: row.first_name,
      id: row.id,
      isEligible: row.status === "subscribed",
      lastEventAt: lastEvent.get(row.id)?.created_at ?? null,
      lastEventType: lastEvent.get(row.id)?.event_type ?? null,
      lastName: row.last_name,
      source: row.source,
      status: row.status,
      statusLabel: subscriberStatusLabels[row.status] ?? row.status,
    })),
  };
}

function newsletterFromRow(row: Record<string, unknown>): NewsletterRecord {
  const status = String(row.status ?? "draft");

  return {
    approvedAt: (row.approved_at as string) ?? null,
    approvedByEmail: (row.approved_by_email as string) ?? null,
    ctaLabel: (row.cta_label as string) ?? null,
    ctaUrl: (row.cta_url as string) ?? null,
    id: String(row.id),
    lastTestSentAt: (row.last_test_sent_at as string) ?? null,
    plannedSendAt: (row.planned_send_at as string) ?? null,
    preheader: (row.preheader as string) ?? null,
    sections: normalizeSections(row.sections),
    sentAt: (row.sent_at as string) ?? null,
    slug: String(row.slug),
    status,
    statusLabel: statusLabel(status),
    subject: String(row.subject),
    summary: (row.summary as string) ?? null,
    title: String(row.title),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

const newsletterColumns = "id, slug, title, subject, preheader, summary, body_markdown, sections, cta_label, cta_url, status, planned_send_at, ready_at, last_test_sent_at, approved_at, approved_by_email, sent_at, cancelled_at, created_at, updated_at";

export async function loadNewsletters(): Promise<{ error?: string; newsletters: NewsletterRecord[] }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Supabase admin environment variables are not configured.", newsletters: [] };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("communication_newsletters")
    .select(newsletterColumns)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return { error: error.message, newsletters: [] };
  }

  return { newsletters: ((data ?? []) as Record<string, unknown>[]).map(newsletterFromRow) };
}

export async function loadNewsletterDetail(id: string): Promise<{
  bodyMarkdown: string;
  newsletter: NewsletterRecord;
} | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("communication_newsletters")
    .select(newsletterColumns)
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const row = data as Record<string, unknown>;

  return {
    bodyMarkdown: String(row.body_markdown ?? ""),
    newsletter: newsletterFromRow(row),
  };
}

/** Delivery outcomes for one newsletter, from real send and event rows only. */
export async function loadNewsletterSendSummary(newsletterId: string): Promise<NewsletterSendSummary> {
  const empty: NewsletterSendSummary = {
    bounced: 0, clicked: 0, delivered: 0, failed: 0, opened: 0, sent: 0, unsubscribed: 0,
  };

  if (!isSupabaseAdminConfigured()) {
    return empty;
  }

  const supabase = createSupabaseAdminClient();
  const { data: sends } = await supabase
    .from("communication_sends")
    .select("id, status, send_type, resend_email_id")
    .eq("newsletter_id", newsletterId)
    .eq("send_type", "broadcast");

  const sendRows = (sends ?? []) as { id: string; resend_email_id: string | null; status: string }[];

  if (sendRows.length === 0) {
    return empty;
  }

  const { data: events } = await supabase
    .from("communication_delivery_events")
    .select("event_type")
    .in("resend_email_id", sendRows.map((row) => row.resend_email_id).filter(Boolean) as string[]);

  const eventRows = (events ?? []) as { event_type: string }[];
  const countEvent = (type: string) => eventRows.filter((row) => row.event_type.includes(type)).length;

  return {
    bounced: countEvent("bounced"),
    clicked: countEvent("clicked"),
    delivered: countEvent("delivered"),
    failed: sendRows.filter((row) => row.status === "failed").length,
    opened: countEvent("opened"),
    sent: sendRows.filter((row) => row.status === "sent" || row.status === "delivered").length,
    unsubscribed: countEvent("unsubscribe"),
  };
}

export type TestSendRecord = {
  error: string | null;
  recipient: string;
  resendEmailId: string | null;
  sentAt: string | null;
  status: string;
};

export async function loadTestSends(newsletterId: string): Promise<TestSendRecord[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("communication_sends")
    .select("recipient_email, status, resend_email_id, sent_at, error_message")
    .eq("newsletter_id", newsletterId)
    .in("send_type", ["test", "preview"])
    .order("created_at", { ascending: false })
    .limit(10);

  return ((data ?? []) as {
    error_message: string | null;
    recipient_email: string;
    resend_email_id: string | null;
    sent_at: string | null;
    status: string;
  }[]).map((row) => ({
    error: row.error_message,
    recipient: row.recipient_email,
    resendEmailId: row.resend_email_id,
    sentAt: row.sent_at,
    status: row.status,
  }));
}

export type SendReadiness = {
  blockers: string[];
  canSend: boolean;
};

/**
 * Every condition that must hold before a donor broadcast is allowed. The UI
 * renders the blockers; the send action re-checks them server-side rather than
 * trusting that the button was hidden.
 */
export function evaluateSendReadiness({
  audience,
  authorizedToManage,
  newsletter,
  senderConfigured,
}: {
  audience: AudienceSummary;
  authorizedToManage: boolean;
  newsletter: NewsletterRecord;
  senderConfigured: boolean;
}): SendReadiness {
  const blockers: string[] = [];

  if (!authorizedToManage) {
    blockers.push("Your role cannot send communications.");
  }

  if (newsletter.status !== "approved" && newsletter.status !== "scheduled") {
    blockers.push("Newsletter is not approved for send.");
  }

  if (!newsletter.approvedByEmail || !newsletter.approvedAt) {
    blockers.push("No recorded approver.");
  }

  if (!newsletter.lastTestSentAt) {
    blockers.push("No test send has been completed.");
  }

  if (newsletter.sentAt) {
    blockers.push("This newsletter has already been sent.");
  }

  if (audience.eligible < 1) {
    blockers.push("No eligible subscribers.");
  }

  if (!senderConfigured) {
    blockers.push("No verified sending address is configured.");
  }

  return { blockers, canSend: blockers.length === 0 };
}

export function communicationsSenderStatus() {
  const from = newsletterFromEmail();

  return {
    configured: Boolean(from),
    from,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    testRecipient: TEST_SEND_RECIPIENT,
  };
}
