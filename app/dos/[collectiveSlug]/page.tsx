import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ImproveDosFeedbackModal } from "@/app/system/preview/ImproveDosFeedbackModal";
import { loadDosWorkspace, type DosMeeting, type DosRelationship, type MultiplicationNode } from "@/src/lib/dos/workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Collective Workspace | USA Missionaries",
  description: "A read-only DOS collective workspace for validating discipleship, meetings, and multiplication.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

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

function joinNames(values: string[], fallback: string) {
  return values.length ? values.join(", ") : fallback;
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

function MetricCard({
  label,
  value,
  detail,
}: {
  detail?: string;
  label: string;
  value: number | string;
}) {
  return (
    <article className="border border-stone-800 bg-[#090909] p-5">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </p>
      <p className="mt-5 text-5xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
      {detail ? <p className="mt-3 text-sm leading-6 text-stone-500">{detail}</p> : null}
    </article>
  );
}

function WorkspaceTabs() {
  const tabs = [
    { label: "DOS", state: "Active" },
    { label: "Public", state: "Placeholder" },
    { label: "Team", state: "Placeholder" },
    { label: "Settings", state: "Placeholder" },
  ] as const;

  return (
    <div className="border-y border-stone-900 bg-black/25">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-px bg-stone-900 md:grid-cols-4">
          {tabs.map((tab) => {
            const isActive = tab.label === "DOS";

            return (
              <div
                aria-current={isActive ? "page" : undefined}
                className={`min-h-20 bg-[#070707] px-4 py-4 ${isActive ? "text-amber-300" : "text-stone-500"}`}
                key={tab.label}
              >
                <p
                  className="text-sm font-bold uppercase tracking-[0.22em]"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {tab.label}
                </p>
                <p className="mt-2 text-xs text-stone-500">{tab.state}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RelationshipList({
  emptyText,
  relationships,
}: {
  emptyText: string;
  relationships: DosRelationship[];
}) {
  if (relationships.length === 0) {
    return (
      <div className="border border-dashed border-stone-800 p-5 text-sm leading-7 text-stone-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-900 border border-stone-800">
      {relationships.map((relationship) => (
        <div className="grid gap-4 bg-[#080808] p-5 sm:grid-cols-[1fr_auto]" key={relationship.id}>
          <div>
            <p className="text-lg font-semibold text-stone-100">
              {relationship.disciplerName} <span className="text-stone-600">walking with</span> {relationship.discipleName}
            </p>
            <p className="mt-2 text-sm text-stone-500">Started {formatDate(relationship.startedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="border border-amber-500/35 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-300">
              {formatLabel(relationship.style)}
            </span>
            <span className="border border-stone-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-stone-300">
              {formatLabel(relationship.strength)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MultiplicationTree({ roots }: { roots: MultiplicationNode[] }) {
  if (roots.length === 0) {
    return (
      <div className="border border-dashed border-stone-800 p-6 text-sm leading-7 text-stone-500">
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
    <div className={node.generation === 0 ? "" : "border-l border-amber-500/35 pl-5"}>
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
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
            style={{ fontFamily: font.rajdhani }}
          >
            Gen {node.generation}
          </p>
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

function MeetingList({ meetings }: { meetings: DosMeeting[] }) {
  if (meetings.length === 0) {
    return (
      <div className="border border-dashed border-stone-800 p-6 text-sm leading-7 text-stone-500">
        No meetings have been logged for this collective yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <article className="border border-stone-800 bg-[#080808]" key={meeting.id}>
          <div className="grid gap-4 border-b border-stone-900 p-5 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400"
                  style={{ fontFamily: font.rajdhani }}
                >
                  One meeting record
                </p>
                <span
                  className="border border-stone-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {meeting.ministers.length} {meeting.ministers.length === 1 ? "minister" : "ministers"} attached
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                {meeting.title}
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-stone-300">{formatDate(meeting.meetingDate)}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-stone-500">{formatLabel(meeting.type)}</p>
            </div>
          </div>

          <div className="grid gap-px bg-stone-900 md:grid-cols-2">
            <div className="bg-[#080808] p-5">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                Many ministers
              </p>
              <div className="mt-4 space-y-3">
                {meeting.ministers.map((minister) => (
                  <div className="flex items-center justify-between gap-4 border-b border-stone-900 pb-3 last:border-b-0 last:pb-0" key={`${meeting.id}-${minister.id}`}>
                    <span className="text-sm text-stone-200">{minister.name}</span>
                    <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{formatLabel(minister.role)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#080808] p-5">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                People ministered to
              </p>
              {meeting.people.length ? (
                <div className="mt-4 space-y-3">
                  {meeting.people.map((person) => (
                    <div className="flex items-center justify-between gap-4 border-b border-stone-900 pb-3 last:border-b-0 last:pb-0" key={`${meeting.id}-${person.id}`}>
                      <span className="text-sm text-stone-200">{person.name}</span>
                      <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{formatLabel(person.role)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-stone-500">No people attached yet.</p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl border border-stone-800 bg-[#080808] p-6">
          <Eyebrow>DOS Workspace</Eyebrow>
          <h1 className="mt-4 text-4xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
            Workspace unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{message}</p>
        </div>
      </section>
    </main>
  );
}

export default async function DosCollectiveWorkspacePage({
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0)_0%,#050505_88%)]" />

      <section className="relative px-4 pb-12 pt-16 sm:px-6 md:pb-16 md:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <Eyebrow>Collective Workspace</Eyebrow>
              <h1
                className="mt-5 text-5xl font-bold uppercase leading-none text-stone-100 sm:text-7xl"
                style={{ fontFamily: font.oswald }}
              >
                {data.collective.name}
              </h1>
              <div className="mt-6 space-y-2 text-sm leading-7 text-stone-300 sm:text-base">
                <p>{data.organization.name}</p>
                <p>Affiliated: {joinNames(affiliateNames, "No active affiliates")}</p>
                <p>Networks: {joinNames(networkNames, "No active networks")}</p>
              </div>
            </div>

            <div className="border border-stone-800 bg-[#080808] p-5">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                Collective members
              </p>
              <div className="mt-5 divide-y divide-stone-900">
                {data.members.map((member) => (
                  <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={member.profile.id}>
                    <span className="text-sm text-stone-200">{member.profile.name}</span>
                    <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{formatLabel(member.role)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-px border border-stone-800 bg-stone-800 md:grid-cols-4">
            <MetricCard label="People discipling" value={data.stats.peopleDiscipling} />
            <MetricCard label="People walking with us" value={data.stats.peopleWalkingWithUs} />
            <MetricCard label="Meetings this month" value={data.stats.meetingsThisMonth} />
            <MetricCard label="Multiplication chains" value={data.stats.multiplicationChains} />
          </div>
        </div>
      </section>

      <WorkspaceTabs />

      <div className="sticky bottom-0 z-40 border-y border-stone-800 bg-[#050505]/95 px-4 py-3 backdrop-blur md:hidden">
        <ImproveDosFeedbackModal
          className="flex min-h-12 w-full items-center justify-center border border-amber-500/50 bg-[#101010] px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-colors hover:border-amber-300 hover:text-amber-100"
        />
      </div>

      <section className="relative border-t border-stone-900 px-4 pb-12 pt-10 sm:px-6 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="Field Activity" title="Activity this month" />
          <div className="mt-8 grid gap-px border border-stone-800 bg-stone-800 md:grid-cols-4">
            <MetricCard label="Meetings This Month" value={data.fieldActivity.meetingsThisMonth} />
            <MetricCard label="Unique People Met" value={data.fieldActivity.uniquePeopleMetThisMonth} />
            <MetricCard label="Prayer Encounters" value={data.fieldActivity.prayerEncounters} />
            <MetricCard label="Kitchen Tables" value={data.fieldActivity.kitchenTablesThisMonth} />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionIntro eyebrow="Discipleship" title="People walking together">
            <p>Relationships are shown as ongoing discipleship, separate from meeting activity.</p>
          </SectionIntro>

          <div className="grid gap-6">
            <div>
              <h3 className="mb-4 text-xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                People I'm discipling
              </h3>
              <RelationshipList
                emptyText="No active discipleship relationships start from this collective yet."
                relationships={data.peopleDiscipling}
              />
            </div>

            <div>
              <h3 className="mb-4 text-xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                People walking with me
              </h3>
              <RelationshipList
                emptyText="No one is currently attached as discipling this collective."
                relationships={data.peopleWalkingWithUs}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionIntro eyebrow="Multiplication" title="Active discipleship chain">
              <p>Multiplication is visible when someone being discipled begins discipling someone else.</p>
            </SectionIntro>

            <div className="mt-8 grid gap-px border border-stone-800 bg-stone-800 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Active disciplers" value={data.multiplication.activeDisciplers} />
              <MetricCard label="2nd generation disciples" value={data.multiplication.secondGenerationDisciples} />
              <MetricCard label="Multiplication chains" value={data.multiplication.chainCount} />
            </div>
          </div>

          <div>
            <MultiplicationTree roots={data.multiplication.roots} />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="Meetings" title="Kitchen tables and ministers">
            <p>Meetings stay as event records. Ministers and people are attached through the relationship tables.</p>
          </SectionIntro>
          <div className="mt-8">
            <MeetingList meetings={data.meetings} />
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-40 hidden md:block">
        <ImproveDosFeedbackModal
          className="flex min-h-12 items-center justify-center border border-amber-500/50 bg-[#101010] px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-colors hover:border-amber-300 hover:text-amber-100"
        />
      </div>
    </main>
  );
}
