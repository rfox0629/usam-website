"use client";

import { useState } from "react";
import type { AdvisorExampleSegment, AdvisorExampleStat } from "@/src/lib/advisor-content";
import type { ExampleTheme } from "./exampleTheme";
import { StatTiles } from "./ExampleStatTiles";

/**
 * The campus or region selector.
 *
 * Choosing a segment swaps the headline figures for that segment's own. The
 * figures are illustrative either way, so the selector demonstrates the shape
 * of the idea rather than querying anything.
 */

const ALL = "__all__";

export function ExampleSegmentPicker({
  overallStats,
  segmentLabel,
  segments,
  theme,
}: {
  overallStats: AdvisorExampleStat[];
  segmentLabel: string;
  segments: AdvisorExampleSegment[];
  theme: ExampleTheme;
}) {
  const [selected, setSelected] = useState(ALL);
  const active = segments.find((segment) => segment.name === selected);
  const stats = active ? active.stats : overallStats;
  const labelCase = theme.uppercaseLabels ? "uppercase tracking-[0.1em]" : "";
  const radius = theme.radiusPx ? 999 : 0;

  return (
    <div>
      <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`text-[11.5px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
          {segmentLabel}
        </span>
        <div
          className="flex flex-wrap gap-1 p-1"
          style={{ backgroundColor: theme.surfaceAlt, border: `1px solid ${theme.line}`, borderRadius: radius }}
        >
          {[{ name: "All", value: ALL }, ...segments.map((s) => ({ name: s.name, value: s.name }))].map(
            (option) => {
              const isActive = selected === option.value;

              return (
                <button
                  aria-pressed={isActive}
                  className="min-h-[36px] px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                  key={option.value}
                  onClick={() => setSelected(option.value)}
                  style={
                    isActive
                      ? {
                          backgroundColor: "#FFFFFF",
                          borderRadius: radius,
                          boxShadow: "0 1px 2px rgba(16,24,40,0.12)",
                          color: theme.ink,
                        }
                      : { borderRadius: radius, color: theme.muted }
                  }
                  type="button"
                >
                  {option.name}
                </button>
              );
            },
          )}
        </div>
      </div>

      <p className="mt-3 text-[13px]" style={{ color: theme.muted }}>
        Showing {active ? active.name : "all locations"}. Figures are illustrative.
      </p>

      <div className="mt-4 overflow-hidden" style={{ border: `1px solid ${theme.line}`, borderRadius: theme.radiusPx ? 10 : 0 }}>
        <StatTiles stats={stats} theme={theme} />
      </div>

      {active?.attention ? (
        <p
          className="mt-3 border-l-2 px-4 py-2.5 text-[13.5px] leading-6"
          style={{
            backgroundColor: theme.accentSoft,
            borderColor: theme.accent,
            borderRadius: theme.radiusPx ? "0 8px 8px 0" : 0,
            color: theme.accentText,
          }}
        >
          {active.attention}
        </p>
      ) : null}
    </div>
  );
}
