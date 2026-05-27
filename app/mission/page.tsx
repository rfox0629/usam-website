import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { FieldReportsAccessCTA } from "./FieldReportsAccessCTA";
import { MissionReviewCTA } from "./MissionReviewCTA";

export const metadata: Metadata = {
  title: "Briefing | USA Missionaries",
  description: "Kitchen table testimonies and quiet field reports from USA Missionaries.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const featuredEncounter = {
  quote:
    "We both felt the evening opened our eyes to the spiritual battle going on inside our home. After we prayed for freedom from lies of the enemy, I literally felt lighter.",
  attribution: "KITCHEN TABLE ENCOUNTER, FEBRUARY 2026",
} as const;

type FieldReport = {
  attribution: string;
  quote: string;
  tag?: string;
};

const fieldReports: readonly FieldReport[] = [
  {
    quote:
      "I can't thank you enough for coming. It was such a blessing... An answer to prayer, really. Glory to God for the words Ryan spoke to my husband. I believe with faith that last night was a pivotal point for him.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
    tag: "ENCOURAGEMENT",
  },
  {
    quote:
      "Our kitchen table night exceeded anything we could have imagined. We left stirred up to seek Jesus more deeply and embrace the gifts of the Spirit. This ministry is exactly what America needs.",
    attribution: "KITCHEN TABLE ENCOUNTER, FEBRUARY 2026",
    tag: "DISCIPLESHIP",
  },
  {
    quote:
      "We are praying for you guys. Our nation needs Jesus NOW. May your mission be amplified and shared until ALL have heard.",
    attribution: "KITCHEN TABLE ENCOUNTER, MARCH 2026",
  },
  {
    quote:
      "Last night was amazing. I am still thinking about it. I couldn't sleep because I was thinking of so many people you could meet with.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
    tag: "BREAKTHROUGH",
  },
  {
    quote:
      "What struck me most was how life-giving our time together was. Ryan and Brooke are authentic and humble servants of the Lord. Our meeting was like a spiritual checkup that was needed.",
    attribution: "KITCHEN TABLE ENCOUNTER, FEBRUARY 2026",
  },
  {
    quote:
      "I have been Christian most of my life and have never experienced discipleship in this way. The Lord impressed His heart for His children upon me as we sat unrushed with no agenda other than to experience His love.",
    attribution: "KITCHEN TABLE ENCOUNTER, MARCH 2026",
    tag: "TABLE ENCOUNTER",
  },
  {
    quote:
      "The prayers specifically for us were so beautiful and things we felt the Holy Spirit stirring in us. How God is working in your lives is so awesome.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
  },
  {
    quote:
      "Matt had a vision the next morning. He was truly touched and it sparked a new level of faith for him.",
    attribution: "KITCHEN TABLE ENCOUNTER, FEBRUARY 2026",
  },
  {
    quote:
      "It was a privilege to hear what the Lord has done in the two of you. We left encouraged, challenged, and with a desire to go higher and dig deeper.",
    attribution: "KITCHEN TABLE ENCOUNTER, MARCH 2026",
    tag: "ENCOURAGEMENT",
  },
  {
    quote:
      "We both felt the evening opened our eyes to the spiritual battle going on inside our home. After we prayed for freedom from lies of the enemy, I literally felt lighter.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
    tag: "PRAYER FOR FREEDOM",
  },
  {
    quote:
      "Being vulnerable allowed God to work and move in our meeting. Something very much needed in the body of Christ that cannot be done on a Sunday. Very intimate.",
    attribution: "KITCHEN TABLE ENCOUNTER, FEBRUARY 2026",
  },
  {
    quote:
      "This was a confirmation on what God is wanting to do in the homes. He is wanting to transform us from Sunday Christians to everyday Christians.",
    attribution: "KITCHEN TABLE ENCOUNTER, MARCH 2026",
  },
  {
    quote:
      "Hope. Our marriage is very rocky right now. This brought me hope. The world would call me a fool for still being in this marriage but it felt good to hear that God's truth is the opposite.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
    tag: "RESTORATION",
  },
] as const;

function FeaturedEncounterSection() {
  return (
    <section className="relative overflow-hidden bg-[#050505] px-6 pb-16 pt-4 md:pb-24 md:pt-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_38%,rgba(212,160,84,0.15),transparent_25%),radial-gradient(circle_at_74%_48%,rgba(255,255,255,0.035),transparent_22%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.72),rgba(8,8,8,0.86),rgba(5,5,5,0.98))]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="relative overflow-hidden border border-white/[0.095] bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012)_42%,rgba(212,160,23,0.04))] px-6 py-12 shadow-[0_24px_90px_rgba(0,0,0,0.52)] md:px-12 md:py-16">
          <div className="absolute inset-y-0 left-0 w-px bg-amber-500/55" />
          <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative max-w-5xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Featured Encounter
            </p>
            <blockquote className="mt-8 border-l-2 border-amber-500/45 pl-6 md:pl-8">
              <p className="text-[28px] font-normal italic leading-[1.42] text-white/[0.94] md:text-5xl md:leading-[1.22]">
                &ldquo;{featuredEncounter.quote}&rdquo;
              </p>
            </blockquote>
            <p
              className="mt-7 text-[10px] uppercase tracking-[2.6px] text-white/42"
              style={{ fontFamily: font.rajdhani }}
            >
              {`— ${featuredEncounter.attribution}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldReportCard({
  report,
}: {
  report: FieldReport;
}) {
  return (
    <article className="relative mb-5 break-inside-avoid overflow-hidden border border-white/[0.055] bg-white/[0.014] p-5 shadow-[0_14px_44px_rgba(0,0,0,0.18)] transition-colors duration-200 hover:border-amber-500/22 hover:bg-white/[0.022] md:p-6">
      <div className="absolute inset-y-5 left-0 w-px bg-amber-500/35" />
      {report.tag ? (
        <p
          className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/56"
          style={{ fontFamily: font.rajdhani }}
        >
          {report.tag}
        </p>
      ) : null}
      <p className="text-base font-normal italic leading-[1.72] text-white/[0.88] md:text-[17px]">
        &ldquo;{report.quote}&rdquo;
      </p>
      <p
        className="mt-5 text-[10px] uppercase tracking-[2px] text-white/[0.38]"
        style={{ fontFamily: font.rajdhani }}
      >
        {`— ${report.attribution}`}
      </p>
    </article>
  );
}

type SearchParams = {
  previewForm?: string;
};

export default async function MissionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const shouldOpenFieldReports = params.previewForm === "field_report_access";

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="briefing" />

      <section className="relative overflow-hidden px-6 pb-10 pt-24 md:pb-14 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_32%,rgba(212,160,84,0.16),transparent_25%),radial-gradient(circle_at_78%_40%,rgba(255,255,255,0.035),transparent_24%),linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:auto,auto,96px_96px,96px_96px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.36),transparent_30%,rgba(5,5,5,0.86)_100%),radial-gradient(ellipse_at_center,transparent_34%,#050505_100%)]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Mission Briefing
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-none tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            BRIEFING
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-stone-300 md:text-xl md:leading-9">
            Real testimonies from kitchen tables where prayer, surrender, and quiet transformation are taking root across America.
          </p>
          <MissionReviewCTA />
        </div>
      </section>

      <FeaturedEncounterSection />

      <section className="relative overflow-hidden bg-[#080808] px-6 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(212,160,84,0.08),transparent_24%),radial-gradient(circle_at_76%_38%,rgba(255,255,255,0.025),transparent_25%),linear-gradient(180deg,rgba(5,5,5,0.2),rgba(8,8,8,1)_24%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Field Reports
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
              FROM THE TABLE
            </h2>
            <p className="mt-4 text-sm md:text-base leading-7 text-stone-500">
              Real homes. Real encounters. Quiet transformation.
            </p>
          </div>

          <div className="mt-10 columns-1 gap-5 md:columns-2">
            {fieldReports.map((report, index) => (
              <FieldReportCard key={`${report.attribution}-${index}`} report={report} />
            ))}
          </div>

          <div className="relative mt-16 overflow-hidden border border-white/[0.1] bg-[#060606] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.42)] md:p-9">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_72%_48%,rgba(212,160,23,0.11),transparent_34%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative max-w-3xl">
                <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  Field Reports
                </p>
                <h3 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                  See the Fruit of the Mission
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
                  For churches, leaders, and ministry partners, USA Missionaries stewards a private reporting environment that provides a high-level view of what God is doing through the movement.
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-400 md:text-base">
                  Individual stories and personal details are never shared publicly and are stewarded with care.
                </p>
                <p className="mt-4 text-xs uppercase leading-6 tracking-[0.18em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
                  Access is reserved for trusted leaders, partner churches, and approved ministry stakeholders.
                </p>
              </div>

              <FieldReportsAccessCTA initialOpen={shouldOpenFieldReports} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
