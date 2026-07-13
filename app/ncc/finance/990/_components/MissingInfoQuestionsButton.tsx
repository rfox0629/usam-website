"use client";

import { useState } from "react";
import { adminFont } from "../../../../admin/_components/AdminUI";
import { draftMissingInformationQuestionsAction } from "../actions";

export function MissingInfoQuestionsButton({
  missingDocuments,
  openQuestions,
  periodEnd,
  periodStart,
  taxYear,
  writeEnabled,
}: {
  missingDocuments: readonly string[];
  openQuestions: readonly string[];
  periodEnd: string;
  periodStart: string;
  taxYear: string;
  writeEnabled: boolean;
}) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  async function handleDraft() {
    setError("");
    setIsDrafting(true);

    try {
      const questions = await draftMissingInformationQuestionsAction(taxYear, missingDocuments, openQuestions, periodStart, periodEnd);
      setDraft(questions);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not draft questions.");
    } finally {
      setIsDrafting(false);
    }
  }

  return (
    <div className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Draft Missing-Information Questions
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        Templated from known gaps (missing documents, existing open questions, uncategorized transaction
        count) — a starting point to send to whoever can answer them, not sent automatically.
      </p>
      <button
        className="mt-3 inline-flex min-h-9 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isDrafting || !writeEnabled}
        onClick={handleDraft}
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        type="button"
      >
        {isDrafting ? "Drafting..." : "Draft Questions"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      {draft ? (
        <ul className="mt-4 space-y-1.5 text-sm text-stone-300">
          {draft.map((question) => (
            <li className="flex gap-2" key={question}>
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#C9A24A]" />
              {question}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
