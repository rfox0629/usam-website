import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { MissionReviewCTA } from "./MissionReviewCTA";

export const metadata: Metadata = {
  title: "Briefing | USA Missionaries",
  description: "Operational briefing and field dashboard for USA Missionaries.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const fieldReports = [
  {
    quote:
      "I can't thank you enough for coming. It was such a blessing... An answer to prayer, really. Glory to God for the words Ryan spoke to my husband. I believe with faith that last night was a pivotal point for him.",
    attribution: "KITCHEN TABLE CLIENT, JANUARY 2026",
  },
  {
    quote:
      "Our kitchen table night exceeded anything we could have imagined. We left stirred up to seek Jesus more deeply and embrace the gifts of the Spirit. This ministry is exactly what America needs.",
    attribution: "KITCHEN TABLE CLIENT, FEBRUARY 2026",
  },
  {
    quote:
      "We are praying for you guys. Our nation needs Jesus NOW. May your mission be amplified and shared until ALL have heard.",
    attribution: "KITCHEN TABLE CLIENT, MARCH 2026",
  },
  {
    quote:
      "Last night was amazing. I am still thinking about it. I couldn't sleep because I was thinking of so many people you could meet with.",
    attribution: "KITCHEN TABLE CLIENT, JANUARY 2026",
  },
  {
    quote:
      "What struck me most was how life-giving our time together was. Ryan and Brooke are authentic and humble servants of the Lord. Our meeting was like a spiritual checkup that was needed.",
    attribution: "KITCHEN TABLE CLIENT, FEBRUARY 2026",
  },
  {
    quote:
      "I have been Christian most of my life and have never experienced discipleship in this way. The Lord impressed His heart for His children upon me as we sat unrushed with no agenda other than to experience His love.",
    attribution: "KITCHEN TABLE CLIENT, MARCH 2026",
  },
  {
    quote:
      "The prayers specifically for us were so beautiful and things we felt the Holy Spirit stirring in us. How God is working in your lives is so awesome.",
    attribution: "KITCHEN TABLE CLIENT, JANUARY 2026",
  },
  {
    quote:
      "Matt had a vision the next morning. He was truly touched and it sparked a new level of faith for him.",
    attribution: "KITCHEN TABLE CLIENT, FEBRUARY 2026",
  },
  {
    quote:
      "It was a privilege to hear what the Lord has done in the two of you. We left encouraged, challenged, and with a desire to go higher and dig deeper.",
    attribution: "KITCHEN TABLE CLIENT, MARCH 2026",
  },
  {
    quote:
      "We both felt the evening opened our eyes to the spiritual battle going on inside our home. After we prayed for freedom from lies of the enemy, I literally felt lighter.",
    attribution: "KITCHEN TABLE CLIENT, JANUARY 2026",
  },
  {
    quote:
      "Being vulnerable allowed God to work and move in our meeting. Something very much needed in the body of Christ that cannot be done on a Sunday. Very intimate.",
    attribution: "KITCHEN TABLE CLIENT, FEBRUARY 2026",
  },
  {
    quote:
      "This was a confirmation on what God is wanting to do in the homes. He is wanting to transform us from Sunday Christians to everyday Christians.",
    attribution: "KITCHEN TABLE CLIENT, MARCH 2026",
  },
  {
    quote:
      "Hope. Our marriage is very rocky right now. This brought me hope. The world would call me a fool for still being in this marriage but it felt good to hear that God's truth is the opposite.",
    attribution: "KITCHEN TABLE CLIENT, JANUARY 2026",
  },
] as const;

export default function MissionPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="briefing" />

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(212,160,84,0.12),transparent_24%),linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:auto,72px_72px,72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,#050505_100%)]" />
        <div className="relative mx-auto max-w-6xl">
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
              <div key={`${report.attribution}-${index}`} className="border border-stone-800/40 bg-stone-950/60 p-5">
                <div className="border-l-2 border-amber-500/15 pl-4">
                  <p className="text-[14px] italic leading-relaxed text-stone-300">
                    &ldquo;{report.quote}&rdquo;
                  </p>
                </div>
                <p
                  className="mt-3 text-[11px] uppercase tracking-[0.2em] text-stone-500"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {`— ${report.attribution}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
