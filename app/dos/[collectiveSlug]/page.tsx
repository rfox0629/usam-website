import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ImproveDosFeedbackModal } from "@/app/system/preview/ImproveDosFeedbackModal";
import {
  loadDosWorkspace,
  type DosMeeting,
  type DosRelationship,
  type MultiplicationNode,
} from "@/src/lib/dos/workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Field Overview | USA Missionaries",
  description: "A strategic DOS field overview for ministry health, activity, and multiplication visibility.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ActivityItem = {
  dateValue: string;
  detail: string;
  id: string;
  meta?: string | null;
  title: string;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatMeetingAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function formatRelativeDateTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const daysAgo = Math.round((todayUtc - dateUtc) / (24 * 60 * 60 * 1000));

  if (daysAgo < 0) {
    return formatMeetingAt(value);
  }

  if (daysAgo === 0) {
    return "Today";
  }

  if (daysAgo === 1) {
    return "Yesterday";
  }

  return `${daysAgo} days ago`;
}

function isWithinDays(value: string, days: number) {
  const date = new Date(value);
  const now = new Date();
  const ageMs = now.getTime() - date.getTime();

  return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000;
}

function joinNames(values: string[], fallback: string) {
  return values.length ? values.join(", ") : fallback;
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function meetingParticipantSummary(meeting: DosMeeting) {
  const names = [...meeting.ministers, ...meeting.people].map((person) => person.name);

  return names.length ? names.join(" + ") : "No people attached";
}

function meetingMovementSummary(meeting: DosMeeting) {
  const movement = meeting.relationshipMovement ?? meeting.spiritualOpennessMovement;

  return movement ? `Movement marker: ${formatLabel(movement)}` : meeting.summaryPrivate;
}

function buildRecentActivity(meetings: DosMeeting[], relationships: DosRelationship[]): ActivityItem[] {
  const meetingItems = meetings.slice(0, 5).map((meeting) => ({
    dateValue: meeting.meetingAt,
    detail: meetingParticipantSummary(meeting),
    id: `meeting-${meeting.id}`,
    meta: meetingMovementSummary(meeting),
    title: `${formatLabel(meeting.type)} • ${formatRelativeDateTime(meeting.meetingAt)}`,
  }));
  const relationshipItems = relationships.slice(0, 5).map((relationship) => ({
    dateValue: `${relationship.startedAt}T00:00:00Z`,
    detail: `${formatLabel(relationship.style)} • ${formatLabel(relationship.strength)}`,
    id: `relationship-${relationship.id}`,
    meta: "Active discipleship relationship",
    title: `${relationship.disciplerName} began walking with ${relationship.discipleName}`,
  }));

  return [...meetingItems, ...relationshipItems]
    .sort((first, second) => new Date(second.dateValue).getTime() - new Date(first.dateValue).getTime())
    .slice(0, 6);
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.26em] text-amber-400"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      <span className="h-px w-8 bg-amber-400" />
      {children}
    </p>
  );
}

function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  children?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className="mt-4 text-3xl font-bold uppercase leading-none text-stone-100 sm:text-4xl"
        style={{ fontFamily: font.oswald }}
      >
        {title}
      </h2>
      {children ? <div className="mt-4 text-sm leading-7 text-stone-400 sm:text-base">{children}</div> : null}
    </div>
  );
}

function AppIdentifier({ label }: { label: string }) {
  return (
    <div
      className="inline-flex border border-stone-800 bg-[#080808] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300"
      style={{ fontFamily: font.rajdhani }}
    >
      {label}
    </div>
  );
}

function KpiCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number | string;
}) {
  return (
    <article className="border border-stone-800 bg-[#080808] p-4 sm:p-5">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </p>
      <p className="mt-4 text-4xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-stone-500">{detail}</p>
    </article>
  );
}

function HealthCard({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "amber" | "neutral";
  value: string;
}) {
  return (
    <article className="border border-stone-800 bg-[#080808] p-4">
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
          tone === "amber" ? "text-amber-400" : "text-stone-500"
        }`}
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </p>
      <p className="mt-3 text-sm leading-6 text-stone-200">{value}</p>
    </article>
  );
}

function GenerationBadge({ generation }: { generation: number }) {
  return (
    <span
      className="border border-amber-500/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300"
      style={{ fontFamily: font.rajdhani }}
    >
      Gen {generation}
    </span>
  );
}

function MultiplicationTree({ roots }: { roots: MultiplicationNode[] }) {
  if (roots.length === 0) {
    return (
      <div className="border border-dashed border-stone-800 bg-[#080808] p-6 text-sm leading-7 text-stone-500">
        Multiplication chains will appear as active discipleship relationships grow.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roots.map((root) => (
        <TreeNode key={root.id} node={root} />
      ))}
    </div>
  );
}

function TreeNode({ node }: { node: MultiplicationNode }) {
  return (
    <div className={node.generation === 0 ? "" : "border-l border-amber-500/35 pl-4 sm:pl-5"}>
      {node.generation > 0 ? (
        <p
          className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/60"
          style={{ fontFamily: font.rajdhani }}
        >
          Discipling
        </p>
      ) : null}
      <div className="border border-stone-800 bg-[#080808] p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg font-semibold text-stone-100">{node.name}</p>
          <GenerationBadge generation={node.generation} />
        </div>
      </div>
      {node.children.length ? (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="border border-dashed border-stone-800 bg-[#080808] p-6 text-sm leading-7 text-stone-500">
        Activity will appear as meetings and discipleship relationships are logged.
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-900 border border-stone-800 bg-[#080808]">
      {items.map((item) => (
        <article className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:p-5" key={item.id}>
          <div>
            <h3 className="text-lg font-semibold text-stone-100">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">{item.detail}</p>
            {item.meta ? <p className="mt-2 text-sm leading-6 text-stone-500">{item.meta}</p> : null}
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-stone-600">{formatRelativeDateTime(item.dateValue)}</p>
        </article>
      ))}
    </div>
  );
}

function MeetingList({ meetings }: { meetings: DosMeeting[] }) {
  if (meetings.length === 0) {
    return (
      <div className="border border-dashed border-stone-800 bg-[#080808] p-6 text-sm leading-7 text-stone-500">
        No meetings have been logged for this collective yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {meetings.slice(0, 4).map((meeting) => (
        <article className="border border-stone-800 bg-[#080808] p-4 sm:p-5" key={meeting.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400"
                style={{ fontFamily: font.rajdhani }}
              >
                {formatLabel(meeting.type)}
              </p>
              <h3 className="mt-3 text-2xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                {meetingParticipantSummary(meeting)}
              </h3>
            </div>
            <p className="text-sm leading-6 text-stone-500">{formatMeetingAt(meeting.meetingAt)}</p>
          </div>

          {meeting.summaryPrivate ? (
            <p className="mt-4 text-sm leading-6 text-stone-300">{meeting.summaryPrivate}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="border border-stone-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400"
              style={{ fontFamily: font.rajdhani }}
            >
              One record
            </span>
            <span
              className="border border-amber-500/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300"
              style={{ fontFamily: font.rajdhani }}
            >
              {meeting.ministers.length} {meeting.ministers.length === 1 ? "minister" : "ministers"} attached
            </span>
            {meeting.followUpNeeded ? (
              <span
                className="border border-amber-500/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300"
                style={{ fontFamily: font.rajdhani }}
              >
                Follow up
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function SignalList({
  emptyText,
  label,
  meetings,
}: {
  emptyText: string;
  label: string;
  meetings: DosMeeting[];
}) {
  return (
    <div className="border border-stone-800 bg-[#080808] p-5">
      <h3 className="text-2xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {label}
      </h3>
      {meetings.length ? (
        <div className="mt-5 divide-y divide-stone-900">
          {meetings.slice(0, 4).map((meeting) => (
            <div className="py-3 first:pt-0 last:pb-0" key={meeting.id}>
              <p className="text-sm font-semibold text-stone-200">{formatLabel(meeting.type)}</p>
              <p className="mt-1 text-sm leading-6 text-stone-500">{meetingParticipantSummary(meeting)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-7 text-stone-500">{emptyText}</p>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl border border-stone-800 bg-[#080808] p-6">
          <Eyebrow>DOS Field Overview</Eyebrow>
          <h1 className="mt-4 text-4xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
            Field overview unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{message}</p>
        </div>
      </section>
    </main>
  );
}

export default async function DosFieldOverviewPage({
  params,
}: {
  params: Promise<{ collectiveSlug: string }>;
}) {
  const { collectiveSlug } = await params;
  const result = await loadDosWorkspace(collectiveSlug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return <ErrorState message={result.message} />;
  }

  const { data } = result;
  const affiliateNames = data.affiliates.map((affiliate) => affiliate.name);
  const networkNames = data.networks.map((network) => network.name);
  const followUpMeetings = data.meetings.filter((meeting) => meeting.followUpNeeded);
  const prayerMeetings = data.meetings.filter((meeting) => meeting.prayerRequested);
  const recentMeetingPersonIds = new Set(
    data.meetings
      .filter((meeting) => isWithinDays(meeting.meetingAt, 14))
      .flatMap((meeting) => meeting.people.map((person) => person.id)),
  );
  const peopleWithoutRecentMeetings = data.peopleDiscipling.filter(
    (relationship) => relationship.discipleType === "person" && !recentMeetingPersonIds.has(relationship.discipleId),
  ).length;
  const growingRelationships = data.meetings.filter((meeting) =>
    ["more_engaged", "beginning_discipleship", "beginning_multiplication"].includes(
      meeting.relationshipMovement ?? meeting.spiritualOpennessMovement ?? "",
    ),
  ).length;
  const recentActivity = buildRecentActivity(data.meetings, data.relationships);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0)_0%,#050505_88%)]" />

      <section className="relative px-4 pb-9 pt-10 sm:px-6 md:pb-12 md:pt-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <AppIdentifier label="DOS FIELD OVERVIEW" />
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600"
              style={{ fontFamily: font.rajdhani }}
            >
              Strategic dashboard
            </p>
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Eyebrow>Field Overview</Eyebrow>
              <h1
                className="mt-4 text-5xl font-bold uppercase leading-none text-stone-100 sm:text-7xl"
                style={{ fontFamily: font.oswald }}
              >
                {data.collective.name}
              </h1>
              <div className="mt-5 space-y-2 text-sm leading-7 text-stone-300 sm:text-base">
                <p>{data.organization.name}</p>
                <p>Affiliated: {joinNames(affiliateNames, "No active affiliates")}</p>
                <p>Networks: {joinNames(networkNames, "No active networks")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                className="inline-flex min-h-12 items-center justify-center border border-amber-500/60 bg-amber-400 px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-amber-300"
                href={`/dos/${data.collective.slug}/people`}
                style={{ fontFamily: font.rajdhani }}
              >
                Open Your Field
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center border border-stone-700 bg-[#080808] px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-stone-200 transition-colors hover:border-amber-500/50 hover:text-amber-300"
                href={`/dos/${data.collective.slug}/meetings`}
                style={{ fontFamily: font.rajdhani }}
              >
                Log Meeting
              </Link>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              detail="Active people in the field"
              label="People Walking With"
              value={data.peopleDiscipling.length}
            />
            <KpiCard
              detail="Profiles helping form others"
              label="Active Disciplers"
              value={data.multiplication.activeDisciplers}
            />
            <KpiCard
              detail="Logged this month"
              label="Meetings This Month"
              value={data.fieldActivity.meetingsThisMonth}
            />
            <KpiCard
              detail="Active visible paths"
              label="Multiplication Chains"
              value={data.multiplication.chainCount}
            />
            <KpiCard
              detail="Needs next touch"
              label="Follow Ups Needed"
              value={followUpMeetings.length}
            />
            <KpiCard
              detail="Prayer context captured"
              label="Prayer Encounters"
              value={data.fieldActivity.prayerEncounters}
            />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="Field Health" title="Movement signals">
            <p>Lightweight indicators for where attention may be needed across the field.</p>
          </SectionIntro>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HealthCard
              label="Follow Ups Needed"
              tone={followUpMeetings.length ? "amber" : "neutral"}
              value={followUpMeetings.length ? pluralize(followUpMeetings.length, "meeting") : "No follow ups flagged"}
            />
            <HealthCard
              label="No Meetings In 14 Days"
              tone={peopleWithoutRecentMeetings ? "amber" : "neutral"}
              value={peopleWithoutRecentMeetings ? pluralize(peopleWithoutRecentMeetings, "person", "people") : "Current rhythms are active"}
            />
            <HealthCard
              label="Relationships Growing"
              value={growingRelationships ? pluralize(growingRelationships, "movement marker") : "No movement markers yet"}
            />
            <HealthCard
              label="People Multiplying"
              value={pluralize(data.multiplication.secondGenerationDisciples, "second generation disciple")}
            />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionIntro eyebrow="Multiplication" title="Multiplication Overview">
              <p>Multiplication is visible when someone being discipled begins discipling someone else.</p>
            </SectionIntro>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <KpiCard
                detail="People actively discipling"
                label="Active Disciplers"
                value={data.multiplication.activeDisciplers}
              />
              <KpiCard
                detail="Disciples beyond the first generation"
                label="2nd Generation Disciples"
                value={data.multiplication.secondGenerationDisciples}
              />
              <KpiCard
                detail="Visible formation paths"
                label="Multiplication Chains"
                value={data.multiplication.chainCount}
              />
            </div>
          </div>

          <div>
            <MultiplicationTree roots={data.multiplication.roots} />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro eyebrow="Recent Activity" title="Field movement">
            <p>A quick read on recent ministry interactions and relationship movement.</p>
          </SectionIntro>
          <ActivityFeed items={recentActivity} />
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro eyebrow="Meetings" title="Ministry interactions">
              <p>One real life meeting stays one record, with ministers and people attached to it.</p>
            </SectionIntro>
            <MeetingList meetings={data.meetings} />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro eyebrow="Prayer / Follow Up" title="Care signals">
            <p>Prayer and follow-up markers stay lightweight here and become action context inside Your Field.</p>
          </SectionIntro>
          <div className="grid gap-4 md:grid-cols-2">
            <SignalList
              emptyText="No prayer requests captured yet."
              label="Prayer Encounters"
              meetings={prayerMeetings}
            />
            <SignalList
              emptyText="No follow ups flagged right now."
              label="Follow Ups Needed"
              meetings={followUpMeetings}
            />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 border border-stone-800 bg-[#080808] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Eyebrow>Improve DOS</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              Keep the field workflow honest
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400">
              Send quick product feedback when this overview or the daily field workflow feels unclear.
            </p>
          </div>
          <ImproveDosFeedbackModal
            className="flex min-h-12 items-center justify-center border border-amber-500/50 bg-[#101010] px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300 transition-colors hover:border-amber-300 hover:text-amber-100"
          />
        </div>
      </section>

    </main>
  );
}
