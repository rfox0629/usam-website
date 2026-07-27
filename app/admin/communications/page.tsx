import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge, AdminEmptyState, AdminMetricCard, adminFont } from "../_components/AdminUI";
import { AdminShell } from "../_components/AdminShell";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { phase1NewsletterRecipients, topicLabel } from "@/src/lib/communications/config";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { sendNewsletterPreview } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Communications | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

type SearchParams = {
  error?: string;
  recipient?: string;
  sent?: string;
};

type SubscriberRow = {
  created_at: string;
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  status: string;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
};

type PreferenceRow = {
  enabled: boolean;
  subscriber_id: string;
  topic: string;
};

type NewsletterRow = {
  id: string;
  published_at: string | null;
  slug: string;
  status: string;
  subject: string;
  summary: string | null;
  title: string;
};

type SendRow = {
  created_at: string;
  error_message: string | null;
  id: string;
  newsletter_id: string | null;
  recipient_email: string;
  resend_email_id: string | null;
  send_type: string;
  status: string;
};

type DeliveryEventRow = {
  id: string;
};

const errorMessages: Record<string, string> = {
  config: "Supabase admin environment variables are not configured.",
  missing: "Choose a newsletter and recipient.",
  newsletter: "Newsletter could not be found.",
  recipient: "Phase 1 previews can only go to Ryan Fox or Brooke Fox.",
  unauthorized: "Admin or editor access is required.",
};

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function fullName(row: SubscriberRow) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email;
}

function badgeTone(status: string) {
  if (["sent", "subscribed", "delivered", "published"].includes(status)) {
    return "green" as const;
  }

  if (["failed", "bounced", "complained", "unsubscribed"].includes(status)) {
    return "red" as const;
  }

  if (["skipped", "draft", "pending"].includes(status)) {
    return "amber" as const;
  }

  return "muted" as const;
}

async function getCommunicationsData() {
  if (!isSupabaseAdminConfigured()) {
    return {
      deliveryEvents: [] as DeliveryEventRow[],
      error: "config",
      newsletters: [] as NewsletterRow[],
      preferences: [] as PreferenceRow[],
      sends: [] as SendRow[],
      subscribers: [] as SubscriberRow[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const [subscribersResult, preferencesResult, newslettersResult, sendsResult, deliveryEventsResult] = await Promise.all([
    supabase
      .from("communication_subscribers")
      .select("id, email, first_name, last_name, status, subscribed_at, unsubscribed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("communication_preferences")
      .select("subscriber_id, topic, enabled"),
    supabase
      .from("communication_newsletters")
      .select("id, slug, title, subject, summary, status, published_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("communication_sends")
      .select("id, newsletter_id, recipient_email, send_type, status, resend_email_id, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("communication_delivery_events")
      .select("id")
      .limit(1000),
  ]);

  return {
    deliveryEvents: (deliveryEventsResult.data ?? []) as DeliveryEventRow[],
    error: subscribersResult.error || preferencesResult.error || newslettersResult.error || sendsResult.error ? "query" : null,
    newsletters: (newslettersResult.data ?? []) as NewsletterRow[],
    preferences: (preferencesResult.data ?? []) as PreferenceRow[],
    sends: (sendsResult.data ?? []) as SendRow[],
    subscribers: (subscribersResult.data ?? []) as SubscriberRow[],
  };
}

export default async function CommunicationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [query, authorization, data] = await Promise.all([
    searchParams,
    getAdminAuthorization(),
    getCommunicationsData(),
  ]);
  const canSendPreview = canEditAdminContent(authorization);
  const preferencesBySubscriber = data.preferences.reduce<Record<string, PreferenceRow[]>>((current, preference) => {
    current[preference.subscriber_id] = [...(current[preference.subscriber_id] ?? []), preference];

    return current;
  }, {});
  const newsletterById = new Map(data.newsletters.map((newsletter) => [newsletter.id, newsletter]));
  const subscribedCount = data.subscribers.filter((subscriber) => subscriber.status === "subscribed").length;
  const sentMessage = query.sent
    ? `Preview ${query.sent} for ${query.recipient ?? "recipient"}.`
    : null;
  const errorMessage = query.error
    ? errorMessages[query.error] ?? decodeURIComponent(query.error)
    : data.error === "config"
      ? errorMessages.config
      : data.error
        ? "Communications data could not be loaded."
        : null;

  return (
    <AdminShell
      active="communications"
      description="Newsletter subscribers, archive issues, preview sends, and Resend delivery events."
      title="Communications"
    >
      <div className="space-y-6">
        {sentMessage ? (
          <div className="border border-green-500/25 bg-green-950/30 p-4 text-sm text-green-200">
            {sentMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="border border-red-500/35 bg-red-950/25 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <AdminMetricCard label="Subscribers" value={data.subscribers.length} />
          <AdminMetricCard label="Subscribed" value={subscribedCount} />
          <AdminMetricCard label="Newsletters" value={data.newsletters.length} />
          <AdminMetricCard label="Events" value={data.deliveryEvents.length} />
        </div>

        <section className="border border-stone-800/75 bg-[#080808]/85 p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Preview Send
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-100">
                Phase 1 test recipients only
              </h2>
            </div>
            <Link className="text-sm text-stone-400 underline-offset-4 hover:text-[#D4A63D] hover:underline" href="/newsletter">
              Public archive
            </Link>
          </div>

          {data.newsletters.length > 0 ? (
            <form action={sendNewsletterPreview} className="mt-5 grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-end">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Newsletter
                <select className="mt-2 min-h-11 w-full rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="newsletter_id" required>
                  {data.newsletters.map((newsletter) => (
                    <option key={newsletter.id} value={newsletter.id}>
                      {newsletter.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Recipient
                <select className="mt-2 min-h-11 w-full rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="recipient_email" required>
                  {phase1NewsletterRecipients.map((recipient) => (
                    <option key={recipient.email} value={recipient.email}>
                      {recipient.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#D4A63D] px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500"
                disabled={!canSendPreview}
                type="submit"
              >
                Send Preview
              </button>
            </form>
          ) : (
            <div className="mt-5">
              <AdminEmptyState description="No newsletter issues are available." title="No Issues" />
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-stone-800/75 bg-[#080808]/85 p-4 md:p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-100">Subscribers</h2>
              <AdminBadge tone="muted">{data.subscribers.length}</AdminBadge>
            </div>
            <div className="mt-4 divide-y divide-stone-800/75">
              {data.subscribers.length > 0 ? data.subscribers.map((subscriber) => {
                const preferences = preferencesBySubscriber[subscriber.id] ?? [];
                const enabledPreferences = preferences.filter((preference) => preference.enabled);

                return (
                  <div key={subscriber.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-stone-100">{fullName(subscriber)}</p>
                        <AdminBadge tone={badgeTone(subscriber.status)}>{subscriber.status}</AdminBadge>
                      </div>
                      <p className="mt-1 truncate text-xs text-stone-500">{subscriber.email}</p>
                      <p className="mt-2 text-xs text-stone-500">
                        {enabledPreferences.length > 0
                          ? enabledPreferences.map((preference) => topicLabel(preference.topic)).join(" / ")
                          : "No active topics"}
                      </p>
                    </div>
                    <p className="text-xs text-stone-500 md:text-right">
                      {formatDate(subscriber.subscribed_at ?? subscriber.created_at)}
                    </p>
                  </div>
                );
              }) : (
                <div className="py-6 text-sm text-stone-500">No subscribers.</div>
              )}
            </div>
          </div>

          <div className="border border-stone-800/75 bg-[#080808]/85 p-4 md:p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-100">Issues</h2>
              <AdminBadge tone="muted">{data.newsletters.length}</AdminBadge>
            </div>
            <div className="mt-4 divide-y divide-stone-800/75">
              {data.newsletters.length > 0 ? data.newsletters.map((newsletter) => (
                <div key={newsletter.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-stone-100">{newsletter.title}</p>
                    <AdminBadge tone={badgeTone(newsletter.status)}>{newsletter.status}</AdminBadge>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{newsletter.subject}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-stone-500">{formatDate(newsletter.published_at)}</span>
                    {newsletter.status === "published" ? (
                      <Link className="text-[#D4A63D] underline-offset-4 hover:underline" href={`/newsletter/${newsletter.slug}`}>
                        View
                      </Link>
                    ) : null}
                  </div>
                </div>
              )) : (
                <div className="py-6 text-sm text-stone-500">No issues.</div>
              )}
            </div>
          </div>
        </section>

        <section className="border border-stone-800/75 bg-[#080808]/85 p-4 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-stone-100">Recent Sends</h2>
            <AdminBadge tone="muted">{data.sends.length}</AdminBadge>
          </div>
          <div className="mt-4 divide-y divide-stone-800/75">
            {data.sends.length > 0 ? data.sends.map((send) => {
              const newsletter = send.newsletter_id ? newsletterById.get(send.newsletter_id) : null;

              return (
                <div key={send.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-stone-100">{newsletter?.title ?? "Newsletter"}</p>
                      <AdminBadge tone={badgeTone(send.status)}>{send.status}</AdminBadge>
                      <AdminBadge tone="muted">{send.send_type}</AdminBadge>
                    </div>
                    <p className="mt-1 truncate text-xs text-stone-500">{send.recipient_email}</p>
                    {send.error_message ? (
                      <p className="mt-2 text-xs leading-5 text-red-200">{send.error_message}</p>
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-500 md:text-right">{formatDate(send.created_at)}</p>
                </div>
              );
            }) : (
              <div className="py-6 text-sm text-stone-500">No sends yet.</div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
