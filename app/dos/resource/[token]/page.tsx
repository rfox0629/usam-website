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

/* USA-279: the link states read as the same product as the assessment behind
   them: white page, one column, hairline rules, no tinted card. */
function ShareLinkState({ detail, title }: { detail: string; title: string }) {
  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <div className="mx-auto w-full max-w-[700px] px-5 pb-16 pt-12 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2563EB]">DOS Library</p>
        <h1 className="mt-3 text-[27px] font-bold leading-[1.08] tracking-[-0.032em] text-[#0F172A]">{title}</h1>
        <p className="mt-4 text-[15.5px] leading-[1.62] text-[#475569]">{detail}</p>
      </div>
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
