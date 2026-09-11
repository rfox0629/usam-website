"use client";

import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DosDetailSection, DosDetailSheet } from "@/src/components/dos/overlays/DosSurfaces";
import { Button, PillRail, Segmented } from "@/src/components/dos/ui";
import {
  buildDosMinistryReport,
  dosMinistryMetricDefinitions,
  dosMinistryMultiplicationCell,
  dosMinistryMultiplicationLabel,
  dosMinistryReportDefaultRange,
  dosMinistryReportDefaultSort,
  dosMinistryReportFilterOptions,
  dosMinistryReportPeriod,
  dosMinistryReportRangeOptions,
  dosMinistryRowMatchesFilter,
  dosMinistrySortRows,
  dosMinistryTimeBucketLabels,
  formatDosMinistryDate,
  formatDosMinistryMinutes,
  formatDosMinistryPeriod,
  type DosMinistryCompleteness,
  type DosMinistryFruitRow,
  type DosMinistryMeetingRecord,
  type DosMinistryMetricKey,
  type DosMinistryPersonRow,
  type DosMinistryReportFilter,
  type DosMinistryReportInput,
  type DosMinistryReportRange,
  type DosMinistryReportRecord,
  type DosMinistryReportSort,
  type DosMinistryReportSortKey,
} from "@/src/lib/dos/ministry-report";

/* Master Ministry Report — Time Investment (USA-251, refined in USA-268).
 *
 * Simple at the surface, powerful underneath (founder, 2026-09-11): one
 * period surface, three summary figures, a Time Investment table and a
 * Ministry Fruit table. Every explanation and every contributing record is
 * one click away in a read-only detail over the report, so the report itself
 * never carries paragraphs. Opening and closing detail keeps the range,
 * custom dates, filter, sort, expanded row and scroll position; a full record
 * opens only from an explicit action, and the client offers Back to Reports.
 * Every number still comes from `buildDosMinistryReport`. Nothing here
 * writes data.
 */

/* Founder colour language (2026-09-09): green only for genuinely confirmed
   status; blue for neutral information and partial data; white / grey for
   ordinary surfaces. No yellow, amber, orange, or red anywhere in Reports. */
type ReportTone = "grey" | "blue" | "green";

const completenessTone: Record<DosMinistryCompleteness, ReportTone> = {
  recorded: "green",
  partial: "blue",
  none: "grey",
};

const pillTone: Record<ReportTone, string> = {
  grey: "bg-dos-surface2 text-dos-secondary",
  blue: "bg-dos-blue50 text-dos-blueText",
  green: "bg-dos-greenBg text-dos-green",
};

/* The shared StatusPill caps its width at 100px (spec §3), which truncates
   "Discipling me" beside a note. Same tokens, same height, no cap. */
function Pill({ children, tone }: { children: string; tone: ReportTone }) {
  return <span className={`inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-dos-3 px-2 text-dos-pill ${pillTone[tone]}`}>{children}</span>;
}

/* ---------- view state: survives detail, a full record, and a reload ---------- */

type ReportDetail =
  | { id: DosMinistryMetricKey; kind: "metric" }
  | { id: string; kind: "fruit" | "meeting" | "person" };

type ReportView = {
  customPeriod: { end: string; start: string };
  detail: ReportDetail[];
  expandedId: string | null;
  filter: DosMinistryReportFilter;
  range: DosMinistryReportRange;
  sort: DosMinistryReportSort;
};

const rangeValues = new Set<string>(dosMinistryReportRangeOptions.map((option) => option.value));
const filterValues = new Set<string>(dosMinistryReportFilterOptions.map((option) => option.value));
const sortKeys = new Set<string>(["person", "relationship", "meetings", "time", "last_activity", "fruit"] satisfies DosMinistryReportSortKey[]);
const metricKeys = new Set<string>(["invested", "received", "meetings"] satisfies DosMinistryMetricKey[]);
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function isReportDetail(value: unknown): value is ReportDetail {
  const item = value as { id?: unknown; kind?: unknown } | null;

  if (!item || typeof item.id !== "string") {
    return false;
  }

  return item.kind === "metric" ? metricKeys.has(item.id) : item.kind === "fruit" || item.kind === "meeting" || item.kind === "person";
}

/* Every field is re-validated on the way back in; anything unrecognised
   keeps its default. */
function readReportView(storageKey: string): Partial<ReportView> {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const custom = parsed.customPeriod as { end?: unknown; start?: unknown } | undefined;
    const sort = parsed.sort as { direction?: unknown; key?: unknown } | undefined;

    return {
      ...(rangeValues.has(parsed.range as string) ? { range: parsed.range as DosMinistryReportRange } : {}),
      ...(filterValues.has(parsed.filter as string) ? { filter: parsed.filter as DosMinistryReportFilter } : {}),
      ...(sort && sortKeys.has(sort.key as string) && (sort.direction === "asc" || sort.direction === "desc")
        ? { sort: { direction: sort.direction, key: sort.key as DosMinistryReportSortKey } }
        : {}),
      ...(custom && dateKeyPattern.test(String(custom.start)) && dateKeyPattern.test(String(custom.end))
        ? { customPeriod: { end: String(custom.end), start: String(custom.start) } }
        : {}),
      ...(typeof parsed.expandedId === "string" || parsed.expandedId === null ? { expandedId: parsed.expandedId as string | null } : {}),
      ...(Array.isArray(parsed.detail) ? { detail: parsed.detail.filter(isReportDetail) } : {}),
    };
  } catch {
    /* A browser that refuses session storage simply starts from the defaults. */
    return {};
  }
}

function writeReportView(storageKey: string, view: ReportView) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(view));
  } catch {
    /* Remembering the view is a convenience; failing must never break the report. */
  }
}

/* Each open level of detail is one browser history entry, so the browser's
   Back closes detail one level at a time, as the in-sheet Back does. */
const historyDepthKey = "dosReportDetail";

function historyDepth() {
  const state = window.history.state as Record<string, unknown> | null;

  return typeof state?.[historyDepthKey] === "number" ? state[historyDepthKey] as number : 0;
}

/* ---------- formatting ---------- */

/* A dash is information DOS does not have; a zero is a verified zero. A
   person with no meeting in range logged no meeting time; a person whose
   meetings all lack a duration has no known time. */
function durationCell(row: Pick<DosMinistryPersonRow, "loggedMinutes" | "meetingCount" | "meetingsMissingDuration">) {
  if (row.meetingCount === 0) {
    return "0m";
  }

  return row.meetingsMissingDuration === row.meetingCount ? "—" : formatDosMinistryMinutes(row.loggedMinutes);
}

function recordDuration(minutes: number | null) {
  return minutes === null ? "—" : formatDosMinistryMinutes(minutes);
}

function multiplicationDetail(row: DosMinistryPersonRow) {
  const name = row.personName.split(/\s+/)[0] ?? row.personName;

  switch (row.downstreamStatus) {
    case "resolved":
      return `${name}'s own Person records name ${row.downstream.map((link) => link.name).join(", ")}.`;
    case "not_recorded":
      return `${name}'s own Person records were read and name no one ${name} is discipling.`;
    case "not_resolved":
      return `${name} has a linked DOS identity, but reading ${name}'s own records is not built yet.`;
    case "not_connected":
      return `${name} has no verified DOS identity, so ${name}'s own records cannot be read.`;
    default:
      return "Multiplication applies to people you are discipling.";
  }
}

/* ---------- shared pieces ---------- */

const headCell = "h-10 whitespace-nowrap px-3 text-dos-eyebrow uppercase text-dos-eyebrow";
const bodyCell = "h-12 whitespace-nowrap px-3 align-middle text-dos-body text-dos-primary";
const stickyCell = "sticky left-0 z-[1] bg-white group-hover:bg-dos-surface2";
const alignClass = { center: "text-center", left: "text-left", right: "text-right" } as const;

function SortHeader({
  align,
  className = "",
  label,
  onSort,
  sort,
  sortKey,
}: {
  align: keyof typeof alignClass;
  className?: string;
  label: string;
  onSort: (key: DosMinistryReportSortKey) => void;
  sort: DosMinistryReportSort;
  sortKey: DosMinistryReportSortKey;
}) {
  const active = sort.key === sortKey;
  const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} className={`${headCell} ${alignClass[align]} ${className}`} scope="col">
      <button
        className={`inline-flex h-8 items-center gap-1 rounded-dos-3 uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue ${active ? "text-dos-primary" : "hover:text-dos-primary"}`}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        {label}
        {active ? <Arrow aria-hidden="true" className="h-3 w-3" strokeWidth={2.25} /> : null}
      </button>
    </th>
  );
}

function ExpandButton({ expanded, name, onToggle }: { expanded: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} records for ${name}`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-dos-3 text-dos-secondary transition-colors hover:bg-dos-surface2 hover:text-dos-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      type="button"
    >
      {expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4" strokeWidth={2} /> : <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
    </button>
  );
}

/* One contributing record per line: date, what it was, where it counted, duration. */
function RecordList({
  currentPersonId,
  now,
  onOpenRecord,
  records,
}: {
  /* Inside a person's own detail their check-ins have nothing further to
     open, so they are plain rows rather than buttons that do nothing. */
  currentPersonId?: string;
  now: Date;
  onOpenRecord: (record: DosMinistryReportRecord) => void;
  records: DosMinistryReportRecord[];
}) {
  if (!records.length) {
    return <p className="text-dos-meta text-dos-secondary">No meeting or check-in in this period.</p>;
  }

  const layout = "grid min-h-11 w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left md:grid-cols-[64px_minmax(0,1fr)_120px_64px]";

  return (
    <ul className="divide-y divide-dos-line rounded-dos-1 border border-dos-line bg-white">
      {records.map((record) => {
        const cells = (
          <>
            <span className="text-dos-meta tabular-nums text-dos-secondary">{formatDosMinistryDate(record.date, now)}</span>
            <span className="truncate text-dos-label text-dos-primary">{record.label}</span>
            <span className="hidden text-dos-meta text-dos-secondary md:block">{record.kind === "meeting" ? dosMinistryTimeBucketLabels[record.bucket] : "Check-in"}</span>
            <span className="text-right text-dos-label tabular-nums text-dos-primary">{recordDuration(record.minutes)}</span>
          </>
        );

        return (
          <li key={`${record.kind}-${record.id}`}>
            {record.kind === "check_in" && record.open.id === currentPersonId ? (
              <div className={layout}>{cells}</div>
            ) : (
              <button
                className={`${layout} transition-colors hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dos-blue`}
                onClick={() => onOpenRecord(record)}
                type="button"
              >
                {cells}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MeetingList({ meetings, now, onOpen }: { meetings: DosMinistryMeetingRecord[]; now: Date; onOpen: (meetingId: string) => void }) {
  if (!meetings.length) {
    return <p className="text-dos-meta text-dos-secondary">No meeting in this period.</p>;
  }

  return (
    <ul className="divide-y divide-dos-line rounded-dos-1 border border-dos-line bg-white">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <button
            className="grid min-h-11 w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dos-blue"
            onClick={() => onOpen(meeting.id)}
            type="button"
          >
            <span className="text-dos-meta tabular-nums text-dos-secondary">{formatDosMinistryDate(meeting.date, now)}</span>
            <span className="min-w-0">
              <span className="block truncate text-dos-label text-dos-primary">{meeting.people.length ? meeting.people.map((person) => person.name).join(", ") : "Not linked"}</span>
              <span className="block truncate text-dos-meta text-dos-secondary">{meeting.label}</span>
            </span>
            <span className="text-right text-dos-label tabular-nums text-dos-primary">{recordDuration(meeting.minutes)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FruitList({ now, onOpen, rows }: { now: Date; onOpen: (fruitId: string) => void; rows: DosMinistryFruitRow[] }) {
  return (
    <ul className="divide-y divide-dos-line rounded-dos-1 border border-dos-line bg-white">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            className="grid min-h-11 w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dos-blue"
            onClick={() => onOpen(row.id)}
            type="button"
          >
            <span className="text-dos-meta tabular-nums text-dos-secondary">{formatDosMinistryDate(row.date, now)}</span>
            <span className="min-w-0">
              <span className="block truncate text-dos-label text-dos-primary">{row.summary}</span>
              <span className="block truncate text-dos-meta text-dos-secondary">{row.sourceLabel}</span>
            </span>
            <Pill tone={row.statusTone}>{row.statusLabel}</Pill>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* Label-value lines inside a detail. */
function Facts({ items }: { items: Array<{ label: string; value: ReactNode } | null> }) {
  return (
    <dl className="divide-y divide-dos-line">
      {items.filter((item): item is { label: string; value: ReactNode } => Boolean(item)).map((item) => (
        <div className="flex min-h-11 items-center justify-between gap-4 py-2" key={item.label}>
          <dt className="text-dos-label text-dos-secondary">{item.label}</dt>
          <dd className="min-w-0 text-right text-dos-body tabular-nums text-dos-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MetricCard({ label, onOpen, value }: { label: string; onOpen: () => void; value: string }) {
  return (
    <button
      aria-haspopup="dialog"
      className="group flex min-h-[84px] min-w-0 flex-col justify-between rounded-dos-2 border border-dos-line bg-white px-3 py-2.5 text-left transition-colors hover:border-dos-blue100 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue md:min-h-[96px] md:px-4 md:py-3"
      onClick={onOpen}
      type="button"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-dos-eyebrow uppercase text-dos-eyebrow">{label}</span>
        <ChevronRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-dos-secondary transition-colors group-hover:text-dos-primary md:block" strokeWidth={2} />
      </span>
      <span className="mt-1 block truncate text-dos-heading tabular-nums text-dos-primary">{value}</span>
    </button>
  );
}

/* ---------- the report ---------- */

export function MinistryTimeInvestmentReport({
  input,
  now,
  onOpenMeeting,
  onOpenPerson,
  storageKey,
}: {
  input: Omit<DosMinistryReportInput, "now" | "period" | "range">;
  /* Injected so the visual suite's pinned clock applies. */
  now: Date;
  /* Open the full source record. Reports calls these only from an explicit
     Open action; ordinary clicks open read-only detail over the report. */
  onOpenMeeting: (meetingId: string, kind?: "discipleship_meeting" | "meeting") => void;
  onOpenPerson: (personId: string) => void;
  /* Scoped per workspace, so the view survives a full record and a reload. */
  storageKey?: string;
}) {
  const [range, setRange] = useState<DosMinistryReportRange>(dosMinistryReportDefaultRange);
  const [filter, setFilter] = useState<DosMinistryReportFilter>("all");
  const [sort, setSort] = useState<DosMinistryReportSort>(dosMinistryReportDefaultSort);
  const [customPeriod, setCustomPeriod] = useState<{ end: string; start: string }>(() => {
    const period = dosMinistryReportPeriod(dosMinistryReportDefaultRange, now);

    return { end: period.end, start: period.start };
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail[]>([]);
  const [isViewRestored, setIsViewRestored] = useState(!storageKey);
  /* Detail levels restored from storage that have no history entry of their own. */
  const unbackedDepthRef = useRef(0);

  /* USA-261: the saved view is restored after hydration, never read during a
     render. */
  useLayoutEffect(() => {
    if (!storageKey) {
      return;
    }

    const saved = readReportView(storageKey);

    if (saved.range) {
      setRange(saved.range);
    }

    if (saved.filter) {
      setFilter(saved.filter);
    }

    if (saved.sort) {
      setSort(saved.sort);
    }

    if (saved.customPeriod) {
      setCustomPeriod(saved.customPeriod);
    }

    if (saved.expandedId !== undefined) {
      setExpandedId(saved.expandedId);
    }

    if (saved.detail?.length) {
      unbackedDepthRef.current = Math.max(0, saved.detail.length - historyDepth());
      setDetail(saved.detail);
    }

    setIsViewRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !isViewRestored) {
      return;
    }

    writeReportView(storageKey, { customPeriod, detail, expandedId, filter, range, sort });
  }, [customPeriod, detail, expandedId, filter, isViewRestored, range, sort, storageKey]);

  useEffect(() => {
    const handlePopState = () => {
      const depth = historyDepth();

      setDetail((stack) => stack.slice(0, Math.min(stack.length, unbackedDepthRef.current + depth)));
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const report = useMemo(
    () => buildDosMinistryReport({ ...input, now, period: range === "custom" ? customPeriod : undefined, range }),
    [customPeriod, input, now, range],
  );
  const visibleRows = useMemo(
    () => dosMinistrySortRows(report.rows.filter((row) => dosMinistryRowMatchesFilter(row, filter)), sort),
    [filter, report.rows, sort],
  );
  const rowById = useMemo(() => new Map(report.rows.map((row) => [row.personId, row])), [report.rows]);
  const meetingById = useMemo(() => new Map(report.meetings.map((meeting) => [meeting.id, meeting])), [report.meetings]);
  const fruitById = useMemo(() => new Map(report.fruitRows.map((row) => [row.id, row])), [report.fruitRows]);
  const nameById = useMemo(() => new Map(input.people.map((person) => [person.id, person.name])), [input.people]);

  const openDetail = (next: ReportDetail) => {
    const top = detail[detail.length - 1];

    if (top && top.kind === next.kind && top.id === next.id) {
      return;
    }

    setDetail([...detail, next]);

    try {
      window.history.pushState({ ...(window.history.state ?? {}), [historyDepthKey]: detail.length + 1 - unbackedDepthRef.current }, "");
    } catch {
      /* Without history, the in-sheet Back and Close still work. */
    }
  };

  const backDetail = () => {
    if (detail.length - unbackedDepthRef.current > 0) {
      window.history.back();
      return;
    }

    unbackedDepthRef.current = Math.max(0, unbackedDepthRef.current - 1);
    setDetail(detail.slice(0, -1));
  };

  const closeDetail = () => {
    const backed = detail.length - unbackedDepthRef.current;

    unbackedDepthRef.current = 0;

    if (backed > 0) {
      window.history.go(-backed);
      return;
    }

    setDetail([]);
  };

  const toggleSort = (key: DosMinistryReportSortKey) => {
    setSort((current) => (current.key === key
      ? { direction: current.direction === "asc" ? "desc" : "asc", key }
      : { direction: key === "person" || key === "relationship" ? "asc" : "desc", key }));
  };
  const toggleExpanded = (personId: string) => setExpandedId((current) => (current === personId ? null : personId));
  const openRecord = (record: DosMinistryReportRecord) => (record.kind === "meeting" ? openDetail({ id: record.id, kind: "meeting" }) : openDetail({ id: record.open.id, kind: "person" }));
  const openPersonDetail = (personId: string) => openDetail({ id: personId, kind: "person" });
  const fruitForPerson = (personId: string) => report.fruitRows.filter((row) => row.personId === personId);

  return (
    <div className="grid min-w-0 gap-5 md:gap-6">
      <section aria-label="Report period" className="flex min-w-0 flex-col gap-3 rounded-dos-2 border border-dos-line bg-white p-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:px-4">
        <div className="min-w-0">
          <p className="text-dos-eyebrow uppercase text-dos-eyebrow">Period</p>
          <p className="mt-1 text-dos-question tabular-nums text-dos-primary">{formatDosMinistryPeriod(report.period)}</p>
        </div>
        <div className="min-w-0 md:w-[420px]">
          <Segmented label="Report range" onChange={setRange} options={dosMinistryReportRangeOptions} value={range} />
        </div>
        {range === "custom" ? (
          <div className="grid min-w-0 grid-cols-2 gap-3 md:ml-auto md:w-[420px]">
            <label className="grid min-w-0 gap-1 text-dos-label text-dos-secondary">
              From
              <input
                className="h-11 min-w-0 rounded-dos-1 border border-dos-line bg-white px-3 text-dos-body tabular-nums text-dos-primary focus-visible:border-dos-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                max={customPeriod.end}
                onChange={(event) => {
                  const start = event.target.value;

                  setCustomPeriod((current) => ({ ...current, start: start || current.start }));
                }}
                type="date"
                value={customPeriod.start}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-dos-label text-dos-secondary">
              To
              <input
                className="h-11 min-w-0 rounded-dos-1 border border-dos-line bg-white px-3 text-dos-body tabular-nums text-dos-primary focus-visible:border-dos-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                min={customPeriod.start}
                onChange={(event) => {
                  const end = event.target.value;

                  setCustomPeriod((current) => ({ ...current, end: end || current.end }));
                }}
                type="date"
                value={customPeriod.end}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section aria-label="Summary" className="grid min-w-0 grid-cols-3 gap-2 md:gap-3">
        <MetricCard label={dosMinistryMetricDefinitions.invested.label} onOpen={() => openDetail({ id: "invested", kind: "metric" })} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesInvested)} />
        <MetricCard label={dosMinistryMetricDefinitions.received.label} onOpen={() => openDetail({ id: "received", kind: "metric" })} value={formatDosMinistryMinutes(report.totals.uniqueLoggedMinutesReceived)} />
        <MetricCard label={dosMinistryMetricDefinitions.meetings.label} onOpen={() => openDetail({ id: "meetings", kind: "metric" })} value={`${report.totals.meetings}`} />
      </section>

      <section aria-labelledby="dos-report-time-investment" className="min-w-0 rounded-dos-2 border border-dos-line bg-white">
        {/* The five filters sit beside the title only where every label fits
            ("Discipling me" must never truncate); narrower widths use the rail. */}
        <div className="flex min-w-0 flex-col gap-2 px-4 pb-3 pt-3.5 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
          <h2 className="text-dos-label text-dos-primary" id="dos-report-time-investment">
            Time Investment <span className="ml-1 font-medium tabular-nums text-dos-secondary">{visibleRows.length}</span>
          </h2>
          <div className="min-w-0 xl:hidden">
            <PillRail edgeInset={4} label="Relationship filter" onChange={setFilter} options={dosMinistryReportFilterOptions} value={filter} />
          </div>
          <div className="hidden min-w-0 xl:block xl:w-[640px]">
            <Segmented label="Relationship filter" onChange={setFilter} options={dosMinistryReportFilterOptions} value={filter} />
          </div>
        </div>

        {visibleRows.length ? (
          <>
            <ul className="divide-y divide-dos-line border-t border-dos-line md:hidden">
              {visibleRows.map((row) => {
                const expanded = expandedId === row.personId;

                return (
                  <li key={row.personId}>
                    <div className="flex min-h-[64px] items-center gap-1 pl-4 pr-1">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                        onClick={() => openPersonDetail(row.personId)}
                        type="button"
                      >
                        {/* Name and time share the first line; the second line
                            gets the full width, so nothing truncates at 390px. */}
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-baseline justify-between gap-3">
                            <span className="truncate text-dos-body font-semibold text-dos-primary">{row.personName}</span>
                            <span className="shrink-0 text-dos-body font-semibold tabular-nums text-dos-primary">{durationCell(row)}</span>
                          </span>
                          <span className="mt-1 flex min-w-0 items-center gap-2">
                            <Pill tone="grey">{row.relationshipLabel}</Pill>
                            <span className="min-w-0 truncate text-dos-meta tabular-nums text-dos-secondary">
                              {row.meetingCount} {row.meetingCount === 1 ? "meeting" : "meetings"} · {row.lastActivity ? formatDosMinistryDate(row.lastActivity.date, now) : "—"}
                            </span>
                            {row.completeness === "partial" ? <span className="ml-auto"><Pill tone="blue">Partial</Pill></span> : null}
                          </span>
                        </span>
                      </button>
                      <ExpandButton expanded={expanded} name={row.personName} onToggle={() => toggleExpanded(row.personId)} />
                    </div>
                    {expanded ? (
                      <div className="border-t border-dos-line bg-dos-surface2/60 px-4 py-3">
                        <dl className="mb-3 grid grid-cols-3 gap-2">
                          <div className="min-w-0">
                            <dt className="text-dos-eyebrow uppercase text-dos-eyebrow">Multiplication</dt>
                            <dd className="mt-1 text-dos-body tabular-nums text-dos-primary">{dosMinistryMultiplicationCell(row)}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-dos-eyebrow uppercase text-dos-eyebrow">Fruit</dt>
                            <dd className="mt-1 text-dos-body tabular-nums text-dos-primary">{row.fruitCount}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-dos-eyebrow uppercase text-dos-eyebrow">Status</dt>
                            <dd className="mt-1"><Pill tone={completenessTone[row.completeness]}>{row.completenessLabel}</Pill></dd>
                          </div>
                        </dl>
                        <RecordList now={now} onOpenRecord={openRecord} records={row.records} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="hidden min-w-0 overflow-x-auto border-t border-dos-line md:block">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className="bg-dos-surface2">
                    <SortHeader align="left" className="sticky left-0 z-[1] bg-dos-surface2 pl-4" label="Person" onSort={toggleSort} sort={sort} sortKey="person" />
                    <SortHeader align="left" label="Relationship" onSort={toggleSort} sort={sort} sortKey="relationship" />
                    <SortHeader align="center" label="Meetings" onSort={toggleSort} sort={sort} sortKey="meetings" />
                    <SortHeader align="right" label="Time" onSort={toggleSort} sort={sort} sortKey="time" />
                    <SortHeader align="center" label="Last activity" onSort={toggleSort} sort={sort} sortKey="last_activity" />
                    <th className={`${headCell} text-center`} scope="col">Multiplication</th>
                    <SortHeader align="center" label="Fruit" onSort={toggleSort} sort={sort} sortKey="fruit" />
                    <th className={`${headCell} text-center`} scope="col">Status</th>
                    <th className={`${headCell} w-14`} scope="col"><span className="sr-only">Records</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const expanded = expandedId === row.personId;

                    return (
                      <PersonTableRow
                        expanded={expanded}
                        key={row.personId}
                        now={now}
                        onOpenDetail={() => openPersonDetail(row.personId)}
                        onOpenRecord={openRecord}
                        onToggle={() => toggleExpanded(row.personId)}
                        row={row}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="border-t border-dos-line px-4 py-4 text-dos-body text-dos-secondary">
            {filter === "all" ? "No logged meeting, check-in, or relationship in this period." : "No one matches this filter in this period."}
          </p>
        )}
      </section>

      <section aria-labelledby="dos-report-ministry-fruit" className="min-w-0 rounded-dos-2 border border-dos-line bg-white">
        <div className="px-4 pb-3 pt-3.5">
          <h2 className="text-dos-label text-dos-primary" id="dos-report-ministry-fruit">
            Ministry Fruit <span className="ml-1 font-medium tabular-nums text-dos-secondary">{report.fruitRows.length}</span>
          </h2>
        </div>
        {report.fruitRows.length ? (
          <>
            <ul className="divide-y divide-dos-line border-t border-dos-line md:hidden">
              {report.fruitRows.map((row) => (
                <li key={row.id}>
                  <button
                    className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dos-blue"
                    onClick={() => openDetail({ id: row.id, kind: "fruit" })}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-dos-body font-semibold text-dos-primary">{row.summary}</span>
                      <span className="mt-1 block truncate text-dos-meta text-dos-secondary">{row.personName} · {row.sourceLabel}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-dos-meta tabular-nums text-dos-secondary">{formatDosMinistryDate(row.date, now)}</span>
                      <Pill tone={row.statusTone}>{row.statusLabel}</Pill>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden min-w-0 overflow-x-auto border-t border-dos-line md:block">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="bg-dos-surface2">
                    <th className={`${headCell} w-24 pl-4 text-center`} scope="col">Date</th>
                    <th className={`${headCell} text-left`} scope="col">Person</th>
                    <th className={`${headCell} text-left`} scope="col">Outcome</th>
                    <th className={`${headCell} text-left`} scope="col">Type</th>
                    <th className={`${headCell} pr-4 text-center`} scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.fruitRows.map((row) => (
                    <tr className="cursor-pointer border-t border-dos-line hover:bg-dos-surface2" key={row.id} onClick={() => openDetail({ id: row.id, kind: "fruit" })}>
                      <td className={`${bodyCell} pl-4 text-center tabular-nums`}>{formatDosMinistryDate(row.date, now)}</td>
                      <td className={`${bodyCell} max-w-[220px] truncate`}>{row.personName}</td>
                      <td className={`${bodyCell} max-w-[280px] truncate`}>
                        <button
                          className="max-w-full truncate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetail({ id: row.id, kind: "fruit" });
                          }}
                          type="button"
                        >
                          {row.summary}
                        </button>
                      </td>
                      <td className={bodyCell}>{row.sourceLabel}</td>
                      <td className={`${bodyCell} pr-4 text-center`}><Pill tone={row.statusTone}>{row.statusLabel}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="border-t border-dos-line px-4 py-4 text-dos-body text-dos-secondary">No fruit, review, testimony, or Journey completion in this period.</p>
        )}
      </section>

      {detail.length ? (
        <ReportDetailSheet
          detail={detail}
          fruitById={fruitById}
          fruitForPerson={fruitForPerson}
          meetingById={meetingById}
          nameById={nameById}
          now={now}
          onBack={backDetail}
          onClose={closeDetail}
          onOpen={openDetail}
          onOpenMeeting={onOpenMeeting}
          onOpenPerson={onOpenPerson}
          onOpenRecord={openRecord}
          report={report}
          rowById={rowById}
        />
      ) : null}
    </div>
  );
}

function PersonTableRow({
  expanded,
  now,
  onOpenDetail,
  onOpenRecord,
  onToggle,
  row,
}: {
  expanded: boolean;
  now: Date;
  /* Opens the person's report-local detail, never the full record. */
  onOpenDetail: () => void;
  onOpenRecord: (record: DosMinistryReportRecord) => void;
  onToggle: () => void;
  row: DosMinistryPersonRow;
}) {
  return (
    <>
      <tr className="group cursor-pointer border-t border-dos-line hover:bg-dos-surface2" onClick={onOpenDetail}>
        <td className={`${bodyCell} ${stickyCell} max-w-[240px] pl-4`}>
          <button
            className="block max-w-full truncate text-left font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail();
            }}
            type="button"
          >
            {row.personName}
          </button>
        </td>
        <td className={bodyCell}><Pill tone="grey">{row.relationshipLabel}</Pill></td>
        <td className={`${bodyCell} text-center tabular-nums`}>{row.meetingCount}</td>
        <td className={`${bodyCell} text-right tabular-nums`}>{durationCell(row)}</td>
        <td className={`${bodyCell} text-center tabular-nums`}>{row.lastActivity ? formatDosMinistryDate(row.lastActivity.date, now) : "—"}</td>
        <td className={`${bodyCell} text-center tabular-nums`}>{dosMinistryMultiplicationCell(row)}</td>
        <td className={`${bodyCell} text-center tabular-nums`}>{row.fruitCount}</td>
        <td className={`${bodyCell} text-center`}><Pill tone={completenessTone[row.completeness]}>{row.completenessLabel}</Pill></td>
        <td className={`${bodyCell} w-14 pr-2 text-right`}>
          <ExpandButton expanded={expanded} name={row.personName} onToggle={onToggle} />
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-dos-line bg-dos-surface2/60">
          <td className="px-4 py-3" colSpan={9}>
            <div className="max-w-[760px]">
              <RecordList now={now} onOpenRecord={onOpenRecord} records={row.records} />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

/* ---------- read-only detail over the report ---------- */

function ReportDetailSheet({
  detail,
  fruitById,
  fruitForPerson,
  meetingById,
  nameById,
  now,
  onBack,
  onClose,
  onOpen,
  onOpenMeeting,
  onOpenPerson,
  onOpenRecord,
  report,
  rowById,
}: {
  detail: ReportDetail[];
  fruitById: Map<string, DosMinistryFruitRow>;
  fruitForPerson: (personId: string) => DosMinistryFruitRow[];
  meetingById: Map<string, DosMinistryMeetingRecord>;
  nameById: Map<string, string>;
  now: Date;
  onBack: () => void;
  onClose: () => void;
  onOpen: (next: ReportDetail) => void;
  onOpenMeeting: (meetingId: string, kind?: "discipleship_meeting" | "meeting") => void;
  onOpenPerson: (personId: string) => void;
  onOpenRecord: (record: DosMinistryReportRecord) => void;
  report: ReturnType<typeof buildDosMinistryReport>;
  rowById: Map<string, DosMinistryPersonRow>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const top = detail[detail.length - 1];
  const previous = detail.length > 1 ? detail[detail.length - 2] : null;

  /* Each level starts at the top of the sheet's scrolling body. */
  useEffect(() => {
    const body = contentRef.current?.parentElement;

    if (body) {
      body.scrollTop = 0;
    }
  }, [detail.length, top.id, top.kind]);

  const titleOf = (item: ReportDetail) => {
    switch (item.kind) {
      case "metric":
        return dosMinistryMetricDefinitions[item.id].label;
      case "person":
        return rowById.get(item.id)?.personName ?? nameById.get(item.id) ?? "Person";
      case "meeting":
        return meetingById.get(item.id)?.label ?? "Meeting";
      default:
        return fruitById.get(item.id)?.summary ?? "Ministry Fruit";
    }
  };
  const personLink = (personId: string | null, name: string) => (personId && rowById.has(personId) ? (
    <button className="text-dos-blueText underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={() => onOpen({ id: personId, kind: "person" })} type="button">
      {name}
    </button>
  ) : name);

  let identity: string | null = null;
  let body: ReactNode = null;
  let actions: ReactNode = null;

  if (top.kind === "metric") {
    const definition = dosMinistryMetricDefinitions[top.id];
    const meetings = top.id === "meetings" ? report.meetings : report.meetings.filter((meeting) => meeting.bucket === top.id);
    const value = top.id === "meetings"
      ? `${report.totals.meetings}`
      : formatDosMinistryMinutes(top.id === "invested" ? report.totals.uniqueLoggedMinutesInvested : report.totals.uniqueLoggedMinutesReceived);
    const missing = meetings.filter((meeting) => meeting.minutes === null).length;

    identity = formatDosMinistryPeriod(report.period);
    body = (
      <>
        <DosDetailSection label="Total">
          <p className="text-dos-display tabular-nums text-dos-primary">{value}</p>
          <p className="mt-2 text-dos-body text-dos-secondary">{definition.definition}</p>
        </DosDetailSection>
        <DosDetailSection label="How it adds up">
          <Facts
            items={top.id === "meetings"
              ? [
                { label: dosMinistryTimeBucketLabels.invested, value: report.totals.investedMeetings },
                { label: dosMinistryTimeBucketLabels.received, value: report.totals.receivedMeetings },
                missing ? { label: "Without a logged duration", value: missing } : null,
                report.totals.unlinkedMeetings ? { label: "Not linked to a person", value: report.totals.unlinkedMeetings } : null,
                report.totals.connectionLogs ? { label: "Connection logs, not counted", value: report.totals.connectionLogs } : null,
              ]
              : [
                { label: "Meetings", value: meetings.length },
                missing ? { label: "Without a logged duration", value: missing } : null,
                { label: "People", value: new Set(meetings.flatMap((meeting) => meeting.people.map((person) => person.id))).size },
              ]}
          />
          {top.id !== "meetings" ? (
            <p className="mt-2 text-dos-meta text-dos-secondary">A meeting with several people counts once here and appears on each person&apos;s row.</p>
          ) : null}
        </DosDetailSection>
        <DosDetailSection label={top.id === "meetings" ? "Meetings" : "Contributing meetings"}>
          <MeetingList meetings={meetings} now={now} onOpen={(meetingId) => onOpen({ id: meetingId, kind: "meeting" })} />
        </DosDetailSection>
      </>
    );
  } else if (top.kind === "person") {
    const row = rowById.get(top.id) ?? null;

    if (!row) {
      body = <p className="text-dos-body text-dos-secondary">No activity or relationship for this person in the selected period.</p>;
      actions = nameById.has(top.id) ? <Button fullWidth onClick={() => onOpenPerson(top.id)}>Open person record</Button> : null;
    } else {
      const personFruit = fruitForPerson(row.personId);

      identity = row.relationshipNote ? `${row.relationshipLabel} · ${row.relationshipNote}` : row.relationshipLabel;
      body = (
        <>
          <DosDetailSection label="Summary">
            <Facts
              items={[
                { label: "Relationship", value: <Pill tone="grey">{row.relationshipLabel}</Pill> },
                { label: "Meetings", value: row.meetingCount },
                { label: dosMinistryTimeBucketLabels.invested, value: row.meetingsByBucket.invested ? formatDosMinistryMinutes(row.minutesByBucket.invested) : "0m" },
                row.meetingsByBucket.received ? { label: dosMinistryTimeBucketLabels.received, value: formatDosMinistryMinutes(row.minutesByBucket.received) } : null,
                row.checkInCount ? { label: "Check-ins", value: row.checkInCount } : null,
                /* USA-271: recorded group attendance is its own count, never
                   a meeting and never the missionary's logged duration. */
                row.gatheringsAttended ? { label: "Group gatherings", value: row.gatheringsAttended } : null,
                { label: "Last activity", value: row.lastActivity ? formatDosMinistryDate(row.lastActivity.date, now) : "—" },
                { label: "Fruit", value: row.fruitCount },
                { label: "Status", value: <Pill tone={completenessTone[row.completeness]}>{row.completenessLabel}</Pill> },
              ]}
            />
            {row.completeness === "partial" ? <p className="mt-2 text-dos-meta text-dos-secondary">{row.completenessDetail}.</p> : null}
            {row.gatheringsAttended ? (
              <p className="mt-2 text-dos-meta text-dos-secondary">Group gatherings are recorded attendance in this range, not counted as meetings or as your logged duration.</p>
            ) : null}
            {row.directionConflict ? <p className="mt-2 rounded-dos-1 bg-dos-blue50 px-3 py-2 text-dos-meta text-dos-blueText">{row.directionConflict}</p> : null}
          </DosDetailSection>
          <DosDetailSection label="Multiplication">
            <Facts items={[{ label: "Status", value: dosMinistryMultiplicationLabel(row) }]} />
            <p className="mt-1 text-dos-meta text-dos-secondary">{multiplicationDetail(row)}</p>
          </DosDetailSection>
          <DosDetailSection label="Contributing records">
            <RecordList currentPersonId={row.personId} now={now} onOpenRecord={onOpenRecord} records={row.records} />
          </DosDetailSection>
          {personFruit.length ? (
            <DosDetailSection label="Ministry Fruit">
              <FruitList now={now} onOpen={(fruitId) => onOpen({ id: fruitId, kind: "fruit" })} rows={personFruit} />
            </DosDetailSection>
          ) : null}
        </>
      );
      actions = <Button fullWidth onClick={() => onOpenPerson(row.personId)}>Open person record</Button>;
    }
  } else if (top.kind === "meeting") {
    const meeting = meetingById.get(top.id) ?? null;

    if (!meeting) {
      body = <p className="text-dos-body text-dos-secondary">This meeting is not in the selected period.</p>;
    } else {
      const meetingFruit = report.fruitRows.filter((row) => row.open?.id === meeting.id);

      identity = formatDosMinistryDate(meeting.date, now);
      body = (
        <>
          <DosDetailSection label="Meeting">
            <Facts
              items={[
                { label: "Date", value: formatDosMinistryDate(meeting.date, now) },
                { label: "Duration", value: meeting.minutes === null ? "Not logged" : formatDosMinistryMinutes(meeting.minutes) },
                { label: "Counted as", value: dosMinistryTimeBucketLabels[meeting.bucket] },
                { label: "Role", value: meeting.roleLabel ?? "Not recorded" },
              ]}
            />
            <p className="mt-2 text-dos-meta text-dos-secondary">{meeting.bucketReason}.</p>
          </DosDetailSection>
          <DosDetailSection label="People">
            {meeting.people.length ? (
              <ul className="grid gap-1">
                {meeting.people.map((person) => <li className="text-dos-body" key={person.id}>{personLink(person.id, person.name)}</li>)}
              </ul>
            ) : (
              <p className="text-dos-body text-dos-secondary">Not linked to a person.</p>
            )}
            {meeting.people.length > 1 ? <p className="mt-2 text-dos-meta text-dos-secondary">Counted once in the totals; each person&apos;s row shows it.</p> : null}
          </DosDetailSection>
          {meetingFruit.length ? (
            <DosDetailSection label="Ministry Fruit">
              <FruitList now={now} onOpen={(fruitId) => onOpen({ id: fruitId, kind: "fruit" })} rows={meetingFruit} />
            </DosDetailSection>
          ) : null}
        </>
      );
      actions = (
        <Button fullWidth onClick={() => onOpenMeeting(meeting.open.id, meeting.open.kind)}>
          {meeting.open.kind === "discipleship_meeting" ? "Open in My Record" : "Open meeting"}
        </Button>
      );
    }
  } else {
    const fruit = fruitById.get(top.id) ?? null;

    if (!fruit) {
      body = <p className="text-dos-body text-dos-secondary">This record is not in the selected period.</p>;
    } else {
      identity = `${fruit.sourceLabel} · ${formatDosMinistryDate(fruit.date, now)}`;
      body = (
        <>
          <DosDetailSection label="Record">
            <Facts
              items={[
                { label: "Type", value: fruit.sourceLabel },
                { label: "Status", value: <Pill tone={fruit.statusTone}>{fruit.statusLabel}</Pill> },
                { label: "Date", value: formatDosMinistryDate(fruit.date, now) },
                { label: "Person", value: fruit.personSource === "none" ? "Not linked" : personLink(fruit.personId, fruit.personName) },
              ]}
            />
            {fruit.personSource === "meeting" ? <p className="mt-2 text-dos-meta text-dos-secondary">Linked through the meeting&apos;s only person.</p> : null}
          </DosDetailSection>
          <DosDetailSection label="Recorded">
            <p>{fruit.text}</p>
          </DosDetailSection>
          <DosDetailSection label="Related">
            {fruit.open ? (
              <button className="text-left text-dos-blueText underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue" onClick={() => onOpen({ id: fruit.open!.id, kind: "meeting" })} type="button">
                {fruit.relatedLabel}
              </button>
            ) : (
              <p className={fruit.relatedLabel === "Not linked" ? "text-dos-secondary" : ""}>{fruit.relatedLabel}</p>
            )}
          </DosDetailSection>
        </>
      );
    }
  }

  return (
    <DosDetailSheet actions={actions} identity={identity} onClose={onClose} title={titleOf(top)}>
      <div ref={contentRef}>
        {previous ? (
          <button
            aria-label={`Back to ${titleOf(previous)}`}
            className="-ml-2 mb-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-dos-3 px-2 text-dos-label text-dos-blueText transition-colors hover:bg-dos-blue50 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{titleOf(previous)}</span>
          </button>
        ) : null}
        {body}
      </div>
    </DosDetailSheet>
  );
}
