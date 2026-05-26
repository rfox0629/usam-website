import type { Missionary } from "@/src/data/missionaries";
import { SupportFlyerPreview } from "@/src/components/missionaries/SupportFlyerPreview";

type FlyerVersion = "color" | "print";

type SupportFlyerProps = {
  missionary: Missionary;
  profileUrl: string;
  supportUrl: string;
  version?: FlyerVersion;
};

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
  const flyerHeadline = missionary.supportRouting?.flyerHeadline?.trim() || `Partner with ${missionary.name}`;
  const supportAppeal = missionary.supportRouting?.flyerSupportAppeal?.trim()
    || missionary.supportRouting?.explanation
    || `${missionary.name} is raising support with USA Missionaries to reach the lost, make disciples, and multiply across America.`;
  const prayerAsk = missionary.supportRouting?.flyerPrayerAsk?.trim()
    || "Would you prayerfully consider partnering monthly or sharing this mission with someone who may want to stand with us?";
  const flyerNote = missionary.supportRouting?.flyerNote?.trim();
  const image = missionary.heroImage || missionary.headerImage || missionary.image;
  const missionCopy = missionary.statement || "Reach the lost, make disciples, and multiply across America.";
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(supportUrl)}`;
  const pageClassName = isPrintFriendly ? "shadow-none" : "shadow-[0_26px_80px_rgba(17,17,17,0.2)]";

  return (
    <main className="min-h-screen bg-[#111111] px-4 py-6 text-[#111111] print:bg-white print:px-0 print:py-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: letter; margin: 0.34in; }
        .flyer-page {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; margin: 0 !important; }
          main { padding: 0 !important; background: #ffffff !important; }
          .flyer-page {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            min-height: auto !important;
            overflow: visible !important;
          }
        }
      ` }} />
      <section className={`flyer-page mx-auto max-w-[680px] ${pageClassName} print:max-w-none`}>
        <SupportFlyerPreview
          annualGoal={missionary.funding.annualGoal}
          headline={flyerHeadline}
          imageUrl={image}
          missionStatement={missionCopy}
          note={flyerNote}
          prayerAsk={prayerAsk}
          qrImageUrl={qrImageUrl}
          supportAppeal={supportAppeal}
          supportLink={supportUrl}
        />
      </section>
      <p className="no-print mx-auto mt-4 max-w-[680px] text-center text-[11px] uppercase tracking-[0.18em] text-stone-500">
        {shortUrl(profileUrl)}
      </p>
    </main>
  );
}
