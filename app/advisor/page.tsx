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
// rendered or cached. a cached copy would either leak the briefing or serve a
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
    <main className="min-h-screen bg-white" data-advisor-doc>
      <PrimaryNav minimal />

      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-md border border-[#E5E8EF] bg-white px-7 py-10 text-center shadow-[0_1px_2px_rgba(11,18,32,0.06),0_8px_24px_rgba(11,18,32,0.06)] sm:px-9">
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
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A6D1F]"
          style={{ fontFamily: font.rajdhani }}
        >
          USA Missionaries
        </p>
        <h1
          className="mt-3 text-[26px] font-semibold text-[#0B1220]"
          style={{ fontFamily: font.oswald }}
        >
          Advisor Briefing
        </h1>
        <p className="mt-1.5 text-[14px] text-[#6B7686]">Private access by invitation</p>

        <AdvisorAccessGateForm />

        <p className="mt-7 border-t border-[#E5E8EF] pt-5 text-[12.5px] leading-[1.6] text-[#6B7686]">
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
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A6D1F]"
          style={{ fontFamily: font.rajdhani }}
        >
          USA Missionaries
        </p>
        <h1
          className="mt-3 text-[26px] font-semibold text-[#0B1220]"
          style={{ fontFamily: font.oswald }}
        >
          Advisor Briefing
        </h1>
        <p className="mt-5 text-[14.5px] leading-[1.7] text-[#3D4654]">
          This briefing is not available right now. Please check back shortly, or contact the person who sent you
          this link.
        </p>
      </AdvisorShell>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <PrimaryNav minimal />
      <AdvisorBriefing content={content} />
    </main>
  );
}
