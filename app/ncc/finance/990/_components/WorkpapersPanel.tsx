"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFont, AdminBadge } from "../../../../admin/_components/AdminUI";
import { approveWorkpaperAction, generateWorkpaperAction } from "../actions";
import { workpaperTypeLabels, type DraftWorkpaper, type WorkpaperType } from "@/src/lib/finance-ops/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function WorkpapersPanel({
  availableTypes,
  canApprove,
  filingId,
  periodEnd,
  periodStart,
  restrictToApproved,
  taxYear,
  title,
  workpapers,
  writeEnabled,
}: {
  availableTypes: readonly WorkpaperType[];
  canApprove?: boolean;
  filingId: string | null;
  periodEnd: string;
  periodStart: string;
  restrictToApproved?: boolean;
  taxYear: string;
  title: string;
  workpapers: readonly DraftWorkpaper[];
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [generatingType, setGeneratingType] = useState<WorkpaperType | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate(workpaperType: WorkpaperType) {
    if (!filingId) {
      setError("Start tracking this filing (above) before generating workpapers.");
      return;
    }

    setError("");
    setGeneratingType(workpaperType);

    try {
      await generateWorkpaperAction(filingId, taxYear, workpaperType, periodStart, periodEnd);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not generate workpaper.");
    } finally {
      setGeneratingType(null);
    }
  }

  async function handleApprove(workpaperId: string) {
    setError("");
    setApprovingId(workpaperId);

    try {
      await approveWorkpaperAction(workpaperId, taxYear);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not approve workpaper.");
    } finally {
      setApprovingId(null);
    }
  }

  const relevantWorkpapers = workpapers
    .filter((workpaper) => availableTypes.includes(workpaper.workpaperType))
    .filter((workpaper) => !restrictToApproved || workpaper.reviewStatus === "approved");

  if (restrictToApproved) {
    return (
      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          {title}
        </h2>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-stone-600">Approved reports only — treasurer read-only view</p>
        {relevantWorkpapers.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No approved report yet for this period.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {relevantWorkpapers.map((workpaper) => {
              const rows = (workpaper.data.rows as Array<{ category: string; total: number }> | undefined) ?? [];

              return (
                <div className="border border-stone-900 bg-[#050505] p-4" key={workpaper.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-100">{workpaperTypeLabels[workpaper.workpaperType]}</p>
                    <AdminBadge tone="green">Approved</AdminBadge>
                  </div>
                  {rows.length > 0 ? (
                    <div className="mt-3 divide-y divide-stone-900">
                      {rows.map((row) => (
                        <div className="flex items-center justify-between py-1.5 text-sm" key={row.category}>
                          <span className="text-stone-300">{row.category}</span>
                          <span className="text-stone-100">{formatCurrency(row.total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          {title}
        </h2>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((workpaperType) => (
            <button
              className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!writeEnabled || generatingType === workpaperType}
              key={workpaperType}
              onClick={() => handleGenerate(workpaperType)}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {generatingType === workpaperType ? "Generating..." : `Generate ${workpaperTypeLabels[workpaperType]}`}
            </button>
          ))}
        </div>
      </div>

      {!writeEnabled ? <p className="mt-3 text-sm text-stone-500">Generation is unavailable until the finance_operations migration is applied.</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {relevantWorkpapers.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">No draft generated yet for this period.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {relevantWorkpapers.map((workpaper) => {
            const rows = (workpaper.data.rows as Array<{ category: string; total: number }> | undefined) ?? [];
            const isApproved = workpaper.reviewStatus === "approved";

            return (
              <div className="border border-stone-900 bg-[#050505] p-4" key={workpaper.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-100">{workpaperTypeLabels[workpaper.workpaperType]}</p>
                  <div className="flex items-center gap-2">
                    <AdminBadge tone="amber">Draft</AdminBadge>
                    <AdminBadge tone={isApproved ? "green" : "muted"}>{workpaper.reviewStatus}</AdminBadge>
                    {!isApproved && canApprove && writeEnabled ? (
                      <button
                        className="inline-flex min-h-7 items-center justify-center border border-stone-700 px-2.5 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={approvingId === workpaper.id}
                        onClick={() => handleApprove(workpaper.id)}
                        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                        type="button"
                      >
                        {approvingId === workpaper.id ? "Approving..." : "Approve"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  Prepared {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(workpaper.preparedAt))} by {workpaper.preparedBy} &middot; Period {workpaper.sourcePeriodStart} to {workpaper.sourcePeriodEnd} &middot; Reviewer: {workpaper.reviewedBy ?? "None yet"}
                </p>

                {workpaper.missingDataWarnings.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {workpaper.missingDataWarnings.map((warning) => (
                      <p className="text-xs text-amber-300" key={warning}>⚠ {warning}</p>
                    ))}
                  </div>
                ) : null}

                {rows.length > 0 ? (
                  <div className="mt-3 divide-y divide-stone-900">
                    {rows.map((row) => (
                      <div className="flex items-center justify-between py-1.5 text-sm" key={row.category}>
                        <span className="text-stone-300">{row.category}</span>
                        <span className="text-stone-100">{formatCurrency(row.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
