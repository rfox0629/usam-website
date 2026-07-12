"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminFont } from "../../../../admin/_components/AdminUI";
import { recordComplianceFilingConfirmation } from "../actions";

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A] disabled:cursor-not-allowed disabled:opacity-50";

export function FilingConfirmationForm({
  alreadyFiled,
  filingKey,
  periodKey,
  writeEnabled,
}: {
  alreadyFiled: boolean;
  filingKey: string;
  periodKey: string;
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      await recordComplianceFilingConfirmation(filingKey, periodKey, {
        confirmationNumber: String(formData.get("confirmationNumber") ?? ""),
        lastFiledDate: String(formData.get("lastFiledDate") ?? ""),
      });
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not record confirmation.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Record Filing Confirmation
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        This is the only way this filing can be marked &ldquo;Filed.&rdquo; It requires a real confirmation number
        from the agency — enforced both here and by a database constraint, so no automated process can set this
        status on its own.
      </p>

      {alreadyFiled ? (
        <p className="mt-4 text-sm text-[#E4C465]">This filing is already recorded as filed.</p>
      ) : (
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Confirmation Number
            </span>
            <input className={fieldClassName} disabled={!writeEnabled} name="confirmationNumber" required type="text" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Filed Date
            </span>
            <input className={fieldClassName} disabled={!writeEnabled} name="lastFiledDate" required type="date" />
          </label>

          {error ? <p className="text-sm text-red-300 sm:col-span-2">{error}</p> : null}
          {!writeEnabled ? (
            <p className="text-sm text-stone-500 sm:col-span-2">
              Unavailable in this preview until the compliance_filings migration is applied.
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <button
              className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !writeEnabled}
              style={{ fontFamily: adminFont.rajdhani }}
              type="submit"
            >
              {isSaving ? "Saving..." : "Mark As Filed"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
