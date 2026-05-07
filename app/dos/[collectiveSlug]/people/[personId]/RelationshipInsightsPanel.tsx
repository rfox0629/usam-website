"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { DosFieldPerson, DosRelationshipDepth } from "@/src/lib/dos/people";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const commitmentOptions = [
  { label: "Resistant", value: -3 },
  { label: "Closed Off", value: -2 },
  { label: "Curious", value: -1 },
  { label: "Exploring", value: 0 },
  { label: "Open and Growing", value: 1 },
  { label: "Committed", value: 2 },
  { label: "Multiplying", value: 3 },
] as const;

const depthOptions: DosRelationshipDepth[] = ["New", "Growing", "Strong"];

function formatCommitmentValue(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function commitmentLabel(value: number | null) {
  if (value === null) {
    return "Not set yet";
  }

  return commitmentOptions.find((option) => option.value === value)?.label ?? "Not set yet";
}

export function RelationshipInsightsPanel({
  collectiveSlug,
  person,
}: {
  collectiveSlug: string;
  person: DosFieldPerson;
}) {
  const router = useRouter();
  const canEdit = person.kind === "person";
  const [commitmentLevel, setCommitmentLevel] = useState<number | null>(person.commitmentLevel);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notesPrivate, setNotesPrivate] = useState(person.notesPrivate ?? "");
  const [relationshipDepth, setRelationshipDepth] = useState<DosRelationshipDepth | "">(
    person.relationshipDepth ?? "",
  );
  const [savedMessage, setSavedMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    setErrorMessage("");
    setSavedMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/dos/${collectiveSlug}/people/${person.id}/insights`, {
        body: JSON.stringify({
          commitmentLevel,
          notesPrivate,
          relationshipDepth,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to save relationship insights.");
      }

      setSavedMessage("Relationship insights saved.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save relationship insights.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {!canEdit ? (
        <div className="border border-stone-800 bg-[#080808] p-4 text-sm leading-6 text-stone-500">
          Relationship insights are available for field people added to your field.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="border border-stone-800 bg-[#080808] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400"
                style={{ fontFamily: font.rajdhani }}
              >
                Commitment Level
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                Where are they spiritually right now?
              </p>
            </div>
            <span className="shrink-0 border border-stone-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-stone-400">
              {commitmentLabel(commitmentLevel)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {commitmentOptions.map((option) => {
              const isActive = commitmentLevel === option.value;

              return (
                <button
                  aria-pressed={isActive}
                  className={`min-h-12 border px-3 text-left transition-colors ${
                    isActive
                      ? "border-amber-500/60 bg-amber-400 text-stone-950"
                      : "border-stone-800 bg-[#050505] text-stone-300 hover:border-amber-500/45"
                  }`}
                  disabled={!canEdit}
                  key={option.value}
                  onClick={() => setCommitmentLevel(option.value)}
                  type="button"
                >
                  <span
                    className="block text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    {formatCommitmentValue(option.value)}
                  </span>
                  <span className="mt-1 block text-sm font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            Directional openness, not a score or judgment.
          </p>
        </section>

        <section className="border border-stone-800 bg-[#080808] p-5">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400"
            style={{ fontFamily: font.rajdhani }}
          >
            Relationship Depth
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            The current depth of your relationship with {person.firstName}.
          </p>

          <div className="mt-5 grid gap-2">
            {depthOptions.map((option) => {
              const isActive = relationshipDepth === option;

              return (
                <button
                  aria-pressed={isActive}
                  className={`min-h-12 border px-4 text-left text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-amber-500/60 bg-amber-400 text-stone-950"
                      : "border-stone-800 bg-[#050505] text-stone-300 hover:border-amber-500/45"
                  }`}
                  disabled={!canEdit}
                  key={option}
                  onClick={() => setRelationshipDepth(option)}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="border border-stone-800 bg-[#080808] p-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400"
          style={{ fontFamily: font.rajdhani }}
        >
          Multiplication Visibility
        </p>

        {person.discipling.length ? (
          <div className="mt-4 text-sm leading-7 text-stone-300">
            <p>{person.firstName} is discipling:</p>
            <ul className="mt-2 space-y-1 text-amber-300">
              {person.discipling.map((relationship) => (
                <li key={relationship.id}>{relationship.discipleName}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-stone-500">No active multiplication yet.</p>
        )}
      </section>

      <section className="border border-stone-800 bg-[#080808] p-5">
        <label className="block">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400"
            style={{ fontFamily: font.rajdhani }}
          >
            Relationship Notes
          </span>
          <textarea
            className="mt-4 min-h-32 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-base text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400 disabled:text-stone-500"
            disabled={!canEdit}
            onChange={(event) => setNotesPrivate(event.target.value)}
            placeholder="Notes about spiritual growth, follow up, or prayer."
            rows={5}
            value={notesPrivate}
          />
        </label>
        <p className="mt-3 text-xs leading-5 text-stone-500">
          Private to the owning organization.
        </p>
      </section>

      {errorMessage ? (
        <div className="border border-red-500/35 bg-red-950/30 p-4 text-sm leading-6 text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="border border-amber-500/35 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          {savedMessage}
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex justify-end">
          <button
            className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            style={{ fontFamily: font.rajdhani }}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save Insights"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
