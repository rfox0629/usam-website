import type { Metadata } from "next";
import { loadDosReviewLink } from "@/src/lib/dos/reviews";
import { DosQuickReviewForm } from "./DosQuickReviewForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Review | DOS",
  robots: {
    follow: false,
    index: false,
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
    <main className="min-h-screen bg-[#EDEAE3] px-5 py-10 text-[#1E1D1A]">
      <section className="mx-auto max-w-md rounded-[28px] border border-[#DED9CF] bg-[#F5F3EE] p-5 shadow-[0_24px_70px_rgba(42,37,29,0.10)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          DOS Review
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#77716A]">{detail}</p>
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
