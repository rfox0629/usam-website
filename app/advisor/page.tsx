import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PrimaryNav } from "@/components/PrimaryNav";
import {
  ADVISOR_ACCESS_COOKIE_NAME,
  isAdvisorAccessTokenValid,
} from "@/src/lib/advisor-access";
import { getAdvisorBriefingContent } from "@/src/lib/advisor-content";
import { AdvisorAccessGateForm } from "./AdvisorAccessGateForm";
import { AdvisorBriefing } from "./AdvisorBriefing";

// The gate decision depends on a cookie, so this page can never be statically
// rendered or cached — a cached copy would either leak the briefing or serve a
// stale gate.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Deliberately generic: page metadata is emitted before the gate is passed, so
// it must not name the advisor, the ministry's finances, or the meeting.
export const metadata: Metadata = {
  description: "Private briefing. Access is restricted.",
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
  title: "Advisor Briefing",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function AdvisorShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-usam-black text-stone-100">
      <PrimaryNav minimal />

      <div className="relative flex min-h-[calc(100vh-88px)] items-center justify-center overflow-hidden px-6 py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_620px_at_50%_-12%,rgba(194,161,78,0.14),transparent_60%)]"
        />

        <div className="relative w-full max-w-md border border-stone-800 bg-white/[0.02] px-8 py-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:px-11">
          {children}
        </div>
      </div>
    </main>
  );
}

export default async function AdvisorPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADVISOR_ACCESS_COOKIE_NAME)?.value;
  const hasAccess = await isAdvisorAccessTokenValid(token);

  // Nothing below this line runs, and no private content is read, until the
  // access cookie has been validated on the server.
  if (!hasAccess) {
    return (
      <AdvisorShell>
        <p
          className="text-[12px] uppercase tracking-[0.34em] text-usam-gold"
          style={{ fontFamily: font.rajdhani }}
        >
          USA Missionaries
        </p>
        <h1 className="mt-4 text-3xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
          Advisor Briefing
        </h1>
        <p className="mt-2 text-sm text-stone-500">Private access by invitation</p>

        <AdvisorAccessGateForm />

        <p className="mt-8 border-t border-stone-800 pt-6 text-xs leading-6 text-stone-500">
          This briefing contains private ministry and planning material. Please do not share this link or code.
        </p>
      </AdvisorShell>
    );
  }

  const content = getAdvisorBriefingContent();

  // A missing or malformed payload is a configuration problem, not something
  // to describe to the reader. The message stays generic on purpose.
  if (!content) {
    return (
      <AdvisorShell>
        <p
          className="text-[12px] uppercase tracking-[0.34em] text-usam-gold"
          style={{ fontFamily: font.rajdhani }}
        >
          USA Missionaries
        </p>
        <h1 className="mt-4 text-3xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
          Advisor Briefing
        </h1>
        <p className="mt-6 text-sm leading-7 text-stone-400">
          This briefing is not available right now. Please check back shortly, or contact the person who sent you
          this link.
        </p>
      </AdvisorShell>
    );
  }

  return (
    <main className="min-h-screen bg-usam-black text-stone-100">
      <PrimaryNav minimal />
      <AdvisorBriefing content={content} />
    </main>
  );
}
