import Link from "next/link";
import type { AdvisorExample } from "@/src/lib/advisor-content";
import { exampleThemes } from "./exampleTheme";
import { ExampleSegmentPicker } from "./ExampleSegmentPicker";

/**
 * A full-page dashboard concept.
 *
 * Illustrative throughout. Every organisation-wide figure sits under a visible
 * illustrative marker, and the concept disclaimer appears both at the top and
 * at the foot, so a printed page cannot lose it.
 *
 * Wide data is never a wide table: segments render as stacked cards on narrow
 * screens and as a grid above `sm`, so nothing is clipped and the page never
 * scrolls sideways.
 */

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export function ExampleDashboard({ example }: { example: AdvisorExample }) {
  const theme = exampleThemes[example.theme];
  const labelCase = theme.uppercaseLabels ? "uppercase tracking-[0.1em]" : "";
  const illustrative = example.illustrativeLabel ?? "Illustrative figures";

  return (
    <div className="min-h-screen" data-advisor-doc style={{ backgroundColor: theme.page }}>
      {/* Header */}
      <header
        className="px-5 py-6 sm:px-8 sm:py-8"
        style={{ backgroundColor: theme.headerBg, borderBottom: `3px solid ${theme.headerBorder}` }}
      >
        <div className="mx-auto max-w-[68rem]">
          <Link
            className="no-print inline-flex min-h-[40px] items-center gap-2 text-[13px] font-medium"
            href="/advisor"
            style={{ color: theme.headerKicker }}
          >
            <span aria-hidden="true">&larr;</span> Back to the briefing
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {example.kicker ? (
                <p
                  className={`text-[11px] font-semibold ${labelCase || "uppercase tracking-[0.12em]"}`}
                  style={{ color: theme.headerKicker, fontFamily: font.rajdhani }}
                >
                  {example.kicker}
                </p>
              ) : null}
              <h1
                className="mt-1.5 break-words text-[clamp(1.5rem,5vw,2.25rem)] font-semibold leading-[1.15]"
                style={{ color: theme.headerText, fontFamily: font.oswald }}
              >
                {example.name}
              </h1>
            </div>
            <span
              className="flex-shrink-0 px-3 py-1.5 text-[11px] font-semibold"
              style={{
                backgroundColor: theme.accent,
                borderRadius: theme.cardRadius === "rounded-none" ? 0 : 999,
                color: "#FFFFFF",
              }}
            >
              Concept
            </span>
          </div>

          {example.intro ? (
            <p
              className="mt-4 max-w-[42rem] break-words text-[15.5px] leading-[1.7]"
              style={{ color: theme.headerKicker }}
            >
              {example.intro}
            </p>
          ) : null}
        </div>
      </header>

      {/* Disclaimer, stated before any figure is shown */}
      <div className="px-5 py-3 sm:px-8" style={{ backgroundColor: theme.accentSoft, borderBottom: `1px solid ${theme.line}` }}>
        <p className="mx-auto max-w-[68rem] break-words text-[13.5px] leading-[1.6]" style={{ color: theme.accentText }}>
          {example.disclaimer}
        </p>
      </div>

      <main className="mx-auto max-w-[68rem] px-5 py-8 sm:px-8 sm:py-10">
        {/* Headline figures, with the campus or region selector */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold" style={{ color: theme.ink, fontFamily: font.oswald }}>
              Overview
            </h2>
            <span className="text-[12px] font-medium" style={{ color: theme.muted }}>
              {illustrative}
            </span>
          </div>

          <div className={`mt-4 overflow-hidden ${theme.card} ${theme.cardRadius} p-4 sm:p-5`}>
            {example.segments && example.segments.length > 0 ? (
              <ExampleSegmentPicker
                overallStats={example.stats}
                segmentLabel={example.segmentLabel ?? "View"}
                segments={example.segments}
                theme={theme}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-px lg:grid-cols-4" style={{ backgroundColor: theme.line }}>
                {example.stats.map((stat) => (
                  <div className="min-w-0 bg-white px-4 py-4" key={stat.label}>
                    <dt className={`truncate text-[11px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
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
            )}
          </div>
        </section>

        {/* Segment comparison: cards on narrow screens, grid above sm. Never a wide table. */}
        {example.segments && example.segments.length > 0 ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold" style={{ color: theme.ink, fontFamily: font.oswald }}>
                {example.segmentLabel ? `${example.segmentLabel} comparison` : "Comparison"}
              </h2>
              <span className="text-[12px] font-medium" style={{ color: theme.muted }}>
                {illustrative}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {example.segments.map((segment) => (
                <div className={`${theme.card} ${theme.cardRadius} p-4`} key={segment.name}>
                  <p className="break-words text-[15px] font-semibold" style={{ color: theme.ink }}>
                    {segment.name}
                  </p>
                  <dl className="mt-3 space-y-2">
                    {segment.stats.map((stat) => (
                      <div className="flex items-baseline justify-between gap-3" key={stat.label}>
                        <dt className="min-w-0 break-words text-[13.5px]" style={{ color: theme.muted }}>
                          {stat.label}
                        </dt>
                        <dd className="flex-shrink-0 text-[14px] font-semibold" style={{ color: theme.ink }}>
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {segment.attention ? (
                    <p
                      className="mt-3 border-l-2 pl-3 text-[13px] leading-[1.55]"
                      style={{ borderColor: theme.accent, color: theme.accentText }}
                    >
                      {segment.attention}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Progress */}
        {example.progress && example.progress.length > 0 ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold" style={{ color: theme.ink, fontFamily: font.oswald }}>
                Journeys and progress
              </h2>
              <span className="text-[12px] font-medium" style={{ color: theme.muted }}>
                {illustrative}
              </span>
            </div>
            <div className={`mt-4 ${theme.card} ${theme.cardRadius} space-y-5 p-4 sm:p-5`}>
              {example.progress.map((item) => {
                const pct = Math.min(100, Math.round((item.value / item.max) * 100));

                return (
                  <div key={item.label}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="min-w-0 break-words text-[14px]" style={{ color: theme.ink }}>
                        {item.label}
                      </p>
                      <p className="flex-shrink-0 text-[13.5px] font-semibold" style={{ color: theme.ink }}>
                        {pct}%
                      </p>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden" style={{ backgroundColor: theme.line }}>
                      <div className="h-full" style={{ backgroundColor: theme.accent, width: `${pct}%` }} />
                    </div>
                    {item.note ? (
                      <p className="mt-1.5 text-[12.5px] leading-5" style={{ color: theme.muted }}>
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Lists: resources, follow-up, people beginning to disciple others */}
        {example.lists && example.lists.length > 0 ? (
          <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {example.lists.map((list) => (
              <div className={`${theme.card} ${theme.cardRadius} p-4 sm:p-5`} key={list.title}>
                <p className={`text-[12px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
                  {list.title}
                </p>
                {list.note ? (
                  <p className="mt-1.5 text-[12.5px] leading-5" style={{ color: theme.muted }}>
                    {list.note}
                  </p>
                ) : null}
                <ul className="mt-3 divide-y" style={{ borderColor: theme.line }}>
                  {list.items.map((item) => (
                    <li
                      className="flex items-baseline justify-between gap-3 py-2.5"
                      key={`${list.title}-${item.label}`}
                      style={{ borderColor: theme.line }}
                    >
                      <div className="min-w-0">
                        <p className="break-words text-[14px] leading-6" style={{ color: theme.ink }}>
                          {item.label}
                        </p>
                        {item.meta ? (
                          <p className="break-words text-[12.5px] leading-5" style={{ color: theme.muted }}>
                            {item.meta}
                          </p>
                        ) : null}
                      </div>
                      {item.value ? (
                        <p className="flex-shrink-0 text-[13.5px] font-semibold" style={{ color: theme.ink }}>
                          {item.value}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {/* Activity */}
        {example.activity && example.activity.length > 0 ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold" style={{ color: theme.ink, fontFamily: font.oswald }}>
                Recent activity
              </h2>
              <span className="text-[12px] font-medium" style={{ color: theme.muted }}>
                {illustrative}
              </span>
            </div>
            <ol className={`mt-4 ${theme.card} ${theme.cardRadius} divide-y p-1`} style={{ borderColor: theme.line }}>
              {example.activity.map((item) => (
                <li
                  className="flex flex-col gap-0.5 px-3 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                  key={`${item.when}-${item.what}`}
                  style={{ borderColor: theme.line }}
                >
                  <span
                    className="flex-shrink-0 text-[12px] font-medium sm:w-32"
                    style={{ color: theme.muted }}
                  >
                    {item.when}
                  </span>
                  <span className="min-w-0 break-words text-[14px] leading-6" style={{ color: theme.ink }}>
                    {item.what}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Verified, real numbers. Visually separated from everything above. */}
        {example.verified ? (
          <section className="mt-10">
            <div
              className={`${theme.cardRadius} border-2 border-dashed p-4 sm:p-5`}
              style={{ borderColor: theme.accent }}
            >
              <p className="text-[12px] font-semibold" style={{ color: theme.accentText }}>
                Not illustrative
              </p>
              <h2 className="mt-1 text-[17px] font-semibold" style={{ color: theme.ink, fontFamily: font.oswald }}>
                {example.verified.title}
              </h2>
              <p className="mt-2 max-w-[38rem] break-words text-[14px] leading-[1.65]" style={{ color: theme.muted }}>
                {example.verified.note}
              </p>
              <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
                {example.verified.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className={`text-[11px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
                      {stat.label}
                    </dt>
                    <dd className="mt-1 text-[1.6rem] font-semibold leading-none" style={{ color: theme.ink }}>
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}

        {/* Repeated at the foot so a printed page carries it too */}
        <footer className="mt-10 border-t pt-5" style={{ borderColor: theme.line }}>
          <p className="break-words text-[13px] leading-[1.65]" style={{ color: theme.muted }}>
            {example.disclaimer}
          </p>
          <Link
            className="no-print mt-4 inline-flex min-h-[44px] items-center gap-2 text-[14px] font-medium"
            href="/advisor"
            style={{ color: theme.accentText }}
          >
            <span aria-hidden="true">&larr;</span> Back to the briefing
          </Link>
        </footer>
      </main>
    </div>
  );
}
