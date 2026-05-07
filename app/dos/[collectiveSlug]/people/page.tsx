import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ImproveDosFeedbackModal } from "@/app/system/preview/ImproveDosFeedbackModal";
import { loadDosPeopleWorkspace } from "@/src/lib/dos/people";
import { PeopleWorkspaceClient } from "./PeopleWorkspaceClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS People | USA Missionaries",
  description: "A simple DOS people workspace for relationships, discipleship, and multiplication.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className="border border-stone-800 bg-[#080808] p-5">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500"
        style={{ fontFamily: font.rajdhani }}
      >
        {label}
      </p>
      <p className="mt-5 text-4xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
    </article>
  );
}

function WorkspaceTabs() {
  const tabs = ["DOS", "Public", "Team", "Settings"];

  return (
    <div className="border-y border-stone-900 bg-black/25">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-4 gap-px bg-stone-900">
          {tabs.map((tab) => (
            <div
              aria-current={tab === "DOS" ? "page" : undefined}
              className={`min-h-14 bg-[#070707] px-2 py-4 text-center sm:px-4 ${
                tab === "DOS" ? "text-amber-300" : "text-stone-500"
              }`}
              key={tab}
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em]"
                style={{ fontFamily: font.rajdhani }}
              >
                {tab}
              </p>
            </div>
          ))}
        </div>
      </div>
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
            People unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{message}</p>
        </div>
      </section>
    </main>
  );
}

export default async function DosPeoplePage({
  params,
}: {
  params: Promise<{ collectiveSlug: string }>;
}) {
  const { collectiveSlug } = await params;
  const result = await loadDosPeopleWorkspace(collectiveSlug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return <ErrorState message={result.message} />;
  }

  const { data } = result;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0)_0%,#050505_88%)]" />

      <section className="relative px-4 pb-10 pt-14 sm:px-6 md:pb-14 md:pt-20">
        <div className="mx-auto max-w-7xl">
          <Link
            className="inline-flex text-xs font-bold uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-amber-300"
            href={`/dos/${data.collective.slug}`}
            style={{ fontFamily: font.rajdhani }}
          >
            Back to DOS
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <Eyebrow>People Workspace</Eyebrow>
              <h1
                className="mt-5 text-5xl font-bold uppercase leading-none text-stone-100 sm:text-7xl"
                style={{ fontFamily: font.oswald }}
              >
                Your Field
              </h1>
              <div className="mt-6 space-y-2 text-sm leading-7 text-stone-300 sm:text-base">
                <p>{data.collective.name}</p>
                <p>{data.organization.name}</p>
              </div>
            </div>

            <div className="grid gap-px border border-stone-800 bg-stone-800 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="People visible" value={data.stats.peopleCount} />
              <MetricCard label="Active relationships" value={data.stats.activeRelationships} />
              <MetricCard label="People discipling" value={data.stats.peopleDiscipling} />
            </div>
          </div>
        </div>
      </section>

      <WorkspaceTabs />

      <section className="relative px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-7xl">
          <PeopleWorkspaceClient collectiveSlug={data.collective.slug} data={data} />
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
