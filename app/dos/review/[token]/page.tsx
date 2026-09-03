import type { Metadata } from "next";
import { loadDosReviewLink } from "@/src/lib/dos/reviews";
import { DosQuickReviewForm } from "./DosQuickReviewForm";

export const dynamic = "force-dynamic";

/* This link arrives as a text message from someone the recipient knows, so the
   preview has to answer "why did I get this?" in one line. Inheriting the DOS
   app metadata made every feedback link unfurl as a product pitch.

   Deliberately impersonal: no recipient name, no leader name, no meeting
   detail. A link preview is rendered by the messaging app and cached by
   whoever receives it, so nothing about the Person or the conversation
   belongs in it. The identity the recipient needs is inside the page, behind
   the token.

   The card is referenced explicitly. Next normally injects it from the
   opengraph-image file convention, but declaring an `openGraph` object here at
   all suppresses that injection, which shipped this route with a correct title
   and no picture at all. Pointing at the generated route restores it and keeps
   one card, drawn by the same renderer as every other share card.

   twitter:card resolves to `summary`, the small square preview, which is the
   restrained treatment a one-to-one feedback link wants rather than the
   full-width banner a marketing page wants. */
export const metadata: Metadata = {
  title: "Share your feedback",
  description: "A quick review of your conversation.",
  openGraph: {
    description: "A quick review of your conversation.",
    images: [{
      alt: "Share your feedback. Discipleship Operating System.",
      height: 630,
      url: "/dos/review/opengraph-image",
      width: 1200,
    }],
    title: "Share your feedback",
    type: "website",
  },
  robots: {
    follow: false,
    index: false,
  },
  twitter: {
    description: "A quick review of your conversation.",
    title: "Share your feedback",
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function ReviewState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#F8FBFF] px-5 py-10 text-[#0F172A]">
      <section className="mx-auto max-w-md rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          DOS Review
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
      detail: "Thanks. This review has already been submitted.",
      title: "Review received",
    },
    expired: {
      detail: "Ask the person who sent this to create a fresh review link.",
      title: "Link expired",
    },
    invalid: {
      detail: "This review link is not available.",
      title: "Review unavailable",
    },
    not_configured: {
      detail: "Reviews are not configured for this environment yet.",
      title: "Review unavailable",
    },
  }[status];
}

export default async function DosQuickReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reviewLink = await loadDosReviewLink(token);

  if (reviewLink.status !== "ready") {
    const copy = stateCopy(reviewLink.status);

    return <ReviewState detail={copy.detail} title={copy.title} />;
  }

  return <DosQuickReviewForm reviewLink={reviewLink} />;
}
