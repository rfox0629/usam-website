import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DOS V3 Review | USA Missionaries",
  description: "USA-138 founder review entry point.",
  robots: {
    follow: false,
    index: false,
  },
};

// USA-138 founder review index. One page that points at everything worth
// inspecting, so the review does not require digging through Linear comments.

const prototypeLinks = [
  {
    href: "/dos/v3",
    title: "DOS V3 prototype",
    detail: "The redesigned discipleship cycle. Start here, and try it on a phone.",
  },
  {
    href: "/dos/app/preview?demo=dos2026",
    title: "Current DOS, repaired",
    detail: "Today's DOS with this branch's fixes applied. Demo workspace, synthetic data.",
  },
];

const walkthrough = [
  "Today — see what needs you, and resume the unfinished capture.",
  "Tap AI intake — pick any source, then review every suggested field before it saves.",
  "Save — watch the person, commitments, prayer, follow-up, and reporting all update from that one capture.",
  "Follow-ups — clear a next step or snooze it.",
  "Fruit — every number is derived from what you logged, never re-entered.",
];

const fixed = [
  "Signed-out /dos rendered a ten-field onboarding form that discarded every keystroke on submit. It now routes into /join, the flow that actually provisions a workspace.",
  "/dos/<workspace>/people/<id> and /meetings/<id> dropped the record id, so every shared link landed on the dashboard. Both now open the record.",
  "My Record injected one person's real MCode and Gregoric results into any account whose display name contained \"ryan\", and hardcoded that person's Gregoric outcome for every viewer. Removed.",
  "Deleted 2,474 lines of unreachable code behind the legacy workspace routes and the dead setup form.",
];

const decisions = [
  "Reports, Stewardship, and Testimony Practice are live nav items that open \"coming soon\" screens. Build them, or hide them until they exist?",
  "V3 nav is Today / People / Follow-ups / Fruit. Today's DOS also exposes Groups, Library, My Record, Prayer, and Stewardship. Which of those stay top-level, and which move behind People or Today?",
  "Should AI intake dedupe against existing prayer needs and commitments, or always add and let you merge afterward? The prototype always adds.",
  "How much should intake infer versus ask? It currently proposes a follow-up date; it could instead leave that blank.",
];

const deferred = [
  "Real transcription, recording capture, and audio storage — needs a storage and retention decision, plus vendor selection.",
  "Any production AI call — needs a model, a prompt contract, cost limits, and a decision about sending ministry notes to a third party.",
  "Persisting V3 to real records — the current schema has no mentioned-but-absent person link and no per-attendee next step, so this needs a migration.",
  "Merging V3 into the existing 39,469-line DosMvpAppClient.tsx — that file is one client component, which is why the app hydrates slowly. Splitting it is a separate piece of work.",
];

export default function DosV3ReviewPage() {
  return (
    <div className="dos-v3-review min-h-screen bg-[#F8FBFF] text-[#0F172A]">
      <ReviewStyles />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">USA-138</p>
        <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-0.035em] text-[#0F172A] sm:text-5xl">
          DOS V3 founder review
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#475569]">
          Two things to look at, a short list of decisions only you can make, and what was deliberately left alone.
          Everything here runs on synthetic data.
        </p>

        <section className="mt-8 grid gap-3">
          {prototypeLinks.map((link) => (
            <Link
              className="group rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition hover:border-[#2563EB]"
              href={link.href}
              key={link.href}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black tracking-[-0.02em] text-[#0F172A]">{link.title}</h2>
                <span aria-hidden="true" className="text-[#94A3B8] transition group-hover:text-[#2563EB]">
                  →
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-[#64748B]">{link.detail}</p>
            </Link>
          ))}
        </section>

        <ReviewSection title="A five-minute walkthrough">
          <ol className="space-y-2.5">
            {walkthrough.map((step, index) => (
              <li className="flex gap-3 text-sm leading-6 text-[#475569]" key={step}>
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-xs font-black text-[#1D4ED8]">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </ReviewSection>

        <ReviewSection title="Fixed in the current product">
          <ItemList items={fixed} marker="✓" tone="green" />
        </ReviewSection>

        <ReviewSection title="Decisions only you can make">
          <ItemList items={decisions} marker="?" tone="blue" />
        </ReviewSection>

        <ReviewSection title="Deliberately deferred">
          <p className="mb-3 text-sm leading-6 text-[#64748B]">
            Each of these needs your approval before anyone starts, because they change schema, storage, or cost.
          </p>
          <ItemList items={deferred} marker="•" tone="amber" />
        </ReviewSection>

        <p className="mt-10 rounded-[20px] border border-[#E2E8F0] bg-white px-5 py-4 text-xs leading-5 text-[#64748B]">
          Nothing in this review touches production data. No migration, schema change, auth change, or RLS change was
          made, and nothing was merged or deployed to production.
        </p>
      </main>
    </div>
  );
}

function ReviewSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">{title}</h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function ItemList({
  items,
  marker,
  tone,
}: {
  items: string[];
  marker: string;
  tone: "green" | "blue" | "amber";
}) {
  const tones = {
    green: "bg-[#ECFDF5] text-[#047857]",
    blue: "bg-[#EBF2FF] text-[#1D4ED8]",
    amber: "bg-[#FEF3C7] text-[#92400E]",
  } as const;

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          className="flex gap-3 rounded-[18px] border border-[#E8EFFA] bg-white px-4 py-3.5 text-sm leading-6 text-[#475569]"
          key={item}
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${tones[tone]}`}
          >
            {marker}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function ReviewStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          body:has(.dos-v3-review) {
            background: #F8FBFF !important;
            color: #0F172A;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .dos-v3-review,
          .dos-v3-review * {
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          body:has(.dos-v3-review) > footer {
            display: none !important;
          }

          body:has(.dos-v3-review) nextjs-portal {
            display: none !important;
          }
        `,
      }}
    />
  );
}
