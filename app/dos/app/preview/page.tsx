import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadDosAppData } from "@/src/lib/dos/missionary-app";
import { DosMvpAppClient } from "../DosMvpAppClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App Preview | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function PreviewBlockedState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#EDEAE3] px-5 py-20 text-[#1E1D1A]">
      <section className="mx-auto max-w-lg rounded-[28px] border border-[#DED9CF] bg-[#F5F3EE] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          DOS Preview
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#77716A]">{detail}</p>
      </section>
    </main>
  );
}

export default async function DosAppPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;

  if (process.env.NODE_ENV !== "development") {
    const nextPath = `/dos/app${params.workspace ? `?workspace=${encodeURIComponent(params.workspace)}` : ""}`;

    redirect(nextPath);
  }

  const result = await loadDosAppData(params.workspace);

  if (result.status === "not_found") {
    return <PreviewBlockedState detail="Create a missionary workspace before opening the DOS preview." title="No workspace found" />;
  }

  if (result.status === "error") {
    return <PreviewBlockedState detail={result.message} title="DOS unavailable" />;
  }

  return <DosMvpAppClient data={result.data} />;
}
