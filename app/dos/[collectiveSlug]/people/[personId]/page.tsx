import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ImproveDosFeedbackModal } from "@/app/system/preview/ImproveDosFeedbackModal";
import {
  loadDosPersonDetail,
  type DosFieldPerson,
  type DosPersonMeeting,
  type DosRelationshipView,
  type MultiplicationNode,
} from "@/src/lib/dos/people";
import { PersonRelationshipModal } from "./PersonRelationshipModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Person | USA Missionaries",
  description: "A focused DOS person view for discipleship relationships and multiplication.",
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
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className="mt-4 text-3xl font-bold uppercase leading-none text-stone-100 sm:text-4xl"
        style={{ fontFamily: font.oswald }}
      >
        {title}
      </h2>
      {children ? <div className="mt-4 text-sm leading-7 text-stone-400">{children}</div> : null}
    </div>
  );
}

function RelationshipList({
  emptyText,
  relationships,
  showDisciple = false,
}: {
  emptyText: string;
  relationships: DosRelationshipView[];
  showDisciple?: boolean;
}) {
  if (!relationships.length) {
    return (
      <div className="border border-dashed border-stone-800 bg-[#080808] p-5 text-sm leading-7 text-stone-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-900 border border-stone-800">
      {relationships.map((relationship) => (
        <div className="bg-[#080808] p-5" key={relationship.id}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-lg font-semibold text-stone-100">
                {showDisciple ? relationship.discipleName : relationship.disciplerName}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Started {formatDate(relationship.startedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="border border-amber-500/35 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-300">
                {formatLabel(relationship.style)}
              </span>
              <span className="border border-stone-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-stone-300">
                {formatLabel(relationship.strength)}
              </span>
              <span className="border border-stone-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                {formatLabel(relationship.status)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingList({ meetings }: { meetings: DosPersonMeeting[] }) {
  if (!meetings.length) {
    return (
      <div className="border border-dashed border-stone-800 bg-[#080808] p-5 text-sm leading-7 text-stone-500">
        No meetings are attached to this person yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <article className="border border-stone-800 bg-[#080808] p-5" key={meeting.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400"
                style={{ fontFamily: font.rajdhani }}
              >
                {formatLabel(meeting.type)}
              </p>
              <h3 className="mt-2 text-2xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                {meeting.title}
              </h3>
            </div>
            <p className="text-sm text-stone-400">{formatDate(meeting.meetingDate)}</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                Ministers involved
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {meeting.ministers.length
                  ? meeting.ministers.map((minister) => minister.name).join(", ")
                  : "No ministers attached"}
              </p>
            </div>
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500"
                style={{ fontFamily: font.rajdhani }}
              >
                People ministered to
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {meeting.people.length
                  ? meeting.people.map((person) => person.name).join(", ")
                  : "No people attached"}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function MultiplicationPreview({
  person,
  roots,
}: {
  person: DosFieldPerson;
  roots: MultiplicationNode[];
}) {
  if (!roots.length) {
    return (
      <div className="border border-dashed border-stone-800 bg-[#080808] p-5 text-sm leading-7 text-stone-500">
        Multiplication will appear here as discipleship relationships begin to reproduce from {person.firstName}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roots.map((root) => (
        <TreeNode key={`${root.kind}-${root.id}`} node={root} />
      ))}
    </div>
  );
}

function TreeNode({ node }: { node: MultiplicationNode }) {
  return (
    <div className="border-l border-amber-500/35 pl-4 first:border-l-0 first:pl-0">
      <div className="border border-stone-800 bg-[#080808] p-4">
        <p className="text-lg font-semibold text-stone-100">{node.name}</p>
      </div>
      {node.children.length ? (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <div key={`${child.kind}-${child.id}`}>
              <p
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/60"
                style={{ fontFamily: font.rajdhani }}
              >
                Discipling
              </p>
              <TreeNode node={child} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl border border-stone-800 bg-[#080808] p-6">
          <Eyebrow>DOS People</Eyebrow>
          <h1 className="mt-4 text-4xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
            Person unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{message}</p>
        </div>
      </section>
    </main>
  );
}

export default async function DosPersonDetailPage({
  params,
}: {
  params: Promise<{ collectiveSlug: string; personId: string }>;
}) {
  const { collectiveSlug, personId } = await params;
  const result = await loadDosPersonDetail(collectiveSlug, personId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return <ErrorState message={result.message} />;
  }

  const data = result.data;
  const { person } = data;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0)_0%,#050505_88%)]" />

      <section className="relative px-4 pb-10 pt-14 sm:px-6 md:pb-14 md:pt-20">
        <div className="mx-auto max-w-7xl">
          <Link
            className="inline-flex text-xs font-bold uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-amber-300"
            href={`/dos/${data.collective.slug}/people`}
            style={{ fontFamily: font.rajdhani }}
          >
            Back to People
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Eyebrow>Person Detail</Eyebrow>
              <h1
                className="mt-5 text-5xl font-bold uppercase leading-none text-stone-100 sm:text-7xl"
                style={{ fontFamily: font.oswald }}
              >
                {person.name}
              </h1>
              <div className="mt-6 space-y-2 text-sm leading-7 text-stone-300 sm:text-base">
                <p>{person.relationshipSummary}</p>
                <p>Engagement: {person.engagementLevel ?? "Not set yet"}</p>
              </div>
            </div>

            <PersonRelationshipModal
              collectiveSlug={data.collective.slug}
              person={person}
              relationshipOptions={data.relationshipOptions}
            />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div>
            <SectionIntro eyebrow="Walking With Them" title="People walking with them" />
            <div className="mt-6">
              <RelationshipList
                emptyText="No one is walking with them yet."
                relationships={person.walkingWith}
              />
            </div>
          </div>

          <div>
            <SectionIntro eyebrow="Discipling" title="People they are discipling" />
            <div className="mt-6">
              <RelationshipList
                emptyText="No active discipleship relationships start from them yet."
                relationships={person.discipling}
                showDisciple
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionIntro eyebrow="Multiplication" title="Multiplication preview">
              <p>Multiplication becomes visible when someone being discipled begins discipling someone else.</p>
            </SectionIntro>
          </div>
          <MultiplicationPreview person={person} roots={result.data.multiplicationRoots} />
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionIntro eyebrow="Meetings" title="Recent meetings" />
            <div className="mt-6">
              <MeetingList meetings={result.data.recentMeetings} />
            </div>
          </div>

          <div>
            <SectionIntro eyebrow="Notes" title="Private notes" />
            <div className="mt-6 border border-stone-800 bg-[#080808] p-5 text-sm leading-7 text-stone-400">
              Private notes are saved for the owning organization and hidden from this workspace preview until
              permissioned workspace access is in place.
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-40 border-y border-stone-800 bg-[#050505]/95 px-4 py-3 backdrop-blur md:hidden">
        <ImproveDosFeedbackModal
          className="flex min-h-12 w-full items-center justify-center border border-amber-500/50 bg-[#101010] px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-colors hover:border-amber-300 hover:text-amber-100"
        />
      </div>

      <div className="fixed bottom-6 right-6 z-40 hidden md:block">
        <ImproveDosFeedbackModal
          className="flex min-h-12 items-center justify-center border border-amber-500/50 bg-[#101010] px-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-colors hover:border-amber-300 hover:text-amber-100"
        />
      </div>
    </main>
  );
}
