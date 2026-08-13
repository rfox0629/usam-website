import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { restorationPreviewAccessCode, restorationPreviewEmail, restorationPreviewToken } from "@/src/lib/restoration/intake";

export const metadata: Metadata = {
  title: "Restoration Review Package | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

async function readReviewDoc(filename: string) {
  return readFile(path.join(process.cwd(), "docs", filename), "utf8");
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2
      className="text-[12px] uppercase tracking-[0.18em] text-[#8b7235]"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </h2>
  );
}

function ReviewPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[#ded5c4] bg-white p-5 shadow-[0_18px_50px_rgba(47,37,18,0.08)] md:p-6">
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ReviewPackageUnavailable() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] px-5 py-10 text-[#15120c]">
      <section className="mx-auto max-w-md rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-[0_24px_70px_rgba(47,37,18,0.12)]">
        <p
          className="text-[11px] uppercase tracking-[0.2em] text-[#8b7235]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Review Package
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase leading-none text-[#15120c]" style={{ fontFamily: font.oswald }}>
          Preview only
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#5f5748]">
          Restoration review assets are available only on protected preview deployments.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cfc4ad] px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#15120c] transition-colors hover:border-[#C2A14E]"
          href="/restoration"
          style={{ fontFamily: font.rajdhani }}
        >
          Return
        </Link>
      </section>
    </main>
  );
}

export default async function RestorationReviewPackagePage() {
  if (process.env.VERCEL_ENV === "production") {
    return <ReviewPackageUnavailable />;
  }

  const [audit, inventory] = await Promise.all([
    readReviewDoc("usa-165-restoration-intake-audit.md"),
    readReviewDoc("usa-165-restoration-field-inventory.md"),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f4ec] px-5 py-8 text-[#15120c] md:px-8 md:py-10">
      <section className="mx-auto max-w-5xl">
        <p
          className="text-[11px] uppercase tracking-[0.24em] text-[#8b7235]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          USA-165 Review Package
        </p>
        <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.95] text-[#15120c] md:text-6xl" style={{ fontFamily: font.oswald }}>
          Restoration Intake Preview
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[#4d4639]">
          Non-production branch preview for the Ministry of Reconciliation restoration doorway, digital intake, and restricted Command Center review design.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ReviewPanel title="Preview Links">
            <div className="space-y-3 text-sm leading-6 text-[#4d4639]">
              <p><Link className="font-semibold text-[#6f5415] underline" href="/restoration">Restoration doorway</Link></p>
              <p><Link className="font-semibold text-[#6f5415] underline" href={`/restoration/${restorationPreviewToken}`}>Private-token intake</Link></p>
              <p><Link className="font-semibold text-[#6f5415] underline" href="/admin/restoration">Command Center review</Link></p>
            </div>
          </ReviewPanel>

          <ReviewPanel title="Preview Access">
            <div className="space-y-2 text-sm leading-6 text-[#4d4639]">
              <p>Email: <span className="font-semibold text-[#15120c]">{restorationPreviewEmail}</span></p>
              <p>Access code: <span className="font-semibold text-[#15120c]">{restorationPreviewAccessCode}</span></p>
              <p>Use fabricated data only. Production persistence is intentionally blocked.</p>
            </div>
          </ReviewPanel>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ReviewPanel title="Validation">
            <ul className="space-y-2 text-sm leading-6 text-[#4d4639]">
              <li>npm ci</li>
              <li>npm run typecheck</li>
              <li>npm run build</li>
              <li>Vercel preview build READY</li>
              <li>Protected-share HTTP checks for doorway and token route</li>
            </ul>
          </ReviewPanel>

          <ReviewPanel title="Blocked">
            <ul className="space-y-2 text-sm leading-6 text-[#4d4639]">
              <li>GitHub push blocked by invalid local token and cancelled connector write.</li>
              <li>Linear issue/comment writes cancelled by connector host.</li>
              <li>Browser screenshots blocked by macOS sandbox.</li>
            </ul>
          </ReviewPanel>

          <ReviewPanel title="Decision">
            <p className="text-sm leading-6 text-[#4d4639]">
              Founder/MOR review needed for intake direction, content flags, retention/deletion, mandatory-reporting, emergency escalation, and the gated schema/RLS issue blocked by USA-86.
            </p>
          </ReviewPanel>
        </div>

        <div className="mt-5 grid gap-5">
          <ReviewPanel title="Audit and RLS Proposal">
            <pre className="max-h-[680px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#ded5c4] bg-[#fbfaf7] p-4 text-xs leading-6 text-[#332c21]">
              {audit}
            </pre>
          </ReviewPanel>

          <ReviewPanel title="Source Field Inventory">
            <pre className="max-h-[680px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#ded5c4] bg-[#fbfaf7] p-4 text-xs leading-6 text-[#332c21]">
              {inventory}
            </pre>
          </ReviewPanel>
        </div>
      </section>
    </main>
  );
}
