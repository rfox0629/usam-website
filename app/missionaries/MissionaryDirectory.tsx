"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export type MissionaryDirectoryProfile = {
  displayNumber: string;
  functionTags: readonly string[];
  image: string | null;
  location: string;
  name: string;
  roleTags: readonly string[];
  slug: string;
};

const filters = [
  "ALL",
  "MISSIONARIES",
  "STATE LEADERS",
  "REGIONAL LEADERS",
  "NATIONAL LEADERS",
  "PRAYER TEAM",
  "SUPPORT TEAM",
] as const;

type DirectoryFilter = (typeof filters)[number];

function isExternalImage(src: string) {
  return /^https?:\/\//.test(src);
}

function matchesFilter(missionary: MissionaryDirectoryProfile, filter: DirectoryFilter) {
  if (filter === "ALL") {
    return true;
  }

  if (filter === "MISSIONARIES") {
    return missionary.roleTags.includes("MISSIONARY") || missionary.roleTags.includes("MISSIONARY COUPLE");
  }

  const roleByFilter = {
    "NATIONAL LEADERS": "NATIONAL LEADER",
    "PRAYER TEAM": "PRAYER TEAM",
    "REGIONAL LEADERS": "REGIONAL LEADER",
    "STATE LEADERS": "STATE LEADER",
    "SUPPORT TEAM": "SUPPORT TEAM",
  } as const satisfies Record<Exclude<DirectoryFilter, "ALL" | "MISSIONARIES">, string>;

  return missionary.roleTags.includes(roleByFilter[filter]);
}

function DirectoryCard({ missionary }: { missionary: MissionaryDirectoryProfile }) {
  const functionTags = missionary.functionTags ?? [];
  const showImage = Boolean(missionary.image);

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-stone-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D4A63D]/50 hover:shadow-[0_28px_90px_rgba(15,23,42,0.14)]">
      <div className="relative h-[250px] overflow-hidden bg-stone-950">
        {showImage && missionary.image ? (
          <>
            <Image
              src={missionary.image}
              alt={`${missionary.name} profile photo`}
              fill
              unoptimized={isExternalImage(missionary.image)}
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.08),rgba(5,5,5,0.2)_45%,rgba(5,5,5,0.72))]" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#090909,#1c1917)] px-6 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Photo Hidden
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                This household has chosen a more discreet public profile.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {missionary.displayNumber}
        </p>

        <h2 className="mt-2 text-4xl font-bold leading-none text-stone-950" style={{ fontFamily: font.oswald }}>
          {missionary.name}
        </h2>

        <p className="mt-4 text-sm font-semibold text-stone-700">
          {missionary.location}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {missionary.roleTags.map((tag) => (
            <span
              key={tag}
              className="border border-[#D4A63D]/35 bg-[#D4A63D]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-950"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {tag}
            </span>
          ))}
          {functionTags.map((tag) => (
            <span
              key={tag}
              className="border border-stone-300 bg-stone-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-stone-600"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <Link
            href={`/missionaries/${missionary.slug}`}
            className="inline-flex min-h-11 w-full items-center justify-center bg-stone-950 px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-[#D4A63D] hover:text-black"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            View Profile
          </Link>
        </div>
      </div>
    </article>
  );
}

export function MissionaryDirectory({
  emptyMessage = "No missionaries found.",
  missionaries,
}: {
  emptyMessage?: string;
  missionaries: readonly MissionaryDirectoryProfile[];
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<DirectoryFilter>("ALL");

  const visibleMissionaries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return missionaries.filter((missionary) => {
      const allTags = [...missionary.roleTags, ...(missionary.functionTags ?? [])];
      const matchesQuery = !normalizedQuery
        || missionary.name.toLowerCase().includes(normalizedQuery)
        || missionary.location.toLowerCase().includes(normalizedQuery)
        || allTags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return matchesFilter(missionary, activeFilter) && matchesQuery;
    });
  }, [activeFilter, missionaries, query]);

  return (
    <>
      <div className="border border-stone-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="sr-only" htmlFor="missionary-search">Search by name, state, or tag</label>
          <input
            id="missionary-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, state, or tag"
            className="min-h-12 w-full border border-stone-300 bg-white px-4 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`min-h-10 border px-4 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 ${
                  activeFilter === filter
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-[#D4A63D] hover:text-stone-950"
                }`}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleMissionaries.map((missionary) => (
          <DirectoryCard key={missionary.slug} missionary={missionary} />
        ))}
      </div>

      {visibleMissionaries.length === 0 ? (
        <div className="mt-8 border border-stone-200 bg-white p-8 text-center text-stone-600">
          {missionaries.length === 0 ? emptyMessage : "No missionaries found."}
        </div>
      ) : null}
    </>
  );
}
