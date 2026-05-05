import type { MissionaryFunding } from "@/src/data/missionaries";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export function getAnnualCommitted(monthlyCommitted: number) {
  return monthlyCommitted * 12;
}

export function getRemainingAnnualNeed(annualGoal: number, monthlyCommitted: number) {
  return Math.max(annualGoal - getAnnualCommitted(monthlyCommitted), 0);
}

export function getFundingProgressPercent(annualGoal: number, monthlyCommitted: number) {
  if (annualGoal <= 0) {
    return 0;
  }

  return Math.min(Math.round((getAnnualCommitted(monthlyCommitted) / annualGoal) * 100), 100);
}

export function getAnnualizedReceived(monthlyReceived: number) {
  return monthlyReceived * 12;
}

export function getRemainingAnnualNeedFromReceived(annualGoal: number, monthlyReceived: number) {
  return Math.max(annualGoal - getAnnualizedReceived(monthlyReceived), 0);
}

export function getReceivedFundingProgressPercent(annualGoal: number, monthlyReceived: number) {
  if (annualGoal <= 0) {
    return 0;
  }

  return Math.min(Math.round((getAnnualizedReceived(monthlyReceived) / annualGoal) * 100), 100);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

type FundingDashboardProps = {
  funding: MissionaryFunding;
};

export function FundingDashboard({ funding }: FundingDashboardProps) {
  const annualizedReceived = getAnnualizedReceived(funding.receivedMonthly);
  const remainingAnnualNeed = getRemainingAnnualNeedFromReceived(funding.annualGoal, funding.receivedMonthly);
  const progressPercent = getReceivedFundingProgressPercent(funding.annualGoal, funding.receivedMonthly);
  const stats = [
    { label: funding.goalLabel, value: formatCurrency(funding.annualGoal) },
    { label: "Currently Raised (Monthly)", value: `${formatCurrency(funding.receivedMonthly)}/mo` },
    { label: "Annualized Raised", value: formatCurrency(annualizedReceived) },
    { label: "Remaining Need", value: formatCurrency(remainingAnnualNeed) },
  ];

  return (
    <div className="mt-12 border border-stone-800/70 bg-stone-950/50 p-6 md:p-8 lg:p-10">
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-bold text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-7 text-sm leading-6 text-stone-400">
        Monthly support committed toward the annual goal.
      </p>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-4 text-sm text-stone-300">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-800">
          <div className="h-full rounded-full bg-[#D4A63D]" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-5 text-sm leading-6 text-stone-400">
          {funding.goalBasis}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          A portion of every missionary support commitment helps sustain USAM leadership, operations, and national expansion.
        </p>
      </div>
    </div>
  );
}
