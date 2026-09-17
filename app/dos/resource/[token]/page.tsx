import type { Metadata } from "next";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { dosShareableResourceSlugs } from "@/src/lib/dos/resource-sharing";
import { loadDosResourceShareLink } from "@/src/lib/dos/resource-share-links";
import { DosSharedAssessmentForm } from "./DosSharedAssessmentForm";
import { DosSharedAssessmentReport } from "./DosSharedAssessmentReport";

export const dynamic = "force-dynamic";

/* USA-278: the assessment a couple was sent.
 *
 * The link arrives as a text message from someone they know, so nothing about
 * them belongs in the unfurled preview: no names, no workspace, no scores. The
 * identity the recipients need is inside the page, behind the token.
 *
 * USA-280: it now says WHICH assessment, because "Discipleship Operating
 * System" over the generic DOS card told the couple nothing about what they
 * had been sent. The card is addressed by resource slug, never by token: an
 * unfurler hands the image URL to third-party caches, and a token there would
 * leak the access itself. Every link to this assessment unfurls the same
 * image.
 *
 * How large the card renders is the messaging app's decision, not ours. iMessage,
 * WhatsApp, Signal and the rest each pick their own layout, and a 1200x630
 * landscape image is what they all accept; it will not look identical
 * everywhere. */
export function generateMetadata(): Metadata {
  const resource = getDosResourceBySlug(dosShareableResourceSlugs[0]);
  const title = resource?.title ?? "Your assessment";
  const description = "A short assessment two people answer together. Open the link to begin.";

  return {
    description,
    openGraph: {
      description,
      images: [{
        alt: title,
        height: 630,
        url: `${getCanonicalSiteUrl()}/share/assessment/${dosShareableResourceSlugs[0]}`,
        width: 1200,
      }],
      title,
      type: "website",
    },
    robots: {
      follow: false,
      index: false,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [`${getCanonicalSiteUrl()}/share/assessment/${dosShareableResourceSlugs[0]}`],
      title,
    },
  };
}

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

function stateCopy(status: "expired" | "invalid" | "not_configured" | "revoked") {
  return {
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

  /* USA-280: reopening a completed link shows the couple their own report
     rather than a thank-you and nothing else. Expiry and revocation are
     resolved before this, so access ends when the link's access ends. */
  if (shareLink.status === "completed") {
    return <DosSharedAssessmentReport shareLink={shareLink} />;
  }

  if (shareLink.status !== "ready") {
    const copy = stateCopy(shareLink.status);

    return <ShareLinkState detail={copy.detail} title={copy.title} />;
  }

  return <DosSharedAssessmentForm shareLink={shareLink} />;
}
