import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge, adminFont } from "../../../admin/_components/AdminUI";
import { NccShell } from "../../_components/NccShell";
import { getCurrentOrganization } from "../../_lib/organization-context";
import { AgentCapabilitiesPanel } from "./_components/AgentCapabilitiesPanel";
import { formatDate, statusLabels, statusTone } from "./_components/complianceLabels";
import { requireAnyFinanceAccess } from "@/src/lib/finance-auth";
import { listComplianceFilings } from "@/src/lib/compliance/filings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Compliance | National Command Center",
};

function detailHrefFor(filingKey: string, periodKey: string) {
  if (filingKey === "arizona-annual-report") {
    return `/ncc/finance/compliance/arizona-annual-report/${periodKey}`;
  }

  return `/ncc/finance/990/${periodKey}`;
}

export default async function NccComplianceOverviewPage() {
  const financeAccess = await requireAnyFinanceAccess();
  const navScope = financeAccess.source === "finance_team_members" ? "finance-only" : "full";
  const filings = await listComplianceFilings();

  return (
    <NccShell active="finance" navScope={navScope} organization={getCurrentOrganization()} title="Annual Compliance Center">
      <div className="space-y-6">
        <p className="text-sm leading-6 text-stone-400">
          Tracks the organization&apos;s recurring statutory and tax filings end to end — due dates, readiness,
          assigned owner, and the confirmation trail once filed. Nothing here is marked filed automatically; see
          the workflow on each filing&apos;s page.{" "}
          <Link className="text-[#E4C465] hover:underline" href="/ncc/finance">
            Back to Finance
          </Link>
        </p>

        <div className="grid gap-4 xl:grid-cols-2">
          {filings.map((filing) => (
            <Link
              className="block border border-stone-800/75 bg-[#080808]/85 p-5 transition-colors hover:border-[#C9A24A]/55 hover:bg-[#C9A24A]/[0.03]"
              href={detailHrefFor(filing.filingKey, filing.periodKey)}
              key={`${filing.filingKey}:${filing.periodKey}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-stone-100">{filing.filingName}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    {filing.agency} &middot; {filing.filingPeriod}
                  </p>
                </div>
                <AdminBadge tone={statusTone[filing.status]}>{statusLabels[filing.status]}</AdminBadge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Original Due</dt>
                  <dd className="mt-0.5 text-stone-200">{formatDate(filing.originalDueDate)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Extended Due</dt>
                  <dd className="mt-0.5 text-stone-200">{formatDate(filing.extendedDueDate)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Assigned</dt>
                  <dd className="mt-0.5 text-stone-200">{filing.assignedPerson || "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Readiness</dt>
                  <dd className="mt-0.5 text-stone-200">{filing.readinessPercentage}%</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Last Filed</dt>
                  <dd className="mt-0.5 text-stone-200">{formatDate(filing.lastFiledDate)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Confirmation #</dt>
                  <dd className="mt-0.5 text-stone-200">{filing.confirmationNumber || "—"}</dd>
                </div>
              </dl>

              {!filing.isPersisted ? (
                <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-stone-600">Read-Only Default — Not Yet Tracked</p>
              ) : null}
            </Link>
          ))}
        </div>

        <AgentCapabilitiesPanel />
      </div>
    </NccShell>
  );
}
