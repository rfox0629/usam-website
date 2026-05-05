"use client";

import { useMemo, useState } from "react";
import type { MissionaryFruitItem } from "@/src/data/missionaries";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function sourceLabel(item: MissionaryFruitItem) {
  if (item.source === "dos") {
    return "DOS";
  }

  if (item.source === "public_form") {
    return "Public Form";
  }

  return "Website Admin";
}

function fruitDateValue(item: MissionaryFruitItem) {
  const date = new Date(item.testimonyDate ?? item.createdAt);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function FruitCard({ item }: { item: MissionaryFruitItem }) {
  return (
    <article className="border border-stone-800/80 bg-[#080808] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {formatDate(item.testimonyDate ?? item.createdAt)}
        </p>
        {item.category ? (
          <span className="border border-stone-700 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {item.category}
          </span>
        ) : null}
        {item.isFeatured ? (
          <span className="border border-[#D4A63D]/40 bg-[#D4A63D]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Featured
          </span>
        ) : null}
      </div>
      <h4 className="mt-3 text-xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
        {item.title || "Field Testimony"}
      </h4>
      <p className="mt-3 text-sm leading-7 text-stone-300">
        {item.body}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        {item.submittedByName ? <span>{item.submittedByName}</span> : null}
        <span>{sourceLabel(item)}</span>
      </div>
    </article>
  );
}

export function FruitFromTheFieldModal({
  items,
}: {
  items: readonly MissionaryFruitItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [sortMode, setSortMode] = useState<"featured" | "impactful" | "newest">("featured");
  const categories = useMemo(() => (
    Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort()
  ), [items]);
  const filteredItems = useMemo(() => {
    const nextItems = category === "all"
      ? [...items]
      : items.filter((item) => item.category === category);

    return nextItems.sort((first, second) => {
      if ((sortMode === "featured" || sortMode === "impactful") && first.isFeatured !== second.isFeatured) {
        return first.isFeatured ? -1 : 1;
      }

      if (sortMode === "featured" && first.isFeatured && first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return fruitDateValue(second) - fruitDateValue(first);
    });
  }, [category, items, sortMode]);

  return (
    <>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] sm:w-auto"
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        View More Testimonies
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto border border-stone-700 bg-[#090909] p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Fruit From The Field
                </p>
                <h3 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                  Testimonies & Updates
                </h3>
              </div>
              <button
                aria-label="Close testimonies"
                className="border border-stone-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-stone-300 hover:border-[#D4A63D] hover:text-[#F5B942]"
                onClick={() => setIsOpen(false)}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-y border-stone-800 py-4 sm:flex-row sm:items-center">
              <label className="block sm:w-56">
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Category
                </span>
                <select
                  className="mt-2 min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  <option value="all">All</option>
                  {categories.map((itemCategory) => (
                    <option key={itemCategory} value={itemCategory}>{itemCategory}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:w-56">
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Sort
                </span>
                <select
                  className="mt-2 min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]"
                  onChange={(event) => setSortMode(event.target.value as "featured" | "impactful" | "newest")}
                  value={sortMode}
                >
                  <option value="featured">Featured first</option>
                  <option value="impactful">Most impactful</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-4">
              {filteredItems.map((item) => (
                <FruitCard item={item} key={item.id} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
