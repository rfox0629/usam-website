"use client";

import { useState } from "react";
import type { AdvisorExampleSegment, AdvisorExampleStat } from "@/src/lib/advisor-content";
import type { ExampleTheme } from "./exampleTheme";

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

  return (
    <div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
          {segmentLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[{ name: "All", value: ALL }, ...segments.map((s) => ({ name: s.name, value: s.name }))].map(
            (option) => {
              const isActive = selected === option.value;

              return (
                <button
                  aria-pressed={isActive}
                  className={`min-h-[40px] px-3.5 py-2 text-[13px] font-medium transition-colors ${theme.cardRadius} ${
                    isActive ? "text-white" : ""
                  }`}
                  key={option.value}
                  onClick={() => setSelected(option.value)}
                  style={
                    isActive
                      ? { backgroundColor: theme.accent }
                      : { backgroundColor: "#FFFFFF", border: `1px solid ${theme.line}`, color: theme.ink }
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

      <dl className="mt-4 grid grid-cols-2 gap-px lg:grid-cols-4" style={{ backgroundColor: theme.line }}>
        {stats.map((stat) => (
          <div className="min-w-0 px-4 py-4" key={`${stat.label}-${stat.value}`} style={{ backgroundColor: "#FFFFFF" }}>
            <dt
              className={`truncate text-[11px] font-semibold ${labelCase}`}
              style={{ color: theme.label }}
            >
              {stat.label}
            </dt>
            <dd
              className="mt-1.5 break-words text-[clamp(1.35rem,4vw,1.9rem)] font-semibold leading-none"
              style={{ color: theme.statValue }}
            >
              {stat.value}
            </dd>
            {stat.note ? (
              <p className="mt-1.5 text-[12.5px] leading-5" style={{ color: theme.muted }}>
                {stat.note}
              </p>
            ) : null}
          </div>
        ))}
      </dl>

      {active?.attention ? (
        <p
          className={`mt-3 border-l-2 px-4 py-2.5 text-[13.5px] leading-6 ${theme.cardRadius}`}
          style={{ backgroundColor: theme.accentSoft, borderColor: theme.accent, color: theme.accentText }}
        >
          {active.attention}
        </p>
      ) : null}
    </div>
  );
}
