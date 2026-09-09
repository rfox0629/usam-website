"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Eyebrow, Segmented, StatusPill, type StatusTone } from "@/src/components/dos/ui";
import {
  buildDosMinistryReport,
  buildDosSafeMinistrySummary,
  dosMinistryReportDefaultRange,
  dosMinistryReportRangeOptions,
  dosMinistryTimeBucketLabels,
  dosUpstreamViewers,
  formatDosMinistryMinutes,
  type DosMinistryCompleteness,
  type DosMinistryReportInput,
  type DosMinistryReportRange,
  type DosMinistryReportRow,
} from "@/src/lib/dos/ministry-report";

/* Master Ministry Report — Time Investment (USA-251).
 *
 * Simple at the surface: one readable list per direction of time, one
 * question answered per row. Powerful underneath: every number comes from
 * `buildDosMinistryReport`, and every row opens into the records that
 * produced it. Nothing here writes data; this is a report, not a second
 * place to enter ministry.
 */

/* Founder colour language (2026-09-09): green only for genuinely confirmed
   status; blue for neutral information, partial or incomplete data,
   unresolved direction, and attention; white / grey for ordinary surfaces.
   No yellow, amber, orange, or red anywhere in Reports or Home. */
const completenessTone: Record<DosMinistryCompleteness, StatusTone> = {
  recorded: "green",
  partial: "blue",
  none: "grey",
  unresolved: "blue",
};

/* The shared StatusPill is 100px wide by design (spec §3), so the pill
   carries the short form; the list title and the row detail say
   "Direction unresolved" in full. */
const completenessPillLabel: Record<DosMinistryCompleteness, string> = {
  recorded: "Recorded",
  partial: "Partial",
  none: "No activity",
  unresolved: "Unresolved",
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

function DownstreamLine({ row }: { row: DosMinistryReportRow }) {
  if (row.downstreamStatus === "not_applicable") {
    return null;
  }

  return (
    <div>
      <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Multiplication</p>
      {row.downstreamStatus === "resolved" ? (
        <>
          <p className="mt-1 text-dos-body text-dos-primary">
            {row.personName}&apos;s own Person records say they are discipling {plural(row.downstream.length, "person", "people")}: {row.downstream.map((link) => link.name).join(", ")}.
          </p>
          <p className="text-dos-meta text-dos-secondary">Resolved from confirmed, directed Person relationships in {firstName(row.personName)}&apos;s workspace through a linked DOS identity.</p>
        </>
      ) : (
        <p className="mt-1 text-dos-meta text-dos-secondary">
          Resolves from {firstName(row.personName)}&apos;s own confirmed Person relationships once {firstName(row.personName)} has a linked DOS workspace. Not linked yet, so nothing is claimed.
        </p>
      )}
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
        <p className="rounded-dos-1 bg-dos-blue50 px-3 py-2 text-dos-meta text-dos-blueText">{row.directionConflict}</p>
      ) : null}

      <DownstreamLine row={row} />

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
            {row.directionLabel} · {plural(row.meetingCount, "meeting")} · {formatDosMinistryMinutes(row.loggedMinutes)}
            {row.checkInCount ? ` · ${plural(row.checkInCount, "check-in")}` : ""} · last {row.lastActivity ? formatReportDate(row.lastActivity.date) : "none"}
          </span>
        </span>
        <span className="hidden truncate text-dos-meta text-dos-primary md:block">{row.directionLabel}</span>
        <span className="hidden text-dos-body tabular-nums text-dos-primary md:block">{row.meetingCount}</span>
        <span className="hidden text-dos-body tabular-nums text-dos-primary md:block">{formatDosMinistryMinutes(row.loggedMinutes)}</span>
        <span className="hidden text-dos-body tabular-nums text-dos-primary md:block">{row.bucket === "invested" ? row.checkInCount : "—"}</span>
        <span className="hidden truncate text-dos-meta text-dos-primary md:block">{lastActivity}</span>
        <span className="flex justify-end md:justify-start"><StatusPill tone={completenessTone[row.completeness]}>{completenessPillLabel[row.completeness]}</StatusPill></span>
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
      <span>Logged duration</span>
      <span>Check-ins</span>
      <span>Last activity</span>
      <span>Completeness</span>
      <span>Next action</span>
      <span />
    </div>
  );
}

function RowTable({
  emptyText,
  expandedKey,
  onOpenMeeting,
  onOpenPerson,
  onToggle,
  rows,
}: {
  emptyText: string;
  expandedKey: string | null;
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  onToggle: (key: string) => void;
  rows: DosMinistryReportRow[];
}) {
  return (
    <div className="overflow-hidden rounded-dos-2 border border-dos-line bg-white">
      <RowTableHeader />
      {rows.length ? rows.map((row) => {
        const key = `${row.bucket}:${row.personId}`;

        return (
          <ReportRow expanded={expandedKey === key} key={key} onOpenMeeting={onOpenMeeting} onOpenPerson={onOpenPerson} onToggle={() => onToggle(key)} row={row} />
        );
      }) : (
        <p className="px-4 py-5 text-dos-body text-dos-secondary">{emptyText}</p>
      )}
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
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const report = useMemo(
    () => buildDosMinistryReport({ ...input, now, period: range === "custom" ? customPeriod : undefined, range }),
    [customPeriod, input, now, range],
  );
  const safeSummary = useMemo(() => buildDosSafeMinistrySummary(report), [report]);
  const upstreamViewers = useMemo(() => dosUpstreamViewers(input.people, input.disciplingMe), [input.disciplingMe, input.people]);
  const disciplingRows = useMemo(() => {
    const seen = new Set<string>();

    return [...report.investedRows, ...report.receivedRows, ...report.relationshipRows].filter((row) => {
      if (row.direction !== "i_am_discipling" || seen.has(row.personId)) {
        return false;
      }

      seen.add(row.personId);

      return true;
    });
  }, [report]);
  const toggle = (key: string) => setExpandedKey((current) => (current === key ? null : key));
  const tableProps = { expandedKey, onOpenMeeting, onOpenPerson, onToggle: toggle };

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
        <p className="text-dos-meta text-dos-secondary">{formatPeriod(report.period.start, report.period.end)} · logged DOS activity only</p>
      </section>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <SummaryTile label="Duration I invested" note={`${plural(report.totals.investedMeetings, "meeting")} · each counted once`} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesInvested)} />
        <SummaryTile label="Invested in me" note={`${plural(report.totals.receivedMeetings, "meeting")} where I was discipled`} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesReceived)} />
        <SummaryTile label="Direction unresolved" note={`${plural(report.totals.unresolvedMeetings, "meeting")} · counted in neither`} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesUnresolved)} />
        <SummaryTile label="Meetings" note={report.totals.meetingsMissingDuration ? `${report.totals.meetingsMissingDuration} without a logged duration` : "All with a logged duration"} value={`${report.totals.meetings}`} />
        <SummaryTile label="Check-ins" note="Own activity, not contact time" value={`${report.totals.checkIns}`} />
      </section>

      {report.notes.length ? (
        <ul className="grid gap-1 text-dos-meta text-dos-secondary">
          {report.notes.map((note) => <li className="text-dos-secondary" key={note}>{note}</li>)}
        </ul>
      ) : null}

      <section>
        <Eyebrow count={plural(report.investedRows.length, "person", "people")}>{dosMinistryTimeBucketLabels.invested}</Eyebrow>
        <RowTable
          emptyText="No meeting where you ministered, and no check-in, is logged in this range. That is what DOS has, not proof that nothing happened."
          rows={report.investedRows}
          {...tableProps}
        />
        <p className="mt-2 text-dos-meta text-dos-secondary">
          Meetings where you ministered, discipled mutually, or planned. A meeting with several people credits its full duration to each of them, so these rows are relationship-contact time. They are never added together as your time; the total above counts each meeting once.
        </p>
      </section>

      <section>
        <Eyebrow count={plural(report.receivedRows.length, "person", "people")}>{dosMinistryTimeBucketLabels.received}</Eyebrow>
        <RowTable
          emptyText="No meeting where you were the one being discipled is logged in this range."
          rows={report.receivedRows}
          {...tableProps}
        />
        <p className="mt-2 text-dos-meta text-dos-secondary">
          Meetings where someone was discipling you. Kept apart from the list above so no one is ranked as though you were investing in them.
        </p>
      </section>

      {report.unresolvedRows.length ? (
        <section>
          <Eyebrow count={plural(report.unresolvedRows.length, "person", "people")}>{dosMinistryTimeBucketLabels.unresolved}</Eyebrow>
          <RowTable emptyText="" rows={report.unresolvedRows} {...tableProps} />
          <p className="mt-2 text-dos-meta text-dos-secondary">
            Meetings DOS cannot place in either direction: no role was recorded on the meeting, and the Person record has no confirmed direction, My Record disagrees with it, or the people present are in both directions. Confirm the direction on the Person record; nothing here is guessed or defaulted.
          </p>
        </section>
      ) : null}

      {report.relationshipRows.length ? (
        <section>
          <Eyebrow count={plural(report.relationshipRows.length, "person", "people")}>Discipleship relationships without activity in this range</Eyebrow>
          <RowTable emptyText="" rows={report.relationshipRows} {...tableProps} />
        </section>
      ) : null}

      <section>
        <Eyebrow>Where discipleship is multiplying</Eyebrow>
        {disciplingRows.length ? (
          <ul className="divide-y divide-dos-line rounded-dos-2 border border-dos-line bg-white">
            {disciplingRows.map((row) => (
              <li className="px-4 py-3 text-dos-primary" key={row.personId}>
                <p className="text-dos-body font-semibold text-dos-primary">
                  {row.downstreamStatus === "resolved"
                    ? `${row.personName} is discipling ${plural(row.downstream.length, "person", "people")}`
                    : `${row.personName} · not yet resolvable`}
                </p>
                <p className="text-dos-meta text-dos-secondary">
                  {row.downstreamStatus === "resolved"
                    ? `From ${firstName(row.personName)}'s own Person records: ${row.downstream.map((link) => link.name).join(", ")}`
                    : `Resolves from ${firstName(row.personName)}'s own confirmed Person relationships once a DOS identity is linked. No linked workspace yet.`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dos-body text-dos-secondary">No one is recorded as being discipled by you in this range.</p>
        )}
        <p className="mt-2 text-dos-meta text-dos-secondary">
          Person is the canonical relationship record. Multiplication is never inferred from a stage, a score, or notes, and DOS keeps no separate chain.
        </p>
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
              <div><dt className="text-dos-secondary">Duration invested</dt><dd className="text-dos-primary">{formatDosMinistryMinutes(safeSummary.loggedMinutesInvested)}</dd></div>
              <div><dt className="text-dos-secondary">Invested in them</dt><dd className="text-dos-primary">{formatDosMinistryMinutes(safeSummary.loggedMinutesReceived)}</dd></div>
              <div><dt className="text-dos-secondary">Direction unresolved</dt><dd className="text-dos-primary">{formatDosMinistryMinutes(safeSummary.loggedMinutesUnresolved)}{safeSummary.meetingsUnresolved ? ` (${plural(safeSummary.meetingsUnresolved, "meeting")})` : ""}</dd></div>
              <div><dt className="text-dos-secondary">Meetings</dt><dd className="text-dos-primary">{safeSummary.meetings}{safeSummary.meetingsMissingDuration ? ` (${safeSummary.meetingsMissingDuration} without duration)` : ""}</dd></div>
              <div><dt className="text-dos-secondary">People with activity</dt><dd className="text-dos-primary">{safeSummary.peopleWithRecordedActivity}</dd></div>
              <div><dt className="text-dos-secondary">Check-ins</dt><dd className="text-dos-primary">{safeSummary.checkIns}</dd></div>
              <div><dt className="text-dos-secondary">Relationships</dt><dd className="text-dos-primary">{safeSummary.relationships.length ? safeSummary.relationships.map((item) => `${item.label} ${item.count}`).join(" · ") : "None recorded"}</dd></div>
              <div><dt className="text-dos-secondary">Multiplication</dt><dd className="text-dos-primary">{plural(safeSummary.downstreamRelationships, "resolved relationship")}</dd></div>
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
          <li>Logged duration is what was entered for the meeting. Historical start times are a synthetic noon, so this is a duration, not clock-in and clock-out. A meeting without a start and end adds nothing and marks the row Partial. Nothing is estimated.</li>
          <li>Time I invested: meetings where your role was ministering, mutual discipleship, or leadership / planning. Time invested in me: meetings where you were the one being discipled. The two are never ranked together.</li>
          <li>How a meeting is placed: a role recorded on the meeting decides. Without one, the confirmed Person direction of everyone present decides (They are discipling me → invested in me; I am discipling them, walking with them, peer encouragement → time I invested). A missing, unconfirmed, or conflicting direction, or a meeting with people in both directions, is Direction unresolved. Nothing is defaulted and notes are never read.</li>
          <li>Accountability check-ins are their own activity: counted separately, never as meetings, never as contact time.</li>
          <li>Direction comes from the Person record&apos;s structured relationship, which is canonical. A My Record relationship is only a fallback for the label, never for placing a meeting, and a disagreement is stated on the row.</li>
          <li>Multiplication resolves from a downstream person&apos;s own confirmed Person relationships through a linked DOS identity. Nothing is claimed until that link exists.</li>
          <li>Circle placement (My 3, My 12, My 70, My 120) and Journey status are not part of this report.</li>
          <li>&ldquo;No qualifying activity&rdquo; means DOS has no record in the range. It does not mean nothing happened.</li>
        </ul>
      </details>
    </div>
  );
}
