import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ImproveDosFeedbackModal } from "@/app/system/preview/ImproveDosFeedbackModal";
import { loadDosMeetingsWorkspace } from "@/src/lib/dos/meetings";
import { MeetingsWorkspaceClient } from "./MeetingsWorkspaceClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Meetings | USA Missionaries",
  description: "A lightweight DOS meeting feed for ministry interactions, prayer context, and follow up.",
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

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" labelOverrides={{ dos: "DOS" }} />
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl border border-stone-800 bg-[#080808] p-6">
          <Eyebrow>DOS Meetings</Eyebrow>
          <h1 className="mt-4 text-4xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
            Meetings unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{message}</p>
        </div>
      </section>
    </main>
  );
}

export default async function DosMeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ collectiveSlug: string }>;
  searchParams: Promise<{ personId?: string }>;
}) {
  const { collectiveSlug } = await params;
  const { personId } = await searchParams;
  const result = await loadDosMeetingsWorkspace(collectiveSlug);

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

      <section className="relative px-4 pb-6 pt-7 sm:px-6 md:pb-8 md:pt-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <AppIdentifier label={`${data.collective.name} DOS`} />
            <Link
              className="inline-flex text-xs font-bold uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-amber-300"
              href={`/dos/${data.collective.slug}/people`}
              style={{ fontFamily: font.rajdhani }}
            >
              Back to Field
            </Link>
          </div>

          <div className="mt-5">
            <Eyebrow>DOS Meetings</Eyebrow>
            <h1
              className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100 sm:text-5xl"
              style={{ fontFamily: font.oswald }}
            >
              Meeting Feed
            </h1>
            <div className="mt-3 space-y-1 text-sm leading-6 text-stone-300 sm:text-base">
              <p>{data.collective.name}</p>
              <p>{data.organization.name}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-10 pt-2 sm:px-6 md:pb-14 md:pt-4">
        <div className="mx-auto max-w-7xl">
          <MeetingsWorkspaceClient
            collectiveSlug={data.collective.slug}
            data={data}
            initialPersonId={personId}
          />
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
