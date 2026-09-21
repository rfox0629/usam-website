"use client";

import { useState } from "react";
import type { AdvisorLinkGroup } from "@/src/lib/advisor-content";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function AdvisorLinkAccordion({ groups }: { groups: AdvisorLinkGroup[] }) {
  // The appendix is reference material, not reading material: it starts closed
  // so it never competes with the briefing itself.
  const [openTitles, setOpenTitles] = useState<string[]>([]);

  function toggle(title: string) {
    setOpenTitles((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
  }

  return (
    <div className="mt-8 divide-y divide-stone-800 border-y border-stone-800">
      {groups.map((group) => {
        const isOpen = openTitles.includes(group.title);

        return (
          <div key={group.title}>
            <button
              aria-controls={`advisor-links-${group.title.replace(/\W+/g, "-").toLowerCase()}`}
              aria-expanded={isOpen}
              className="no-print flex w-full items-center justify-between gap-4 px-1 py-5 text-left transition-colors hover:text-usam-gold"
              onClick={() => toggle(group.title)}
              type="button"
            >
              <span
                className="text-[13.5px] font-semibold uppercase tracking-[0.14em] text-stone-200"
                style={{ fontFamily: font.rajdhani }}
              >
                {group.title}
              </span>
              <span aria-hidden="true" className="text-lg leading-none text-usam-gold">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {/* Printed copies expand every group. */}
            <div
              className={`px-1 pb-6 ${isOpen ? "" : "hidden print:block"}`}
              id={`advisor-links-${group.title.replace(/\W+/g, "-").toLowerCase()}`}
            >
              <p
                className="hidden pb-3 text-[13.5px] font-semibold uppercase tracking-[0.14em] text-stone-200 print:block"
                style={{ fontFamily: font.rajdhani }}
              >
                {group.title}
              </p>
              {group.note ? <p className="mb-4 text-[14px] leading-7 text-stone-500">{group.note}</p> : null}
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}-${link.label}`}>
                    <a
                      className="break-words text-[14.5px] leading-6 text-stone-300 underline decoration-stone-700 underline-offset-4 transition-colors hover:text-usam-gold hover:decoration-usam-gold"
                      href={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                    {link.description ? (
                      <p className="mt-1 text-[13.5px] leading-6 text-stone-500">{link.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
