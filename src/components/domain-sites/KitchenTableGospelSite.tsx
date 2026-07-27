import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const rhythm = [
  {
    body: "Enter the relationship with attention. Listen, ask better questions, and notice where Jesus is already drawing near.",
    practices: ["presence", "hospitality", "listening"],
    title: "Meet",
  },
  {
    body: "Bring prayer, Scripture, accountability, and practical care into the moment instead of leaving ministry for another room.",
    practices: ["prayer", "Scripture", "care"],
    title: "Minister",
  },
  {
    body: "Train people to follow Jesus and repeat the same rhythm with the people already trusted to them.",
    practices: ["obedience", "follow-through", "disciple making"],
    title: "Multiply",
  },
] as const;

const places = [
  {
    body: "Family meals, neighbors, living rooms, and the people already close enough to be known.",
    title: "Homes",
  },
  {
    body: "Small groups that practice prayer, Scripture, confession, care, and shared obedience.",
    title: "Groups",
  },
  {
    body: "Church communities that train everyday disciple makers instead of outsourcing ministry.",
    title: "Churches",
  },
  {
    body: "Workplaces, job sites, and regular rhythms where trust is built over time.",
    title: "Workplaces",
  },
  {
    body: "The ordinary relationships that become holy ground when people keep showing up.",
    title: "Relationships",
  },
] as const;

const training = [
  "How to recognize open doors in everyday relationships",
  "How to lead a table with prayer, Scripture, accountability, and care",
  "How to keep following up after the first conversation",
  "How to train others to repeat the rhythm without becoming dependent on one leader",
] as const;

export function KitchenTableGospelSite({
  ecosystemHref,
  siteHref,
}: {
  ecosystemHref: string;
  siteHref: string;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#120F0C] text-[#F8EEDB]">
      <style>
        {`
          @keyframes ktg-rise {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes ktg-drift {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
            50% { transform: translate3d(0, -12px, 0) rotate(0.4deg); }
          }

          @keyframes ktg-rule {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }

          .ktg-rise { animation: ktg-rise 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
          .ktg-rise-delay-1 { animation-delay: 120ms; }
          .ktg-rise-delay-2 { animation-delay: 240ms; }
          .ktg-rise-delay-3 { animation-delay: 360ms; }
          .ktg-drift { animation: ktg-drift 9s ease-in-out infinite; }
          .ktg-rule { transform-origin: left; animation: ktg-rule 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }

          .ktg-grain::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.04;
            mix-blend-mode: overlay;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.8'/%3E%3C/svg%3E");
          }

          @media (prefers-reduced-motion: reduce) {
            .ktg-rise,
            .ktg-drift,
            .ktg-rule {
              animation: none;
            }
          }
        `}
      </style>

      <header className="sticky top-0 z-50 border-b border-[#F0D29E]/15 bg-[#120F0C]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 md:px-8">
          <Link className="flex min-w-0 items-center gap-3" href={siteHref}>
            <img
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-sm object-cover"
              role="presentation"
              src="/icons/the-table-source.png"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase leading-none text-[#F8EEDB]" style={{ fontFamily: font.oswald }}>
                Kitchen Table Gospel
              </p>
              <p className="mt-1 hidden text-[10px] uppercase leading-none tracking-[0.2em] text-[#D8A34B] sm:block" style={{ fontFamily: font.rajdhani }}>
                An initiative of USA Missionaries
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Kitchen Table Gospel navigation">
            {[
              ["Rhythm", "#rhythm"],
              ["Places", "#places"],
              ["Training", "#training"],
            ].map(([label, href]) => (
              <a
                key={label}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#CDBF9F] transition-colors hover:text-[#F8EEDB]"
                href={href}
                style={{ fontFamily: font.rajdhani }}
              >
                {label}
              </a>
            ))}
            <Link
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D8A34B] transition-colors hover:text-[#F8EEDB]"
              href={ecosystemHref}
              style={{ fontFamily: font.rajdhani }}
            >
              Ecosystem
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="ktg-grain relative isolate min-h-[82svh] overflow-hidden px-5 pb-12 pt-16 md:px-8 md:pb-16 md:pt-20">
        <img
          alt="Jesus gathered with people around an ordinary table"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src="/images/domain-sites/kitchen-table-gospel-table.jpg"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,15,12,0.98)_0%,rgba(18,15,12,0.82)_38%,rgba(18,15,12,0.44)_68%,rgba(18,15,12,0.72)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-[#120F0C] to-transparent" />
        <div className="absolute left-0 top-0 -z-10 hidden h-full w-px bg-[#D8A34B]/40 md:block md:left-[8vw]" />

        <div className="relative mx-auto flex min-h-[calc(82svh-7rem)] max-w-7xl flex-col justify-end">
          <div className="max-w-4xl pb-8">
            <p
              className="ktg-rise text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D8A34B]"
              style={{ fontFamily: font.rajdhani }}
            >
              An initiative of USA Missionaries
            </p>
            <h1
              className="ktg-rise ktg-rise-delay-1 mt-5 max-w-4xl text-5xl font-bold uppercase leading-none text-[#FFF7EA] sm:text-7xl md:text-8xl"
              style={{ fontFamily: font.oswald }}
            >
              Kitchen Table Gospel
            </h1>
            <p className="ktg-rise ktg-rise-delay-2 mt-7 max-w-2xl text-lg leading-8 text-[#F2DEC1] md:text-xl">
              A USA Missionaries-developed discipleship methodology that helps people meet, minister, and multiply like Jesus did.
            </p>
            <div className="ktg-rise ktg-rise-delay-3 mt-9 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#D8A34B] bg-[#D8A34B] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#120F0C] transition-colors hover:bg-transparent hover:text-[#F6D29B]"
                href="#rhythm"
                style={{ fontFamily: font.rajdhani }}
              >
                See The Rhythm
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#F0D29E]/30 bg-[#120F0C]/55 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFF7EA] backdrop-blur-md transition-colors hover:border-[#D8A34B] hover:text-[#F6D29B]"
                href={ecosystemHref}
                style={{ fontFamily: font.rajdhani }}
              >
                USA Missionaries Ecosystem
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="ktg-rise ktg-rise-delay-3 grid border-y border-[#F0D29E]/20 bg-[#120F0C]/35 backdrop-blur-md md:grid-cols-3">
            {rhythm.map((item) => (
              <div key={item.title} className="border-b border-[#F0D29E]/15 px-4 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#F4E5CE]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5E7D1] px-5 py-16 text-[#15100D] md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8B4B25]" style={{ fontFamily: font.rajdhani }}>
              How Jesus Moved
            </p>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-[#15100D] md:text-6xl" style={{ fontFamily: font.oswald }}>
              He met people, ministered in the moment, and multiplied disciples.
            </h2>
          </div>
          <div className="grid gap-6">
            <p className="text-xl leading-9 text-[#3D2B20] md:text-2xl">
              Jesus showed up in ordinary places: homes, roads, shorelines, wells, meals, and crowded rooms. The table became a place where people were known, healed, challenged, forgiven, and sent.
            </p>
            <div className="h-px bg-[#A06634]/45" />
            <p className="max-w-3xl text-base leading-8 text-[#5C4938]">
              Kitchen Table Gospel gives missionaries a repeatable rhythm for bringing that same kind of intentional discipleship into everyday relationships without turning it into a program people have to attend.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-16 md:px-8 md:py-24" id="rhythm">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[length:76px_76px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
                Core Rhythm
              </p>
              <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-[#FFF7EA] md:text-6xl" style={{ fontFamily: font.oswald }}>
                Meet. Minister. Multiply.
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-8 text-[#D7C2A8] md:text-lg">
              The rhythm is simple enough to carry anywhere and deep enough to shape a life: notice the person, minister with Jesus, and help them do the same with someone else.
            </p>
          </div>

          <div className="mt-12 grid gap-px bg-[#F0D29E]/18 lg:grid-cols-3">
            {rhythm.map((item, index) => (
              <article key={item.title} className="bg-[#18120E] p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
                    0{index + 1}
                  </span>
                  <span className="h-8 w-8 border border-[#F0D29E]/22 text-center text-xs font-semibold leading-8 text-[#F0D29E]" style={{ fontFamily: font.rajdhani }}>
                    {index === 2 ? "GO" : "TO"}
                  </span>
                </div>
                <h3 className="mt-12 text-4xl font-bold uppercase leading-none text-[#FFF7EA] md:text-5xl" style={{ fontFamily: font.oswald }}>
                  {item.title}
                </h3>
                <div className="ktg-rule mt-6 h-px bg-[#D8A34B]" />
                <p className="mt-6 text-sm leading-7 text-[#D7C2A8]">{item.body}</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {item.practices.map((practice) => (
                    <span
                      key={practice}
                      className="border border-[#F0D29E]/20 bg-[#221713] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F6D29B]"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      {practice}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#F0D29E]/14 bg-[#1A2319] px-5 py-16 md:px-8 md:py-24" id="places">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
                Where It Works
              </p>
              <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-[#FFF7EA] md:text-6xl" style={{ fontFamily: font.oswald }}>
                Everyday rooms become disciple-making ground.
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-8 text-[#D9D5BF] md:text-lg">
              Kitchen Table Gospel is built for the places people already live, gather, work, and build trust. Missionaries learn to bring intentional discipleship into those spaces instead of waiting for ideal conditions.
            </p>
          </div>

          <div className="mt-12 grid gap-px bg-[#E6D19C]/20 md:grid-cols-5">
            {places.map((place) => (
              <article key={place.title} className="min-h-[220px] bg-[#11170F] p-5 transition-colors hover:bg-[#192216]">
                <h3 className="text-3xl font-bold uppercase leading-none text-[#FFF7EA]" style={{ fontFamily: font.oswald }}>
                  {place.title}
                </h3>
                <p className="mt-8 text-sm leading-6 text-[#D9D5BF]">{place.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8 md:py-24" id="training">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="relative overflow-hidden border border-[#F0D29E]/18 bg-[#17110E] p-6 md:p-9">
            <div className="absolute right-0 top-0 h-40 w-40 border-l border-b border-[#D8A34B]/30" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
              USA Missionaries Training
            </p>
            <h2 className="relative mt-5 text-4xl font-bold uppercase leading-tight text-[#FFF7EA] md:text-5xl" style={{ fontFamily: font.oswald }}>
              Missionaries are trained to carry the table rhythm into the field.
            </h2>
            <p className="relative mt-7 text-base leading-8 text-[#D7C2A8]">
              This is not a ministry brand pasted onto a curriculum. It is a practiced way of following Jesus that forms missionary households and equips them to keep showing up.
            </p>
          </div>

          <div className="grid gap-3">
            {training.map((item, index) => (
              <div key={item} className="grid grid-cols-[44px_1fr] border border-[#F0D29E]/14 bg-[#120F0C]">
                <div className="flex items-center justify-center border-r border-[#F0D29E]/14 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </div>
                <p className="px-5 py-4 text-sm leading-6 text-[#E7D6BE]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5E7D1] px-5 py-16 text-[#15100D] md:px-8 md:py-24">
        <div className="absolute inset-y-0 left-0 hidden w-[18vw] bg-[#8B4B25] lg:block" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
          <div className="hidden lg:block">
            <div className="ktg-drift h-72 border border-[#F0D29E]/45 bg-[radial-gradient(circle_at_center,rgba(245,231,209,0.95)_0,rgba(245,231,209,0.95)_34%,rgba(216,163,75,0.9)_35%,rgba(216,163,75,0.9)_37%,transparent_38%)]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8B4B25]" style={{ fontFamily: font.rajdhani }}>
              Connected To The Ecosystem
            </p>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-[#15100D] md:text-6xl" style={{ fontFamily: font.oswald }}>
              The table is the rhythm. USA Missionaries trains, equips, and deploys it.
            </h2>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#5C4938] md:text-lg">
              Kitchen Table Gospel forms the disciple-making methodology. DOS helps missionaries remember people, meetings, prayer, commitments, and faithful follow-through after the table.
            </p>
            <div className="mt-9">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#15100D] bg-[#15100D] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5E7D1] transition-colors hover:bg-transparent hover:text-[#15100D]"
                href={ecosystemHref}
                style={{ fontFamily: font.rajdhani }}
              >
                Back To The Ecosystem
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#F0D29E]/14 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#BBA98F] md:flex-row md:items-center md:justify-between">
          <p>Kitchen Table Gospel · An initiative of USA Missionaries</p>
          <Link className="inline-flex items-center gap-2 text-[#D8A34B] transition-colors hover:text-[#FFF7EA]" href={ecosystemHref}>
            USA Missionaries Ecosystem
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
