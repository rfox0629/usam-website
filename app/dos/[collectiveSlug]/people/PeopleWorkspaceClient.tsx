"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { DosFieldPerson, DosPeopleWorkspaceData } from "@/src/lib/dos/people";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type FilterKey = "all" | "walking" | "discipling" | "new" | "inactive";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "walking", label: "Walking with" },
  { key: "discipling", label: "Discipling" },
  { key: "new", label: "New" },
  { key: "inactive", label: "Inactive" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function matchesFilter(person: DosFieldPerson, filter: FilterKey) {
  if (filter === "walking") {
    return person.walkingWith.some((relationship) => relationship.status === "active");
  }

  if (filter === "discipling") {
    return person.disciplingCount > 0;
  }

  if (filter === "new") {
    return person.newToField;
  }

  if (filter === "inactive") {
    return person.inactive;
  }

  return true;
}

function PersonCard({
  collectiveSlug,
  person,
}: {
  collectiveSlug: string;
  person: DosFieldPerson;
}) {
  return (
    <Link
      className="group block border border-stone-800 bg-[#080808] p-5 transition-colors hover:border-amber-500/45"
      href={`/dos/${collectiveSlug}/people/${person.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500"
            style={{ fontFamily: font.rajdhani }}
          >
            {person.kind === "profile" ? "Collective member" : "Field person"}
          </p>
          <h2 className="mt-3 text-2xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
            {person.name}
          </h2>
        </div>
        {person.disciplingCount > 0 ? (
          <span
            className="shrink-0 border border-amber-500/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300"
            style={{ fontFamily: font.rajdhani }}
          >
            Multiplying
          </span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3 text-sm leading-6">
        {person.engagementLevel ? (
          <p className="text-stone-300">
            <span className="text-stone-500">Engagement:</span> {person.engagementLevel}
          </p>
        ) : null}

        <p className="text-stone-300">{person.relationshipSummary}</p>

        {person.disciplingCount > 0 ? (
          <p className="text-amber-300">
            Discipling {pluralize(person.disciplingCount, "person", "people")}
          </p>
        ) : null}

        <p className="text-stone-500">
          {person.lastMeeting ? `Last meeting: ${person.lastMeeting.title} on ${formatDate(person.lastMeeting.meetingDate)}` : "No meetings attached yet"}
        </p>
      </div>
    </Link>
  );
}

function AddPersonModal({
  collectiveSlug,
  onClose,
}: {
  collectiveSlug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`/api/dos/${collectiveSlug}/people`, {
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          engagementLevel: String(formData.get("engagement_level") ?? ""),
          firstName: String(formData.get("first_name") ?? ""),
          lastName: String(formData.get("last_name") ?? ""),
          notesPrivate: String(formData.get("notes_private") ?? ""),
          phone: String(formData.get("phone") ?? ""),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to add this person.");
      }

      form.reset();
      onClose();

      if (typeof result.personId === "string") {
        router.push(`/dos/${collectiveSlug}/people/${result.personId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add this person.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <div
          aria-labelledby="add-person-title"
          aria-modal="true"
          className="w-full max-w-2xl border border-stone-800 bg-[#080808] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-7"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400"
                style={{ fontFamily: font.rajdhani }}
              >
                Your Field
              </p>
              <h2
                className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100"
                id="add-person-title"
                style={{ fontFamily: font.oswald }}
              >
                Add Person
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                Add only what you need now. You can deepen the relationship record later.
              </p>
            </div>
            <button
              aria-label="Close add person form"
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone-700 text-xl leading-none text-stone-300 transition-colors hover:border-amber-400 hover:text-amber-300"
              onClick={onClose}
              type="button"
            >
              &times;
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" name="first_name" required />
              <Field label="Last name" name="last_name" />
              <Field label="Phone" name="phone" type="tel" />
              <Field label="Email" name="email" type="email" />
            </div>

            <Field label="Engagement level" name="engagement_level" />

            <label className="block">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                Notes
              </span>
              <textarea
                className="mt-2 min-h-28 w-full border border-stone-700 bg-[#050505] px-4 py-3 text-base text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
                name="notes_private"
                placeholder="Private ministry notes"
                rows={4}
              />
            </label>

            {errorMessage ? (
              <div className="border border-red-500/35 bg-red-950/30 p-4 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-xs leading-5 text-stone-500">
                This stays in the owning organization workspace and is not shared as public profile content.
              </p>
              <button
                className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                style={{ fontFamily: font.rajdhani }}
                type="submit"
              >
                {isSubmitting ? "Adding..." : "Add Person"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </span>
      <input
        className="mt-2 min-h-12 w-full border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

export function PeopleWorkspaceClient({
  collectiveSlug,
  data,
}: {
  collectiveSlug: string;
  data: DosPeopleWorkspaceData;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredPeople = useMemo(
    () =>
      data.people.filter((person) => {
        const matchesSearch = !normalizedSearch ||
          [person.name, person.engagementLevel, person.relationshipSummary]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch));

        return matchesSearch && matchesFilter(person, activeFilter);
      }),
    [activeFilter, data.people, normalizedSearch],
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500"
            style={{ fontFamily: font.rajdhani }}
          >
            Search
          </span>
          <input
            className="mt-3 min-h-12 w-full border border-stone-800 bg-[#080808] px-4 text-base text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or relationship"
            type="search"
            value={search}
          />
        </label>

        <button
          className="min-h-12 border border-amber-500/60 bg-amber-400 px-6 text-sm font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-300"
          onClick={() => setIsAddOpen(true)}
          style={{ fontFamily: font.rajdhani }}
          type="button"
        >
          Add Person
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;

          return (
            <button
              className={`min-h-10 shrink-0 border px-4 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
                isActive
                  ? "border-amber-500/60 bg-amber-400 text-stone-950"
                  : "border-stone-800 bg-[#080808] text-stone-400 hover:border-amber-500/45 hover:text-stone-100"
              }`}
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              style={{ fontFamily: font.rajdhani }}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {filteredPeople.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPeople.map((person) => (
              <PersonCard collectiveSlug={collectiveSlug} key={`${person.kind}-${person.id}`} person={person} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-stone-800 bg-[#080808] p-6 text-sm leading-7 text-stone-400">
            <p className="text-stone-200">No one added to your field yet.</p>
            <p className="mt-2 text-stone-500">Start by adding someone you are walking with.</p>
          </div>
        )}
      </div>

      {isAddOpen ? <AddPersonModal collectiveSlug={collectiveSlug} onClose={() => setIsAddOpen(false)} /> : null}
    </>
  );
}
