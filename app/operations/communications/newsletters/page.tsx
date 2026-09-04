import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadAudienceSummary, loadNewsletters } from "@/src/lib/operations/communications";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  type OperationsTone,
} from "../../_components/OperationsUI";
import { CommunicationsSubnav } from "../_components/CommunicationsSubnav";

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

export default async function OperationsNewslettersPage() {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "communications")) {
    return <OperationsAccessDenied active="communications" authorization={authorization} />;
  }

  const [{ newsletters, error }, audience] = await Promise.all([
    loadNewsletters(),
    loadAudienceSummary(),
  ]);

  return (
    <OperationsShell active="communications" authorization={authorization} title="Communications">
      <CommunicationsSubnav active="newsletters" />

      <div className="space-y-4">
        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</section>
        ) : null}

        <OperationsPanel title="Newsletters">
          {newsletters.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.4fr)_150px_110px_120px_110px]">
                {["Newsletter", "Status", "Audience", "Send Date", "Updated"].map((heading) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={heading}>{heading}</p>
                ))}
              </div>
              {newsletters.map((newsletter) => (
                <Link
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_150px_110px_120px_110px] lg:items-center lg:gap-3"
                  href={`/operations/communications/newsletters/${newsletter.id}`}
                  key={newsletter.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{newsletter.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{newsletter.subject}</p>
                  </div>
                  <div>
                    <OperationsBadge tone={statusTone(newsletter.status)}>{newsletter.statusLabel}</OperationsBadge>
                  </div>
                  <p className="text-sm text-slate-700">
                    {newsletter.sentAt ? "—" : `${audience.eligible} eligible`}
                  </p>
                  <p className="text-sm text-slate-700">
                    {newsletter.sentAt
                      ? formatOperationsDate(newsletter.sentAt)
                      : newsletter.plannedSendAt
                        ? formatOperationsDate(newsletter.plannedSendAt)
                        : "Not scheduled"}
                  </p>
                  <p className="text-sm text-slate-500">{formatOperationsDate(newsletter.updatedAt)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <OperationsEmptyState>No newsletters yet.</OperationsEmptyState>
          )}
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
