import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { FinancialFreedomInquiryForm } from "./FinancialFreedomInquiryForm";

export const metadata: Metadata = {
  title: "Financial Freedom | USA Missionaries",
  description: "Voluntary Financial Freedom inquiry form for USA Missionaries.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SearchParams = {
  error?: string;
  submitted?: string;
  upload?: string;
};

export default async function FinancialFreedomInquiryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="support" />

      <section className="relative overflow-hidden px-6 pb-10 pt-24 md:pb-12 md:pt-28">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(212,166,61,0.10),transparent_28%),radial-gradient(ellipse_at_center,transparent_38%,#050505_100%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Financial Freedom
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[0.95] tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Find clarity. Build a plan. Move toward freedom.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-stone-400 md:text-lg">
            If you would like help thinking through debt, budget, savings, retirement, or generosity, you can voluntarily share your information here.
          </p>
        </div>
      </section>

      <section className="border-t border-stone-900/80 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <FinancialFreedomInquiryForm
            error={params.error}
            submitted={params.submitted === "1"}
            uploadPartial={params.upload === "partial"}
          />
        </div>
      </section>
    </main>
  );
}
