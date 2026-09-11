import type { Metadata } from "next";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { septemberProposedContent } from "@/src/lib/communications/proposed/september-content";
import { renderProposedNewsletter } from "@/src/lib/communications/proposed/september-ecosystem";

/**
 * TEMPORARY founder design review. Delete this directory and
 * src/lib/communications/proposed to remove the experiment entirely.
 *
 * Reads nothing, writes nothing, and never touches Resend or the newsletter
 * record. It renders the proposed HTML into two iframes so desktop and phone
 * widths can be compared side by side.
 */
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "September Newsletter — Proposed Design",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default function NewsletterDesignReviewPage() {
  const siteUrl = getConfiguredSiteUrl();
  const { html } = renderProposedNewsletter({
    assetBase: siteUrl,
    content: septemberProposedContent,
    links: {
      archiveUrl: `${siteUrl}/newsletter/${septemberProposedContent.slug}`,
      preferencesUrl: `${siteUrl}/preferences/test-preview`,
      unsubscribeUrl: `${siteUrl}/unsubscribe/test-preview`,
    },
    // Still unverified, so nothing renders in the footer.
    postalAddress: null,
    recipientFirstName: "Ryan",
  });

  return (
    <main className="min-h-screen bg-[#0D0D0D] px-5 py-10 text-stone-100 md:px-8">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Design review — not live
        </p>
        <h1 className="mt-3 text-4xl font-bold uppercase leading-none md:text-5xl" style={{ fontFamily: font.oswald }}>
          September Newsletter · Proposed
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400">
          The live September newsletter is untouched. This page renders a proposed design only:
          it reads no data, writes nothing, and is not connected to Resend. Deleting{" "}
          <code className="text-stone-300">app/dev/newsletter-design-review</code> and{" "}
          <code className="text-stone-300">src/lib/communications/proposed</code> restores the
          current state exactly.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_390px]">
          <section>
            <h2 className="text-xs uppercase tracking-[0.22em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Desktop · 600px shell
            </h2>
            <iframe
              className="mt-4 h-[1400px] w-full border border-stone-800 bg-[#0D0D0D]"
              sandbox=""
              srcDoc={html}
              title="Proposed September newsletter, desktop width"
            />
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-[0.22em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Mobile · 390px
            </h2>
            <iframe
              className="mt-4 h-[1400px] w-[390px] max-w-full border border-stone-800 bg-[#0D0D0D]"
              sandbox=""
              srcDoc={html}
              title="Proposed September newsletter, phone width"
            />
          </section>
        </div>

        <p className="mt-10 text-xs leading-6 text-stone-500">
          Raw HTML: <a className="text-[#C2A14E] underline-offset-4 hover:underline" href="/dev/newsletter-design-review/raw">/dev/newsletter-design-review/raw</a>
        </p>
      </div>
    </main>
  );
}
