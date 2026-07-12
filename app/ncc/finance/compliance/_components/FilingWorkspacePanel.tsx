"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminFont } from "../../../../admin/_components/AdminUI";
import { startTrackingComplianceFiling, updateComplianceFilingFields } from "../actions";
import { complianceWorkflowStages, workflowStageLabels, type ComplianceFiling } from "@/src/lib/compliance/types";

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A] disabled:cursor-not-allowed disabled:opacity-50";

function listToText(items: readonly string[]) {
  return items.join("\n");
}

function textToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function FilingWorkspacePanel({
  filing,
  is990,
  writeEnabled,
}: {
  filing: ComplianceFiling;
  is990: boolean;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function handleStartTracking() {
    setError("");
    setIsStarting(true);

    try {
      await startTrackingComplianceFiling(filing.filingKey, filing.periodKey);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not start tracking.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      await updateComplianceFilingFields(filing.filingKey, filing.periodKey, {
        accountingYearEnd: is990 ? String(formData.get("accountingYearEnd") ?? "") : undefined,
        assignedPerson: String(formData.get("assignedPerson") ?? ""),
        extendedDueDate: String(formData.get("extendedDueDate") ?? ""),
        extensionStatus: is990 ? String(formData.get("extensionStatus") ?? "") : undefined,
        filingType: is990 ? String(formData.get("filingType") ?? "") : undefined,
        missingDocuments: textToList(String(formData.get("missingDocuments") ?? "")),
        openQuestions: textToList(String(formData.get("openQuestions") ?? "")),
        originalDueDate: is990 ? String(formData.get("originalDueDate") ?? "") : undefined,
        readinessPercentage: Number(formData.get("readinessPercentage") ?? 0),
        workflowStage: formData.get("workflowStage") as ComplianceFiling["workflowStage"],
      });
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!filing.isPersisted && !writeEnabled) {
    return (
      <section className="border border-[#C9A24A]/35 bg-[#C9A24A]/[0.06] p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#E4C465]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Tracking Unavailable In This Preview
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          The <code className="text-stone-100">compliance_filings</code> migration hasn&apos;t been applied to any
          database yet, so this filing shows read-only defaults and can&apos;t be assigned, updated, or moved
          through the workflow here. Everything above reflects the real starting values from the formation
          approval letter / IRS requirements.
        </p>
      </section>
    );
  }

  if (!filing.isPersisted) {
    return (
      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <p className="text-sm text-stone-400">
          This filing hasn&apos;t been started yet. Starting it creates the tracked record so it can be assigned,
          have documents attached, and move through the workflow.
        </p>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button
          className="mt-4 inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isStarting}
          onClick={handleStartTracking}
          style={{ fontFamily: adminFont.rajdhani }}
          type="button"
        >
          {isStarting ? "Starting..." : "Start Tracking This Filing"}
        </button>
      </section>
    );
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Update Filing
      </h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Assigned Person
          </span>
          <input className={fieldClassName} defaultValue={filing.assignedPerson ?? ""} name="assignedPerson" type="text" />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Readiness Percentage
          </span>
          <input
            className={fieldClassName}
            defaultValue={filing.readinessPercentage}
            max={100}
            min={0}
            name="readinessPercentage"
            type="number"
          />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Workflow Stage
          </span>
          <select className={fieldClassName} defaultValue={filing.workflowStage} name="workflowStage">
            {complianceWorkflowStages.map((stage) => (
              <option key={stage} value={stage}>
                {workflowStageLabels[stage]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Extended Due Date
          </span>
          <input className={fieldClassName} defaultValue={filing.extendedDueDate ?? ""} name="extendedDueDate" type="date" />
        </label>

        {is990 ? (
          <>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Original Due Date (once year-end is confirmed)
              </span>
              <input className={fieldClassName} defaultValue={filing.originalDueDate ?? ""} name="originalDueDate" type="date" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Filing Type
              </span>
              <select className={fieldClassName} defaultValue={filing.extra.filingType ?? "Unknown"} name="filingType">
                {["Unknown", "990-N", "990-EZ", "990"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Accounting Year-End
              </span>
              <input
                className={fieldClassName}
                defaultValue={filing.extra.accountingYearEnd === "Unknown" ? "" : filing.extra.accountingYearEnd}
                name="accountingYearEnd"
                placeholder="e.g. December 31"
                type="text"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Extension Status
              </span>
              <select className={fieldClassName} defaultValue={filing.extra.extensionStatus ?? "Unknown"} name="extensionStatus">
                {["Unknown", "Not Filed", "Filed — Pending", "Granted"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Open Questions (one per line)
          </span>
          <textarea className={`${fieldClassName} min-h-24`} defaultValue={listToText(filing.openQuestions)} name="openQuestions" />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Missing Documents (one per line)
          </span>
          <textarea className={`${fieldClassName} min-h-24`} defaultValue={listToText(filing.missingDocuments)} name="missingDocuments" />
        </label>

        {error ? <p className="text-sm text-red-300 sm:col-span-2">{error}</p> : null}

        <div className="sm:col-span-2">
          <button
            className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            style={{ fontFamily: adminFont.rajdhani }}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
