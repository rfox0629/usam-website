import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { restorationPreviewToken } from "@/src/lib/restoration/intake";
import { RestorationIntakeClient } from "./RestorationIntakeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restoration Reflection | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function InvitationUnavailable() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] px-5 py-10 text-[#15120c]">
      <section className="mx-auto max-w-md rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-[0_24px_70px_rgba(47,37,18,0.12)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#15120c] text-[#C2A14E]">
          <LockKeyhole aria-hidden="true" className="h-5 w-5" />
        </div>
        <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#8b7235]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Private Link
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase leading-none text-[#15120c]" style={{ fontFamily: font.oswald }}>
          Invitation unavailable
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#5f5748]">
          This restoration invitation is not available in this preview. Ask the person who sent it to share a fresh link.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cfc4ad] px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#15120c] transition-colors hover:border-[#C2A14E]"
          href="/restoration"
          style={{ fontFamily: font.rajdhani }}
        >
          Return
        </Link>
      </section>
    </main>
  );
}

export default async function RestorationInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (token !== restorationPreviewToken) {
    return <InvitationUnavailable />;
  }

  return <RestorationIntakeClient token={token} />;
}
