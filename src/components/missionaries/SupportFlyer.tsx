import type { Missionary } from "@/src/data/missionaries";

type FlyerVersion = "color" | "print";

type SupportFlyerProps = {
  missionary: Missionary;
  profileUrl: string;
  supportUrl: string;
  version?: FlyerVersion;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function supportProgress(missionary: Missionary) {
  const monthlyGoal = missionary.funding.monthlyGoal || Math.round((missionary.funding.annualGoal || 0) / 12);

  if (monthlyGoal <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((missionary.funding.monthlyCommitted / monthlyGoal) * 100)));
}

function publicNumber(missionary: Missionary) {
  const number = missionary.householdMembers?.find((member) => member.publicNumber)?.publicNumber ?? missionary.missionaryNumber;

  if (!number) {
    return "";
  }

  return number.startsWith("#") ? number : `#${number}`;
}

function shortUrl(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function storyParagraphs(value?: string | null) {
  return (value ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function sentencePreview(value: string, maxLength = 420) {
  if (value.length <= maxLength) {
    return value;
  }

  const nextValue = value.slice(0, maxLength);
  const lastPeriod = nextValue.lastIndexOf(".");

  return `${nextValue.slice(0, lastPeriod > 160 ? lastPeriod + 1 : maxLength).trim()}...`;
}

export function SupportFlyer({
  missionary,
  profileUrl,
  supportUrl,
  version = "color",
}: SupportFlyerProps) {
  const isPrintFriendly = version === "print";
  const monthlyGoal = missionary.funding.monthlyGoal || Math.round((missionary.funding.annualGoal || 0) / 12);
  const progress = supportProgress(missionary);
  const flyerHeadline = missionary.supportRouting?.flyerHeadline?.trim() || `Partner with ${missionary.name}`;
  const supportAppeal = missionary.supportRouting?.flyerSupportAppeal?.trim()
    || missionary.story
    || missionary.supportRouting?.explanation
    || `${missionary.name} is raising support with USA Missionaries to reach the lost, make disciples, and multiply across America.`;
  const prayerAsk = missionary.supportRouting?.flyerPrayerAsk?.trim()
    || "Would you prayerfully consider partnering monthly or sharing this mission with someone who may want to stand with us?";
  const flyerNote = missionary.supportRouting?.flyerNote?.trim();
  const image = missionary.heroImage || missionary.headerImage || missionary.image;
  const story = storyParagraphs(missionary.story);
  const callCopy = story[0] ?? missionary.statement;
  const missionCopy = missionary.statement || supportAppeal;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(supportUrl)}`;
  const pageClassName = isPrintFriendly
    ? "border-[#d7d7d7] bg-white"
    : "border-[#d7d7d7] bg-white shadow-[0_28px_90px_rgba(17,17,17,0.22)]";

  return (
    <main className="min-h-screen bg-[#f3f1ec] px-4 py-6 text-[#111111] print:bg-white print:px-0 print:py-0">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --flyer-bg: #ffffff;
          --flyer-text: #111111;
          --flyer-muted: #5f6368;
          --flyer-gold: #c89b2d;
          --flyer-border: #d7d7d7;
          --flyer-soft: #f7f4ed;
        }
        @page { size: letter; margin: 0.32in; }
        .flyer-page {
          color: var(--flyer-text);
          background: var(--flyer-bg);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .flyer-copy {
          color: var(--flyer-muted);
          line-height: 1.8;
          max-width: 820px;
        }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; margin: 0 !important; }
          .flyer-page {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      ` }} />
      <section className={`flyer-page mx-auto max-w-[8.25in] overflow-hidden rounded-[18px] border ${pageClassName} print:max-w-none print:rounded-none`}>
        <header className="relative border-b border-[var(--flyer-border)] bg-[var(--flyer-soft)]">
          <div className="mx-auto flex max-h-[420px] min-h-[280px] items-center justify-center overflow-hidden bg-[#ebe5d8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={`${missionary.name} support flyer`} className="max-h-[420px] w-full object-contain" src={image} />
          </div>
          <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/20 bg-black/62 p-5 text-white shadow-none backdrop-blur-md md:inset-x-8 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f3c75b]">
                  USA Missionaries
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight md:text-5xl">
                  {missionary.name}
                </h1>
                <p className="mt-3 max-w-[680px] text-base leading-7 text-white md:text-lg">
                  {missionary.statement}
                </p>
              </div>
              {publicNumber(missionary) ? (
                <div className="inline-flex shrink-0 self-start rounded-full border border-[#f3c75b]/60 bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#f3c75b]">
                  {publicNumber(missionary)}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="px-8 py-8 md:px-10 md:py-10">
          <section className="print-avoid-break">
            <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[var(--flyer-gold)]">
              Support Flyer
            </p>
            <h2 className="mt-3 max-w-[820px] text-4xl font-semibold leading-tight text-[var(--flyer-text)] md:text-5xl">
              {flyerHeadline}
            </h2>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px]">
            <div className="space-y-7">
              <section className="print-avoid-break">
                <h3 className="text-2xl font-semibold uppercase tracking-[0.02em] text-[var(--flyer-text)]">
                  Our Story
                </h3>
                <p className="flyer-copy mt-3 text-[16px]">
                  {sentencePreview(supportAppeal)}
                </p>
              </section>

              <section className="print-avoid-break">
                <h3 className="text-2xl font-semibold uppercase tracking-[0.02em] text-[var(--flyer-text)]">
                  The Call
                </h3>
                <p className="flyer-copy mt-3 text-[16px]">
                  {sentencePreview(callCopy)}
                </p>
              </section>

              <section className="print-avoid-break">
                <h3 className="text-2xl font-semibold uppercase tracking-[0.02em] text-[var(--flyer-text)]">
                  The Mission
                </h3>
                <p className="flyer-copy mt-3 text-[16px]">
                  {sentencePreview(missionCopy)}
                </p>
              </section>

              <section className="print-avoid-break rounded-2xl border border-[var(--flyer-border)] bg-[#fffaf0] p-5">
                <h3 className="text-2xl font-semibold uppercase tracking-[0.02em] text-[var(--flyer-text)]">
                  How You Can Help
                </h3>
                <p className="mt-3 max-w-[820px] text-[16px] leading-[1.8] text-[#2a2a2a]">
                  {prayerAsk}
                </p>
                {flyerNote ? (
                  <p className="mt-4 border-l-4 border-[var(--flyer-gold)] pl-4 text-[15px] leading-7 text-[var(--flyer-muted)]">
                    {flyerNote}
                  </p>
                ) : null}
              </section>
            </div>

            <aside className="space-y-5">
              <section className="print-avoid-break rounded-2xl border border-[var(--flyer-border)] bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--flyer-muted)]">
                  Monthly Support Goal
                </p>
                <p className="mt-3 text-4xl font-semibold text-[var(--flyer-text)]">
                  {formatCurrency(monthlyGoal)}
                </p>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e4e4e4]">
                  <div className="h-full rounded-full bg-[var(--flyer-gold)]" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--flyer-muted)]">
                  {formatCurrency(missionary.funding.monthlyCommitted)} committed monthly. {progress}% funded.
                </p>
              </section>

              <section className="print-avoid-break rounded-2xl border-2 border-[var(--flyer-gold)] bg-[#fff8e5] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7a5a12]">
                  Partner Monthly
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-[var(--flyer-text)]">
                  Scan to give securely
                </h3>
                <div className="mt-5 flex justify-center rounded-2xl border border-[var(--flyer-border)] bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="QR code to support this missionary" className="h-[210px] w-[210px]" src={qrImageUrl} />
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-[var(--flyer-text)]">
                  Recurring support helps sustain faithful ministry month after month.
                </p>
                <p className="mt-3 break-all text-sm leading-6 text-[var(--flyer-muted)]">
                  {shortUrl(supportUrl)}
                </p>
              </section>
            </aside>
          </div>

          <footer className="mt-8 border-t border-[var(--flyer-border)] pt-5 text-center">
            <p className="text-sm leading-6 text-[var(--flyer-muted)]">
              Your support helps sustain this missionary household and the broader USA Missionaries mission.
            </p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--flyer-gold)]">
              {shortUrl(profileUrl)}
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
