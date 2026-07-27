import type { Metadata } from "next";
import { PrimaryNav } from "@/components/PrimaryNav";
import { latestNewsletterIssue } from "@/src/data/newsletter-fixtures";
import { renderNewsletterIssueEmail } from "@/src/lib/email/templates/newsletter-issue";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const metadata: Metadata = {
  description: "Internal design preview — not a real newsletter send.",
  robots: { follow: false, index: false },
  title: "Email Preview | USA Missionaries",
};

function Frame({
  html,
  label,
  width,
}: {
  html: string;
  label: string;
  width: number;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
      <iframe
        className="rounded-xl border border-stone-800"
        height={900}
        srcDoc={html}
        style={{ width, maxWidth: "100%" }}
        title={label}
      />
    </div>
  );
}

export default function NewsletterEmailPreviewPage() {
  const issue = latestNewsletterIssue();

  if (!issue) {
    return null;
  }

  const links = {
    preferencesUrl: `${getCanonicalSiteUrl()}/newsletter/preferences/preview-token`,
    unsubscribeUrl: `${getCanonicalSiteUrl()}/newsletter/unsubscribe/preview-token`,
    viewInBrowserUrl: `${getCanonicalSiteUrl()}/newsletter/${issue.slug}`,
  };

  const lightHtml = renderNewsletterIssueEmail(issue, { links, previewColorScheme: "light", subscriberFirstName: "Sample" });
  const darkHtml = renderNewsletterIssueEmail(issue, { links, previewColorScheme: "dark", subscriberFirstName: "Sample" });

  return (
    <main className="min-h-screen bg-usam-black">
      <PrimaryNav />

      <section className="px-6 pb-20 pt-28 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Internal Design Preview
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
            Newsletter Email Template
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
            Rendered from <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">src/lib/email/templates/newsletter-issue.ts</code> with
            fixture content. Light/dark columns below are forced for side-by-side review — in a real inbox the
            template picks its theme automatically from <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">prefers-color-scheme</code>.
            This page is <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">noindex</code> and not linked from any public page.
          </p>

          <div className="mt-10 grid gap-10">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani }}>
                Desktop (640px)
              </p>
              <div className="grid gap-6 lg:grid-cols-2">
                <Frame html={lightHtml} label="Light" width={640} />
                <Frame html={darkHtml} label="Dark" width={640} />
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani }}>
                Mobile (375px)
              </p>
              <div className="grid gap-6 lg:grid-cols-2">
                <Frame html={lightHtml} label="Light" width={375} />
                <Frame html={darkHtml} label="Dark" width={375} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
