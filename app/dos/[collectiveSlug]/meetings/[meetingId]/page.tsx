import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ImproveDosFeedbackModal } from "@/app/system/preview/ImproveDosFeedbackModal";
import { loadDosMeetingDetail } from "@/src/lib/dos/meetings";
import {
  dosMeetingMovementLabel,
  dosMeetingTypeLabel,
  type DosMeetingParticipant,
} from "@/src/lib/dos/meeting-options";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Meeting | USA Missionaries",
  description: "A lightweight DOS meeting detail view.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function formatMeetingDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
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

function PeopleList({
  emptyText,
  people,
}: {
  emptyText: string;
  people: DosMeetingParticipant[];
}) {
  if (!people.length) {
    return <p className="text-sm leading-7 text-stone-500">{emptyText}</p>;
  }

  return (
    <div className="divide-y divide-stone-900">
      {people.map((person) => (
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={`${person.kind}-${person.id}`}>
          <span className="text-sm text-stone-200">{person.name}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500"
            style={{ fontFamily: font.rajdhani }}
          >
            {person.role.replaceAll("_", " ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function DetailTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-stone-800 bg-[#080808] p-4">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-200">{value}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl border border-stone-800 bg-[#080808] p-6">
          <Eyebrow>DOS Meeting</Eyebrow>
          <h1 className="mt-4 text-4xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
            Meeting unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{message}</p>
        </div>
      </section>
    </main>
  );
}

export default async function DosMeetingDetailPage({
  params,
}: {
  params: Promise<{ collectiveSlug: string; meetingId: string }>;
}) {
  const { collectiveSlug, meetingId } = await params;
  const result = await loadDosMeetingDetail(collectiveSlug, meetingId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return <ErrorState message={result.message} />;
  }

  const { collective, meeting } = result.data;
  const movement = dosMeetingMovementLabel(meeting.relationshipMovement);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0)_0%,#050505_88%)]" />

      <section className="relative px-4 pb-10 pt-14 sm:px-6 md:pb-12 md:pt-20">
        <div className="mx-auto max-w-7xl">
          <Link
            className="inline-flex text-xs font-bold uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-amber-300"
            href={`/dos/${collective.slug}/meetings`}
            style={{ fontFamily: font.rajdhani }}
          >
            Back to Meetings
          </Link>

          <div className="mt-6">
            <Eyebrow>DOS Meeting</Eyebrow>
            <h1
              className="mt-5 text-5xl font-bold uppercase leading-none text-stone-100 sm:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              {dosMeetingTypeLabel(meeting.type)}
            </h1>
            <p className="mt-5 text-sm leading-7 text-stone-300 sm:text-base">
              {formatMeetingDate(meeting.meetingAt)}
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailTile label="Prayer Requested" value={meeting.prayerRequested ? "Yes" : "No"} />
            <DetailTile label="Follow Up Needed" value={meeting.followUpNeeded ? "Yes" : "No"} />
            <DetailTile label="Movement" value={movement || "No movement marker"} />
            <DetailTile label="People Attached" value={String(meeting.ministers.length + meeting.people.length)} />
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-9 sm:px-6 md:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>Summary</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              What happened
            </h2>
          </div>
          <div className="border border-stone-800 bg-[#080808] p-5 text-sm leading-7 text-stone-300">
            {meeting.summaryPrivate ?? "No summary added yet."}
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900 px-4 py-9 sm:px-6 md:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="border border-stone-800 bg-[#080808] p-5">
            <Eyebrow>Ministers</Eyebrow>
            <div className="mt-5">
              <PeopleList emptyText="No ministers attached." people={meeting.ministers} />
            </div>
          </div>
          <div className="border border-stone-800 bg-[#080808] p-5">
            <Eyebrow>People</Eyebrow>
            <div className="mt-5">
              <PeopleList emptyText="No people attached." people={meeting.people} />
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
