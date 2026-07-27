import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminBadge, AdminMetricCard, adminFont } from "../_components/AdminUI";
import { AdminShell } from "../_components/AdminShell";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  communicationPreferenceTopics,
  formatCommunicationDate,
  loadAdminCommunicationsData,
  phase1NewsletterRecipients,
  type CommunicationPreference,
  type CommunicationSubscriber,
  type NewsletterIssue,
  type NewsletterPublication,
} from "@/src/lib/communications/newsletter";
import {
  createNewsletterDraft,
  publishNewsletterDraft,
  sendNewsletterPreviewAction,
  updateSubscriberStatus,
} from "./actions";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Communications | Command Center",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  recipient?: string;
  saved?: string;
  sent?: string;
};

const inputClassName = "mt-2 min-h-10 w-full rounded-md border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
const textareaClassName = "mt-2 min-h-[120px] w-full rounded-md border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
const labelClassName = "text-[10px] uppercase tracking-[0.16em] text-stone-400";
const primaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-md border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-[#F5B942]";
const secondaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-md border border-stone-700 px-4 text-[11px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]";
const dangerButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-md border border-red-500/35 px-4 text-[11px] uppercase tracking-[0.14em] text-red-200 transition-colors hover:bg-red-950/25";

function statusTone(status: string): "amber" | "blue" | "green" | "muted" | "red" {
  if (["subscribed", "published", "sent", "delivered", "opened", "clicked"].includes(status)) {
    return "green";
  }

  if (["draft", "queued", "in_review"].includes(status)) {
    return "amber";
  }

  if (["failed", "bounced", "complained", "suppressed"].includes(status)) {
    return "red";
  }

  if (status === "skipped") {
    return "blue";
  }

  return "muted";
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pageMessage(params: SearchParams) {
  if (params.error) {
    const message = params.error === "recipient_not_allowed"
      ? "Phase 1 sends are restricted to Ryan and Brooke."
      : decodeURIComponent(params.error);

    return { text: message, tone: "red" as const };
  }

  if (params.sent) {
    return {
      text: `Preview ${params.sent}${params.recipient ? ` for ${params.recipient}` : ""}.`,
      tone: params.sent === "failed" ? "red" as const : "green" as const,
    };
  }

  if (params.saved) {
    return {
      text: `${titleCase(params.saved)} saved.`,
      tone: "green" as const,
    };
  }

  return null;
}

function Message({ text, tone }: { text: string; tone: "green" | "red" }) {
  const className = tone === "green"
    ? "border-emerald-500/25 bg-emerald-950/30 text-emerald-200"
    : "border-red-500/35 bg-red-950/25 text-red-200";

  return <div className={`mb-5 border p-4 text-sm leading-7 ${className}`}>{text}</div>;
}

function preferenceSummary(
  subscriber: CommunicationSubscriber,
  preferences: readonly CommunicationPreference[],
) {
  const subscriberPreferences = preferences.filter((preference) => preference.subscriber_id === subscriber.id);
  const enabled = communicationPreferenceTopics
    .filter((topic) => subscriberPreferences.some((preference) => preference.topic === topic.value && preference.enabled))
    .map((topic) => topic.label);

  return enabled.length ? enabled.join(", ") : "No email topics";
}

function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-4 md:p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InlineEmpty({ children }: { children: string }) {
  return <p className="text-sm leading-7 text-stone-500">{children}</p>;
}

function SubscriberRow({
  preferences,
  subscriber,
}: {
  preferences: readonly CommunicationPreference[];
  subscriber: CommunicationSubscriber;
}) {
  const name = [subscriber.first_name, subscriber.last_name].filter(Boolean).join(" ") || "Unnamed";

  return (
    <article className="grid gap-4 border-t border-stone-800 py-4 first:border-t-0 first:pt-0 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-stone-100">{name}</p>
          <AdminBadge tone={statusTone(subscriber.status)}>{titleCase(subscriber.status)}</AdminBadge>
        </div>
        <p className="mt-1 break-words text-sm text-stone-400">{subscriber.email}</p>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          {preferenceSummary(subscriber, preferences)} · {formatCommunicationDate(subscriber.consented_at)}
        </p>
      </div>
      <form action={updateSubscriberStatus} className="flex flex-wrap gap-2">
        <input name="subscriber_id" type="hidden" value={subscriber.id} />
        <button className={secondaryButtonClassName} name="status" type="submit" value="subscribed">Resubscribe</button>
        <button className={secondaryButtonClassName} name="status" type="submit" value="unsubscribed">Unsubscribe</button>
        <button className={dangerButtonClassName} name="status" type="submit" value="suppressed">Suppress</button>
      </form>
    </article>
  );
}

function PreviewSendControls({ publication }: { publication: NewsletterPublication }) {
  return (
    <div className="flex flex-wrap gap-2">
      {phase1NewsletterRecipients.map((recipient) => (
        <form action={sendNewsletterPreviewAction} key={recipient.email}>
          <input name="publication_id" type="hidden" value={publication.id} />
          <input name="recipient_email" type="hidden" value={recipient.email} />
          <button className={secondaryButtonClassName} type="submit">
            Preview {recipient.name.split(" ")[0]}
          </button>
        </form>
      ))}
    </div>
  );
}

function PublicationRow({
  issue,
  publication,
}: {
  issue: NewsletterIssue | undefined;
  publication: NewsletterPublication;
}) {
  return (
    <article className="grid gap-4 border-t border-stone-800 py-4 first:border-t-0 first:pt-0 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-stone-100">{publication.title}</p>
          <AdminBadge tone={statusTone(publication.status)}>{titleCase(publication.status)}</AdminBadge>
          {publication.archive_visible ? <AdminBadge tone="green">Archive</AdminBadge> : <AdminBadge>Private</AdminBadge>}
        </div>
        <p className="mt-1 text-sm text-stone-400">{publication.subject}</p>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          /newsletter/{publication.slug} · {formatCommunicationDate(publication.published_at)}
        </p>
      </div>
      <div className="flex flex-col gap-2 lg:items-end">
        <PreviewSendControls publication={publication} />
        {issue ? (
          <form action={publishNewsletterDraft} className="flex flex-wrap gap-2 lg:justify-end">
            <input name="issue_id" type="hidden" value={issue.id} />
            <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-700 px-3 text-xs text-stone-300">
              <input defaultChecked={publication.archive_visible} name="archive_visible" type="checkbox" />
              Public archive
            </label>
            <button className={primaryButtonClassName} type="submit">Save Publication</button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function DraftForm() {
  return (
    <form action={createNewsletterDraft} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="title" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Title</label>
          <input className={inputClassName} id="title" name="title" required />
        </div>
        <div>
          <label className={labelClassName} htmlFor="slug" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Slug</label>
          <input className={inputClassName} id="slug" name="slug" placeholder="optional-auto-generated" />
        </div>
      </div>
      <div>
        <label className={labelClassName} htmlFor="subject" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Subject</label>
        <input className={inputClassName} id="subject" name="subject" required />
      </div>
      <div>
        <label className={labelClassName} htmlFor="preview_text" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Preview Text</label>
        <input className={inputClassName} id="preview_text" name="preview_text" />
      </div>
      <div>
        <label className={labelClassName} htmlFor="intro_text" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Intro</label>
        <textarea className={textareaClassName} id="intro_text" name="intro_text" />
      </div>
      <div>
        <label className={labelClassName} htmlFor="body_text" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Body</label>
        <textarea className={`${textareaClassName} min-h-[170px]`} id="body_text" name="body_text" required />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClassName} htmlFor="cta_label" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>CTA Label</label>
          <input className={inputClassName} id="cta_label" name="cta_label" />
        </div>
        <div className="md:col-span-2">
          <label className={labelClassName} htmlFor="cta_url" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>CTA URL</label>
          <input className={inputClassName} id="cta_url" name="cta_url" type="url" />
        </div>
      </div>
      <div>
        <label className={labelClassName} htmlFor="hero_image_url" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Hero Image URL</label>
        <input className={inputClassName} id="hero_image_url" name="hero_image_url" type="url" />
      </div>
      <div>
        <button className={primaryButtonClassName} type="submit">Create Draft</button>
      </div>
    </form>
  );
}

export default async function CommunicationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const [params, data] = await Promise.all([searchParams, loadAdminCommunicationsData()]);
  const message = pageMessage(params);
  const subscribedCount = data.subscribers.filter((subscriber) => subscriber.status === "subscribed").length;
  const publicArchiveCount = data.publications.filter((publication) => publication.status === "published" && publication.archive_visible).length;
  const sentCount = data.sends.filter((send) => ["sent", "delivered", "opened", "clicked"].includes(send.status)).length;
  const latestPublication = data.publications[0];

  return (
    <AdminShell
      active="communications"
      description="Subscribers, newsletter archive, Resend previews, and delivery events."
      title="Communications"
    >
      {message ? <Message text={message.text} tone={message.tone} /> : null}
      {data.error ? <Message text={data.error} tone="red" /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard label="Subscribers" value={subscribedCount} />
        <AdminMetricCard label="Public Issues" value={publicArchiveCount} />
        <AdminMetricCard label="Preview Sends" value={sentCount} />
        <AdminMetricCard label="Events" value={data.deliveryEvents.length} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <Section title="Publications">
            {data.publications.length ? (
              <div>
                {data.publications.map((publication) => (
                  <PublicationRow
                    issue={data.issues.find((issue) => issue.id === publication.newsletter_id)}
                    key={publication.id}
                    publication={publication}
                  />
                ))}
              </div>
            ) : (
              <InlineEmpty>Create a draft to prepare the first publication.</InlineEmpty>
            )}
          </Section>

          <Section title="Subscribers">
            {data.subscribers.length ? (
              <div>
                {data.subscribers.map((subscriber) => (
                  <SubscriberRow key={subscriber.id} preferences={data.preferences} subscriber={subscriber} />
                ))}
              </div>
            ) : (
              <InlineEmpty>No subscribers have been created yet.</InlineEmpty>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="New Draft">
            <DraftForm />
          </Section>

          <Section title="Phase 1 Preview">
            <div className="space-y-3 text-sm leading-7 text-stone-400">
              <p>
                Preview sends are locked to Ryan and Brooke. The database also rejects any other email.
              </p>
              {latestPublication ? (
                <PreviewSendControls publication={latestPublication} />
              ) : null}
            </div>
          </Section>

          <Section title="Recent Sends">
            {data.sends.length ? (
              <div>
                {data.sends.map((send) => (
                  <div className="border-t border-stone-800 py-3 first:border-t-0 first:pt-0" key={send.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-stone-100">{send.email}</p>
                      <AdminBadge tone={statusTone(send.status)}>{titleCase(send.status)}</AdminBadge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      {formatCommunicationDate(send.created_at)} · {send.provider_message_id ?? send.error_code ?? "No provider id"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <InlineEmpty>No preview sends recorded yet.</InlineEmpty>
            )}
          </Section>

          <Section title="Delivery Events">
            {data.deliveryEvents.length ? (
              <div>
                {data.deliveryEvents.map((event) => (
                  <div className="border-t border-stone-800 py-3 first:border-t-0 first:pt-0" key={event.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-stone-100">{event.event_type}</p>
                      {event.duplicate_count > 0 ? <AdminBadge tone="amber">{event.duplicate_count} duplicates</AdminBadge> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      {event.recipient_email ?? "No recipient"} · {formatCommunicationDate(event.received_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <InlineEmpty>Resend delivery events will appear after webhooks are configured.</InlineEmpty>
            )}
          </Section>

          <Section title="Public Links">
            <div className="grid gap-2 text-sm">
              <Link className="text-[#D4A63D] hover:text-stone-100" href="/newsletter">/newsletter</Link>
              <Link className="text-[#D4A63D] hover:text-stone-100" href="/subscribe">/subscribe</Link>
              <Link className="text-[#D4A63D] hover:text-stone-100" href="/preferences">/preferences</Link>
            </div>
          </Section>
        </div>
      </div>
    </AdminShell>
  );
}
