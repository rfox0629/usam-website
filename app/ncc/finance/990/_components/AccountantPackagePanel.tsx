"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFont, AdminBadge, AdminEmptyState } from "../../../../admin/_components/AdminUI";
import { generateAccountantPackageAction, markAccountantPackageReadyAction } from "../actions";
import type { ComplianceFiling } from "@/src/lib/compliance/types";
import type { ComplianceFilingDocument } from "@/src/lib/compliance/types";
import type { AccountantPackageSummary, DraftWorkpaper } from "@/src/lib/finance-ops/types";

export function AccountantPackagePanel({
  arizonaFiling,
  canMarkReady,
  documents,
  filingId,
  form990Filing,
  governanceData,
  officerCompensationData,
  packages,
  programAccomplishmentsData,
  taxYear,
  workpapers,
  writeEnabled,
}: {
  arizonaFiling: ComplianceFiling | null;
  canMarkReady: boolean;
  documents: readonly ComplianceFilingDocument[];
  filingId: string | null;
  form990Filing: ComplianceFiling;
  governanceData: Record<string, unknown>;
  officerCompensationData: Record<string, unknown>;
  packages: readonly AccountantPackageSummary[];
  programAccomplishmentsData: Record<string, unknown>;
  taxYear: string;
  workpapers: readonly DraftWorkpaper[];
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [markingReadyId, setMarkingReadyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function buildManifest() {
    return {
      documentIndex: documents.map((doc) => ({ category: doc.docCategory, name: doc.docName, uploadedAt: doc.createdAt })),
      draftWorkpapers: workpapers.map((workpaper) => ({
        preparedAt: workpaper.preparedAt,
        reviewStatus: workpaper.reviewStatus,
        type: workpaper.workpaperType,
      })),
      form990Worksheet: form990Filing,
      generatedAt: new Date().toISOString(),
      governanceWorksheet: governanceData,
      officerCompensation: officerCompensationData,
      openQuestions: form990Filing.openQuestions,
      programAccomplishments: programAccomplishmentsData,
      statutoryAgentWorksheet: arizonaFiling,
    };
  }

  async function handleGenerate() {
    if (!filingId) {
      setError("Start tracking the 990 filing above first.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const manifest = buildManifest();
      await generateAccountantPackageAction(filingId, taxYear, manifest);

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `accountant-package-990-${taxYear}.json`;
      link.click();
      URL.revokeObjectURL(url);

      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not generate package.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleMarkReady(packageId: string) {
    setError("");
    setMarkingReadyId(packageId);

    try {
      await markAccountantPackageReadyAction(packageId, taxYear);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not mark package ready.");
    } finally {
      setMarkingReadyId(null);
    }
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Accountant Package
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        Compiles the document index, draft workpapers, governance and program-accomplishments worksheets,
        officer-compensation summary, open questions, and both filings&apos; worksheets into one downloadable
        file. Nothing is sent anywhere automatically — this only prepares a download for a human to review and
        share manually.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="border border-stone-900 bg-[#050505] p-3 text-sm text-stone-300">{documents.length} document(s) indexed</div>
        <div className="border border-stone-900 bg-[#050505] p-3 text-sm text-stone-300">{workpapers.length} draft workpaper(s)</div>
        <div className="border border-stone-900 bg-[#050505] p-3 text-sm text-stone-300">{form990Filing.openQuestions.length} open question(s)</div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isGenerating || !writeEnabled}
        onClick={handleGenerate}
        style={{ fontFamily: adminFont.rajdhani }}
        type="button"
      >
        {isGenerating ? "Generating..." : writeEnabled ? "Generate & Download Package" : "Unavailable In Preview"}
      </button>

      {!writeEnabled ? (
        <div className="mt-4">
          <AdminEmptyState
            description="Package generation is unavailable until the finance_operations migration is applied."
            title="Unavailable"
          />
        </div>
      ) : null}

      {packages.length > 0 ? (
        <div className="mt-5 divide-y divide-stone-900 border border-stone-800/75">
          {packages.map((pkg) => (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3" key={pkg.id}>
              <span className="text-sm text-stone-300">
                Generated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(pkg.generatedAt))}
              </span>
              <div className="flex items-center gap-2">
                <AdminBadge tone={pkg.status === "ready" ? "green" : "amber"}>{pkg.status === "ready" ? "Ready" : "Draft"}</AdminBadge>
                {pkg.status === "draft" && canMarkReady ? (
                  <button
                    className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={markingReadyId === pkg.id}
                    onClick={() => handleMarkReady(pkg.id)}
                    style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {markingReadyId === pkg.id ? "Marking..." : "Mark Ready"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
