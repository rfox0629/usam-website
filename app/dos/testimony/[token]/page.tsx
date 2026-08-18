import type { Metadata } from "next";
import { loadDosTestimonyLink } from "@/src/lib/dos/testimonies";
import { DosTestimonyForm } from "./DosTestimonyForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimony Review",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function TestimonyState({ detail, title }: { detail: string; title: string }) {
  return (
    <main className="min-h-screen bg-[#F8FBFF] px-5 py-10 text-[#0F172A]">
      <section className="mx-auto max-w-md rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          DOS Testimony
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{detail}</p>
      </section>
    </main>
  );
}

function stateCopy(status: "already_submitted" | "expired" | "invalid" | "not_configured") {
  return {
    already_submitted: {
      detail: "Thanks. This testimony has already been submitted.",
      title: "Testimony received",
    },
    expired: {
      detail: "Ask the person who sent this to create a fresh testimony link.",
      title: "Link expired",
    },
    invalid: {
      detail: "This testimony link is not available.",
      title: "Testimony unavailable",
    },
    not_configured: {
      detail: "Testimony sharing is not configured for this environment yet.",
      title: "Testimony unavailable",
    },
  }[status];
}

export default async function DosTestimonyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await loadDosTestimonyLink(token);

  if (link.status !== "ready") {
    const copy = stateCopy(link.status);

    return <TestimonyState detail={copy.detail} title={copy.title} />;
  }

  return <DosTestimonyForm link={link} />;
}
