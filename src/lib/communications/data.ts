import "server-only";

import { communicationTopics, normalizeEmail } from "./config";
import { createManageToken, hashManageToken } from "./tokens";
import { normalizeNewsletterSections } from "./newsletter-template";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import type { CommunicationNewsletter, CommunicationPreference, CommunicationSubscriber } from "./types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type NewsletterRow = Omit<CommunicationNewsletter, "sections"> & {
  sections: unknown;
};

type SubscriberRow = CommunicationSubscriber & {
  created_at?: string;
  subscribed_at?: string | null;
  unsubscribed_at?: string | null;
  updated_at?: string;
};

export type SubscriberWithPreferences = CommunicationSubscriber & {
  preferences: CommunicationPreference[];
};

export function mapNewsletterRow(row: NewsletterRow): CommunicationNewsletter {
  return {
    body_markdown: row.body_markdown ?? "",
    cta_label: row.cta_label,
    cta_url: row.cta_url,
    id: row.id,
    preheader: row.preheader,
    published_at: row.published_at,
    sections: normalizeNewsletterSections(row.sections),
    slug: row.slug,
    status: row.status,
    subject: row.subject,
    summary: row.summary,
    title: row.title,
  };
}

export async function getPublishedNewsletters() {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("communication_newsletters")
    .select("id, slug, title, subject, preheader, summary, body_markdown, sections, cta_label, cta_url, status, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as NewsletterRow[]).map(mapNewsletterRow);
}

export async function getPublishedNewsletterBySlug(slug: string) {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("communication_newsletters")
    .select("id, slug, title, subject, preheader, summary, body_markdown, sections, cta_label, cta_url, status, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapNewsletterRow(data as NewsletterRow);
}

export async function createSubscriberPreferenceToken(supabase: SupabaseAdminClient, subscriberId: string) {
  const token = createManageToken();
  const tokenHash = hashManageToken(token);

  const { error } = await supabase
    .from("communication_subscriber_tokens")
    .insert({
      subscriber_id: subscriberId,
      token_hash: tokenHash,
    });

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("communication_subscribers")
    .update({
      manage_token_hash: tokenHash,
      manage_token_issued_at: new Date().toISOString(),
    })
    .eq("id", subscriberId);

  return token;
}

export async function recordSubscriberEvent(
  supabase: SupabaseAdminClient,
  input: {
    actorEmail?: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
    source: "admin" | "preference_center" | "seed" | "system" | "unsubscribe" | "webhook" | "website";
    subscriberId?: string | null;
  },
) {
  await supabase
    .from("communication_subscriber_events")
    .insert({
      actor_email: input.actorEmail ?? null,
      event_type: input.eventType,
      payload: input.payload ?? {},
      source: input.source,
      subscriber_id: input.subscriberId ?? null,
    });
}

export async function getSubscriberWithPreferencesById(
  supabase: SupabaseAdminClient,
  subscriberId: string,
): Promise<SubscriberWithPreferences | null> {
  const [{ data: subscriber, error: subscriberError }, { data: preferences, error: preferencesError }] = await Promise.all([
    supabase
      .from("communication_subscribers")
      .select("id, email, first_name, last_name, status")
      .eq("id", subscriberId)
      .maybeSingle(),
    supabase
      .from("communication_preferences")
      .select("topic, enabled")
      .eq("subscriber_id", subscriberId)
      .eq("channel", "email"),
  ]);

  if (subscriberError || preferencesError || !subscriber) {
    return null;
  }

  return {
    ...(subscriber as CommunicationSubscriber),
    preferences: ((preferences ?? []) as CommunicationPreference[]),
  };
}

export async function getSubscriberByPreferenceToken(token: string) {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const tokenHash = hashManageToken(token);
  const { data: tokenRow, error: tokenError } = await supabase
    .from("communication_subscriber_tokens")
    .select("subscriber_id, expires_at, status")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError || !tokenRow || tokenRow.status !== "active") {
    return null;
  }

  if (typeof tokenRow.expires_at === "string" && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    await supabase
      .from("communication_subscriber_tokens")
      .update({ status: "expired" })
      .eq("token_hash", tokenHash);

    return null;
  }

  return getSubscriberWithPreferencesById(supabase, String(tokenRow.subscriber_id));
}

export async function getOrCreateSubscriber(
  supabase: SupabaseAdminClient,
  input: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    source: "admin" | "seed" | "website";
  },
) {
  const email = normalizeEmail(input.email);
  const { data: existing, error: existingError } = await supabase
    .from("communication_subscribers")
    .select("id, email, first_name, last_name, status")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const subscriber = existing as CommunicationSubscriber;
    const wasUnsubscribed = subscriber.status === "unsubscribed";
    const { data: updated, error: updateError } = await supabase
      .from("communication_subscribers")
      .update({
        confirmed_at: new Date().toISOString(),
        first_name: input.firstName || subscriber.first_name,
        last_name: input.lastName || subscriber.last_name,
        source: input.source,
        status: "subscribed",
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      })
      .eq("id", subscriber.id)
      .select("id, email, first_name, last_name, status")
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Unable to update subscriber.");
    }

    await recordSubscriberEvent(supabase, {
      eventType: wasUnsubscribed ? "resubscribed" : "subscribe_idempotent",
      payload: { email },
      source: input.source,
      subscriberId: subscriber.id,
    });

    return updated as CommunicationSubscriber;
  }

  const { data: created, error: createError } = await supabase
    .from("communication_subscribers")
    .insert({
      confirmed_at: new Date().toISOString(),
      email,
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      source: input.source,
      status: "subscribed",
      subscribed_at: new Date().toISOString(),
    })
    .select("id, email, first_name, last_name, status")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Unable to create subscriber.");
  }

  await recordSubscriberEvent(supabase, {
    eventType: "subscribed",
    payload: { email },
    source: input.source,
    subscriberId: String(created.id),
  });

  return created as CommunicationSubscriber;
}

export async function updateSubscriberPreferences(
  supabase: SupabaseAdminClient,
  input: {
    actorEmail?: string | null;
    selectedTopics: readonly string[];
    source: "admin" | "preference_center" | "unsubscribe" | "website";
    subscriberId: string;
  },
) {
  const selectedTopics = new Set(input.selectedTopics);
  const now = new Date().toISOString();
  const rows = communicationTopics.map((topic) => {
    const enabled = selectedTopics.has(topic.value);

    return {
      channel: "email",
      consented_at: enabled ? now : null,
      enabled,
      subscriber_id: input.subscriberId,
      topic: topic.value,
      unsubscribed_at: enabled ? null : now,
    };
  });
  const { error } = await supabase
    .from("communication_preferences")
    .upsert(rows, { onConflict: "subscriber_id,channel,topic" });

  if (error) {
    throw new Error(error.message);
  }

  await recordSubscriberEvent(supabase, {
    actorEmail: input.actorEmail,
    eventType: "preferences_updated",
    payload: { selected_topics: [...selectedTopics] },
    source: input.source,
    subscriberId: input.subscriberId,
  });
}

export async function unsubscribeSubscriber(
  supabase: SupabaseAdminClient,
  input: {
    source: "preference_center" | "unsubscribe" | "webhook";
    subscriberId: string;
  },
) {
  const now = new Date().toISOString();
  const { data: subscriber } = await supabase
    .from("communication_subscribers")
    .select("status")
    .eq("id", input.subscriberId)
    .maybeSingle();
  const alreadyUnsubscribed = (subscriber as SubscriberRow | null)?.status === "unsubscribed";

  const { error: subscriberError } = await supabase
    .from("communication_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: now,
    })
    .eq("id", input.subscriberId);

  if (subscriberError) {
    throw new Error(subscriberError.message);
  }

  const { error: preferencesError } = await supabase
    .from("communication_preferences")
    .update({
      enabled: false,
      unsubscribed_at: now,
    })
    .eq("subscriber_id", input.subscriberId)
    .eq("channel", "email");

  if (preferencesError) {
    throw new Error(preferencesError.message);
  }

  await recordSubscriberEvent(supabase, {
    eventType: alreadyUnsubscribed ? "unsubscribe_idempotent" : "unsubscribed",
    payload: { already_unsubscribed: alreadyUnsubscribed },
    source: input.source,
    subscriberId: input.subscriberId,
  });
}
