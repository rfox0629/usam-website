import type { Metadata } from "next";
import { loadDosResourceShareLink } from "@/src/lib/dos/resource-share-links";
import { DosSharedAssessmentForm } from "./DosSharedAssessmentForm";

export const dynamic = "force-dynamic";

/* USA-278: the assessment a couple was sent.
 *
 * The link arrives as a text message from someone they know, so nothing about
 * them belongs in the unfurled preview: no names, no workspace, no scores. The
 * identity the recipients need is inside the page, behind the token. */
export const metadata: Metadata = {
  description: "An assessment someone shared with you.",
  robots: {
    follow: false,
    index: false,
  },
  title: "Your assessment",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function ShareLinkState({ detail, title }: { detail: string; title: string }) {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-[#0F172A]">
      <section className="mx-auto max-w-md rounded-3xl border border-dos-hairline bg-white p-5 shadow-[0_18px_44px_rgba(15,21,32,0.07)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          DOS Library
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{detail}</p>
      </section>
    </main>
  );
}

function stateCopy(status: "completed" | "expired" | "invalid" | "not_configured" | "revoked") {
  return {
    completed: {
      detail: "Thank you. This assessment has already been completed, and the results went to the person who sent it.",
      title: "Assessment received",
    },
    expired: {
      detail: "Ask the person who sent this to create a fresh link.",
      title: "Link expired",
    },
    invalid: {
      detail: "This assessment link is not available.",
      title: "Assessment unavailable",
    },
    not_configured: {
      detail: "Shared resources are not configured for this environment yet.",
      title: "Assessment unavailable",
    },
    revoked: {
      detail: "This link was turned off. Ask the person who sent it for a new one.",
      title: "Link no longer active",
    },
  }[status];
}

export default async function DosSharedResourcePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shareLink = await loadDosResourceShareLink(token);

  if (shareLink.status !== "ready") {
    const copy = stateCopy(shareLink.status);

    return <ShareLinkState detail={copy.detail} title={copy.title} />;
  }

  return <DosSharedAssessmentForm shareLink={shareLink} />;
}
