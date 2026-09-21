import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ADVISOR_ACCESS_COOKIE_NAME, isAdvisorAccessTokenValid } from "@/src/lib/advisor-access";
import { getAdvisorExample } from "@/src/lib/advisor-content";
import { ExampleDashboard } from "../ExampleDashboard";

// Gated on a cookie, so never static and never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Generic, like the briefing's own metadata: it is emitted before the gate is
// passed and must not name an organisation.
export const metadata: Metadata = {
  description: "Private briefing. Access is restricted.",
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
  title: "Advisor Briefing",
};

function Locked({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white" data-advisor-doc>
      <PrimaryNav minimal />
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-md border border-[#E5E8EF] bg-white px-7 py-10 text-center">
          {children}
        </div>
      </div>
    </main>
  );
}

export default async function AdvisorExamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const hasAccess = await isAdvisorAccessTokenValid(cookieStore.get(ADVISOR_ACCESS_COOKIE_NAME)?.value);

  // Nothing private is read until the cookie has been validated. An
  // unauthenticated visitor cannot even learn whether a given slug exists.
  if (!hasAccess) {
    return (
      <Locked>
        <h1 className="text-[26px] font-semibold text-[#0B1220]" style={{ fontFamily: "'Oswald', sans-serif" }}>
          Advisor Briefing
        </h1>
        <p className="mt-5 text-[14.5px] leading-[1.7] text-[#3D4654]">
          This page is private. Please open the briefing and enter your access code first.
        </p>
        <Link
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-sm bg-[#0B1220] px-5 py-2.5 text-[14px] font-medium text-white"
          href="/advisor"
        >
          Go to the briefing
        </Link>
      </Locked>
    );
  }

  const example = getAdvisorExample(slug);

  if (!example) {
    notFound();
  }

  return <ExampleDashboard example={example} />;
}
