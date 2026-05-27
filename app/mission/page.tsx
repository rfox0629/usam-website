import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { FieldReportsAccessCTA } from "./FieldReportsAccessCTA";
import { MissionReviewCTA } from "./MissionReviewCTA";

export const metadata: Metadata = {
  title: "Briefing | USA Missionaries",
  description: "Operational briefing and field dashboard for USA Missionaries.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function VideoPlaceholderCard() {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.16] bg-[#050505] shadow-[0_0_0_1px_rgba(255,255,255,0.045),0_26px_80px_rgba(0,0,0,0.72)]">
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.18]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(212,160,84,0.16),transparent_23%),radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_42%),linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.76))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:18px_18px] opacity-[0.06]" />
      <div className="absolute inset-x-0 top-0 h-10 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-black/45" />

      <div className="relative aspect-video min-h-[286px] p-5 md:min-h-0 md:p-7">
        <div className="flex h-full flex-col">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-[rgba(212,160,23,0.9)] [text-shadow:0_0_8px_rgba(212,160,23,0.28)]" style={{ fontFamily: font.rajdhani }}>
              Film In Progress
            </p>
            <h2 className="max-w-sm text-2xl font-semibold leading-[1.2] text-white md:text-3xl" style={{ fontFamily: font.oswald }}>
              Kitchen Table Testimony
            </h2>
            <p className="mt-5 max-w-[17rem] text-sm leading-6 text-white/68 md:max-w-sm">
              Prayer, surrender, and a home becoming holy ground.
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-10 flex justify-center md:inset-0 md:translate-y-4 md:items-center">
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/50 bg-black/35 shadow-[0_0_0_9px_rgba(255,255,255,0.035),0_0_42px_rgba(212,160,23,0.26)] backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:border-amber-200/70 group-hover:shadow-[0_0_0_11px_rgba(255,255,255,0.04),0_0_52px_rgba(212,160,23,0.34)] md:h-[86px] md:w-[86px]">
              <div className="ml-1 h-0 w-0 border-y-[13px] border-l-[21px] border-y-transparent border-l-stone-100" />
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-white/38" style={{ fontFamily: font.rajdhani }}>
            <span>USA Missionaries</span>
            <span>Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldReports = [
  {
    quote:
      "I can't thank you enough for coming. It was such a blessing... An answer to prayer, really. Glory to God for the words Ryan spoke to my husband. I believe with faith that last night was a pivotal point for him.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
  },
  {
    quote:
      "Our kitchen table night exceeded anything we could have imagined. We left stirred up to seek Jesus more deeply and embrace the gifts of the Spirit. This ministry is exactly what America needs.",
    attribution: "KITCHEN TABLE ENCOUNTER, FEBRUARY 2026",
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
  },
  {
    quote:
      "We both felt the evening opened our eyes to the spiritual battle going on inside our home. After we prayed for freedom from lies of the enemy, I literally felt lighter.",
    attribution: "KITCHEN TABLE ENCOUNTER, JANUARY 2026",
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
  },
] as const;

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

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_21%_36%,rgba(212,160,84,0.17),transparent_25%),radial-gradient(circle_at_74%_42%,rgba(255,255,255,0.045),transparent_24%),linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[length:auto,auto,86px_86px,86px_86px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.38),transparent_28%,rgba(5,5,5,0.88)_100%),radial-gradient(ellipse_at_center,transparent_32%,#050505_100%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Mission Briefing
            </p>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
              BRIEFING
            </h1>
            <p className="mt-8 max-w-3xl text-base md:text-lg leading-8 text-stone-400">
              A quiet look at what God is doing around kitchen tables, in living rooms, and through ordinary obedience across America.
            </p>
            <MissionReviewCTA />
          </div>

          <VideoPlaceholderCard />
        </div>
      </section>

      <section className="bg-[#080808] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
              Field Reports
            </p>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
              FROM THE TABLE
            </h2>
            <p className="mt-4 text-sm md:text-base leading-7 text-stone-500">
              Direct reports from the field. Real homes. Real encounters.
            </p>
          </div>

          <div className="mt-10 grid gap-3 lg:grid-cols-2">
            {fieldReports.map((report, index) => (
              <div key={`${report.attribution}-${index}`} className="border border-white/[0.07] bg-white/[0.015] p-6">
                <div className="border-l-2 border-amber-500/35 pl-5">
                  <p className="text-[15.5px] font-normal italic leading-[1.65] text-white/[0.86] md:text-[17px]">
                    &ldquo;{report.quote}&rdquo;
                  </p>
                </div>
                <p
                  className="mt-[14px] text-[10px] uppercase tracking-[2px] text-white/[0.38]"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {`— ${report.attribution}`}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
                  Field Reports
                </p>
                <h3 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                  See the Fruit of the Mission
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
                  For churches, leaders, and ministry partners, USA Missionaries is building a private reporting environment that provides a high-level view of what God is doing through the movement.
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
