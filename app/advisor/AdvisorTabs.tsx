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
        className="no-print flex flex-wrap gap-px border border-stone-800 bg-stone-800"
        role="tablist"
      >
        {panels.map((panel) => {
          const isActive = panel.id === active.id;

          return (
            <button
              aria-controls={`advisor-tabpanel-${panel.id}`}
              aria-selected={isActive}
              className={`min-w-0 flex-1 break-words px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
                isActive
                  ? "bg-usam-gold text-usam-black"
                  : "bg-usam-black text-stone-400 hover:text-usam-gold"
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
            className={`border border-t-0 border-stone-800 px-5 py-6 sm:px-7 ${
              isActive ? "" : "hidden print:block"
            }`}
            id={`advisor-tabpanel-${panel.id}`}
            key={panel.id}
            role="tabpanel"
          >
            <p
              className="hidden text-[11px] font-bold uppercase tracking-[0.2em] text-usam-gold print:block"
              style={{ fontFamily: font.rajdhani }}
            >
              {panel.label}
            </p>
            {panel.caption ? (
              <p className="mb-5 text-[12px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                {panel.caption}
              </p>
            ) : null}
            {panel.content}
          </div>
        );
      })}

      {note ? <p className="mt-3 text-[13px] leading-6 text-stone-500">{note}</p> : null}
    </div>
  );
}
