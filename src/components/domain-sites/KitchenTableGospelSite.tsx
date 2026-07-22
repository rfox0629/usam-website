import Link from "next/link";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const rhythm = [
  {
    body: "Enter the space with attention. Listen for the person Jesus is already drawing near.",
    title: "Meet",
  },
  {
    body: "Bring prayer, Scripture, care, accountability, and presence into the conversation.",
    title: "Minister",
  },
  {
    body: "Train others to follow Jesus and repeat the rhythm in their own relationships.",
    title: "Multiply",
  },
] as const;

const places = ["Homes", "Groups", "Churches", "Workplaces", "Everyday relationships"] as const;

export function KitchenTableGospelSite({ ecosystemHref }: { ecosystemHref: string }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#11100E] text-[#F7F1E7]">
      <style>
        {`
          @keyframes ktg-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          @keyframes ktg-line {
            0% { transform: scaleX(0); transform-origin: left; }
            100% { transform: scaleX(1); transform-origin: left; }
          }

          .ktg-float { animation: ktg-float 7s ease-in-out infinite; }
          .ktg-line { animation: ktg-line 1.2s ease-out both; }
        `}
      </style>

      <header className="sticky top-0 z-50 border-b border-[#E9D7AD]/15 bg-[#11100E]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <img alt="" aria-hidden="true" className="h-9 w-9 rounded-sm object-cover" role="presentation" src="/icons/the-table-source.png" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase text-[#F7F1E7]" style={{ fontFamily: font.oswald }}>
                Kitchen Table Gospel
              </p>
              <p className="hidden text-[10px] uppercase tracking-[0.2em] text-[#D8A34B] sm:block" style={{ fontFamily: font.rajdhani }}>
                An initiative of USA Missionaries
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Kitchen Table Gospel navigation">
            {["Rhythm", "Places", "Training"].map((item) => (
              <a key={item} className="text-[11px] uppercase tracking-[0.2em] text-[#CDBF9F] transition-colors hover:text-[#F7F1E7]" href={`#${item.toLowerCase()}`} style={{ fontFamily: font.rajdhani }}>
                {item}
              </a>
            ))}
            <Link className="text-[11px] uppercase tracking-[0.2em] text-[#D8A34B] transition-colors hover:text-[#F7F1E7]" href={ecosystemHref} style={{ fontFamily: font.rajdhani }}>
              Ecosystem
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative px-5 py-16 md:px-8 md:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
              Meet. Minister. Multiply.
            </p>
            <h1 className="mt-6 text-6xl font-bold uppercase leading-none text-[#F7F1E7] md:text-8xl" style={{ fontFamily: font.oswald }}>
              Kitchen Table Gospel
            </h1>
            <p className="mt-7 text-lg leading-8 text-[#DED0B8] md:text-xl">
              A USA Missionaries-developed discipleship methodology that helps people meet, minister, and multiply like Jesus did.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="inline-flex min-h-11 items-center justify-center border border-[#D8A34B] bg-[#D8A34B] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#11100E] transition-colors hover:bg-transparent hover:text-[#D8A34B]" href="#rhythm" style={{ fontFamily: font.rajdhani }}>
                See The Rhythm
              </a>
              <Link className="inline-flex min-h-11 items-center justify-center border border-[#E9D7AD]/25 bg-[#171613] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#F7F1E7] transition-colors hover:border-[#D8A34B] hover:text-[#D8A34B]" href={ecosystemHref} style={{ fontFamily: font.rajdhani }}>
                USA Missionaries Ecosystem
              </Link>
            </div>
          </div>

          <div className="ktg-float relative">
            <div className="absolute -left-5 top-6 hidden h-28 w-28 border border-[#D8A34B]/50 md:block" />
            <figure className="relative overflow-hidden border border-[#E9D7AD]/20 bg-black/30 shadow-[0_34px_90px_rgba(0,0,0,0.42)]">
              <img
                alt="Jesus sitting at a table in conversation"
                className="h-full min-h-[360px] w-full object-cover"
                src="/images/domain-sites/kitchen-table-gospel-table.jpg"
              />
              <figcaption className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/65 px-5 py-4 text-sm leading-6 text-[#DED0B8] backdrop-blur-md">
                Jesus met people in homes, around meals, in ordinary places, and called them into transformed life.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E9D7AD]/12 bg-[#F7F1E7] px-5 py-14 text-[#11100E] md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#8B5E20]" style={{ fontFamily: font.rajdhani }}>
              How Jesus Moved
            </p>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-tight text-[#11100E] md:text-6xl" style={{ fontFamily: font.oswald }}>
              He met people. He ministered. He multiplied disciples.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3" id="rhythm">
            {rhythm.map((item, index) => (
              <article key={item.title} className="border border-[#C7B98F] bg-white p-5 shadow-sm">
                <span className="text-[11px] uppercase tracking-[0.24em] text-[#8B5E20]" style={{ fontFamily: font.rajdhani }}>
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-3xl font-bold uppercase text-[#11100E]" style={{ fontFamily: font.oswald }}>
                  {item.title}
                </h3>
                <div className="ktg-line mt-5 h-px bg-[#8B5E20]" />
                <p className="mt-5 text-sm leading-6 text-[#4F4536]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:px-8 md:py-20" id="places">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
                Where It Works
              </p>
              <h2 className="mt-5 text-4xl font-bold uppercase leading-tight md:text-6xl" style={{ fontFamily: font.oswald }}>
                Ordinary relationships become places of discipleship.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#DED0B8] md:text-lg">
              Kitchen Table Gospel gives missionaries a simple rhythm for homes, groups, churches, workplaces, and the everyday relationships already in front of them.
            </p>
          </div>

          <div className="mt-10 grid gap-px bg-[#E9D7AD]/20 md:grid-cols-5">
            {places.map((place) => (
              <div key={place} className="bg-[#171613] p-5">
                <p className="text-2xl font-bold uppercase text-[#F7F1E7]" style={{ fontFamily: font.oswald }}>
                  {place}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#E9D7AD]/12 px-5 py-14 md:px-8 md:py-20" id="training">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="border border-[#E9D7AD]/20 bg-[#171613] p-6">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#D8A34B]" style={{ fontFamily: font.rajdhani }}>
              USA Missionaries Training
            </p>
            <h2 className="mt-5 text-4xl font-bold uppercase leading-tight md:text-5xl" style={{ fontFamily: font.oswald }}>
              Missionaries are trained to carry this rhythm into the field.
            </h2>
            <p className="mt-6 text-base leading-8 text-[#DED0B8]">
              The goal is not a program to attend. It is a way of following Jesus that can be practiced, shared, and repeated.
            </p>
          </div>
          <div className="grid gap-3">
            {["Prayer and Scripture at the table", "Accountability rooted in relationship", "Care that follows people after the meeting", "Multiplication that trains others to do the same"].map((item) => (
              <div key={item} className="border border-[#E9D7AD]/15 bg-black/25 px-5 py-4 text-sm leading-6 text-[#DED0B8]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E9D7AD]/12 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#AFA186] md:flex-row md:items-center md:justify-between">
          <p>Kitchen Table Gospel · An initiative of USA Missionaries</p>
          <Link className="text-[#D8A34B] transition-colors hover:text-[#F7F1E7]" href={ecosystemHref}>
            Back to the USA Missionaries Ecosystem
          </Link>
        </div>
      </footer>
    </main>
  );
}
