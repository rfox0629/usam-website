"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminFont } from "../../../../admin/_components/AdminUI";
import { saveWorksheetAction } from "../actions";

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A] disabled:cursor-not-allowed disabled:opacity-50";

const governanceQuestions = [
  { key: "boardSize", label: "Number of voting board members" },
  { key: "independentMembers", label: "Number of independent voting board members" },
  { key: "conflictOfInterestPolicy", label: "Does the organization have a written conflict-of-interest policy?" },
  { key: "whistleblowerPolicy", label: "Does the organization have a written whistleblower policy?" },
  { key: "documentRetentionPolicy", label: "Does the organization have a written document-retention policy?" },
  { key: "compensationReviewProcess", label: "How is the top official's compensation determined and reviewed?" },
] as const;

function SaveButton({ isSaving, writeEnabled }: { isSaving: boolean; writeEnabled: boolean }) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isSaving || !writeEnabled}
      style={{ fontFamily: adminFont.rajdhani }}
      type="submit"
    >
      {isSaving ? "Saving..." : writeEnabled ? "Save" : "Unavailable In Preview"}
    </button>
  );
}

export function GovernanceWorksheetPanel({
  filingId,
  initialData,
  taxYear,
  writeEnabled,
}: {
  filingId: string | null;
  initialData: Record<string, unknown>;
  taxYear: string;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!filingId) {
      setError("Start tracking this filing above first.");
      return;
    }

    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(governanceQuestions.map((question) => [question.key, String(formData.get(question.key) ?? "")]));

    try {
      await saveWorksheetAction(filingId, taxYear, "governance", data);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Governance Worksheet
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">Mirrors the substance of Form 990 Part VI — not derived from transactions.</p>
      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        {governanceQuestions.map((question) => (
          <label className="block" key={question.key}>
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              {question.label}
            </span>
            <input className={fieldClassName} defaultValue={String(initialData[question.key] ?? "")} disabled={!writeEnabled} name={question.key} type="text" />
          </label>
        ))}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <SaveButton isSaving={isSaving} writeEnabled={writeEnabled} />
      </form>
    </section>
  );
}

export function ProgramAccomplishmentsPanel({
  filingId,
  initialData,
  taxYear,
  writeEnabled,
}: {
  filingId: string | null;
  initialData: Record<string, unknown>;
  taxYear: string;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const initialText = Array.isArray(initialData.items) ? (initialData.items as string[]).join("\n") : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!filingId) {
      setError("Start tracking this filing above first.");
      return;
    }

    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const items = String(formData.get("items") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      await saveWorksheetAction(filingId, taxYear, "program_accomplishments", { items });
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Program Accomplishments (Draft)
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">One accomplishment per line — mirrors Form 990 Part III narrative. Draft only; the accountant reviews and finalizes wording.</p>
      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <textarea className={`${fieldClassName} min-h-32`} defaultValue={initialText} disabled={!writeEnabled} name="items" />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <SaveButton isSaving={isSaving} writeEnabled={writeEnabled} />
      </form>
    </section>
  );
}

type OfficerRow = {
  avgHoursPerWeek: string;
  benefits: string;
  compensation: string;
  name: string;
  otherCompensation: string;
  title: string;
};

const emptyOfficerRow: OfficerRow = { avgHoursPerWeek: "", benefits: "", compensation: "", name: "", otherCompensation: "", title: "" };

export function OfficerCompensationPanel({
  filingId,
  initialData,
  taxYear,
  writeEnabled,
}: {
  filingId: string | null;
  initialData: Record<string, unknown>;
  taxYear: string;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<OfficerRow[]>(
    Array.isArray(initialData.officers) && (initialData.officers as OfficerRow[]).length > 0
      ? (initialData.officers as OfficerRow[])
      : [emptyOfficerRow],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function updateRow(index: number, field: keyof OfficerRow, value: string) {
    setRows((previous) => previous.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  async function handleSave() {
    if (!filingId) {
      setError("Start tracking this filing above first.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await saveWorksheetAction(filingId, taxYear, "officer_compensation", { officers: rows.filter((row) => row.name.trim()) });
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Officer Compensation Summary
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">Manually entered — compensation figures aren&apos;t reliably derivable from bank transactions alone (W-2/1099 boxes differ from net deposits).</p>

      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div className="grid gap-2 sm:grid-cols-6" key={index}>
            <input className={fieldClassName} disabled={!writeEnabled} onChange={(event) => updateRow(index, "name", event.target.value)} placeholder="Name" type="text" value={row.name} />
            <input className={fieldClassName} disabled={!writeEnabled} onChange={(event) => updateRow(index, "title", event.target.value)} placeholder="Title" type="text" value={row.title} />
            <input className={fieldClassName} disabled={!writeEnabled} onChange={(event) => updateRow(index, "avgHoursPerWeek", event.target.value)} placeholder="Avg hrs/week" type="text" value={row.avgHoursPerWeek} />
            <input className={fieldClassName} disabled={!writeEnabled} onChange={(event) => updateRow(index, "compensation", event.target.value)} placeholder="Compensation" type="text" value={row.compensation} />
            <input className={fieldClassName} disabled={!writeEnabled} onChange={(event) => updateRow(index, "benefits", event.target.value)} placeholder="Benefits" type="text" value={row.benefits} />
            <input className={fieldClassName} disabled={!writeEnabled} onChange={(event) => updateRow(index, "otherCompensation", event.target.value)} placeholder="Other comp." type="text" value={row.otherCompensation} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!writeEnabled}
          onClick={() => setRows((previous) => [...previous, emptyOfficerRow])}
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Add Officer
        </button>
        <button
          className="inline-flex min-h-9 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || !writeEnabled}
          onClick={handleSave}
          style={{ fontFamily: adminFont.rajdhani }}
          type="button"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
