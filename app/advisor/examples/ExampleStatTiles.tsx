import type { AdvisorExampleStat } from "@/src/lib/advisor-content";
import type { ExampleTheme } from "./exampleTheme";

/**
 * The KPI row: one tile per headline figure, each with an optional signed
 * delta and a small sparkline. Shared by the server-rendered dashboard and
 * the client-side campus picker, so it carries no directive and no hooks.
 */

const SPARK_W = 96;
const SPARK_H = 28;

export function Sparkline({ values, theme }: { values: number[]; theme: ExampleTheme }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = SPARK_W / (values.length - 1);
  const points = values.map((value, i) => ({
    x: i * stepX,
    y: 3 + (SPARK_H - 6) * (1 - (value - min) / span),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${SPARK_W} ${SPARK_H} L0 ${SPARK_H} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      aria-hidden="true"
      className="block h-7 w-24 flex-shrink-0"
      focusable="false"
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      width={SPARK_W}
    >
      <path d={area} fill={theme.accent} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={theme.accentLight} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <circle cx={last.x} cy={last.y} fill={theme.accent} r={4} stroke="#FFFFFF" strokeWidth={2} />
    </svg>
  );
}

export function StatTiles({
  stats,
  theme,
  columns = 4,
}: {
  stats: AdvisorExampleStat[];
  theme: ExampleTheme;
  columns?: 2 | 3 | 4;
}) {
  const labelCase = theme.uppercaseLabels ? "uppercase tracking-[0.1em]" : "";
  const cols = columns === 4 ? "lg:grid-cols-4" : columns === 3 ? "lg:grid-cols-3" : "";

  return (
    <dl className={`grid grid-cols-2 gap-px ${cols}`} style={{ backgroundColor: theme.line }}>
      {stats.map((stat) => (
        <div className="min-w-0 bg-white px-4 py-4 sm:px-5" key={`${stat.label}-${stat.value}`}>
          <dt className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`break-words text-[11.5px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
              {stat.label}
            </span>
            {stat.tag ? (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor: theme.accentSoft,
                  borderRadius: theme.radiusPx ? 999 : 0,
                  color: theme.accentText,
                }}
              >
                {stat.tag}
              </span>
            ) : null}
          </dt>
          <dd className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <span
              className="break-words text-[clamp(1.6rem,4.5vw,2.1rem)] font-semibold leading-none"
              style={{ color: theme.statValue }}
            >
              {stat.value}
            </span>
            {stat.trend ? <Sparkline theme={theme} values={stat.trend} /> : null}
          </dd>
          {stat.delta ? (
            <p className="mt-2 text-[12.5px] font-medium leading-5" style={{ color: theme.accentText }}>
              {stat.delta}
            </p>
          ) : null}
          {stat.note ? (
            <p className="mt-1 text-[12.5px] leading-5" style={{ color: theme.muted }}>
              {stat.note}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
