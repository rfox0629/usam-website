"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Eyebrow, PillRail, Segmented } from "@/src/components/dos/ui";
import {
  buildDosMinistryReport,
  dosMinistryMultiplicationLabel,
  dosMinistryReportDefaultRange,
  dosMinistryReportFilterOptions,
  dosMinistryReportRangeOptions,
  dosMinistryRowMatchesFilter,
  formatDosMinistryMinutes,
  type DosMinistryCompleteness,
  type DosMinistryFruitRow,
  type DosMinistryPersonRow,
  type DosMinistryReportFilter,
  type DosMinistryReportInput,
  type DosMinistryReportRange,
} from "@/src/lib/dos/ministry-report";

/* Master Ministry Report — Time Investment (USA-251).
 *
 * Founder revision of 2026-09-10: one primary table, one row per person, in
 * a horizontal-scroll container so no width ever clips it; multiplication and
 * fruit as columns with honest states; "Relationship not set" instead of
 * "Direction unresolved"; a compact Ministry Fruit table beneath. Every number
 * still comes from `buildDosMinistryReport`, and every row still opens into
 * the records that produced it. Nothing here writes data.
 */

/* Founder colour language (2026-09-09): green only for genuinely confirmed
   status; blue for neutral information, partial or incomplete data, an unset
   relationship, and attention; white / grey for ordinary surfaces. No yellow,
   amber, orange, or red anywhere in Reports or Home. */
/* The only tones this report may use. */
type ReportTone = "grey" | "blue" | "green";

const completenessTone: Record<DosMinistryCompleteness, ReportTone> = {
  recorded: "green",
  partial: "blue",
  none: "grey",
  unresolved: "blue",
};

const completenessPillLabel: Record<DosMinistryCompleteness, string> = {
  recorded: "Recorded",
  partial: "Partial",
  none: "No activity",
  unresolved: "Needs relationship",
};

const pillTone: Record<ReportTone, string> = {
  grey: "bg-dos-surface2 text-dos-secondary",
  blue: "bg-dos-blue50 text-dos-blueText",
  green: "bg-dos-greenBg text-dos-green",
};

/* The shared StatusPill caps its width at 100px (spec §3), which truncates
   "Needs relationship", the founder's chosen wording. Same tokens, same
   height, no cap. */
function Pill({ children, tone }: { children: string; tone: ReportTone }) {
  return <span className={`inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-dos-3 px-2 text-dos-pill ${pillTone[tone]}`}>{children}</span>;
}

function formatReportDate(dateKey: string, withYear = false) {
  const date = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString("en-US", withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

function formatPeriod(start: string, end: string) {
  return `${formatReportDate(start)} – ${formatReportDate(end, true)}`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

function SummaryTile({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="min-w-0 rounded-dos-1 border border-dos-line bg-white px-3.5 py-3">
      <p className="text-dos-eyebrow uppercase text-dos-eyebrow">{label}</p>
      <p className="mt-1 text-dos-heading text-dos-primary">{value}</p>
      {note ? <p className="mt-0.5 text-dos-meta text-dos-secondary">{note}</p> : null}
    </div>
  );
}

/* Header and body cell classes. The first column is sticky so the person
   stays visible while the rest scrolls. */
const headCell = "px-2 py-2 text-left text-dos-eyebrow uppercase text-dos-eyebrow";
const bodyCell = "px-2 py-3 align-top text-dos-body text-dos-primary";
/* The fruit table shows four columns on a phone, so its cells are a little tighter there. */
const fruitCell = "px-1.5 py-3 align-top text-dos-body text-dos-primary md:px-2";
const fruitHead = "px-1.5 py-2 text-left text-dos-eyebrow uppercase text-dos-eyebrow md:px-2";
const stickyCell = "sticky left-0 z-10 bg-white group-hover:bg-dos-surface2";

function multiplicationDetail(row: DosMinistryPersonRow) {
  const name = firstName(row.personName);

  switch (row.downstreamStatus) {
    case "resolved":
      return `${row.personName}'s own Person records say they are discipling ${plural(row.downstream.length, "person", "people")}: ${row.downstream.map((link) => link.name).join(", ")}. Resolved through a linked DOS identity.`;
    case "not_recorded":
      return `${name}'s own Person records were read and name no one ${name} is discipling.`;
    case "not_resolved":
      return `${name} has a linked DOS identity. Reading ${name}'s own Person relationships is not built yet, so nothing is claimed.`;
    case "not_connected":
      return `${name} has no verified DOS identity, so ${name}'s own records cannot be reached. Nothing is claimed.`;
    default:
      return null;
  }
}

/* Never a zero for missing data: zero is a measurement and DOS has none. A
   relationship with no meetings in range has no duration ("—"); a row whose
   meetings all lack a duration reads "Not logged". */
function rowDuration(row: DosMinistryPersonRow) {
  if (row.meetingCount === 0) {
    return "—";
  }

  return row.loggedMinutes === 0 && row.meetingsMissingDuration === row.meetingCount
    ? "Not logged"
    : formatDosMinistryMinutes(row.loggedMinutes);
}

function durationBreakdown(row: DosMinistryPersonRow) {
  if (!row.minutesByBucket.received && !row.meetingsByBucket.received && !row.meetingsByBucket.unresolved) {
    return null;
  }

  return [
    row.meetingsByBucket.invested ? `${formatDosMinistryMinutes(row.minutesByBucket.invested)} I invested` : null,
    row.meetingsByBucket.received ? `${formatDosMinistryMinutes(row.minutesByBucket.received)} invested in me` : null,
    row.meetingsByBucket.unresolved ? `${formatDosMinistryMinutes(row.minutesByBucket.unresolved)} not counted` : null,
  ].filter(Boolean).join(" · ");
}

function RowDetail({
  onOpenMeeting,
  onOpenPerson,
  row,
}: {
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  row: DosMinistryPersonRow;
}) {
  const multiplication = multiplicationDetail(row);

  return (
    <div className="grid gap-4 border-t border-dos-line bg-dos-surface2/60 px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Relationship</p>
          <p className="mt-1 text-dos-body font-semibold text-dos-primary">{row.relationshipLabel}{row.relationshipNote ? ` · ${row.relationshipNote}` : ""}</p>
          <p className="text-dos-meta text-dos-secondary">From the Person record&apos;s structured relationship, which is canonical.</p>
        </div>
        <div>
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Data status</p>
          <p className="mt-1 text-dos-body font-semibold text-dos-primary">{row.completeness === "unresolved" ? "Needs relationship" : row.completenessLabel}</p>
          <p className="text-dos-meta text-dos-secondary">{row.completenessDetail}</p>
        </div>
      </div>

      {row.directionConflict ? (
        <p className="rounded-dos-1 bg-dos-blue50 px-3 py-2 text-dos-meta text-dos-blueText">{row.directionConflict}</p>
      ) : null}

      {multiplication ? (
        <div>
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Multiplication</p>
          <p className="mt-1 text-dos-body font-semibold text-dos-primary">{dosMinistryMultiplicationLabel(row)}</p>
          <p className="text-dos-meta text-dos-secondary">{multiplication}</p>
        </div>
      ) : null}

      <div>
        <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Contributing records</p>
        {row.records.length ? (
          <ul className="mt-1 divide-y divide-dos-line rounded-dos-1 border border-dos-line bg-white">
            {row.records.map((record) => (
              <li className="flex min-h-[52px] items-center gap-3 px-3 py-2 text-dos-primary" key={`${record.kind}-${record.id}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-dos-label text-dos-primary">{formatReportDate(record.date)} · {record.label}</span>
                  <span className="block text-dos-meta text-dos-secondary">
                    {record.kind === "meeting" ? "Logged duration" : "Check-in duration"}: {formatDosMinistryMinutes(record.minutes)}
                    {record.kind === "meeting" ? ` · ${record.bucket === "received" ? "invested in me" : record.bucket === "unresolved" ? "not counted" : "I invested"}` : ""}
                    {record.kind === "meeting" && record.shared ? " · credited to each person present" : ""}
                    {record.kind === "meeting" ? ` · ${record.bucketReason}` : ""}
                    {record.kind === "check_in" ? " · not a meeting, not contact time" : ""}
                  </span>
                </span>
                <Button compact onClick={() => (record.open.kind === "meeting" ? onOpenMeeting(record.open.id) : onOpenPerson(record.open.id))} variant="secondary">
                  {record.open.kind === "meeting" ? "Open meeting" : "Open person"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-dos-body text-dos-secondary">No meeting or check-in is logged for this range.</p>
        )}
      </div>

      <div>
        <Button compact onClick={() => onOpenPerson(row.personId)} variant="tinted">Open {row.personName}</Button>
      </div>
    </div>
  );
}

function PersonRow({
  expanded,
  onOpenMeeting,
  onOpenPerson,
  onToggle,
  row,
}: {
  expanded: boolean;
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  onToggle: () => void;
  row: DosMinistryPersonRow;
}) {
  const lastActivity = row.lastActivity
    ? `${formatReportDate(row.lastActivity.date)} · ${row.lastActivity.kind === "meeting" ? "meeting" : "check-in"}`
    : "None in range";
  const breakdown = durationBreakdown(row);
  const multiplication = dosMinistryMultiplicationLabel(row);
  const chevron = expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4" strokeWidth={2} /> : <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />;

  return (
    <>
      <tr className="group cursor-pointer border-t border-dos-line hover:bg-dos-surface2" onClick={onToggle}>
        <td className={`${bodyCell} ${stickyCell} border-r border-dos-line pl-3 md:min-w-[160px] md:max-w-[240px]`}>
          <button
            aria-expanded={expanded}
            className="flex w-full items-start gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            type="button"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{row.personName}</span>
              <span className="mt-0.5 block whitespace-normal text-dos-meta text-dos-secondary md:hidden">
                {row.relationshipLabel} · {plural(row.meetingCount, "meeting")} · {rowDuration(row)}
                {breakdown ? ` (${breakdown})` : ""} · last {row.lastActivity ? formatReportDate(row.lastActivity.date) : "none"}
              </span>
            </span>
            <span className="text-dos-secondary">{chevron}</span>
          </button>
        </td>
        <td className={`${bodyCell} hidden md:table-cell md:max-w-[180px]`}>
          <span className="block">{row.relationshipLabel}</span>
          {row.relationshipNote ? <span className="block text-dos-meta text-dos-blueText">{row.relationshipNote}</span> : null}
        </td>
        <td className={`${bodyCell} hidden tabular-nums md:table-cell`}>{row.meetingCount}</td>
        <td className={`${bodyCell} hidden tabular-nums md:table-cell md:min-w-[112px] md:max-w-[200px]`}>
          <span className="block">{rowDuration(row)}</span>
          {breakdown ? <span className="block text-dos-meta text-dos-secondary">{breakdown}</span> : null}
        </td>
        <td className={`${bodyCell} hidden text-dos-meta md:table-cell`}>{lastActivity}</td>
        <td className={`${bodyCell} hidden md:table-cell ${row.downstreamStatus === "resolved" ? "" : "text-dos-secondary"}`}>{multiplication}</td>
        <td className={`${bodyCell} hidden md:table-cell ${row.fruitCount ? "" : "text-dos-secondary"}`}>{row.fruitCount ? `${row.fruitCount} recorded` : "None recorded"}</td>
        <td className={`${bodyCell} pr-3 text-right md:text-left`}><Pill tone={completenessTone[row.completeness]}>{completenessPillLabel[row.completeness]}</Pill></td>
      </tr>
      {expanded ? (
        <tr>
          <td className="p-0" colSpan={8}>
            <RowDetail onOpenMeeting={onOpenMeeting} onOpenPerson={onOpenPerson} row={row} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function FruitTable({ onOpenMeeting, rows }: { onOpenMeeting: (meetingId: string) => void; rows: DosMinistryFruitRow[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-dos-2 border border-dos-line bg-white px-4 py-5 text-dos-body text-dos-secondary">
        No fruit, review, testimony, or Journey completion is recorded in this range.
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-dos-2 border border-dos-line bg-white">
      <table className="w-full border-collapse md:min-w-[700px]">
        <thead>
          <tr className="bg-dos-surface2">
            <th className={`${fruitHead} whitespace-nowrap md:pl-3`} scope="col">Date</th>
            <th className={fruitHead} scope="col">Person</th>
            <th className={fruitHead} scope="col">Fruit or feedback</th>
            <th className={`${fruitHead} hidden md:table-cell`} scope="col">Source</th>
            <th className={`${fruitHead} hidden md:table-cell`} scope="col">Related activity</th>
            <th className={`${fruitHead} md:pr-3`} scope="col">Data status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-dos-line" key={row.id}>
              <td className={`${fruitCell} whitespace-nowrap text-dos-meta md:pl-3`}>{formatReportDate(row.date)}</td>
              <td className={fruitCell}>
                <span className="block">{row.personName}</span>
                {row.personSource === "meeting" ? <span className="block text-dos-meta text-dos-secondary">via the meeting</span> : null}
                <span className="block text-dos-meta text-dos-secondary md:hidden">{row.sourceLabel}</span>
              </td>
              <td className={fruitCell}>{row.text}</td>
              <td className={`${fruitCell} hidden whitespace-nowrap md:table-cell`}>{row.sourceLabel}</td>
              <td className={`${fruitCell} hidden md:table-cell`}>
                {row.open ? (
                  <button className="text-left text-dos-blueText underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={() => onOpenMeeting(row.open!.id)} type="button">
                    {row.relatedLabel}
                  </button>
                ) : (
                  <span className={row.relatedLabel === "Not linked" ? "text-dos-secondary" : ""}>{row.relatedLabel}</span>
                )}
              </td>
              <td className={`${fruitCell} md:pr-3`}><Pill tone={row.statusTone}>{row.statusLabel}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MinistryTimeInvestmentReport({
  input,
  now,
  onOpenMeeting,
  onOpenPerson,
}: {
  input: Omit<DosMinistryReportInput, "now" | "period" | "range">;
  /* Injected so the visual suite's pinned clock applies. */
  now: Date;
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
}) {
  const [range, setRange] = useState<DosMinistryReportRange>(dosMinistryReportDefaultRange);
  const [filter, setFilter] = useState<DosMinistryReportFilter>("all");
  const [customPeriod, setCustomPeriod] = useState<{ end: string; start: string }>(() => {
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now);

    startDate.setDate(startDate.getDate() - 29);

    return { end, start: startDate.toISOString().slice(0, 10) };
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const report = useMemo(
    () => buildDosMinistryReport({ ...input, now, period: range === "custom" ? customPeriod : undefined, range }),
    [customPeriod, input, now, range],
  );
  const visibleRows = useMemo(() => report.rows.filter((row) => dosMinistryRowMatchesFilter(row, filter)), [filter, report.rows]);
  const toggle = (personId: string) => setExpandedId((current) => (current === personId ? null : personId));

  return (
    <div className="grid min-w-0 gap-6">
      <section className="min-w-0">
        <Eyebrow>Master Ministry Report</Eyebrow>
        <h2 className="text-dos-title text-dos-primary">Time Investment</h2>
        <p className="mt-1.5 max-w-2xl text-dos-body text-dos-secondary">
          Where is your time going in the field God has given you, and what is happening through it?
        </p>
      </section>

      <section className="grid min-w-0 gap-3">
        <Segmented label="Report range" onChange={setRange} options={dosMinistryReportRangeOptions} value={range} />
        {range === "custom" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-dos-label text-dos-secondary">
              From
              <input
                className="h-12 rounded-dos-1 border border-dos-line bg-white px-3 text-dos-body text-dos-primary focus-visible:border-dos-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                max={customPeriod.end}
                onChange={(event) => setCustomPeriod((current) => ({ ...current, start: event.target.value || current.start }))}
                type="date"
                value={customPeriod.start}
              />
            </label>
            <label className="grid gap-1 text-dos-label text-dos-secondary">
              To
              <input
                className="h-12 rounded-dos-1 border border-dos-line bg-white px-3 text-dos-body text-dos-primary focus-visible:border-dos-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                min={customPeriod.start}
                onChange={(event) => setCustomPeriod((current) => ({ ...current, end: event.target.value || current.end }))}
                type="date"
                value={customPeriod.end}
              />
            </label>
          </div>
        ) : null}
        <p className="text-dos-meta text-dos-secondary">{formatPeriod(report.period.start, report.period.end)} · logged DOS activity only</p>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryTile label="Duration I invested" note={`${plural(report.totals.investedMeetings, "meeting")} · each counted once`} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesInvested)} />
        <SummaryTile label="Invested in me" note={`${plural(report.totals.receivedMeetings, "meeting")} where I was discipled`} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesReceived)} />
        <SummaryTile label="Relationship not set" note={`${plural(report.totals.unresolvedMeetings, "meeting")} · counted in neither`} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesUnresolved)} />
        <SummaryTile label="Meetings" note={report.totals.meetingsMissingDuration ? `${report.totals.meetingsMissingDuration} without a logged duration` : "All with a logged duration"} value={`${report.totals.meetings}`} />
        <SummaryTile label="Check-ins" note="Own activity, not contact time" value={`${report.totals.checkIns}`} />
      </section>

      {report.notes.length ? (
        <ul className="grid gap-1 text-dos-meta text-dos-secondary">
          {report.notes.map((note) => <li className="text-dos-secondary" key={note}>{note}</li>)}
        </ul>
      ) : null}

      <section className="min-w-0">
        <Eyebrow count={plural(visibleRows.length, "person", "people")}>Time Investment</Eyebrow>
        <div className="mb-3 lg:hidden">
          <PillRail edgeInset={4} label="Relationship filter" onChange={setFilter} options={dosMinistryReportFilterOptions} value={filter} />
        </div>
        <div className="mb-3 hidden lg:block">
          <Segmented label="Relationship filter" onChange={setFilter} options={dosMinistryReportFilterOptions} value={filter} />
        </div>
        <div className="min-w-0 overflow-x-auto rounded-dos-2 border border-dos-line bg-white">
          <table className="w-full border-collapse md:min-w-[820px]">
            <thead>
              <tr className="bg-dos-surface2">
                <th className={`${headCell} ${stickyCell} whitespace-nowrap border-r border-dos-line pl-3 !bg-dos-surface2`} scope="col">Person</th>
                <th className={`${headCell} hidden md:table-cell`} scope="col">Relationship</th>
                <th className={`${headCell} hidden md:table-cell`} scope="col">Meetings</th>
                <th className={`${headCell} hidden md:table-cell`} scope="col">Logged duration</th>
                <th className={`${headCell} hidden md:table-cell`} scope="col">Last activity</th>
                <th className={`${headCell} hidden md:table-cell`} scope="col">Multiplication</th>
                <th className={`${headCell} hidden md:table-cell`} scope="col">Fruit</th>
                <th className={`${headCell} pr-3 text-right md:text-left`} scope="col">Data status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? visibleRows.map((row) => (
                <PersonRow expanded={expandedId === row.personId} key={row.personId} onOpenMeeting={onOpenMeeting} onOpenPerson={onOpenPerson} onToggle={() => toggle(row.personId)} row={row} />
              )) : (
                <tr className="border-t border-dos-line">
                  <td className="px-4 py-5 text-dos-body text-dos-secondary" colSpan={8}>
                    {filter === "all"
                      ? "No logged activity and no recorded relationship in this range. That is what DOS has, not proof that nothing happened."
                      : "No one matches this filter in this range."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="min-w-0">
        <Eyebrow count={plural(report.fruitRows.length, "record")}>Ministry Fruit</Eyebrow>
        <FruitTable onOpenMeeting={onOpenMeeting} rows={report.fruitRows} />
      </section>

      <details className="rounded-dos-2 border border-dos-line bg-white px-4 py-3">
        <summary className="cursor-pointer text-dos-label text-dos-primary">How this is calculated</summary>
        <ul className="mt-2 grid gap-1.5 text-dos-meta text-dos-secondary [&>li]:text-dos-secondary">
          <li>A meeting is a logged DOS meeting dated inside the range. Scheduled, canceled, and connection-log records are not meetings. Logged duration is what was entered; a meeting without a start and end adds nothing and marks the row Partial. Nothing is estimated.</li>
          <li>A meeting is placed by the role recorded on it, else by the confirmed relationship on the Person record of everyone present. When the relationship is not set, not confirmed, conflicting, or mixed within one meeting, the meeting is kept but counted in neither direction. Nothing is defaulted and notes are never read.</li>
          <li>Each person appears once. A person&apos;s row shows all their meetings; the tiles keep time I invested, time invested in me, and not-set time apart, each meeting counted once.</li>
          <li>Check-ins are their own activity: counted in the tile and the records, never as meetings or contact time.</li>
          <li>Multiplication reads a person&apos;s own confirmed Person relationships through a verified DOS identity link. Not connected means there is no link; nothing is claimed without one.</li>
          <li>Ministry Fruit lists recorded fruit, submitted reviews and testimonies, and completed Journey sessions, showing only what was explicitly selected or completed. Stories, comments, reflections, and Kitchen Table Gospel responses are never shown. Circle placement is not part of this report.</li>
        </ul>
      </details>
    </div>
  );
}
