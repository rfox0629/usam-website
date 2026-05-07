"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { DosFieldPerson, DosRelationshipOption } from "@/src/lib/dos/people";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const relationshipStyles = [
  ["mentor", "Mentor"],
  ["pastor", "Pastor"],
  ["coach", "Coach"],
  ["spiritual_parent", "Spiritual Parent"],
  ["peer_accountability", "Peer Accountability"],
  ["prayer_support", "Prayer Support"],
  ["ministry_partner", "Ministry Partner"],
  ["other", "Other"],
] as const;

export function PersonRelationshipModal({
  collectiveSlug,
  person,
  relationshipOptions,
}: {
  collectiveSlug: string;
  person: DosFieldPerson;
  relationshipOptions: DosRelationshipOption[];
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availableOptions = useMemo(
    () =>
      relationshipOptions.filter((option) => {
        if (person.kind !== "profile") {
          return true;
        }

        return option.id !== person.id;
      }),
    [person.id, person.kind, relationshipOptions],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`/api/dos/${collectiveSlug}/relationships`, {
        body: JSON.stringify({
          discipleId: person.id,
          discipleKind: person.kind,
          disciplerProfileId: String(formData.get("discipler_profile_id") ?? ""),
          status: String(formData.get("status") ?? "active"),
          strength: String(formData.get("strength") ?? "supporting"),
          style: String(formData.get("style") ?? "mentor"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to save this relationship.");
      }

      setIsOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this relationship.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300"
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani }}
        type="button"
      >
        Add Another Discipler
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm"
          onMouseDown={() => setIsOpen(false)}
          role="presentation"
        >
          <div className="flex min-h-full items-end justify-center sm:items-center">
            <div
              aria-labelledby="relationship-title"
              aria-modal="true"
              className="w-full max-w-xl border border-stone-800 bg-[#080808] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-7"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    Discipleship
                  </p>
                  <h2
                    className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100"
                    id="relationship-title"
                    style={{ fontFamily: font.oswald }}
                  >
                    Add another discipler for {person.firstName}
                  </h2>
                </div>
                <button
                  aria-label="Close relationship form"
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone-700 text-xl leading-none text-stone-300 transition-colors hover:border-amber-400 hover:text-amber-300"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  &times;
                </button>
              </div>

              {availableOptions.length ? (
                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                  <Select label="Who else is helping disciple this person?" name="discipler_profile_id" required>
                    <option value="">Select a person</option>
                    {availableOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Select defaultValue="mentor" label="Style" name="style">
                      {relationshipStyles.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Select defaultValue="supporting" label="Strength" name="strength">
                      <option value="primary">Primary</option>
                      <option value="supporting">Supporting</option>
                    </Select>
                    <Select defaultValue="active" label="Status" name="status">
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="ended">Ended</option>
                    </Select>
                  </div>

                  {errorMessage ? (
                    <div className="border border-red-500/35 bg-red-950/30 p-4 text-sm leading-6 text-red-100">
                      {errorMessage}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <p className="text-xs leading-5 text-stone-500">
                      This is secondary relationship management for additional discipleship support.
                    </p>
                    <button
                      className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmitting}
                      style={{ fontFamily: font.rajdhani }}
                      type="submit"
                    >
                      {isSubmitting ? "Saving..." : "Save Relationship"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 border border-dashed border-stone-800 p-5 text-sm leading-7 text-stone-400">
                  Add a collective profile before creating discipleship relationships.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Select({
  children,
  defaultValue,
  label,
  name,
  required = false,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </span>
      <select
        className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors focus:border-amber-400"
        defaultValue={defaultValue}
        name={name}
        required={required}
      >
        {children}
      </select>
    </label>
  );
}
