"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export type AdvisorTabPanel = {
  caption?: string;
  content: ReactNode;
  id: string;
  label: string;
};

export function AdvisorTabs({ note, panels }: { note?: string; panels: AdvisorTabPanel[] }) {
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "");
  const active = panels.find((panel) => panel.id === activeId) ?? panels[0];

  if (!active) {
    return null;
  }

  return (
    <div className="mt-8">
      <div
        aria-label="Examples"
        className="no-print flex flex-wrap gap-px border border-[#E5E8EF] bg-[#E5E8EF]"
        role="tablist"
      >
        {panels.map((panel) => {
          const isActive = panel.id === active.id;

          return (
            <button
              aria-controls={`advisor-tabpanel-${panel.id}`}
              aria-selected={isActive}
              className={`min-w-0 flex-1 break-words px-4 py-2.5 text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-[#0B1220] text-white"
                  : "bg-white text-[#5A6473] hover:text-[#0B1220]"
              }`}
              id={`advisor-tab-${panel.id}`}
              key={panel.id}
              onClick={() => setActiveId(panel.id)}
              role="tab"
              style={{ fontFamily: font.rajdhani }}
              type="button"
            >
              {panel.label}
            </button>
          );
        })}
      </div>

      {/* Print shows every panel: a paper copy has no tabs to click. */}
      {panels.map((panel) => {
        const isActive = panel.id === active.id;

        return (
          <div
            aria-labelledby={`advisor-tab-${panel.id}`}
            className={`border border-t-0 border-[#E5E8EF] bg-white px-5 py-5 sm:px-6 ${
              isActive ? "" : "hidden print:block"
            }`}
            id={`advisor-tabpanel-${panel.id}`}
            key={panel.id}
            role="tabpanel"
          >
            <p
              className="hidden text-[12px] font-semibold text-[#0B1220] print:block"
              style={{ fontFamily: font.rajdhani }}
            >
              {panel.label}
            </p>
            {panel.caption ? (
              <p className="mb-4 text-[12.5px] text-[#6B7686]" style={{ fontFamily: font.rajdhani }}>
                {panel.caption}
              </p>
            ) : null}
            {panel.content}
          </div>
        );
      })}

      {note ? <p className="mt-3 text-[15.5px] leading-[1.75] text-[#5A6473]">{note}</p> : null}
    </div>
  );
}
