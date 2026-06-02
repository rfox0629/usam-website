import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DOS Onboarding | USA Missionaries",
  description: "A simple path to start a DOS discipleship workspace.",
};

export default function DosOnboardingPage() {
  return (
    <main className="dos-onboarding-route min-h-screen bg-white text-[#0F172A]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-onboarding-route) {
              background: #FFFFFF !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            body:has(.dos-onboarding-route) > footer {
              display: none !important;
            }
          `,
        }}
      />
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
        <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#2563EB]">DOS</p>
        <h1 className="mt-4 max-w-2xl text-[48px] font-black leading-[0.92] tracking-[-0.045em] text-[#020617] sm:text-[68px]">
          Discipleship on the go.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#475569]">
          DOS is a simple mobile workspace for everyday disciple makers. It helps you identify who God has placed in front of you, pray for them, meet with purpose, follow up faithfully, and keep walking with people over time.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["Identify", "Name the first few people you are called to steward."],
            ["Walk", "Pray, meet, follow up, and keep the relationship warm."],
            ["Disciple", "Track fruit without turning people into a database."],
          ].map(([title, text]) => (
            <article className="rounded-[24px] border border-[#EAF2FF] bg-[#FBFDFF] p-4 shadow-[0_16px_38px_rgba(37,99,235,0.055)]" key={title}>
              <h2 className="text-sm font-black uppercase tracking-[0.13em] text-[#2563EB]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)]"
            href="/dos/setup"
          >
            Start Setup
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-6 text-sm font-bold text-[#0F172A]"
            href="/dos"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
