import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export const phase1NewsletterRecipients = [
  { email: "ryan@usamissionaries.org", name: "Ryan Fox" },
  { email: "brooke.r.fox@gmail.com", name: "Brooke Fox" },
] as const;

export const communicationPreferenceTopics = [
  { description: "Monthly public updates and field stories.", label: "Newsletter", value: "newsletter" },
  { description: "Mission progress, training, and movement updates.", label: "Mission Updates", value: "mission_updates" },
  { description: "Support needs and generosity updates.", label: "Support Updates", value: "support_updates" },
  { description: "Prayer requests and answered prayer updates.", label: "Prayer Updates", value: "prayer_updates" },
] as const;

export type CommunicationPreferenceTopic = typeof communicationPreferenceTopics[number]["value"];

export type CommunicationSubscriber = {
  consented_at: string | null;
  created_at: string;
  email: string;
  email_normalized: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  source: string;
  status: "pending" | "subscribed" | "suppressed" | "unsubscribed";
  unsubscribed_at: string | null;
  updated_at: string | null;
};

export type CommunicationPreference = {
  enabled: boolean;
  id: string;
  subscriber_id: string;
  topic: CommunicationPreferenceTopic;
  updated_at: string | null;
};

export type NewsletterIssue = {
  body_text: string;
  created_at: string;
  cta_label: string | null;
  cta_url: string | null;
  hero_image_url: string | null;
  id: string;
  intro_text: string | null;
  preview_text: string | null;
  published_at: string | null;
  slug: string;
  status: "archived" | "draft" | "in_review" | "published";
  subject: string;
  title: string;
  updated_at: string | null;
};

export type NewsletterPublication = {
  archive_visible: boolean;
  body_text: string;
  created_at: string;
  cta_label: string | null;
  cta_url: string | null;
  hero_image_url: string | null;
  html_snapshot: string | null;
  id: string;
  intro_text: string | null;
  newsletter_id: string;
  preview_text: string | null;
  published_at: string | null;
  slug: string;
  status: "archived" | "draft" | "published";
  subject: string;
  text_snapshot: string | null;
  title: string;
  updated_at: string | null;
};

export type NewsletterSend = {
  created_at: string;
  email: string;
  error_code: string | null;
  error_message: string | null;
  id: string;
  publication_id: string | null;
  provider_message_id: string | null;
  requested_by_email: string | null;
  send_type: "campaign" | "preview" | "test";
  sent_at: string | null;
  status: "bounced" | "clicked" | "complained" | "delivered" | "failed" | "opened" | "queued" | "sent" | "skipped";
};

export type NewsletterDeliveryEvent = {
  duplicate_count: number;
  event_type: string;
  id: string;
  provider_event_id: string;
  provider_message_id: string | null;
  received_at: string;
  recipient_email: string | null;
  send_id: string | null;
};

export type AdminCommunicationsData = {
  deliveryEvents: NewsletterDeliveryEvent[];
  error?: string;
  issues: NewsletterIssue[];
  preferences: CommunicationPreference[];
  publications: NewsletterPublication[];
  sends: NewsletterSend[];
  subscribers: CommunicationSubscriber[];
};

type CommunicationTokenRow = {
  expires_at: string;
  id: string;
  purpose: "preferences" | "unsubscribe";
  status: string;
  subscriber_id: string;
};

type ResendEmailResult = {
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  sent: boolean;
  skippedReason?: string;
};

const tokenBytes = 32;
const tokenTtlMs = 1000 * 60 * 60 * 24 * 90;
const defaultError = "Communications are not configured yet.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowIso() {
  return new Date().toISOString();
}

function tokenExpiresAt() {
  return new Date(Date.now() + tokenTtlMs).toISOString();
}

function newToken() {
  return randomBytes(tokenBytes).toString("base64url");
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanText(value: string | null | undefined, maxLength = 4000) {
  const trimmed = value?.trim().slice(0, maxLength) ?? "";

  return trimmed ? trimmed : null;
}

function cleanRequiredText(value: string | null | undefined, maxLength = 4000) {
  return value?.trim().slice(0, maxLength) ?? "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlParagraphs(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return "";
  }

  return paragraphs
    .map((paragraph) => `<p style="margin:0 0 18px;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function safeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function titleFromEmail(email: string) {
  return email.split("@")[0]?.split(/[._-]+/).filter(Boolean).map((part) => (
    part.charAt(0).toUpperCase() + part.slice(1)
  )).join(" ") || "Friend";
}

function subscriberDisplayName(subscriber: Pick<CommunicationSubscriber, "email" | "first_name" | "last_name">) {
  const name = [subscriber.first_name, subscriber.last_name].filter(Boolean).join(" ").trim();

  return name || titleFromEmail(subscriber.email);
}

function getNewsletterFromEmail() {
  return process.env.NEWSLETTER_EMAIL_FROM
    || process.env.EMAIL_FROM
    || "";
}

function getNewsletterReplyTo() {
  return process.env.NEWSLETTER_REPLY_TO || process.env.EMAIL_REPLY_TO || undefined;
}

function configuredSiteUrl() {
  return getConfiguredSiteUrl({ allowLocalhost: process.env.NODE_ENV !== "production" });
}

function preferenceEnabled(
  preferences: readonly CommunicationPreference[],
  topic: CommunicationPreferenceTopic,
  fallback = false,
) {
  return preferences.find((preference) => preference.topic === topic)?.enabled ?? fallback;
}

function publicationDate(value: string | null | undefined) {
  if (!value) {
    return "Draft";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function normalizeCommunicationEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isValidCommunicationEmail(value: string) {
  return emailPattern.test(value);
}

export function isPhase1NewsletterRecipient(value: string) {
  const email = normalizeCommunicationEmail(value);

  return phase1NewsletterRecipients.some((recipient) => recipient.email === email);
}

export function slugifyNewsletterTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    || `newsletter-${Date.now()}`;
}

export function formatCommunicationDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function buildNewsletterEmail(
  publication: NewsletterPublication,
  subscriber: Pick<CommunicationSubscriber, "email" | "first_name" | "last_name">,
  links: {
    preferencesUrl?: string;
    unsubscribeUrl?: string;
  } = {},
) {
  const siteUrl = configuredSiteUrl();
  const archiveUrl = new URL(`/newsletter/${publication.slug}`, siteUrl).toString();
  const ctaUrl = safeUrl(publication.cta_url);
  const heroUrl = safeUrl(publication.hero_image_url);
  const preheader = publication.preview_text || publication.intro_text || publication.title;
  const intro = publication.intro_text
    ? `<p style="margin:0 0 22px;font-size:18px;line-height:1.65;color:#2f2a22;">${escapeHtml(publication.intro_text)}</p>`
    : "";
  const cta = ctaUrl && publication.cta_label
    ? `<p style="margin:28px 0 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#C2A14E;color:#111111;padding:13px 18px;text-decoration:none;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;">${escapeHtml(publication.cta_label)}</a></p>`
    : "";
  const hero = heroUrl
    ? `<img src="${escapeHtml(heroUrl)}" alt="" width="640" style="display:block;width:100%;height:auto;margin:0 0 26px;border:0;" />`
    : "";
  const preferencesUrl = links.preferencesUrl || archiveUrl;
  const unsubscribeUrl = links.unsubscribeUrl || preferencesUrl;
  const html = `<!doctype html>
<html>
  <head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <style>
      @media only screen and (max-width: 620px) {
        .newsletter-shell { padding: 18px 12px !important; }
        .newsletter-card { padding: 24px 18px !important; }
        .newsletter-title { font-size: 34px !important; line-height: 1.02 !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#0D0D0D;color:#171717;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <div class="newsletter-shell" style="background:#0D0D0D;padding:34px 16px;font-family:Arial,sans-serif;">
      <div class="newsletter-card" style="margin:0 auto;max-width:640px;background:#fffdf8;padding:34px;border:1px solid #e5d8b6;">
        <p style="margin:0 0 16px;color:#8a6822;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">USA Missionaries</p>
        ${hero}
        <h1 class="newsletter-title" style="margin:0;color:#111111;font-size:44px;line-height:0.98;letter-spacing:0;font-weight:800;">${escapeHtml(publication.title)}</h1>
        <p style="margin:14px 0 28px;color:#8a7b61;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(publicationDate(publication.published_at))}</p>
        <div style="color:#2f2a22;font-size:16px;line-height:1.75;">
          <p style="margin:0 0 18px;">Hi ${escapeHtml(subscriberDisplayName(subscriber))},</p>
          ${intro}
          ${htmlParagraphs(publication.body_text)}
          ${cta}
        </div>
        <div style="margin-top:34px;border-top:1px solid #e7ddc3;padding-top:18px;color:#766b5a;font-size:12px;line-height:1.7;">
          <p style="margin:0 0 10px;">You are receiving this because you subscribed to USA Missionaries updates.</p>
          <p style="margin:0;">
            <a href="${escapeHtml(archiveUrl)}" style="color:#65490f;">View online</a>
            <span style="color:#b8ad99;"> | </span>
            <a href="${escapeHtml(preferencesUrl)}" style="color:#65490f;">Manage preferences</a>
            <span style="color:#b8ad99;"> | </span>
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#65490f;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;
  const text = [
    publication.title,
    publicationDate(publication.published_at),
    "",
    publication.preview_text || "",
    "",
    publication.intro_text || "",
    "",
    publication.body_text,
    "",
    ctaUrl && publication.cta_label ? `${publication.cta_label}: ${ctaUrl}` : "",
    `View online: ${archiveUrl}`,
    `Manage preferences: ${preferencesUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].filter(Boolean).join("\n");

  return {
    html,
    subject: publication.subject,
    text,
  };
}

async function insertAuditEvent(
  supabase: SupabaseAdminClient,
  input: {
    actorEmail?: string | null;
    actorType: "admin" | "public" | "system" | "webhook";
    details?: Record<string, unknown>;
    eventType: string;
    subscriberId?: string | null;
  },
) {
  await supabase
    .from("communication_audit_events")
    .insert({
      actor_email: input.actorEmail ?? null,
      actor_type: input.actorType,
      details: input.details ?? {},
      event_type: input.eventType,
      subscriber_id: input.subscriberId ?? null,
    });
}

async function getSubscriberByEmail(supabase: SupabaseAdminClient, email: string) {
  const { data, error } = await supabase
    .from("communication_subscribers")
    .select("id, email, email_normalized, first_name, last_name, status, source, consented_at, unsubscribed_at, created_at, updated_at")
    .eq("email_normalized", normalizeCommunicationEmail(email))
    .maybeSingle();

  return { error, subscriber: data as CommunicationSubscriber | null };
}

async function getSubscriberPreferences(supabase: SupabaseAdminClient, subscriberId: string) {
  const { data, error } = await supabase
    .from("communication_preferences")
    .select("id, subscriber_id, topic, enabled, updated_at")
    .eq("subscriber_id", subscriberId)
    .eq("channel", "email");

  return { error, preferences: (data ?? []) as CommunicationPreference[] };
}

async function upsertNewsletterPreferences(
  supabase: SupabaseAdminClient,
  subscriberId: string,
  enabledTopics: readonly CommunicationPreferenceTopic[],
  source: string,
) {
  const timestamp = nowIso();
  const enabledSet = new Set(enabledTopics);
  const rows = communicationPreferenceTopics.map((topic) => {
    const enabled = enabledSet.has(topic.value);

    return {
      channel: "email",
      consented_at: enabled ? timestamp : null,
      enabled,
      source,
      subscriber_id: subscriberId,
      topic: topic.value,
      unsubscribed_at: enabled ? null : timestamp,
    };
  });

  return supabase
    .from("communication_preferences")
    .upsert(rows, { onConflict: "subscriber_id,channel,topic" });
}

export async function subscribeToNewsletter(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  source?: string;
  topics?: readonly CommunicationPreferenceTopic[];
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, subscriber: null };
  }

  const email = normalizeCommunicationEmail(input.email);

  if (!isValidCommunicationEmail(email)) {
    return { error: "Enter a valid email address.", subscriber: null };
  }

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const source = input.source ?? "public_subscribe";
  const firstName = cleanText(input.firstName, 120);
  const lastName = cleanText(input.lastName, 120);
  const existingResult = await getSubscriberByEmail(supabase, email);

  if (existingResult.error) {
    return { error: existingResult.error.message, subscriber: null };
  }

  const existing = existingResult.subscriber;
  const write = existing
    ? await supabase
      .from("communication_subscribers")
      .update({
        consented_at: existing.consented_at ?? timestamp,
        first_name: firstName ?? existing.first_name,
        last_name: lastName ?? existing.last_name,
        resubscribed_at: existing.status === "unsubscribed" ? timestamp : undefined,
        source,
        status: "subscribed",
        suppression_reason: null,
        unsubscribed_at: null,
      })
      .eq("id", existing.id)
      .select("id, email, email_normalized, first_name, last_name, status, source, consented_at, unsubscribed_at, created_at, updated_at")
      .single()
    : await supabase
      .from("communication_subscribers")
      .insert({
        consented_at: timestamp,
        email,
        first_name: firstName,
        last_name: lastName,
        source,
        status: "subscribed",
      })
      .select("id, email, email_normalized, first_name, last_name, status, source, consented_at, unsubscribed_at, created_at, updated_at")
      .single();

  if (write.error || !write.data) {
    return { error: write.error?.message ?? "Unable to save subscription.", subscriber: null };
  }

  const subscriber = write.data as CommunicationSubscriber;
  const topics = input.topics?.length ? input.topics : ["newsletter" as const];
  const preferencesWrite = await upsertNewsletterPreferences(supabase, subscriber.id, topics, source);

  if (preferencesWrite.error) {
    return { error: preferencesWrite.error.message, subscriber: null };
  }

  await insertAuditEvent(supabase, {
    actorType: "public",
    details: { email, source },
    eventType: existing?.status === "unsubscribed" ? "resubscribe" : existing ? "subscribe_idempotent" : "subscribe",
    subscriberId: subscriber.id,
  });

  return { error: null, subscriber };
}

export async function createCommunicationToken(
  supabase: SupabaseAdminClient,
  input: {
    createdByEmail?: string | null;
    purpose: "preferences" | "unsubscribe";
    subscriberId: string;
  },
) {
  const token = newToken();
  const expiresAt = tokenExpiresAt();
  const { error } = await supabase
    .from("communication_tokens")
    .insert({
      created_by_email: input.createdByEmail ?? null,
      expires_at: expiresAt,
      purpose: input.purpose,
      status: "active",
      subscriber_id: input.subscriberId,
      token_hash: tokenHash(token),
    });

  if (error) {
    return { error: error.message, expiresAt: null, token: null };
  }

  return { error: null, expiresAt, token };
}

export async function loadPreferencePortal(token: string) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, preferences: [], subscriber: null };
  }

  const cleanedToken = token.trim();

  if (cleanedToken.length < 32) {
    return { error: "This preferences link is invalid.", preferences: [], subscriber: null };
  }

  const supabase = createSupabaseAdminClient();
  const { data: tokenRow, error: tokenError } = await supabase
    .from("communication_tokens")
    .select("id, subscriber_id, purpose, status, expires_at")
    .eq("token_hash", tokenHash(cleanedToken))
    .in("purpose", ["preferences", "unsubscribe"])
    .maybeSingle();

  if (tokenError) {
    return { error: tokenError.message, preferences: [], subscriber: null };
  }

  const communicationToken = tokenRow as CommunicationTokenRow | null;

  if (!communicationToken || communicationToken.status !== "active" || new Date(communicationToken.expires_at).getTime() <= Date.now()) {
    return { error: "This preferences link has expired. Request a new link.", preferences: [], subscriber: null };
  }

  const { data: subscriberRow, error: subscriberError } = await supabase
    .from("communication_subscribers")
    .select("id, email, email_normalized, first_name, last_name, status, source, consented_at, unsubscribed_at, created_at, updated_at")
    .eq("id", communicationToken.subscriber_id)
    .maybeSingle();

  if (subscriberError || !subscriberRow) {
    return { error: subscriberError?.message ?? "Subscriber not found.", preferences: [], subscriber: null };
  }

  const preferencesResult = await getSubscriberPreferences(supabase, communicationToken.subscriber_id);

  if (preferencesResult.error) {
    return { error: preferencesResult.error.message, preferences: [], subscriber: null };
  }

  return {
    error: null,
    preferences: preferencesResult.preferences,
    subscriber: subscriberRow as CommunicationSubscriber,
  };
}

export async function updatePreferencesByToken(
  token: string,
  enabledTopics: readonly CommunicationPreferenceTopic[],
) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError };
  }

  const portal = await loadPreferencePortal(token);

  if (portal.error || !portal.subscriber) {
    return { error: portal.error ?? "Unable to load preferences." };
  }

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const shouldSubscribe = enabledTopics.length > 0;
  const preferencesWrite = await upsertNewsletterPreferences(supabase, portal.subscriber.id, enabledTopics, "preferences_token");

  if (preferencesWrite.error) {
    return { error: preferencesWrite.error.message };
  }

  const { error: subscriberError } = await supabase
    .from("communication_subscribers")
    .update({
      resubscribed_at: shouldSubscribe && portal.subscriber.status === "unsubscribed" ? timestamp : undefined,
      status: shouldSubscribe ? "subscribed" : "unsubscribed",
      unsubscribed_at: shouldSubscribe ? null : portal.subscriber.unsubscribed_at ?? timestamp,
    })
    .eq("id", portal.subscriber.id);

  if (subscriberError) {
    return { error: subscriberError.message };
  }

  await insertAuditEvent(supabase, {
    actorType: "public",
    details: { enabledTopics },
    eventType: "preferences_update",
    subscriberId: portal.subscriber.id,
  });

  return { error: null };
}

export async function unsubscribeByToken(token: string) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError };
  }

  const portal = await loadPreferencePortal(token);

  if (portal.error || !portal.subscriber) {
    return { error: portal.error ?? "Unable to load preferences." };
  }

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const preferencesWrite = await upsertNewsletterPreferences(supabase, portal.subscriber.id, [], "unsubscribe_token");

  if (preferencesWrite.error) {
    return { error: preferencesWrite.error.message };
  }

  const { error } = await supabase
    .from("communication_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: portal.subscriber.unsubscribed_at ?? timestamp,
    })
    .eq("id", portal.subscriber.id);

  if (error) {
    return { error: error.message };
  }

  await insertAuditEvent(supabase, {
    actorType: "public",
    details: { source: "unsubscribe_token" },
    eventType: portal.subscriber.status === "unsubscribed" ? "unsubscribe_idempotent" : "unsubscribe",
    subscriberId: portal.subscriber.id,
  });

  return { error: null };
}

export async function requestPreferenceManagementLink(input: {
  email: string;
  source?: string;
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, sent: false };
  }

  const email = normalizeCommunicationEmail(input.email);

  if (!isValidCommunicationEmail(email)) {
    return { error: "Enter a valid email address.", sent: false };
  }

  const supabase = createSupabaseAdminClient();
  const subscriberResult = await getSubscriberByEmail(supabase, email);

  if (subscriberResult.error) {
    return { error: subscriberResult.error.message, sent: false };
  }

  const subscriber = subscriberResult.subscriber;

  if (!subscriber) {
    return { error: null, sent: false };
  }

  if (!isPhase1NewsletterRecipient(email)) {
    await insertAuditEvent(supabase, {
      actorType: "public",
      details: { email, reason: "phase1_recipient_not_allowed", source: input.source ?? "preferences_request" },
      eventType: "preferences_link_skipped",
      subscriberId: subscriber.id,
    });

    return { error: null, sent: false };
  }

  const preferencesToken = await createCommunicationToken(supabase, {
    purpose: "preferences",
    subscriberId: subscriber.id,
  });
  const unsubscribeToken = await createCommunicationToken(supabase, {
    purpose: "unsubscribe",
    subscriberId: subscriber.id,
  });

  if (preferencesToken.error || !preferencesToken.token || unsubscribeToken.error || !unsubscribeToken.token) {
    return {
      error: preferencesToken.error ?? unsubscribeToken.error ?? "Unable to create management link.",
      sent: false,
    };
  }

  const siteUrl = configuredSiteUrl();
  const preferencesUrl = new URL(`/preferences/${preferencesToken.token}`, siteUrl).toString();
  const unsubscribeUrl = new URL(`/unsubscribe/${unsubscribeToken.token}`, siteUrl).toString();
  const html = `
    <div style="margin:0;background:#0D0D0D;padding:32px 16px;font-family:Arial,sans-serif;color:#171717;line-height:1.6;">
      <div style="margin:0 auto;max-width:620px;background:#fffdf8;border:1px solid #e5d8b6;padding:28px;">
        <p style="margin:0 0 14px;color:#8a6822;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">USA Missionaries</p>
        <h1 style="margin:0 0 16px;color:#111111;font-size:30px;line-height:1.1;">Manage your updates</h1>
        <p style="margin:0 0 18px;color:#2f2a22;">Use this confirmed link to update your USA Missionaries email preferences.</p>
        <p style="margin:0 0 20px;"><a href="${escapeHtml(preferencesUrl)}" style="display:inline-block;background:#C2A14E;color:#111111;padding:13px 18px;text-decoration:none;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;">Open Preferences</a></p>
        <p style="margin:0;color:#766b5a;font-size:12px;">You can also unsubscribe here: <a href="${escapeHtml(unsubscribeUrl)}" style="color:#65490f;">unsubscribe</a>.</p>
      </div>
    </div>
  `;
  const text = [
    "Manage your USA Missionaries updates",
    "",
    `Preferences: ${preferencesUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
  const result = await sendResendEmail({
    html,
    idempotencyKey: `preferences-${subscriber.id}-${Date.now()}-${randomBytes(6).toString("hex")}`,
    subject: "Manage your USA Missionaries updates",
    text,
    to: email,
  });

  await insertAuditEvent(supabase, {
    actorType: "public",
    details: {
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      email,
      sent: result.sent,
      skippedReason: result.skippedReason,
      source: input.source ?? "preferences_request",
    },
    eventType: "preferences_link_requested",
    subscriberId: subscriber.id,
  });

  return {
    error: null,
    sent: result.sent,
  };
}

async function sendResendEmail(input: {
  html: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
}): Promise<ResendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = getNewsletterFromEmail();

  if (!isPhase1NewsletterRecipient(input.to)) {
    return {
      errorCode: "phase1_recipient_not_allowed",
      errorMessage: "Phase 1 newsletter sends are restricted to Ryan and Brooke Fox.",
      sent: false,
    };
  }

  if (!resendApiKey || !from) {
    return {
      sent: false,
      skippedReason: "missing_resend_config",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html: input.html,
        reply_to: getNewsletterReplyTo(),
        subject: input.subject,
        text: input.text,
        to: input.to,
      }),
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      method: "POST",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");

      return {
        errorCode: "resend_request_failed",
        errorMessage: `${response.status} ${message}`.trim(),
        sent: false,
      };
    }

    const data = await response.json().catch(() => ({} as { id?: string }));

    return {
      providerMessageId: typeof data.id === "string" ? data.id : undefined,
      sent: true,
    };
  } catch (error) {
    return {
      errorCode: "resend_network_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown Resend error.",
      sent: false,
    };
  }
}

export async function sendNewsletterPreview(input: {
  publicationId: string;
  recipientEmail: string;
  requestedByEmail: string;
  sendType?: "preview" | "test";
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, send: null };
  }

  const recipientEmail = normalizeCommunicationEmail(input.recipientEmail);

  if (!isPhase1NewsletterRecipient(recipientEmail)) {
    return { error: "Phase 1 previews can only be sent to Ryan or Brooke Fox.", send: null };
  }

  const supabase = createSupabaseAdminClient();
  const [publicationResult, subscriberResult] = await Promise.all([
    supabase
      .from("newsletter_publications")
      .select("id, newsletter_id, slug, title, subject, preview_text, intro_text, body_text, cta_label, cta_url, hero_image_url, html_snapshot, text_snapshot, status, archive_visible, published_at, created_at, updated_at")
      .eq("id", input.publicationId)
      .maybeSingle(),
    getSubscriberByEmail(supabase, recipientEmail),
  ]);

  if (publicationResult.error) {
    return { error: publicationResult.error.message, send: null };
  }

  const publication = publicationResult.data as NewsletterPublication | null;

  if (!publication) {
    return { error: "Newsletter publication not found.", send: null };
  }

  if (subscriberResult.error) {
    return { error: subscriberResult.error.message, send: null };
  }

  const subscriber = subscriberResult.subscriber;

  if (!subscriber || subscriber.status !== "subscribed") {
    return { error: "The preview recipient must be one of the two seeded subscribed users.", send: null };
  }

  const preferencesToken = await createCommunicationToken(supabase, {
    createdByEmail: input.requestedByEmail,
    purpose: "preferences",
    subscriberId: subscriber.id,
  });
  const unsubscribeToken = await createCommunicationToken(supabase, {
    createdByEmail: input.requestedByEmail,
    purpose: "unsubscribe",
    subscriberId: subscriber.id,
  });

  if (preferencesToken.error || !preferencesToken.token || unsubscribeToken.error || !unsubscribeToken.token) {
    return { error: preferencesToken.error ?? unsubscribeToken.error ?? "Unable to create preference links.", send: null };
  }

  const siteUrl = configuredSiteUrl();
  const email = buildNewsletterEmail(publication, subscriber, {
    preferencesUrl: new URL(`/preferences/${preferencesToken.token}`, siteUrl).toString(),
    unsubscribeUrl: new URL(`/unsubscribe/${unsubscribeToken.token}`, siteUrl).toString(),
  });
  const idempotencyKey = `newsletter-${input.sendType ?? "preview"}-${publication.id}-${recipientEmail}-${Date.now()}-${randomBytes(6).toString("hex")}`;
  const sendInsert = await supabase
    .from("newsletter_sends")
    .insert({
      email: recipientEmail,
      idempotency_key: idempotencyKey,
      newsletter_id: publication.newsletter_id,
      publication_id: publication.id,
      requested_by_email: input.requestedByEmail,
      send_type: input.sendType ?? "preview",
      status: "queued",
      subscriber_id: subscriber.id,
    })
    .select("id, publication_id, email, send_type, status, provider_message_id, requested_by_email, sent_at, error_code, error_message, created_at")
    .single();

  if (sendInsert.error || !sendInsert.data) {
    return { error: sendInsert.error?.message ?? "Unable to record send.", send: null };
  }

  const insertedSend = sendInsert.data as NewsletterSend;
  const resendResult = await sendResendEmail({
    html: email.html,
    idempotencyKey,
    subject: email.subject,
    text: email.text,
    to: recipientEmail,
  });
  const nextStatus = resendResult.sent ? "sent" : resendResult.skippedReason ? "skipped" : "failed";
  const sendUpdate = await supabase
    .from("newsletter_sends")
    .update({
      error_code: resendResult.errorCode ?? resendResult.skippedReason ?? null,
      error_message: resendResult.errorMessage ?? null,
      provider_message_id: resendResult.providerMessageId ?? null,
      sent_at: resendResult.sent ? nowIso() : null,
      status: nextStatus,
    })
    .eq("id", insertedSend.id)
    .select("id, publication_id, email, send_type, status, provider_message_id, requested_by_email, sent_at, error_code, error_message, created_at")
    .single();

  await insertAuditEvent(supabase, {
    actorEmail: input.requestedByEmail,
    actorType: "admin",
    details: {
      publicationId: publication.id,
      recipientEmail,
      status: nextStatus,
    },
    eventType: "newsletter_preview_send",
    subscriberId: subscriber.id,
  });

  if (sendUpdate.error || !sendUpdate.data) {
    return { error: sendUpdate.error?.message ?? "Unable to update send.", send: insertedSend };
  }

  return {
    error: null,
    send: sendUpdate.data as NewsletterSend,
  };
}

export async function loadAdminCommunicationsData(): Promise<AdminCommunicationsData> {
  if (!isSupabaseAdminConfigured()) {
    return {
      deliveryEvents: [],
      error: defaultError,
      issues: [],
      preferences: [],
      publications: [],
      sends: [],
      subscribers: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const [
    subscribersResult,
    preferencesResult,
    issuesResult,
    publicationsResult,
    sendsResult,
    deliveryEventsResult,
  ] = await Promise.all([
    supabase
      .from("communication_subscribers")
      .select("id, email, email_normalized, first_name, last_name, status, source, consented_at, unsubscribed_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("communication_preferences")
      .select("id, subscriber_id, topic, enabled, updated_at")
      .eq("channel", "email"),
    supabase
      .from("newsletters")
      .select("id, slug, title, subject, preview_text, intro_text, body_text, cta_label, cta_url, hero_image_url, status, published_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("newsletter_publications")
      .select("id, newsletter_id, slug, title, subject, preview_text, intro_text, body_text, cta_label, cta_url, hero_image_url, html_snapshot, text_snapshot, status, archive_visible, published_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("newsletter_sends")
      .select("id, publication_id, email, send_type, status, provider_message_id, requested_by_email, sent_at, error_code, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("newsletter_delivery_events")
      .select("id, send_id, provider_event_id, provider_message_id, event_type, recipient_email, received_at, duplicate_count")
      .order("received_at", { ascending: false })
      .limit(30),
  ]);

  const firstError = subscribersResult.error
    ?? preferencesResult.error
    ?? issuesResult.error
    ?? publicationsResult.error
    ?? sendsResult.error
    ?? deliveryEventsResult.error;

  return {
    deliveryEvents: (deliveryEventsResult.data ?? []) as NewsletterDeliveryEvent[],
    error: firstError?.message,
    issues: (issuesResult.data ?? []) as NewsletterIssue[],
    preferences: (preferencesResult.data ?? []) as CommunicationPreference[],
    publications: (publicationsResult.data ?? []) as NewsletterPublication[],
    sends: (sendsResult.data ?? []) as NewsletterSend[],
    subscribers: (subscribersResult.data ?? []) as CommunicationSubscriber[],
  };
}

export async function loadPublishedNewsletterArchive() {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, publications: [] as NewsletterPublication[] };
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("newsletter_publications")
    .select("id, newsletter_id, slug, title, subject, preview_text, intro_text, body_text, cta_label, cta_url, hero_image_url, html_snapshot, text_snapshot, status, archive_visible, published_at, created_at, updated_at")
    .eq("status", "published")
    .eq("archive_visible", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  return {
    error: error?.message ?? null,
    publications: (data ?? []) as NewsletterPublication[],
  };
}

export async function loadPublishedNewsletterBySlug(slug: string) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, publication: null };
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("newsletter_publications")
    .select("id, newsletter_id, slug, title, subject, preview_text, intro_text, body_text, cta_label, cta_url, hero_image_url, html_snapshot, text_snapshot, status, archive_visible, published_at, created_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("archive_visible", true)
    .not("published_at", "is", null)
    .maybeSingle();

  return {
    error: error?.message ?? null,
    publication: data as NewsletterPublication | null,
  };
}

export async function saveNewsletterDraft(input: {
  actorEmail: string;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  heroImageUrl?: string | null;
  introText?: string | null;
  previewText?: string | null;
  slug?: string | null;
  subject: string;
  title: string;
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, issueId: null };
  }

  const title = cleanRequiredText(input.title, 160);
  const subject = cleanRequiredText(input.subject, 180);
  const bodyText = cleanRequiredText(input.bodyText, 12000);

  if (!title || !subject || !bodyText) {
    return { error: "Title, subject, and body are required.", issueId: null };
  }

  const slug = slugifyNewsletterTitle(input.slug || title);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("newsletters")
    .insert({
      body_text: bodyText,
      created_by_email: input.actorEmail,
      cta_label: cleanText(input.ctaLabel, 80),
      cta_url: safeUrl(input.ctaUrl),
      hero_image_url: safeUrl(input.heroImageUrl),
      intro_text: cleanText(input.introText, 700),
      preview_text: cleanText(input.previewText, 220),
      slug,
      status: "draft",
      subject,
      title,
      updated_by_email: input.actorEmail,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Unable to save draft.", issueId: null };
  }

  await insertAuditEvent(supabase, {
    actorEmail: input.actorEmail,
    actorType: "admin",
    details: { issueId: data.id, slug },
    eventType: "newsletter_draft_created",
  });

  return { error: null, issueId: data.id as string };
}

export async function publishNewsletterIssue(input: {
  actorEmail: string;
  archiveVisible: boolean;
  issueId: string;
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError, publicationId: null };
  }

  const supabase = createSupabaseAdminClient();
  const { data: issueRow, error: issueError } = await supabase
    .from("newsletters")
    .select("id, slug, title, subject, preview_text, intro_text, body_text, cta_label, cta_url, hero_image_url, status, published_at, created_at, updated_at")
    .eq("id", input.issueId)
    .maybeSingle();

  if (issueError || !issueRow) {
    return { error: issueError?.message ?? "Newsletter issue not found.", publicationId: null };
  }

  const issue = issueRow as NewsletterIssue;
  const publishedAt = nowIso();
  const publicationSnapshot: NewsletterPublication = {
    archive_visible: input.archiveVisible,
    body_text: issue.body_text,
    created_at: issue.created_at,
    cta_label: issue.cta_label,
    cta_url: issue.cta_url,
    hero_image_url: issue.hero_image_url,
    html_snapshot: null,
    id: "",
    intro_text: issue.intro_text,
    newsletter_id: issue.id,
    preview_text: issue.preview_text,
    published_at: input.archiveVisible ? publishedAt : null,
    slug: issue.slug,
    status: input.archiveVisible ? "published" : "draft",
    subject: issue.subject,
    text_snapshot: null,
    title: issue.title,
    updated_at: issue.updated_at,
  };
  const placeholderSubscriber = {
    email: "preview@usamissionaries.org",
    first_name: "Friend",
    last_name: null,
  };
  const rendered = buildNewsletterEmail(publicationSnapshot, placeholderSubscriber, {
    preferencesUrl: new URL("/preferences", configuredSiteUrl()).toString(),
    unsubscribeUrl: new URL("/preferences", configuredSiteUrl()).toString(),
  });
  const publicationWrite = await supabase
    .from("newsletter_publications")
    .upsert({
      archive_visible: input.archiveVisible,
      body_text: issue.body_text,
      cta_label: issue.cta_label,
      cta_url: issue.cta_url,
      hero_image_url: issue.hero_image_url,
      html_snapshot: rendered.html,
      intro_text: issue.intro_text,
      newsletter_id: issue.id,
      preview_text: issue.preview_text,
      published_at: input.archiveVisible ? publishedAt : null,
      slug: issue.slug,
      status: input.archiveVisible ? "published" : "draft",
      subject: issue.subject,
      text_snapshot: rendered.text,
      title: issue.title,
      updated_by_email: input.actorEmail,
    }, { onConflict: "newsletter_id" })
    .select("id")
    .single();

  if (publicationWrite.error || !publicationWrite.data) {
    return { error: publicationWrite.error?.message ?? "Unable to publish issue.", publicationId: null };
  }

  const issueUpdate = await supabase
    .from("newsletters")
    .update({
      published_at: input.archiveVisible ? publishedAt : null,
      status: input.archiveVisible ? "published" : "in_review",
      updated_by_email: input.actorEmail,
    })
    .eq("id", issue.id);

  if (issueUpdate.error) {
    return { error: issueUpdate.error.message, publicationId: null };
  }

  await insertAuditEvent(supabase, {
    actorEmail: input.actorEmail,
    actorType: "admin",
    details: {
      archiveVisible: input.archiveVisible,
      issueId: issue.id,
      publicationId: publicationWrite.data.id,
    },
    eventType: input.archiveVisible ? "newsletter_published" : "newsletter_publication_saved",
  });

  return { error: null, publicationId: publicationWrite.data.id as string };
}

export async function setSubscriberStatus(input: {
  actorEmail: string;
  status: "subscribed" | "suppressed" | "unsubscribed";
  subscriberId: string;
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError };
  }

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const enabled = input.status === "subscribed";
  const subscriberWrite = await supabase
    .from("communication_subscribers")
    .update({
      resubscribed_at: enabled ? timestamp : undefined,
      status: input.status,
      unsubscribed_at: enabled ? null : timestamp,
      updated_by_email: input.actorEmail,
    })
    .eq("id", input.subscriberId);

  if (subscriberWrite.error) {
    return { error: subscriberWrite.error.message };
  }

  const preferencesWrite = input.status === "suppressed"
    ? await upsertNewsletterPreferences(supabase, input.subscriberId, [], "admin_suppressed")
    : await upsertNewsletterPreferences(supabase, input.subscriberId, enabled ? ["newsletter"] : [], "admin_status");

  if (preferencesWrite.error) {
    return { error: preferencesWrite.error.message };
  }

  await insertAuditEvent(supabase, {
    actorEmail: input.actorEmail,
    actorType: "admin",
    details: { status: input.status },
    eventType: "subscriber_status_update",
    subscriberId: input.subscriberId,
  });

  return { error: null };
}

function statusForResendEvent(eventType: string): NewsletterSend["status"] | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    default:
      return null;
  }
}

function sendStatusRank(status: NewsletterSend["status"] | null | undefined) {
  return {
    bounced: 90,
    clicked: 60,
    complained: 95,
    delivered: 30,
    failed: 80,
    opened: 50,
    queued: 0,
    sent: 20,
    skipped: 10,
  }[status ?? "queued"] ?? 0;
}

function firstRecipient(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? normalizeCommunicationEmail(value[0]) : null;
  }

  return typeof value === "string" ? normalizeCommunicationEmail(value) : null;
}

export async function recordResendWebhookEvent(input: {
  event: Record<string, unknown>;
  providerEventId: string;
}) {
  if (!isSupabaseAdminConfigured()) {
    return { error: defaultError };
  }

  const supabase = createSupabaseAdminClient();
  const eventType = typeof input.event.type === "string" ? input.event.type : "unknown";
  const data = input.event.data && typeof input.event.data === "object" ? input.event.data as Record<string, unknown> : {};
  const providerMessageId = typeof data.email_id === "string"
    ? data.email_id
    : typeof data.id === "string"
      ? data.id
      : typeof data.message_id === "string"
        ? data.message_id
        : null;
  const recipientEmail = firstRecipient(data.to);
  const sendResult = providerMessageId
    ? await supabase
      .from("newsletter_sends")
      .select("id, subscriber_id, status")
      .eq("provider", "resend")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle()
    : { data: null, error: null };
  const send = sendResult.data as { id: string; status: NewsletterSend["status"] | null; subscriber_id: string | null } | null;
  const insert = await supabase
    .from("newsletter_delivery_events")
    .insert({
      event_type: eventType,
      payload: input.event,
      provider: "resend",
      provider_event_id: input.providerEventId,
      provider_message_id: providerMessageId,
      recipient_email: recipientEmail,
      send_id: send?.id ?? null,
    });

  if (insert.error) {
    if (insert.error.code === "23505") {
      const existing = await supabase
        .from("newsletter_delivery_events")
        .select("id, duplicate_count")
        .eq("provider", "resend")
        .eq("provider_event_id", input.providerEventId)
        .maybeSingle();

      if (!existing.error && existing.data) {
        await supabase
          .from("newsletter_delivery_events")
          .update({
            duplicate_count: Number(existing.data.duplicate_count ?? 0) + 1,
            last_seen_at: nowIso(),
          })
          .eq("id", existing.data.id);
      }
    } else {
      return { error: insert.error.message };
    }
  }

  const nextSendStatus = statusForResendEvent(eventType);

  if (send?.id && nextSendStatus && sendStatusRank(nextSendStatus) >= sendStatusRank(send.status)) {
    await supabase
      .from("newsletter_sends")
      .update({ status: nextSendStatus })
      .eq("id", send.id);
  }

  await insertAuditEvent(supabase, {
    actorType: "webhook",
    details: {
      eventType,
      providerEventId: input.providerEventId,
      providerMessageId,
    },
    eventType: "resend_webhook_recorded",
    subscriberId: send?.subscriber_id ?? null,
  });

  return { error: null };
}

export function defaultPreferenceEnabled(preferences: readonly CommunicationPreference[], topic: CommunicationPreferenceTopic) {
  return preferenceEnabled(preferences, topic, topic === "newsletter");
}
