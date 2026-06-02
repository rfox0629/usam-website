import { ImageIcon } from "lucide-react";

type SupportFlyerPreviewProps = {
  annualGoal: number;
  headline: string;
  imageUrl?: string | null;
  missionStatement: string;
  note?: string | null;
  prayerAsk: string;
  qrImageUrl?: string | null;
  supportAppeal: string;
  supportLink: string;
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const flyerQrCells = [
  0, 1, 2, 4, 6, 7, 8,
  10, 14, 16, 18, 20, 22,
  24, 25, 27, 29, 31, 33,
  36, 38, 40, 42, 44, 45,
  48, 50, 52, 54, 56, 58,
  60, 61, 62,
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function calculateMonthlyGoal(annualGoal: number) {
  return annualGoal > 0 ? Math.round(annualGoal / 12) : 0;
}

function shortUrl(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function MiniQrCode() {
  return (
    <div className="grid h-[74px] w-[74px] grid-cols-8 gap-[2px] rounded-lg border border-usam-gold bg-white p-2">
      {Array.from({ length: 64 }).map((_, index) => (
        <span
          className={`rounded-[1px] ${flyerQrCells.includes(index) ? "bg-[#111111]" : "bg-[#f3ead4]"}`}
          key={index}
        />
      ))}
    </div>
  );
}

export function SupportFlyerPreview({
  annualGoal,
  headline,
  imageUrl,
  missionStatement,
  note,
  prayerAsk,
  qrImageUrl,
  supportAppeal,
  supportLink,
}: SupportFlyerPreviewProps) {
  const shortSupportLink = shortUrl(supportLink);
  const monthlyGoal = calculateMonthlyGoal(annualGoal);

  return (
    <div className="overflow-hidden rounded-2xl border border-usam-gold bg-[#fffdf7] text-[#111111] shadow-[0_18px_46px_rgba(17,17,17,0.09)]">
      <div className="flex items-center justify-between border-b border-[#eadfcd] bg-[#111111] px-4 py-3 text-white">
        <p className="text-[10px] uppercase tracking-[0.18em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          USA Missionaries
        </p>
        <p className="text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Support Flyer
        </p>
      </div>
      <div className="p-4">
        <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-[#f8f6f1]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Missionary support flyer"
                className="h-40 w-full object-cover"
                src={imageUrl}
              />
            ) : (
              <div className="flex h-40 items-center justify-center bg-[rgba(var(--usam-gold-rgb),0.12)] text-[var(--usam-black)]">
                <ImageIcon className="h-8 w-8" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold uppercase leading-[0.96] text-[#111111]" style={{ fontFamily: font.oswald }}>
              {headline}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4b443b]">
              {missionStatement}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[#eadfcd] bg-white p-3">
          <p className="text-sm font-semibold text-[#111111]">{prayerAsk}</p>
          <p className="mt-2 text-xs leading-5 text-[#6f6658]">{supportAppeal}</p>
        </div>
        <div className="mt-3 grid gap-3 rounded-xl border border-usam-gold bg-[rgba(var(--usam-gold-rgb),0.16)] p-3 sm:grid-cols-[auto_1fr]">
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="QR code for support link"
              className="h-[74px] w-[74px] rounded-lg border border-usam-gold bg-white p-1.5"
              src={qrImageUrl}
            />
          ) : (
            <MiniQrCode />
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a5a12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Partner Monthly
            </p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">
              {formatCurrency(monthlyGoal)}/mo goal
            </p>
            <p className="mt-1 truncate text-xs text-[#6f6658]">{shortSupportLink}</p>
          </div>
        </div>
        {note ? (
          <p className="mt-3 text-xs italic leading-5 text-[#7b746a]">{note}</p>
        ) : null}
      </div>
    </div>
  );
}
