import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { MissionReviewCTA } from "./MissionReviewCTA";

export const metadata: Metadata = {
  title: "Briefing | USA Missionaries",
  description: "Operational briefing and field dashboard for USA Missionaries.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function VideoPlaceholderCard() {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/25 bg-[#0D0D0D] shadow-[0_0_0_1px_rgba(194,161,78,0.08),0_24px_70px_rgba(0,0,0,0.68)]">
      <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(194,161,78,0.13),transparent_28%),radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.78)_100%),linear-gradient(135deg,rgba(255,255,255,0.055),transparent_40%,rgba(194,161,78,0.02))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:42px_42px] opacity-[0.08]" />

      <div className="relative aspect-video min-h-[280px] p-5 md:min-h-0 md:p-7">
        <div className="flex h-full flex-col">
          <div className="relative z-10">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-[#C2A14E] [text-shadow:0_0_10px_rgba(194,161,78,0.28)]" style={{ fontFamily: font.rajdhani }}>
              Coming Soon
            </p>
            <h2 className="max-w-sm text-2xl font-semibold leading-[1.2] text-white md:text-3xl" style={{ fontFamily: font.oswald }}>
              Kitchen Table Testimony
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">
              A story from the table.
            </p>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/50 bg-black/40 shadow-[0_0_0_8px_rgba(255,255,255,0.035),0_0_42px_rgba(194,161,78,0.28)] backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:border-usam-gold/70 group-hover:shadow-[0_0_0_10px_rgba(255,255,255,0.04),0_0_54px_rgba(194,161,78,0.36)] md:h-[84px] md:w-[84px]">
              <div className="ml-1 h-0 w-0 border-y-[13px] border-l-[21px] border-y-transparent border-l-stone-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

const fieldReportCardStyles = [
  "p-6 md:p-7 lg:col-span-7",
  "p-7 md:p-8 lg:col-span-5",
  "p-6 md:p-7 lg:col-span-5",
  "p-7 md:p-8 lg:col-span-7",
  "p-6 md:p-7 lg:col-span-6",
  "p-7 md:p-9 lg:col-span-6",
  "p-6 md:p-7 lg:col-span-5",
  "p-7 md:p-8 lg:col-span-7",
  "p-6 md:p-7 lg:col-span-7",
  "p-7 md:p-8 lg:col-span-5",
  "p-6 md:p-7 lg:col-span-6",
  "p-7 md:p-8 lg:col-span-6",
  "p-7 md:p-9 lg:col-span-12",
] as const;

function FeaturedEncounterSection() {
  return (
    <section className="relative overflow-hidden bg-[#0D0D0D] px-6 py-16 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_42%,rgba(194,161,78,0.12),transparent_24%),radial-gradient(circle_at_78%_50%,rgba(255,255,255,0.035),transparent_22%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.95),rgba(13,13,13,0.86),rgba(13,13,13,0.98))]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="relative overflow-hidden border border-white/[0.1] bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012)_44%,rgba(194,161,78,0.035))] px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.5)] md:px-12 md:py-14">
          <div className="absolute inset-y-0 left-0 w-px bg-usam-gold/55" />
          <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-usam-gold/10 blur-3xl" />

          <div className="relative max-w-5xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Featured Encounter
            </p>
            <blockquote className="mt-8 border-l-2 border-usam-gold/45 pl-6 md:pl-8">
              <p className="text-2xl font-normal italic leading-[1.5] text-white/[0.92] md:text-4xl md:leading-[1.35]">
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
  index,
}: {
  report: FieldReport;
  index: number;
}) {
  const cardStyle = fieldReportCardStyles[index] ?? "p-6 md:p-7 lg:col-span-6";

  return (
    <article className={`border border-white/[0.075] bg-white/[0.018] shadow-[0_18px_54px_rgba(0,0,0,0.22)] transition-colors duration-200 hover:border-usam-gold/25 hover:bg-white/[0.026] ${cardStyle}`}>
      {report.tag ? (
        <p
          className="mb-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-usam-gold/65"
          style={{ fontFamily: font.rajdhani }}
        >
          {report.tag}
        </p>
      ) : null}
      <div className="border-l-2 border-usam-gold/35 pl-5 md:pl-6">
        <p className="text-[15.5px] font-normal italic leading-[1.72] text-white/[0.86] md:text-[17px]">
          &ldquo;{report.quote}&rdquo;
        </p>
      </div>
      <p
        className="mt-[16px] text-[10px] uppercase tracking-[2px] text-white/[0.38]"
        style={{ fontFamily: font.rajdhani }}
      >
        {`— ${report.attribution}`}
      </p>
    </article>
  );
}

export default function BriefingPage() {
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="briefing" />

      <section className="relative overflow-hidden px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_34%,rgba(194,161,78,0.14),transparent_25%),radial-gradient(circle_at_78%_42%,rgba(255,255,255,0.04),transparent_24%),linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:auto,auto,86px_86px,86px_86px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.38),transparent_28%,rgba(13,13,13,0.9)_100%),radial-gradient(ellipse_at_center,transparent_34%,#0D0D0D_100%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Mission Briefing
            </p>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              BRIEFING
            </h1>
            <p className="mt-8 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
              Active field reports, movement metrics, and operational visibility.
            </p>
            <MissionReviewCTA />
          </div>

          <VideoPlaceholderCard />
        </div>
      </section>

      <FeaturedEncounterSection />

      <section className="relative overflow-hidden bg-[#0D0D0D] px-6 py-20 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(194,161,78,0.08),transparent_24%),linear-gradient(180deg,rgba(13,13,13,0.2),rgba(13,13,13,1)_24%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Field Reports
            </p>
            <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
              FROM THE TABLE
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-500 md:text-base">
              Real homes. Real encounters. Quiet transformation.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-12">
            {fieldReports.map((report, index) => (
              <FieldReportCard key={`${report.attribution}-${index}`} report={report} index={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
