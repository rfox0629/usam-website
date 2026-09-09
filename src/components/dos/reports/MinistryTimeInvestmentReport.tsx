"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Eyebrow, Segmented, StatusPill, type StatusTone } from "@/src/components/dos/ui";
import {
  buildDosMinistryReport,
  buildDosSafeMinistrySummary,
  dosMinistryReportDefaultRange,
  dosMinistryReportRangeOptions,
  dosUpstreamViewers,
  formatDosMinistryMinutes,
  type DosMinistryCompleteness,
  type DosMinistryReportInput,
  type DosMinistryReportRange,
  type DosMinistryReportRow,
} from "@/src/lib/dos/ministry-report";

/* Master Ministry Report — Time Investment (USA-251).
 *
 * Simple at the surface: one readable list, one question answered per row.
 * Powerful underneath: every number comes from `buildDosMinistryReport`, and
 * every row opens into the records that produced it. Nothing here writes
 * data; this is a report, not a second place to enter ministry.
 */

const completenessTone: Record<DosMinistryCompleteness, StatusTone> = {
  recorded: "green",
  partial: "amber",
  none: "grey",
};

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

function SummaryTile({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="min-w-0 rounded-dos-1 border border-dos-line bg-white px-3.5 py-3">
      <p className="text-dos-eyebrow uppercase text-dos-eyebrow">{label}</p>
      <p className="mt-1 text-dos-heading text-dos-primary">{value}</p>
      {note ? <p className="mt-0.5 text-dos-meta text-dos-secondary">{note}</p> : null}
    </div>
  );
}

function RowDetail({
  onOpenMeeting,
  onOpenPerson,
  row,
}: {
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  row: DosMinistryReportRow;
}) {
  return (
    <div className="grid gap-4 border-t border-dos-line bg-dos-surface2/60 px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Next action</p>
          <p className="mt-1 text-dos-body font-semibold text-dos-primary">{row.nextAction.label}</p>
          <p className="text-dos-meta text-dos-secondary">{row.nextAction.reason}</p>
        </div>
        <div>
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Data completeness</p>
          <p className="mt-1 text-dos-body font-semibold text-dos-primary">{row.completenessLabel}</p>
          <p className="text-dos-meta text-dos-secondary">{row.completenessDetail}</p>
        </div>
      </div>

      {row.directionConflict ? (
        <p className="rounded-dos-1 bg-dos-amberBg px-3 py-2 text-dos-meta text-dos-amber">{row.directionConflict}</p>
      ) : null}

      {row.downstream.length ? (
        <div>
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Multiplication</p>
          <p className="mt-1 text-dos-body text-dos-primary">
            {row.personName} has recorded that they are discipling {plural(row.downstream.length, "person", "people")}: {row.downstream.map((link) => link.name).join(", ")}.
          </p>
          <p className="text-dos-meta text-dos-secondary">Explicitly recorded discipleship relationships only. DOS never infers this from a stage, a score, or notes.</p>
        </div>
      ) : null}

      <div>
        <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Contributing records</p>
        {row.records.length ? (
          <ul className="mt-1 divide-y divide-dos-line rounded-dos-1 border border-dos-line bg-white">
            {row.records.map((record) => (
              <li className="flex min-h-[52px] items-center gap-3 px-3 py-2" key={`${record.kind}-${record.id}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-dos-label text-dos-primary">{formatReportDate(record.date)} · {record.label}</span>
                  <span className="block text-dos-meta text-dos-secondary">
                    {record.kind === "meeting" ? "Recorded time" : "Check-in time"}: {formatDosMinistryMinutes(record.minutes)}
                    {record.kind === "meeting" && record.shared ? " · credited to each person present" : ""}
                    {record.kind === "check_in" ? " · not counted as a meeting" : ""}
                  </span>
                </span>
                <Button compact onClick={() => (record.open.kind === "meeting" ? onOpenMeeting(record.open.id) : onOpenPerson(record.open.id))} variant="secondary">
                  {record.open.kind === "meeting" ? "Open meeting" : "Open person"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-dos-body text-dos-secondary">No meeting or check-in is recorded for this range.</p>
        )}
      </div>

      <div>
        <Button compact onClick={() => onOpenPerson(row.personId)} variant="tinted">Open {row.personName}</Button>
      </div>
    </div>
  );
}

function ReportRow({
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
  row: DosMinistryReportRow;
}) {
  const lastActivity = row.lastActivity
    ? `${formatReportDate(row.lastActivity.date)} · ${row.lastActivity.kind === "meeting" ? "meeting" : "check-in"}`
    : "None in range";

  return (
    <div className="border-t border-dos-line first:border-t-0">
      <button
        aria-expanded={expanded}
        className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-dos-surface2/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-inset md:grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_72px_110px_80px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1.2fr)_24px] md:gap-2"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate text-dos-body font-semibold text-dos-primary">{row.personName}</span>
          <span className="mt-0.5 block whitespace-normal text-dos-meta text-dos-secondary md:hidden">
            {row.directionLabel} · {plural(row.meetingCount, "meeting")} · {formatDosMinistryMinutes(row.recordedMinutes)}
            {row.checkInCount ? ` · ${plural(row.checkInCount, "check-in")}` : ""} · last {row.lastActivity ? formatReportDate(row.lastActivity.date) : "none"}
          </span>
        </span>
        <span className="hidden truncate text-dos-meta text-dos-primary md:block">{row.directionLabel}</span>
        <span className="hidden text-dos-body tabular-nums text-dos-primary md:block">{row.meetingCount}</span>
        <span className="hidden text-dos-body tabular-nums text-dos-primary md:block">{formatDosMinistryMinutes(row.recordedMinutes)}</span>
        <span className="hidden text-dos-body tabular-nums text-dos-primary md:block">{row.checkInCount}</span>
        <span className="hidden truncate text-dos-meta text-dos-primary md:block">{lastActivity}</span>
        <span className="flex justify-end md:justify-start"><StatusPill tone={completenessTone[row.completeness]}>{row.completenessLabel}</StatusPill></span>
        <span className="hidden truncate text-dos-meta text-dos-primary md:block">{row.nextAction.label}</span>
        <span className="hidden text-dos-secondary md:flex md:justify-end">
          {expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4" strokeWidth={2} /> : <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
        </span>
      </button>
      {expanded ? <RowDetail onOpenMeeting={onOpenMeeting} onOpenPerson={onOpenPerson} row={row} /> : null}
    </div>
  );
}

function RowTableHeader() {
  return (
    <div aria-hidden="true" className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_72px_110px_80px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1.2fr)_24px] gap-2 border-b border-dos-line bg-dos-surface2 px-4 py-2 text-dos-eyebrow uppercase text-dos-eyebrow md:grid">
      <span>Person</span>
      <span>Direction</span>
      <span>Meetings</span>
      <span>Recorded time</span>
      <span>Check-ins</span>
      <span>Last activity</span>
      <span>Completeness</span>
      <span>Next action</span>
      <span />
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
  const [customPeriod, setCustomPeriod] = useState<{ end: string; start: string }>(() => {
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now);

    startDate.setDate(startDate.getDate() - 29);

    return { end, start: startDate.toISOString().slice(0, 10) };
  });
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const report = useMemo(
    () => buildDosMinistryReport({ ...input, now, period: range === "custom" ? customPeriod : undefined, range }),
    [customPeriod, input, now, range],
  );
  const safeSummary = useMemo(() => buildDosSafeMinistrySummary(report), [report]);
  const upstreamViewers = useMemo(() => dosUpstreamViewers(input.disciplingMe), [input.disciplingMe]);
  const multiplying = [...report.rows, ...report.relationshipRows].filter((row) => row.downstream.length > 0);
  const toggle = (personId: string) => setExpandedPersonId((current) => (current === personId ? null : personId));
  const rowProps = { onOpenMeeting, onOpenPerson };

  return (
    <div className="grid gap-6">
      <section>
        <Eyebrow>Master Ministry Report</Eyebrow>
        <h2 className="text-dos-title text-dos-primary">Time Investment</h2>
        <p className="mt-1.5 max-w-2xl text-dos-body text-dos-secondary">
          Where are you spending your time in the field God has given you, and what is happening through that investment?
        </p>
      </section>

      <section className="grid gap-3">
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
        <p className="text-dos-meta text-dos-secondary">{formatPeriod(report.period.start, report.period.end)} · recorded DOS activity only</p>
      </section>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SummaryTile label="Your recorded time" note="Each meeting counted once" value={formatDosMinistryMinutes(report.totals.uniqueRecordedMinutes)} />
        <SummaryTile label="Meetings" note={report.totals.meetingsMissingTime ? `${report.totals.meetingsMissingTime} without recorded time` : "All with recorded time"} value={`${report.totals.meetings}`} />
        <SummaryTile label="People" note="With recorded activity" value={`${report.totals.peopleWithActivity}`} />
        <SummaryTile label="Check-ins" note="Separate from meetings" value={`${report.totals.checkIns}`} />
      </section>

      {report.notes.length ? (
        <ul className="grid gap-1 text-dos-meta text-dos-secondary">
          {report.notes.map((note) => <li className="text-dos-secondary" key={note}>{note}</li>)}
        </ul>
      ) : null}

      <section>
        <Eyebrow count={plural(report.rows.length, "person", "people")}>Recorded contact time by person</Eyebrow>
        <div className="overflow-hidden rounded-dos-2 border border-dos-line bg-white">
          <RowTableHeader />
          {report.rows.length ? report.rows.map((row) => (
            <ReportRow expanded={expandedPersonId === row.personId} key={row.personId} onToggle={() => toggle(row.personId)} row={row} {...rowProps} />
          )) : (
            <p className="px-4 py-5 text-dos-body text-dos-secondary">No meeting or check-in is recorded in this range. That is what DOS has, not proof that nothing happened.</p>
          )}
        </div>
        <p className="mt-2 text-dos-meta text-dos-secondary">
          A meeting with several people credits its full time to each of them, so these rows are relationship-contact time. They are never added together as your time; the total above counts each meeting once.
        </p>
      </section>

      {report.relationshipRows.length ? (
        <section>
          <Eyebrow count={plural(report.relationshipRows.length, "person", "people")}>Discipleship relationships without activity in this range</Eyebrow>
          <div className="overflow-hidden rounded-dos-2 border border-dos-line bg-white">
            <RowTableHeader />
            {report.relationshipRows.map((row) => (
              <ReportRow expanded={expandedPersonId === row.personId} key={row.personId} onToggle={() => toggle(row.personId)} row={row} {...rowProps} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <Eyebrow>Where discipleship is multiplying</Eyebrow>
        {multiplying.length ? (
          <ul className="divide-y divide-dos-line rounded-dos-2 border border-dos-line bg-white">
            {multiplying.map((row) => (
              <li className="px-4 py-3 text-dos-primary" key={row.personId}>
                <p className="text-dos-body font-semibold text-dos-primary">{row.personName} is discipling {plural(row.downstream.length, "person", "people")}</p>
                <p className="text-dos-meta text-dos-secondary">{row.directionLabel} · recorded: {row.downstream.map((link) => link.name).join(", ")}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dos-body text-dos-secondary">No downstream discipleship relationship is recorded yet. DOS reports multiplication only from an explicit record.</p>
        )}
      </section>

      {upstreamViewers.length ? (
        <section>
          <Eyebrow>What flows upward</Eyebrow>
          <div className="rounded-dos-2 border border-dos-line bg-white px-4 py-3.5">
            <p className="text-dos-body text-dos-primary">
              {upstreamViewers.map((viewer) => viewer.name).join(" and ")} {upstreamViewers.length === 1 ? "is" : "are"} discipling you. A confirmed discipleship relationship carries this safe summary upward automatically; there is no separate share switch, and ending the relationship ends it.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-dos-meta md:grid-cols-4">
              <div><dt className="text-dos-secondary">Period</dt><dd className="text-dos-primary">{formatPeriod(safeSummary.period.start, safeSummary.period.end)}</dd></div>
              <div><dt className="text-dos-secondary">Recorded time</dt><dd className="text-dos-primary">{formatDosMinistryMinutes(safeSummary.uniqueRecordedMinutes)}</dd></div>
              <div><dt className="text-dos-secondary">Meetings</dt><dd className="text-dos-primary">{safeSummary.meetings}{safeSummary.meetingsMissingTime ? ` (${safeSummary.meetingsMissingTime} without time)` : ""}</dd></div>
              <div><dt className="text-dos-secondary">People with activity</dt><dd className="text-dos-primary">{safeSummary.peopleWithRecordedActivity}</dd></div>
              <div><dt className="text-dos-secondary">Check-ins</dt><dd className="text-dos-primary">{safeSummary.checkIns}</dd></div>
              <div><dt className="text-dos-secondary">Relationships</dt><dd className="text-dos-primary">{safeSummary.relationships.length ? safeSummary.relationships.map((item) => `${item.label} ${item.count}`).join(" · ") : "None recorded"}</dd></div>
              <div><dt className="text-dos-secondary">Multiplication</dt><dd className="text-dos-primary">{plural(safeSummary.downstreamRelationships, "recorded relationship")}</dd></div>
              <div><dt className="text-dos-secondary">Completeness</dt><dd className="text-dos-primary">{safeSummary.completeness === "recorded" ? "Recorded" : safeSummary.completeness === "partial" ? "Partial" : "No qualifying activity"}</dd></div>
            </dl>
            <p className="mt-3 text-dos-meta text-dos-secondary">
              Never included: private notes, prayer wording, My Record narrative, participant responses, private reflections, testimony content, and names in the summary. Upward delivery is not switched on in this prototype; this shows what would travel.
            </p>
          </div>
        </section>
      ) : null}

      <details className="rounded-dos-2 border border-dos-line bg-white px-4 py-3">
        <summary className="cursor-pointer text-dos-label text-dos-primary">How these numbers are counted</summary>
        <ul className="mt-2 grid gap-1.5 text-dos-meta text-dos-secondary [&>li]:text-dos-secondary">
          <li>A meeting is a logged DOS meeting dated inside the range. Scheduled, canceled, and connection-log records are not meetings.</li>
          <li>Recorded time is the meeting&apos;s saved duration. A meeting without a start and end adds nothing and marks the row Partial. Nothing is estimated.</li>
          <li>Accountability check-ins are a separate activity: counted and timed separately, never as meetings.</li>
          <li>Direction comes from your My Record relationships (Discipling me) and the Person record&apos;s structured role. A conflict between the two is stated on the row.</li>
          <li>Multiplication appears only when someone has explicitly recorded who they are discipling.</li>
          <li>Circle placement (My 3, My 12, My 70, My 120) is not part of this report.</li>
          <li>&ldquo;No qualifying activity&rdquo; means DOS has no record in the range. It does not mean nothing happened.</li>
        </ul>
      </details>
    </div>
  );
}
