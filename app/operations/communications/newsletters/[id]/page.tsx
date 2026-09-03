import { notFound } from "next/navigation";
import { canAccessOperationsModule, canManageOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { renderNewsletterEmail } from "@/src/lib/communications/newsletter-template";
import {
  communicationsSenderStatus,
  evaluateSendReadiness,
  loadAudienceSummary,
  loadNewsletterDetail,
  loadNewsletterSendSummary,
  loadTestSends,
} from "@/src/lib/operations/communications";
import { OperationsAccessDenied, OperationsShell } from "../../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  operationsFont,
  type OperationsTone,
} from "../../../_components/OperationsUI";
import { CommunicationsSubnav } from "../../_components/CommunicationsSubnav";
import {
  approveNewsletterAction,
  markNewsletterReadyAction,
  sendNewsletterTestAction,
  sendNewsletterToAudienceAction,
} from "./actions";

export const dynamic = "force-dynamic";

function statusTone(status: string): OperationsTone {
  if (status === "sent") {
    return "green";
  }

  if (status === "approved" || status === "scheduled") {
    return "blue";
  }

  if (status === "cancelled") {
    return "red";
  }

  return "amber";
}

export default async function OperationsNewsletterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ approved?: string; error?: string; saved?: string; tested?: string; view?: string }>;
}) {
  const [{ id }, query, authorization] = await Promise.all([
    params,
    searchParams,
    getOperationsAuthorization(),
  ]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "communications")) {
    return <OperationsAccessDenied active="communications" authorization={authorization} />;
  }

  const detail = await loadNewsletterDetail(id);

  if (!detail) {
    notFound();
  }

  const { newsletter } = detail;
  const canManage = canManageOperationsModule(authorization, "communications");
  const [audience, testSends, delivery] = await Promise.all([
    loadAudienceSummary(),
    loadTestSends(id),
    loadNewsletterSendSummary(id),
  ]);
  const sender = communicationsSenderStatus();
  const readiness = evaluateSendReadiness({
    audience,
    authorizedToManage: canManage,
    newsletter,
    senderConfigured: sender.configured,
  });

  // Exactly what Resend receives — same renderer, same inputs.
  const rendered = renderNewsletterEmail({
    manageToken: "preview",
    newsletter: {
      body_markdown: detail.bodyMarkdown,
      cta_label: newsletter.ctaLabel,
      cta_url: newsletter.ctaUrl,
      id: newsletter.id,
      preheader: newsletter.preheader,
      published_at: null,
      sections: newsletter.sections,
      slug: newsletter.slug,
      status: newsletter.status,
      subject: newsletter.subject,
      summary: newsletter.summary,
      title: newsletter.title,
    },
    subscriber: { email: sender.testRecipient, first_name: "Ryan", id: "preview", last_name: "Fox", status: "subscribed" },
  });

  const view = query.view === "mobile" || query.view === "text" ? query.view : "desktop";
  const viewHref = (next: string) => `/operations/communications/newsletters/${id}?view=${next}`;

  return (
    <OperationsShell
      action={<OperationsActionLink href="/operations/communications/newsletters" variant="outline">Back</OperationsActionLink>}
      active="communications"
      authorization={authorization}
      title="Communications"
    >
      <CommunicationsSubnav active="newsletters" />

      <div className="space-y-4">
        {query.tested ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Test email sent to {sender.testRecipient}.
          </section>
        ) : null}
        {query.approved ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Approved for send.
          </section>
        ) : null}
        {query.saved ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Saved.</section>
        ) : null}
        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {query.error}
          </section>
        ) : null}

        <OperationsPanel title={newsletter.title}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Status</p>
              <div className="mt-1">
                <OperationsBadge tone={statusTone(newsletter.status)}>{newsletter.statusLabel}</OperationsBadge>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Subject</p>
              <p className="mt-1 break-words text-sm text-slate-900">{newsletter.subject}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Preview text</p>
              <p className="mt-1 break-words text-sm text-slate-600">{newsletter.preheader ?? newsletter.summary ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Audience</p>
              <p className="mt-1 text-sm text-slate-900">{audience.eligible} eligible</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Planned send</p>
              <p className="mt-1 text-sm text-slate-900">
                {newsletter.plannedSendAt ? formatOperationsDate(newsletter.plannedSendAt) : "Not scheduled"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Last test</p>
              <p className="mt-1 text-sm text-slate-900">
                {newsletter.lastTestSentAt ? formatOperationsDate(newsletter.lastTestSentAt) : "Not yet"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Approved by</p>
              <p className="mt-1 truncate text-sm text-slate-900">{newsletter.approvedByEmail ?? "Not approved"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">From</p>
              <p className="mt-1 truncate text-sm text-slate-900">{sender.from ?? "Not configured"}</p>
            </div>
          </div>
        </OperationsPanel>

        <OperationsPanel
          action={
            <div className="flex flex-wrap gap-1">
              {[["desktop", "Desktop"], ["mobile", "Mobile"], ["text", "Plain Text"]].map(([key, label]) => (
                <a
                  className={`inline-flex min-h-8 items-center rounded-md border px-3 text-[11px] uppercase tracking-[0.12em] ${
                    view === key
                      ? "border-[#D8A932] bg-[#FFF7DF] text-[#654500]"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  href={viewHref(key)}
                  key={key}
                  style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                >
                  {label}
                </a>
              ))}
            </div>
          }
          title="Preview"
        >
          <p className="mb-3 text-xs text-slate-500">
            This is the exact HTML Resend receives, rendered by the same template the send uses.
          </p>
          {view === "text" ? (
            <pre className="max-h-[640px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800">
              {rendered.text}
            </pre>
          ) : (
            <div className={view === "mobile" ? "mx-auto w-full max-w-[390px]" : "w-full"}>
              <iframe
                className="h-[640px] w-full rounded-md border border-slate-200 bg-white"
                // Sandboxed: newsletter HTML renders but cannot run scripts or
                // navigate the Operations page around it.
                sandbox=""
                srcDoc={rendered.html}
                title="Newsletter preview"
              />
            </div>
          )}
        </OperationsPanel>

        {canManage ? (
          <OperationsPanel title="Actions">
            <div className="flex flex-wrap gap-2">
              <form action={sendNewsletterTestAction}>
                <input name="id" type="hidden" value={newsletter.id} />
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] disabled:opacity-50"
                  disabled={!sender.configured || !sender.resendConfigured}
                  style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  Send Test
                </button>
              </form>
              <form action={markNewsletterReadyAction}>
                <input name="id" type="hidden" value={newsletter.id} />
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932]"
                  style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  Mark Ready For Review
                </button>
              </form>
              <form action={approveNewsletterAction}>
                <input name="id" type="hidden" value={newsletter.id} />
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] disabled:opacity-50"
                  disabled={!newsletter.lastTestSentAt}
                  style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  Approve For Send
                </button>
              </form>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Test sends go only to {sender.testRecipient} and never touch the donor audience.
            </p>
          </OperationsPanel>
        ) : null}

        <OperationsPanel title="Production Send">
          {readiness.canSend && canManage ? (
            <form action={sendNewsletterToAudienceAction} className="grid gap-3 md:grid-cols-[240px_auto] md:items-end">
              <input name="id" type="hidden" value={newsletter.id} />
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Type SEND to confirm</span>
                <input
                  className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                  name="confirmation"
                  placeholder="SEND"
                  required
                />
              </label>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D8A932] px-4 text-[11px] uppercase tracking-[0.14em] text-[#101826] transition hover:bg-[#E7BF57]"
                style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
                type="submit"
              >
                Send To {audience.eligible} Subscribers
              </button>
            </form>
          ) : (
            <OperationsEmptyState>
              <p className="font-semibold text-slate-700">Sending is blocked.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {readiness.blockers.map((blocker) => (
                  <li className="text-slate-600" key={blocker}>{blocker}</li>
                ))}
              </ul>
            </OperationsEmptyState>
          )}
        </OperationsPanel>

        <div className="grid gap-4 xl:grid-cols-2">
          <OperationsPanel title="Test Sends">
            {testSends.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {testSends.map((send, index) => (
                  <div className="grid gap-1 py-3 first:pt-0 last:pb-0" key={`${send.resendEmailId ?? "none"}-${index}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-950">{send.recipient}</span>
                      <OperationsBadge tone={send.status === "sent" ? "green" : "red"}>{send.status}</OperationsBadge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {send.sentAt ? formatOperationsDate(send.sentAt) : "Not sent"}
                      {send.resendEmailId ? ` · ${send.resendEmailId}` : ""}
                      {send.error ? ` · ${send.error}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <OperationsEmptyState>No test sends yet.</OperationsEmptyState>
            )}
          </OperationsPanel>

          <OperationsPanel title="Delivery">
            {newsletter.sentAt ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  ["Sent", delivery.sent], ["Delivered", delivery.delivered], ["Bounced", delivery.bounced],
                  ["Opened", delivery.opened], ["Clicked", delivery.clicked], ["Unsubscribed", delivery.unsubscribed],
                ].map(([label, value]) => (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={String(label)}>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <OperationsEmptyState>
                Delivery results appear here after a production send. Nothing has been sent to the audience.
              </OperationsEmptyState>
            )}
          </OperationsPanel>
        </div>
      </div>
    </OperationsShell>
  );
}
