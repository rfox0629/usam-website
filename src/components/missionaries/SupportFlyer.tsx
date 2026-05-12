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
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=190x190&margin=12&data=${encodeURIComponent(supportUrl)}`;

  return (
    <main className={`min-h-screen ${isPrintFriendly ? "bg-white text-stone-950" : "bg-[#11100e] text-stone-950"} px-4 py-6 print:bg-white print:px-0 print:py-0`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: letter; margin: 0.35in; }
        @media print {
          .no-print { display: none !important; }
          .flyer-page { box-shadow: none !important; border: 1px solid #d6d3ce !important; min-height: auto !important; }
          body { background: #ffffff !important; }
        }
      ` }} />
      <section className={`flyer-page mx-auto flex min-h-[10.25in] max-w-[8in] flex-col overflow-hidden rounded-[18px] border ${isPrintFriendly ? "border-stone-300 bg-white shadow-none" : "border-[#e3d8bd] bg-[#fbfaf7] shadow-[0_28px_90px_rgba(0,0,0,0.32)]"} print:max-w-none print:rounded-none`}>
        <header className={`${isPrintFriendly ? "border-b border-stone-300 bg-white" : "bg-[#0c0b09] text-white"} px-8 py-7`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.28em] ${isPrintFriendly ? "text-stone-600" : "text-[#D4A63D]"}`}>
                USA Missionaries
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-none tracking-tight">
                {missionary.name}
              </h1>
              <p className={`mt-3 max-w-xl text-base leading-7 ${isPrintFriendly ? "text-stone-700" : "text-stone-200"}`}>
                {missionary.statement}
              </p>
            </div>
            {publicNumber(missionary) ? (
              <div className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${isPrintFriendly ? "border-stone-300 text-stone-700" : "border-[#D4A63D]/50 text-[#F5B942]"}`}>
                {publicNumber(missionary)}
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid flex-1 gap-0 md:grid-cols-[0.9fr_1.1fr]">
          <aside className={`${isPrintFriendly ? "border-r border-stone-200 bg-white" : "bg-[#eee6d8]"} p-7`}>
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-stone-300 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${missionary.name} support flyer`} className="h-full w-full object-cover" src={image} />
            </div>
            <div className="mt-6 rounded-2xl border border-stone-300 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">
                Monthly Support Goal
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(monthlyGoal)}
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-[#D4A63D]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {formatCurrency(missionary.funding.monthlyCommitted)} committed monthly. {progress}% funded.
              </p>
            </div>
          </aside>

          <section className="flex flex-col p-7">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a6b12]">
                Support Flyer
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">
                {flyerHeadline}
              </h2>
              <p className="mt-4 text-base leading-8 text-stone-700">
                {supportAppeal}
              </p>
              <p className="mt-4 rounded-2xl border border-[#D4A63D]/30 bg-[#fff8e5] p-4 text-sm leading-7 text-stone-800">
                {prayerAsk}
              </p>
              {flyerNote ? (
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  {flyerNote}
                </p>
              ) : null}
            </div>

            <div className="mt-auto pt-7">
              <div className="rounded-2xl border border-stone-300 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="shrink-0 rounded-xl border border-stone-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="QR code to support this missionary" className="h-[145px] w-[145px]" src={qrImageUrl} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a6b12]">
                      Partner Monthly
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                      Scan the QR code or visit the support link to give securely.
                    </p>
                    <p className="mt-3 break-all text-sm font-semibold text-stone-950">
                      {shortUrl(supportUrl)}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-stone-500">
                Your support helps sustain this missionary household and the broader USA Missionaries mission.
              </p>
              <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-stone-400">
                {shortUrl(profileUrl)}
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
