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
    <div className="mt-6 divide-y divide-[#E5E8EF] border-y border-[#E5E8EF]">
      {groups.map((group) => {
        const isOpen = openTitles.includes(group.title);

        return (
          <div key={group.title}>
            <button
              aria-controls={`advisor-links-${group.title.replace(/\W+/g, "-").toLowerCase()}`}
              aria-expanded={isOpen}
              className="no-print flex w-full items-center justify-between gap-4 px-1 py-4 text-left transition-colors hover:text-[#0B1220]"
              onClick={() => toggle(group.title)}
              type="button"
            >
              <span
                className="text-[14px] font-medium text-[#0B1220]"
                style={{ fontFamily: font.rajdhani }}
              >
                {group.title}
              </span>
              <span aria-hidden="true" className="text-lg leading-none text-[#8A6D1F]">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {/* Printed copies expand every group. */}
            <div
              className={`px-1 pb-6 ${isOpen ? "" : "hidden print:block"}`}
              id={`advisor-links-${group.title.replace(/\W+/g, "-").toLowerCase()}`}
            >
              <p
                className="hidden pb-3 text-[14px] font-medium text-[#0B1220] print:block"
                style={{ fontFamily: font.rajdhani }}
              >
                {group.title}
              </p>
              {group.note ? <p className="mb-3 text-[14px] leading-[1.6] text-[#6B7686]">{group.note}</p> : null}
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}-${link.label}`}>
                    <a
                      className="break-words text-[14.5px] leading-6 text-[#1E3FB8] underline decoration-[#C7D0E8] underline-offset-4 transition-colors hover:decoration-[#1E3FB8]"
                      href={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                    {link.description ? (
                      <p className="mt-1 text-[13.5px] leading-6 text-[#6B7686]">{link.description}</p>
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
