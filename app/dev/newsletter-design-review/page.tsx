import type { Metadata } from "next";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import { renderEcosystemNewsletter } from "@/src/lib/communications/newsletter-ecosystem";
import {
  septemberSections,
  SEPTEMBER_PREHEADER,
  SEPTEMBER_SUBJECT,
} from "@/src/lib/communications/september-2026-sections";

/**
 * TEMPORARY founder design review for the September issue.
 *
 * This route is publicly reachable on a deploy, so it renders the SENDABLE
 * issue only: the featured testimony is not here, and neither is the private
 * review mockup. Those live in docs/newsletter/september-2026/, generated
 * locally by scripts/september-newsletter-preview.mjs.
 *
 * Reads nothing, writes nothing, never touches Resend or the newsletter record.
 * Once the design is approved this directory can be deleted: the record and
 * Operations preview render the same issue through the same renderer.
 */
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "September Newsletter — Proposed Design",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default function NewsletterDesignReviewPage() {
  const siteUrl = getConfiguredSiteUrl();
  const { html } = renderEcosystemNewsletter({
    issue: {
      markBase: siteUrl,
      // Unverified, so nothing renders in the footer and sending stays blocked.
      postalAddress: null,
      preheader: SEPTEMBER_PREHEADER,
      sections: septemberSections.map((section) => (section.image
        ? { ...section, image: { ...section.image, url: `${siteUrl}${section.image.url}` } }
        : section)),
      subject: SEPTEMBER_SUBJECT,
    },
    links: {
      archiveUrl: `${siteUrl}/newsletter/q2-q3-2026-field-update`,
      preferencesUrl: `${siteUrl}/preferences/test-preview`,
      unsubscribeUrl: `${siteUrl}/unsubscribe/test-preview`,
    },
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
          Three sections: the covering, the model in action, and the tool being prepared. This page
          reads no data, writes nothing, and is not connected to Resend.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400">
          The featured testimony is <strong className="text-stone-200">not on this page</strong>. Its
          sharing permission has not been verified, and this route is publicly reachable, so the
          story is kept to the private review artifacts under{" "}
          <code className="text-stone-300">docs/newsletter/september-2026/</code>.
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
