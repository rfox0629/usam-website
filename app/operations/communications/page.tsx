import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  communicationsSenderStatus,
  loadAudienceSummary,
  loadNewsletterSendSummary,
  loadNewsletters,
} from "@/src/lib/operations/communications";
import { OperationsAccessDenied, OperationsShell } from "../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
  type OperationsTone,
} from "../_components/OperationsUI";
import { CommunicationsSubnav } from "./_components/CommunicationsSubnav";

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

export default async function OperationsCommunicationsPage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "communications")) {
    return <OperationsAccessDenied active="communications" authorization={authorization} />;
  }

  const [audience, { newsletters, error }] = await Promise.all([
    loadAudienceSummary(),
    loadNewsletters(),
  ]);
  const sender = communicationsSenderStatus();
  // The newsletter currently being worked on: the newest one not yet sent.
  const current = newsletters.find((item) => (
    item.status !== "sent" && item.status !== "cancelled" && item.status !== "archived"
  )) ?? newsletters[0] ?? null;
  const delivery = current ? await loadNewsletterSendSummary(current.id) : null;

  return (
    <OperationsShell active="communications" authorization={authorization} title="Communications">
      <CommunicationsSubnav active="overview" />

      <div className="space-y-4">
        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</section>
        ) : null}

        {!sender.configured || !sender.resendConfigured ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-semibold text-amber-900">Sending is not fully configured.</p>
            <p className="mt-1 text-amber-900">
              {!sender.resendConfigured ? "RESEND_API_KEY is missing. " : ""}
              {!sender.configured ? "No verified From address is set, so no send can run." : ""}
            </p>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <OperationsMetric
            href="/operations/communications/audience"
            label="Active Subscribers"
            value={audience.eligible}
          />
          <OperationsMetric
            href="/operations/communications/audience?status=unsubscribed"
            label="Unsubscribed"
            value={audience.unsubscribed}
          />
          <OperationsMetric
            href="/operations/communications/audience?status=suppressed"
            label="Suppressed"
            value={audience.suppressed}
          />
          <OperationsMetric
            label="Current Newsletter"
            value={current ? current.statusLabel : "None"}
            detail={current ? current.title : undefined}
          />
        </div>

        {current ? (
          <OperationsPanel
            action={
              <OperationsActionLink href={`/operations/communications/newsletters/${current.id}`}>
                Open Newsletter
              </OperationsActionLink>
            }
            title={current.title}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Status</p>
                <div className="mt-1">
                  <OperationsBadge tone={statusTone(current.status)}>{current.statusLabel}</OperationsBadge>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Subject</p>
                <p className="mt-1 truncate text-sm text-slate-900">{current.subject}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Will receive</p>
                <p className="mt-1 text-sm text-slate-900">{audience.eligible} eligible</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Planned send</p>
                <p className="mt-1 text-sm text-slate-900">
                  {current.plannedSendAt ? formatOperationsDate(current.plannedSendAt) : "Not scheduled"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Preview text</p>
                <p className="mt-1 truncate text-sm text-slate-600">{current.preheader ?? current.summary ?? "—"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Test sent</p>
                <p className="mt-1 text-sm text-slate-900">
                  {current.lastTestSentAt ? formatOperationsDate(current.lastTestSentAt) : "Not yet"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Approved</p>
                <p className="mt-1 truncate text-sm text-slate-900">
                  {current.approvedByEmail ? `${current.approvedByEmail}` : "Not approved"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Last updated</p>
                <p className="mt-1 text-sm text-slate-900">{formatOperationsDate(current.updatedAt)}</p>
              </div>
            </div>
          </OperationsPanel>
        ) : (
          <OperationsPanel title="Current Newsletter">
            <OperationsEmptyState>No newsletter records yet.</OperationsEmptyState>
          </OperationsPanel>
        )}

        {current && delivery && current.sentAt ? (
          <OperationsPanel title="Delivery Results">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                ["Sent", delivery.sent],
                ["Delivered", delivery.delivered],
                ["Bounced", delivery.bounced],
                ["Opened", delivery.opened],
                ["Clicked", delivery.clicked],
                ["Unsubscribed", delivery.unsubscribed],
              ].map(([label, value]) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={String(label)}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Counts come from recorded Resend sends and delivery webhook events only.
            </p>
          </OperationsPanel>
        ) : null}
      </div>
    </OperationsShell>
  );
}
