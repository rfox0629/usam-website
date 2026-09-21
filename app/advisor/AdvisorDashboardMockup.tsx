import type { AdvisorDashboard } from "@/src/lib/advisor-content";

/**
 * A still of what the DOS platform would look like for a given ministry.
 *
 * Deliberately built from the DOS design tokens (ink #0B1220, body #3D4654,
 * blue #2251E8, hairline #E5E8EF, band #F7F8FB) rather than the briefing's
 * own styling, so it reads as a screen of the real product rather than a
 * chart drawn for a slide.
 *
 * Every value is illustrative. The component renders its own "sample data"
 * marking and does not rely on surrounding prose to say so.
 */

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#E5E8EF] bg-[#F7F8FB] px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-[#D7DBE4]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D7DBE4]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D7DBE4]" />
      </div>
      <p className="truncate text-[12px] font-medium text-[#5A6473]">{title}</p>
    </div>
  );
}

function Metric({ delta, label, value }: { delta?: string; label: string; value: string }) {
  return (
    <div className="min-w-0 bg-white px-4 py-4">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7686]">
        {label}
      </p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none text-[#0B1220]">{value}</p>
      {delta ? <p className="mt-1.5 text-[12px] leading-5 text-[#5A6473]">{delta}</p> : null}
    </div>
  );
}

function Bar({ label, max, value }: { label: string; max: number; value: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[13.5px] text-[#3D4654]">{label}</p>
        <p className="flex-shrink-0 text-[13px] font-medium text-[#0B1220]">{pct}%</p>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E8EF]">
        <div className="h-full rounded-full bg-[#2251E8]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AdvisorDashboardMockup({ dashboard }: { dashboard: AdvisorDashboard }) {
  const { caption, metrics, org, panels, progress, view } = dashboard;

  return (
    <figure className="mt-8">
      <div className="overflow-hidden rounded-lg border border-[#E5E8EF] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.06),0_8px_24px_rgba(11,18,32,0.06)]">
        <WindowChrome title={`${org} · Discipleship Operating System`} />

        {/* App header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8EF] px-5 py-4">
          <div className="min-w-0">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2251E8]"
              style={{ fontFamily: font.rajdhani }}
            >
              {view ?? "Dashboard"}
            </p>
            <p
              className="mt-0.5 truncate text-[19px] font-semibold leading-tight text-[#0B1220]"
              style={{ fontFamily: font.oswald }}
            >
              {org}
            </p>
          </div>
          <span className="flex-shrink-0 rounded-full border border-[#E5E8EF] bg-[#F7F8FB] px-3 py-1 text-[11px] font-medium text-[#6B7686]">
            Sample data
          </span>
        </div>

        {metrics && metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-px border-b border-[#E5E8EF] bg-[#E5E8EF] sm:grid-cols-4">
            {metrics.map((metric) => (
              <Metric
                delta={metric.delta}
                key={metric.label}
                label={metric.label}
                value={metric.value}
              />
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-px bg-[#E5E8EF] lg:grid-cols-2">
          {panels?.map((panel) => (
            <div className="bg-white px-5 py-5" key={panel.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7686]">
                {panel.title}
              </p>
              <ul className="mt-3 divide-y divide-[#E5E8EF]">
                {panel.rows.map((row) => (
                  <li
                    className="flex items-baseline justify-between gap-4 py-2.5"
                    key={`${panel.title}-${row.label}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] leading-6 text-[#0B1220]">{row.label}</p>
                      {row.meta ? (
                        <p className="truncate text-[12.5px] leading-5 text-[#6B7686]">{row.meta}</p>
                      ) : null}
                    </div>
                    <p className="flex-shrink-0 text-[13.5px] font-medium text-[#3D4654]">{row.value}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {progress && progress.length > 0 ? (
            <div className="bg-white px-5 py-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7686]">
                Progress
              </p>
              <div className="mt-4 space-y-4">
                {progress.map((item) => (
                  <Bar key={item.label} label={item.label} max={item.max} value={item.value} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <figcaption className="mt-3 text-[13px] leading-6 text-[#6B7686]">
        {caption ?? `Illustrative mockup of DOS configured for ${org}. Sample data, not a live account.`}
      </figcaption>
    </figure>
  );
}
