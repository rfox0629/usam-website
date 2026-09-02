"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Film } from "lucide-react";
import type { RemnantVideo } from "@/src/lib/remnant/content";
import { RemnantVideoEmbed } from "./RemnantVideoEmbed";

function VideoDetail({ video }: { video: RemnantVideo }) {
  return (
    <article className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <div className="mb-3.5">
        <RemnantVideoEmbed video={video} />
      </div>
      <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#1D4ED8]">
        {video.category}
      </span>
      <h3 className="mt-2.5 text-base font-black leading-tight text-[#0F172A]">{video.speaker}</h3>
      {video.ministry ? <p className="mt-1 text-xs font-bold text-[#64748B]">{video.ministry}</p> : null}
      <p className="mt-3 text-sm leading-6 text-[#475569]">{video.description}</p>
      <div className="mt-3 rounded-[16px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]">Why It Matters</p>
        <p className="mt-1.5 text-xs leading-5 text-[#475569]">{video.whyWeRecommendIt}</p>
      </div>
      {video.scriptureReferences?.length ? (
        <p className="mt-3 text-xs font-bold text-[#64748B]">
          Scripture: {video.scriptureReferences.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

export function RemnantCollectionClient({
  featured,
  videos,
}: {
  featured: RemnantVideo | null;
  videos: readonly RemnantVideo[];
}) {
  const remaining = videos.filter((video) => video.id !== featured?.id);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FBFF] px-4 pb-16 pt-5 text-[#0F172A] md:px-6 md:pb-10 md:pt-8">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <Link
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-black text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.06)] transition-colors hover:bg-[#EBF2FF]"
          href="/dos/app?view=library&resource=remnant"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
          Library
        </Link>

        <header className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#EBF2FF] text-[#2563EB]">
              <Film className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">DOS Library</p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-[#0F172A]">Remnant</h1>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-[#475569]">
            Trusted messages to strengthen obedience, evangelism, and formation. A short, curated list, not a
            search catalog.
          </p>
        </header>

        {featured ? (
          <section>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
              Start Here
            </p>
            <VideoDetail video={featured} />
          </section>
        ) : null}

        {remaining.length ? (
          <section>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">More Messages</p>
            <div className="grid gap-3">
              {remaining.map((video) => (
                <VideoDetail key={video.id} video={video} />
              ))}
            </div>
          </section>
        ) : null}

        <Link
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-black text-[#1D4ED8] shadow-[0_12px_28px_rgba(37,99,235,0.08)] transition-colors hover:bg-[#EBF2FF]"
          href="/dos/app?view=library"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          Back to Library
        </Link>
      </div>
    </main>
  );
}
