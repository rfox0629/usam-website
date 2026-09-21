import Link from "next/link";
import type { AdvisorExample, AdvisorExampleSegment } from "@/src/lib/advisor-content";
import { exampleThemes, type ExampleTheme } from "./exampleTheme";
import { Avatar, GenerationBars, MultiplicationTree, RhythmChart, TrendChart } from "./ExampleCharts";
import { ExampleSegmentPicker } from "./ExampleSegmentPicker";
import { StatTiles } from "./ExampleStatTiles";

/**
 * A full-page dashboard concept, drawn as the product would look.
 *
 * Illustrative throughout. Every organisation-wide figure sits under a visible
 * illustrative marker, and the concept disclaimer appears both at the top and
 * at the foot, so a printed page cannot lose it. The one exception is the
 * "verified" panel, which holds real figures and says so.
 *
 * Wide data is never a wide table: segments render as stacked cards on narrow
 * screens and as a grid above `sm`, the multiplication tree has a stacked twin
 * below `sm`, and every chart keeps its text in HTML so nothing shrinks or
 * clips on a phone. The page never scrolls sideways.
 */

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function SectionHead({
  title,
  marker,
  theme,
  note,
}: {
  title: string;
  marker?: string;
  theme: ExampleTheme;
  note?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="min-w-0 text-[17px] font-semibold" style={{ color: theme.ink, fontFamily: font.oswald }}>
          {title}
        </h2>
        {marker ? (
          <span className="flex-shrink-0 text-[11.5px] font-medium" style={{ color: theme.muted }}>
            {marker}
          </span>
        ) : null}
      </div>
      {note ? (
        <p className="mt-1 max-w-[44rem] break-words text-[13.5px] leading-[1.6]" style={{ color: theme.muted }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Panel({ children, className = "", theme }: { children: React.ReactNode; className?: string; theme: ExampleTheme }) {
  return <div className={`min-w-0 ${theme.card} ${theme.cardRadius} ${className}`}>{children}</div>;
}

function numberOf(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

function SegmentCard({
  segment,
  maxLead,
  theme,
}: {
  segment: AdvisorExampleSegment;
  maxLead: number;
  theme: ExampleTheme;
}) {
  const lead = segment.stats[0];
  const leadValue = lead ? numberOf(lead.value) : null;

  return (
    <Panel className="p-4 sm:p-5" theme={theme}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[15.5px] font-semibold" style={{ color: theme.ink }}>
          {segment.name}
        </p>
        {segment.attention ? (
          <span
            aria-label="Needs attention"
            className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: theme.gold }}
            title="Needs attention"
          />
        ) : null}
      </div>

      {lead && leadValue !== null ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[12px]" style={{ color: theme.muted }}>
              {lead.label}
            </span>
            <span className="text-[22px] font-semibold leading-none" style={{ color: theme.ink }}>
              {lead.value}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full" style={{ backgroundColor: theme.surfaceAlt, borderRadius: theme.radiusPx ? 3 : 0 }}>
            <div
              className="h-full"
              style={{
                backgroundColor: theme.accent,
                borderRadius: theme.radiusPx ? "0 3px 3px 0" : 0,
                width: `${Math.min(100, (leadValue / maxLead) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <dl className="mt-3 divide-y" style={{ borderColor: theme.line }}>
        {segment.stats.slice(lead && leadValue !== null ? 1 : 0).map((stat) => (
          <div className="flex items-baseline justify-between gap-3 py-1.5" key={stat.label} style={{ borderColor: theme.line }}>
            <dt className="min-w-0 break-words text-[13px]" style={{ color: theme.muted }}>
              {stat.label}
            </dt>
            <dd className="flex-shrink-0 text-[13.5px] font-semibold tabular-nums" style={{ color: theme.ink }}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {segment.attention ? (
        <p
          className="mt-3 border-l-2 pl-3 text-[12.5px] leading-[1.55]"
          style={{ borderColor: theme.gold, color: theme.goldText }}
        >
          {segment.attention}
        </p>
      ) : null}
    </Panel>
  );
}

export function ExampleDashboard({ example }: { example: AdvisorExample }) {
  const theme = exampleThemes[example.theme];
  const labelCase = theme.uppercaseLabels ? "uppercase tracking-[0.1em]" : "";
  const illustrative = example.illustrativeLabel ?? "Illustrative figures";
  const nav = example.nav ?? [];
  const segments = example.segments ?? [];
  const maxLead = Math.max(
    1,
    ...segments.map((segment) => (segment.stats[0] ? (numberOf(segment.stats[0].value) ?? 0) : 0)),
  );

  return (
    <div className="min-h-screen" data-advisor-doc style={{ backgroundColor: theme.page }}>
      {/* Application chrome */}
      <header style={{ backgroundColor: theme.headerBg }}>
        <div className="mx-auto max-w-[72rem] px-4 pt-3 sm:px-6">
          <Link
            className="no-print inline-flex min-h-[36px] items-center gap-2 text-[12.5px] font-medium"
            href="/advisor"
            style={{ color: theme.headerKicker }}
          >
            <span aria-hidden="true">&larr;</span> Back to the briefing
          </Link>
        </div>

        <div className="mx-auto max-w-[72rem] px-4 pb-4 pt-2 sm:px-6 sm:pt-3">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-[15px] font-bold text-white"
                style={{
                  backgroundColor: theme.accent,
                  borderRadius: theme.radiusPx ? 12 : 0,
                  fontFamily: font.oswald,
                }}
              >
                {example.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")}
              </span>
              <div className="min-w-0">
                <h1
                  className="break-words text-[clamp(1.25rem,4vw,1.6rem)] font-semibold leading-[1.15]"
                  style={{ color: theme.headerText, fontFamily: font.oswald }}
                >
                  {example.name}
                </h1>
                {example.kicker ? (
                  <p
                    className={`mt-0.5 text-[11px] font-semibold ${labelCase || "uppercase tracking-[0.12em]"}`}
                    style={{ color: theme.headerKicker, fontFamily: font.rajdhani }}
                  >
                    {example.kicker}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {example.period ? (
                <span
                  className="inline-flex min-h-[34px] items-center gap-2 px-3 text-[12.5px] font-medium"
                  style={{
                    border: `1px solid ${theme.headerBorder}`,
                    borderRadius: theme.radiusPx ? 8 : 0,
                    color: theme.headerKicker,
                  }}
                >
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                  {example.period}
                </span>
              ) : null}
              <span
                className="inline-flex min-h-[34px] items-center px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor: theme.accent,
                  borderRadius: theme.radiusPx ? 8 : 0,
                  color: "#FFFFFF",
                }}
              >
                Concept
              </span>
            </div>
          </div>

          {nav.length > 0 ? (
            <div
              aria-hidden="true"
              className="mt-4 flex gap-1 overflow-x-auto border-t pt-2 [scrollbar-width:none]"
              style={{ borderColor: theme.headerBorder }}
            >
              {nav.map((item, i) => (
                <span
                  className="relative flex-shrink-0 whitespace-nowrap px-3 py-2 text-[13px] font-medium"
                  key={item}
                  style={{ color: i === 0 ? theme.headerText : theme.headerMuted }}
                >
                  {item}
                  {i === 0 ? (
                    <span
                      className="absolute inset-x-3 -bottom-2 h-0.5"
                      style={{ backgroundColor: theme.accent }}
                    />
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {/* Disclaimer, stated before any figure is shown */}
      <div className="px-4 py-3 sm:px-6" style={{ backgroundColor: theme.accentSoft, borderBottom: `1px solid ${theme.line}` }}>
        <p className="mx-auto max-w-[72rem] break-words text-[13px] leading-[1.6]" style={{ color: theme.accentText }}>
          {example.disclaimer}
        </p>
      </div>

      <main className="mx-auto max-w-[72rem] px-4 py-6 sm:px-6 sm:py-8">
        {example.intro ? (
          <p className="max-w-[46rem] break-words text-[15px] leading-[1.7]" style={{ color: theme.muted }}>
            {example.intro}
          </p>
        ) : null}

        {/* Headline figures, with the campus or region selector */}
        <section className={example.intro ? "mt-6" : ""}>
          <SectionHead marker={illustrative} theme={theme} title="Overview" />
          <Panel className="mt-3 p-4 sm:p-5" theme={theme}>
            {segments.length > 0 ? (
              <ExampleSegmentPicker
                overallStats={example.stats}
                segmentLabel={example.segmentLabel ?? "View"}
                segments={segments}
                theme={theme}
              />
            ) : (
              <div className="overflow-hidden" style={{ border: `1px solid ${theme.line}`, borderRadius: theme.radiusPx ? 10 : 0 }}>
                <StatTiles stats={example.stats} theme={theme} />
              </div>
            )}
          </Panel>
        </section>

        {/* One person, in place: the multiplication story starts with a face. */}
        {example.spotlight || example.network ? (
          <section className="mt-8">
            <SectionHead
              marker={illustrative}
              note={example.network?.note ?? example.spotlight?.note}
              theme={theme}
              title={example.network?.title ?? example.spotlight?.title ?? "Multiplication"}
            />
            <div className={`mt-3 grid grid-cols-1 gap-4 ${example.spotlight && example.network ? "lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]" : ""}`}>
              {example.spotlight ? (
                <Panel className="p-5" theme={theme}>
                  <p className={`text-[11.5px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
                    {example.spotlight.title}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <Avatar
                      name={example.spotlight.person.name}
                      photo={example.spotlight.person.photo}
                      ring
                      size={72}
                      theme={theme}
                    />
                    <div className="min-w-0">
                      <p className="break-words text-[18px] font-semibold leading-tight" style={{ color: theme.ink, fontFamily: font.oswald }}>
                        {example.spotlight.person.name}
                      </p>
                      <p className="mt-1 break-words text-[13px] leading-5" style={{ color: theme.muted }}>
                        {example.spotlight.person.role}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: theme.line }}>
                    <div>
                      <dt className="text-[11.5px]" style={{ color: theme.muted }}>
                        {example.segmentLabel ?? "Location"}
                      </dt>
                      <dd className="mt-0.5 break-words text-[14.5px] font-semibold" style={{ color: theme.ink }}>
                        {example.spotlight.place.name}
                      </dd>
                      {example.spotlight.place.detail ? (
                        <dd className="break-words text-[12.5px] leading-5" style={{ color: theme.muted }}>
                          {example.spotlight.place.detail}
                        </dd>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar name={example.spotlight.lead.name} size={34} theme={theme} tone="dark" />
                      <div className="min-w-0">
                        <dt className="text-[11.5px]" style={{ color: theme.muted }}>
                          {example.spotlight.lead.role}
                        </dt>
                        <dd className="break-words text-[14px] font-semibold" style={{ color: theme.ink }}>
                          {example.spotlight.lead.name}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-5 overflow-hidden" style={{ border: `1px solid ${theme.line}`, borderRadius: theme.radiusPx ? 10 : 0 }}>
                    <StatTiles columns={2} stats={example.spotlight.stats} theme={theme} />
                  </div>

                  {example.spotlight.tags && example.spotlight.tags.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {example.spotlight.tags.map((tag) => (
                        <li
                          className="px-2.5 py-1 text-[12px] font-medium"
                          key={tag}
                          style={{
                            backgroundColor: theme.surfaceAlt,
                            border: `1px solid ${theme.line}`,
                            borderRadius: theme.radiusPx ? 999 : 0,
                            color: theme.ink,
                          }}
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Panel>
              ) : null}

              {example.network ? (
                <Panel className="p-4 sm:p-5" theme={theme}>
                  <MultiplicationTree network={example.network} theme={theme} />
                  {example.network.legend ? (
                    <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5" style={{ color: theme.muted }}>
                      <span
                        aria-hidden="true"
                        className="mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: theme.gold }}
                      />
                      <span>{example.network.legend}</span>
                    </p>
                  ) : null}
                  {example.network.generations ? (
                    <div className="mt-5 border-t pt-4" style={{ borderColor: theme.line }}>
                      <p className={`text-[11.5px] font-semibold ${labelCase}`} style={{ color: theme.label }}>
                        {example.network.generationsTitle ?? "People by generation"}
                      </p>
                      <div className="mt-3">
                        <GenerationBars items={example.network.generations} theme={theme} />
                      </div>
                    </div>
                  ) : null}
                </Panel>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Through the week, and over time */}
        {example.rhythm || example.trend ? (
          <section className={`mt-8 grid grid-cols-1 gap-4 ${example.rhythm && example.trend ? "lg:grid-cols-2" : ""}`}>
            {example.rhythm ? (
              <div className="min-w-0">
                <SectionHead marker={illustrative} note={example.rhythm.note} theme={theme} title={example.rhythm.title} />
                <Panel className="mt-3 p-4 sm:p-5" theme={theme}>
                  <RhythmChart rhythm={example.rhythm} theme={theme} />
                  {example.rhythm.callout ? (
                    <p
                      className="mt-4 border-l-2 pl-3 text-[13.5px] font-medium leading-[1.55]"
                      style={{ borderColor: theme.accent, color: theme.accentText }}
                    >
                      {example.rhythm.callout}
                    </p>
                  ) : null}
                </Panel>
              </div>
            ) : null}
            {example.trend ? (
              <div className="min-w-0">
                <SectionHead marker={illustrative} note={example.trend.note} theme={theme} title={example.trend.title} />
                <Panel className="mt-3 p-4 sm:p-5" theme={theme}>
                  <TrendChart theme={theme} trend={example.trend} />
                </Panel>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Segment comparison: cards on narrow screens, grid above sm. Never a wide table. */}
        {segments.length > 0 ? (
          <section className="mt-8">
            <SectionHead
              marker={illustrative}
              theme={theme}
              title={example.segmentLabel ? `${example.segmentLabel} comparison` : "Comparison"}
            />
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {segments.map((segment) => (
                <SegmentCard key={segment.name} maxLead={maxLead} segment={segment} theme={theme} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Progress and lists */}
        {(example.progress && example.progress.length > 0) || (example.lists && example.lists.length > 0) ? (
          <section className="mt-8">
            <SectionHead marker={illustrative} theme={theme} title="Journeys and follow up" />
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {example.progress && example.progress.length > 0 ? (
                <Panel className="space-y-5 p-4 sm:p-5 lg:col-span-1" theme={theme}>
                  {example.progress.map((item) => {
                    const pct = Math.min(100, Math.round((item.value / item.max) * 100));

                    return (
                      <div key={item.label}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="min-w-0 break-words text-[14px] font-medium" style={{ color: theme.ink }}>
                            {item.label}
                          </p>
                          <p className="flex-shrink-0 text-[13.5px] font-semibold tabular-nums" style={{ color: theme.ink }}>
                            {item.value} of {item.max}
                          </p>
                        </div>
                        <div
                          className="mt-2 h-2.5 w-full overflow-hidden"
                          style={{ backgroundColor: theme.accentSoft, borderRadius: theme.radiusPx ? 5 : 0 }}
                        >
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
                </Panel>
              ) : null}

              {example.lists?.map((list) => (
                <Panel className="p-4 sm:p-5" key={list.title} theme={theme}>
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
                          <p className="flex-shrink-0 text-[15px] font-semibold tabular-nums" style={{ color: theme.ink }}>
                            {item.value}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Panel>
              ))}
            </div>
          </section>
        ) : null}

        {/* Activity */}
        {example.activity && example.activity.length > 0 ? (
          <section className="mt-8">
            <SectionHead marker={illustrative} theme={theme} title="Recent activity" />
            <Panel className="mt-3 divide-y p-1" theme={theme}>
              {example.activity.map((item) => (
                <div
                  className="flex flex-col gap-0.5 px-3 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                  key={`${item.when}-${item.what}`}
                  style={{ borderColor: theme.line }}
                >
                  <span className="flex-shrink-0 text-[12px] font-medium sm:w-28" style={{ color: theme.muted }}>
                    {item.when}
                  </span>
                  <span className="min-w-0 break-words text-[14px] leading-6" style={{ color: theme.ink }}>
                    {item.what}
                  </span>
                </div>
              ))}
            </Panel>
          </section>
        ) : null}

        {/* Verified, real numbers. Visually separated from everything above. */}
        {example.verified ? (
          <section className="mt-8">
            <div
              className={`${theme.cardRadius} border-2 border-dashed bg-white p-4 sm:p-5`}
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
