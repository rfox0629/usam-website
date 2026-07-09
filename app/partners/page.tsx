import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { PartnersFaqAccordion } from "./PartnersFaqAccordion";

export const metadata: Metadata = {
  description: "Private partnership and integration resource center for USA Missionaries.",
  robots: {
    follow: false,
    index: false,
  },
  title: "Ministry Network | USA Missionaries",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const inPageNav = [
  { href: "#overview", label: "Overview" },
  { href: "#levels", label: "Partnership Levels" },
  { href: "#mor", label: "MOR Case Study" },
  { href: "#takeon", label: "What We Take On" },
  { href: "#legal", label: "Legal Options" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#documents", label: "Documents" },
  { href: "#faq", label: "FAQ" },
] as const;

function Eyebrow({ center = false, children }: { center?: boolean; children: ReactNode }) {
  return (
    <p
      className={`flex items-center gap-4 text-[11px] uppercase tracking-[0.28em] text-usam-gold ${
        center ? "justify-center" : ""
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
      <span className="h-px w-14 bg-usam-gold/55" aria-hidden="true" />
    </p>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-5 max-w-2xl text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] text-stone-100"
      style={{ fontFamily: font.oswald }}
    >
      {children}
    </h2>
  );
}

function Lede({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-400">{children}</p>;
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="mt-8 max-w-2xl space-y-5 text-[15.5px] leading-8 text-stone-400">{children}</div>;
}

function Section({
  children,
  id,
  variant = "plain",
}: {
  children: ReactNode;
  id: string;
  variant?: "plain" | "panel" | "feature";
}) {
  const backgrounds: Record<typeof variant, string> = {
    feature:
      "relative overflow-hidden border-y border-stone-900/80 bg-[radial-gradient(circle_at_18%_10%,rgba(194,161,78,0.1),transparent_28%),linear-gradient(180deg,rgba(13,13,13,0.4),#0D0D0D_18%)]",
    panel: "border-y border-stone-900/80 bg-white/[0.015]",
    plain: "",
  };

  return (
    <section className={`scroll-mt-24 px-6 py-20 md:py-28 ${backgrounds[variant]}`} id={id}>
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* HERO                                                                    */
/* ---------------------------------------------------------------------- */

function HeroSection() {
  return (
    <header className="relative overflow-hidden bg-[radial-gradient(1200px_700px_at_78%_-20%,rgba(194,161,78,0.14),transparent_62%)] px-6 pb-0 pt-20 md:pt-28" id="overview">
      <div className="relative mx-auto max-w-6xl">
        <Eyebrow>Sec 01 — The Vision</Eyebrow>
        <h1
          className="mt-6 max-w-3xl text-[clamp(2.3rem,6vw,3.75rem)] font-bold leading-[1.05] text-stone-100"
          style={{ fontFamily: font.oswald }}
        >
          Building a National Ecosystem of <span className="text-usam-gold">Disciple-Making</span> Ministries
        </h1>
        <p className="mt-7 max-w-2xl text-xl leading-8 text-stone-400">
          USA Missionaries helps aligned ministries partner, integrate, and scale together while preserving the
          unique calling God has given each organization.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center justify-center border border-usam-gold bg-usam-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-usam-black transition-colors hover:bg-usam-gold/90"
            href="#levels"
            style={{ fontFamily: font.rajdhani }}
          >
            Explore Partnership Levels
          </a>
          <a
            className="inline-flex items-center justify-center border border-stone-700 bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-stone-200 transition-colors hover:border-usam-gold hover:text-usam-gold"
            href="#roadmap"
            style={{ fontFamily: font.rajdhani }}
          >
            View Integration Roadmap
          </a>
          <a
            className="inline-flex items-center justify-center border border-stone-700 bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-stone-200 transition-colors hover:border-usam-gold hover:text-usam-gold"
            href="#documents"
            style={{ fontFamily: font.rajdhani }}
          >
            Review Documents
          </a>
        </div>
      </div>

      <div className="relative mt-16 border-t border-stone-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {[
            ["501(c)(3)", "Registered"],
            ["Board", "Governed"],
            ["National", "Vision"],
            ["DOS", "Powered"],
            ["Ministry", "Infrastructure"],
          ].map(([label, value], index) => (
            <div
              className={`border-t border-stone-900 px-4 py-6 text-center sm:border-t-0 md:border-l md:border-t-0 ${
                index === 0 ? "md:border-l-0" : ""
              }`}
              key={label}
            >
              <p
                className="text-[11px] uppercase tracking-[0.2em] text-usam-gold"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                {label}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------- */
/* WHY THIS EXISTS                                                         */
/* ---------------------------------------------------------------------- */

function WhySection() {
  return (
    <Section id="why">
      <Eyebrow>Sec 02 — Rationale</Eyebrow>
      <SectionHeading>Why This Exists</SectionHeading>
      <Prose>
        <p>
          The Church in America does not suffer from a lack of ministries. It suffers from fragmentation. Across
          every state, faithful men and women are serving people well — praying with the hurting, discipling new
          believers, walking families through crisis, and carrying callings they have stewarded for years. The
          problem is rarely the ministry itself. The problem is everything strapped to its back.
        </p>
        <p>
          Nearly every independent ministry carries the full weight of a standalone organization: separate
          accounting, separate payroll, separate donor systems, separate websites, separate insurance, separate
          compliance obligations, separate administration, and separate software subscriptions. Each of those
          burdens pulls leadership hours away from the actual work of ministry, and each duplicates costs that
          other ministries down the road are paying for the exact same thing.
        </p>
        <p>
          USA Missionaries exists to strengthen ministries by creating shared infrastructure, shared systems, and
          coordinated discipleship pathways. When aligned ministries stop duplicating the back office and start
          sharing one operational backbone, leaders get their time back, donors see their gifts go further, and the
          people being ministered to experience one coordinated journey instead of a series of disconnected
          handoffs.
        </p>
      </Prose>

      <figure className="mt-14">
        <svg
          aria-labelledby="streams-title"
          className="w-full"
          role="img"
          viewBox="0 0 1080 300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title id="streams-title">Many independent ministry streams converging into one coordinated river</title>
          <defs>
            <linearGradient id="riv" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#C2A14E" stopOpacity=".35" />
              <stop offset="1" stopColor="#C2A14E" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M0,30  C 260,30  420,138 640,148" fill="none" stroke="#C2A14E" strokeOpacity=".38" strokeWidth="2" />
          <path d="M0,80  C 240,80  430,142 640,150" fill="none" stroke="#C2A14E" strokeOpacity=".5" strokeWidth="2.5" />
          <path d="M0,130 C 240,130 430,148 640,152" fill="none" stroke="#C2A14E" strokeOpacity=".62" strokeWidth="3" />
          <path d="M0,180 C 240,180 430,158 640,154" fill="none" stroke="#C2A14E" strokeOpacity=".62" strokeWidth="3" />
          <path d="M0,230 C 240,230 430,164 640,156" fill="none" stroke="#C2A14E" strokeOpacity=".5" strokeWidth="2.5" />
          <path d="M0,280 C 260,280 420,170 640,158" fill="none" stroke="#C2A14E" strokeOpacity=".38" strokeWidth="2" />
          <path d="M640,153 C 800,153 940,153 1080,153" fill="none" stroke="url(#riv)" strokeWidth="12" strokeLinecap="round" />
          <g fill="#8F7433" fontFamily="'Rajdhani', sans-serif" fontSize="12" letterSpacing="2">
            <text x="0" y="14">MANY MINISTRIES</text>
            <text textAnchor="end" x="1080" y="134">ONE ECOSYSTEM</text>
          </g>
        </svg>
        <figcaption
          className="mt-3 flex flex-wrap justify-between gap-3 border-t border-stone-800 pt-3 text-[11px] uppercase tracking-[0.18em] text-stone-500"
          style={{ fontFamily: font.rajdhani }}
        >
          <span>Fig. 01 — Shared infrastructure</span>
          <span>Separate streams · One river</span>
        </figcaption>
      </figure>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* ROLE OF USA MISSIONARIES                                                */
/* ---------------------------------------------------------------------- */

const units = [
  {
    body: "Deployment and first contact. Kitchen-table ministry, direct questions, encounter, and next steps — then a coordinated referral into the right pathway.",
    tag: "Unit — Front Line",
    title: "USA Missionaries",
  },
  {
    body: "Reconciliation, freedom, prayer, and long-term spiritual support for people who need more than a first conversation can provide.",
    tag: "Unit — Deeper Care",
    title: "Ministry of Reconciliation",
  },
  {
    body: "Community, teaching, groups, and ongoing formation. Distinct roles, one mission — every unit stronger because the others exist.",
    tag: "Unit — Long-Term Formation",
    title: "Churches & Partner Ministries",
  },
] as const;

function RoleSection() {
  return (
    <Section id="role" variant="panel">
      <Eyebrow>Sec 03 — Our Role</Eyebrow>
      <SectionHeading>The Role of USA Missionaries</SectionHeading>
      <Prose>
        <p>
          USA Missionaries serves as a front-line disciple-making and deployment ministry. Our primary ministry
          environment is not a stage or a building — it is the kitchen table. USA Missionaries missionaries sit
          down with people face to face, ask direct questions, minister fully in the moment, help people encounter
          Jesus, identify next steps, and connect them into long-term discipleship pathways.
        </p>
        <p>
          USA Missionaries does not have to be the expert in every area, and we don&rsquo;t pretend to be. Some
          people need one-on-one discipleship. Some need a group. Some need to be connected to a local church. Some
          need deeper, specialized ministry through organizations like Ministry of Reconciliation. A front-line team
          that tries to do everything ends up doing most of it poorly.
        </p>
        <p>
          We think of this the way specialized teams work together in the field. USA Missionaries is one specialized
          unit — deployment and first contact. Ministry of Reconciliation is another specialized unit — deeper care
          and reconciliation. Churches and other ministries hold their own distinct roles. The goal is not
          competition between ministries. The goal is coordinated ministry, where every person is handed forward
          with care and nothing falls through the cracks.
        </p>
      </Prose>

      <div className="mt-10 grid gap-px overflow-hidden border border-stone-800 bg-stone-800 sm:grid-cols-3">
        {units.map((unit) => (
          <div className="bg-usam-black px-7 py-8" key={unit.title}>
            <p
              className="text-[10.5px] uppercase tracking-[0.2em] text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {unit.tag}
            </p>
            <h3 className="mt-3 text-xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
              {unit.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">{unit.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* PARTNERSHIP LEVELS                                                      */
/* ---------------------------------------------------------------------- */

const levels = [
  {
    best: "Churches, ministries, and organizations that want collaboration without formal integration.",
    body: "Strategic Partners remain independent organizations while intentionally collaborating with USA Missionaries through referrals, training, events, resources, and shared mission alignment. Governance, finances, operations, and legal responsibilities remain fully separate.",
    featured: false,
    label: "Level One",
    title: "Strategic Partner",
  },
  {
    best: "Ministries that want to reduce administrative burden and operate inside a shared ministry ecosystem while retaining their unique calling.",
    body: "An Integrated Ministry keeps its ministry focus and public identity while sharing significant operational infrastructure with USA Missionaries. This may include accounting, donor management, technology, DOS, communications, administration, volunteer systems, and reporting.",
    featured: true,
    label: "Level Two",
    title: "Integrated Ministry",
  },
  {
    best: "Ministries that desire full alignment, long-term scalability, reduced overhead, and unified national expansion.",
    body: "A Mission Division becomes fully integrated under USA Missionaries through an appropriate legal and governance process. The ministry may continue publicly under its existing name as “A Ministry of USA Missionaries,” but operates under one organization, one financial system, one board structure, and one operational backbone.",
    featured: false,
    label: "Level Three",
    title: "Mission Division",
  },
] as const;

function LevelsSection() {
  return (
    <Section id="levels">
      <Eyebrow>Sec 04 — Framework</Eyebrow>
      <SectionHeading>Three Levels of Partnership</SectionHeading>
      <Lede>
        Partnership is not all-or-nothing. Ministries can collaborate, share infrastructure, or fully integrate —
        and every level is a legitimate long-term home, not a sales funnel.
      </Lede>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {levels.map((level) => (
          <article
            className={`flex flex-col border px-7 py-9 transition-colors ${
              level.featured
                ? "border-usam-gold/60 bg-[linear-gradient(180deg,rgba(194,161,78,0.07),transparent_45%)]"
                : "border-stone-800 hover:border-stone-700"
            }`}
            key={level.title}
          >
            <p
              className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {level.label}
              <span className="h-px flex-1 bg-stone-800" aria-hidden="true" />
            </p>
            <h3 className="mt-4 text-2xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
              {level.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-400">{level.body}</p>
            <div className="mt-auto pt-6">
              <div className="border-t border-stone-800 pt-4">
                <p
                  className="text-[10.5px] uppercase tracking-[0.2em] text-usam-gold"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Best For
                </p>
                <p className="mt-1.5 text-sm text-stone-400">{level.best}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* MOR CASE STUDY                                                          */
/* ---------------------------------------------------------------------- */

const morFlow = [
  {
    body: "A USA Missionaries missionary meets someone face to face. God moves in the conversation.",
    title: "The kitchen table",
  },
  {
    body: "The missionary discerns that this person needs deeper ministry, healing, or reconciliation support.",
    title: "Need identified",
  },
  {
    body: "Through DOS, the person is referred to Ministry of Reconciliation with context and care — not a cold handoff.",
    title: "Referral through DOS",
  },
  {
    body: "MOR leaders carry the deeper work while the overall discipleship journey remains coordinated.",
    title: "Deeper work continues",
  },
  {
    body: "Follow-up, prayer, and next steps stay visible to the right people at every stage.",
    title: "One coordinated journey",
  },
] as const;

function MorSection() {
  return (
    <Section id="mor" variant="feature">
      <Eyebrow>Sec 05 — Featured Case Study</Eyebrow>
      <SectionHeading>Ministry of Reconciliation</SectionHeading>
      <Lede>
        The first integration conversation being explored — and the working model for how a partnership can
        strengthen a ministry without replacing its calling.
      </Lede>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="space-y-5 text-[15.5px] leading-8 text-stone-400">
            <p>
              Ministry of Reconciliation currently serves people through deeper ministry: reconciliation, freedom,
              prayer, counseling-style care, and long-term spiritual support. Darren Pickett and Andy Leenstra are
              key leaders in the work. Andy also leads another organization that may be considered as part of the
              larger integration conversation.
            </p>
            <p>
              USA Missionaries&rsquo; goal would not be to replace MOR&rsquo;s calling. It would be to strengthen
              MOR by systematizing administration, operations, technology, documentation, referrals, donor systems,
              and reporting — the load-bearing work that currently competes with ministry time.
            </p>
            <p className="text-stone-200">
              <b className="font-semibold text-stone-100">
                USA Missionaries may be the front-line deployment team. Ministry of Reconciliation may be the deeper
                care and reconciliation team.
              </b>{" "}
              Together, the ministries create a stronger discipleship pathway than either could provide alone.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden border border-stone-800 bg-stone-800 sm:grid-cols-2">
            <div className="bg-usam-black px-6 py-6">
              <p
                className="text-[10.5px] uppercase tracking-[0.2em] text-usam-gold"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                Front Line
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                <b className="font-semibold text-stone-100">USA Missionaries</b> — deployment, first contact,
                kitchen-table ministry, and coordinated next steps through DOS.
              </p>
            </div>
            <div className="bg-usam-black px-6 py-6">
              <p
                className="text-[10.5px] uppercase tracking-[0.2em] text-usam-gold"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                Deeper Care
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                <b className="font-semibold text-stone-100">Ministry of Reconciliation</b> — reconciliation,
                freedom, prayer, and long-term spiritual support for those who need it.
              </p>
            </div>
          </div>
        </div>

        <aside aria-label="Potential ministry flow" className="border border-stone-800 bg-white/[0.02] px-7 py-8">
          <p
            className="text-[11px] uppercase tracking-[0.22em] text-usam-gold"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Potential Ministry Flow
          </p>
          <ol className="mt-6 space-y-0">
            {morFlow.map((step, index) => (
              <li className="relative pb-6 pl-8 last:pb-0" key={step.title}>
                {index !== morFlow.length - 1 ? (
                  <span aria-hidden="true" className="absolute bottom-0 left-[7px] top-2 w-px bg-stone-800" />
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-[1.5px] border-usam-gold bg-usam-black"
                />
                <p className="text-[15px] font-semibold text-stone-100">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-500">{step.body}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* WHAT WE TAKE ON                                                         */
/* ---------------------------------------------------------------------- */

const takeOnCategories = [
  {
    items: [
      "Board administration support",
      "Meeting agendas and minutes",
      "Policy library",
      "Compliance calendar",
      "Organizational documentation",
      "Annual planning",
      "Decision tracking",
    ],
    tag: "01 — Backbone",
    title: "Governance & Administration",
  },
  {
    items: [
      "Accounting coordination",
      "Bookkeeping",
      "Budgeting",
      "Financial reporting",
      "Donor receipting",
      "Expense tracking",
      "CPA coordination",
      "990 preparation support",
      "Internal controls",
    ],
    tag: "02 — Backbone",
    title: "Finance",
  },
  {
    items: [
      "Administrative systems",
      "Vendor management",
      "Document management",
      "Lease and facility tracking",
      "Insurance coordination",
      "Standard operating procedures",
      "Intake forms and workflows",
      "Volunteer onboarding",
    ],
    tag: "03 — Backbone",
    title: "Operations",
  },
  {
    items: [
      "DOS implementation",
      "CRM / database migration",
      "Website support",
      "Email systems",
      "File storage",
      "Cybersecurity basics",
      "Forms and automation",
      "Reporting dashboards",
    ],
    tag: "04 — Systems",
    title: "Technology",
  },
  {
    items: [
      "Branding support",
      "Ministry pages",
      "Newsletters",
      "Donor updates",
      "Social media support",
      "Story capture",
      "Video and photo coordination",
      "Public messaging",
    ],
    tag: "05 — Systems",
    title: "Communications",
  },
  {
    items: [
      "Referral pathways",
      "Follow-up workflows",
      "Discipleship tracking",
      "Prayer request tracking",
      "Event registration",
      "Testimony capture",
      "Ministry outcome reporting",
      "Training library",
    ],
    tag: "06 — Systems",
    title: "Ministry Systems",
  },
] as const;

function TakeOnSection() {
  return (
    <Section id="takeon" variant="panel">
      <Eyebrow>Sec 06 — The Commitment</Eyebrow>
      <SectionHeading>What USA Missionaries Takes On</SectionHeading>
      <Lede>
        In an integrated or fully integrated partnership, USA Missionaries assumes a serious operational load. This
        is the honest scope of that commitment.
      </Lede>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {takeOnCategories.map((cat) => (
          <article className="border border-stone-800 bg-usam-black px-6 py-7" key={cat.title}>
            <p
              className="text-[10.5px] uppercase tracking-[0.2em] text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {cat.tag}
            </p>
            <h3 className="mt-2 text-lg font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
              {cat.title}
            </h3>
            <ul className="mt-4 border-t border-stone-800">
              {cat.items.map((item) => (
                <li className="relative border-b border-stone-800 py-2 pl-4 text-sm text-stone-400" key={item}>
                  <span aria-hidden="true" className="absolute left-0 top-[13px] h-1.5 w-1.5 rotate-45 border border-usam-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-10 border border-stone-800 border-l-[3px] border-l-usam-gold bg-usam-black px-7 py-6">
        <p className="text-lg font-semibold text-stone-100" style={{ fontFamily: font.oswald }}>
          This is not a small commitment.
        </p>
        <p className="mt-2 text-[15px] leading-7 text-stone-400">
          USA Missionaries becomes the operational backbone of the partnership — six full categories of ongoing
          responsibility — so that ministry leaders can focus more fully on the ministry itself.
        </p>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* WHAT WE DO NOT TAKE AWAY                                                */
/* ---------------------------------------------------------------------- */

const notAways = [
  {
    body: "The calling God gave your ministry remains the reason the partnership exists at all.",
    label: "Not taken",
    thing: "The ministry's calling.",
  },
  {
    body: "Your story, your testimonies, and the years behind them are honored, documented, and told.",
    label: "Not erased",
    thing: "The ministry's history.",
  },
  {
    body: "The people your community knows and trusts keep leading the ministry they were called to.",
    label: "Not replaced",
    thing: "Trusted ministry leaders.",
  },
  {
    body: "USA Missionaries does not force every ministry to look, sound, or operate the same.",
    label: "Not forced",
    thing: "Uniformity.",
  },
  {
    body: "We do not compete for platform, credit, or control of the relationships you have built.",
    label: "Not contested",
    thing: "Influence.",
  },
  {
    body: "DOS exists to serve real discipleship. We do not treat people like data.",
    label: "Not reduced",
    thing: "People.",
  },
  {
    body: "We do not move faster than trust, prayer, and wise counsel allow.",
    label: "Not rushed",
    thing: "The pace.",
  },
] as const;

function NotAwaySection() {
  return (
    <Section id="not-away">
      <Eyebrow>Sec 07 — The Guardrails</Eyebrow>
      <SectionHeading>What USA Missionaries Does Not Take Away</SectionHeading>
      <Lede>
        Integration raises honest fears, and they deserve honest answers. These commitments hold at every level of
        partnership.
      </Lede>

      <ul className="mt-10 border-t border-stone-800">
        {notAways.map((item) => (
          <li
            className="flex flex-col gap-1 border-b border-stone-800 py-5 text-lg text-stone-300 sm:flex-row sm:items-baseline sm:gap-6"
            key={item.thing}
          >
            <span
              className="w-[110px] flex-shrink-0 text-[11px] uppercase tracking-[0.16em] text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {item.label}
            </span>
            <span>
              <b className="font-semibold text-stone-100">{item.thing}</b> {item.body}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-xl text-2xl font-normal leading-snug text-stone-200" style={{ fontFamily: font.oswald }}>
        The goal is <span className="text-usam-gold">unity without uniformity</span> — one backbone, many callings.
      </p>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* LEGAL & STRUCTURAL OPTIONS                                              */
/* ---------------------------------------------------------------------- */

const legalRows = [
  {
    optionOne: "Separate nonprofit, fully independent",
    optionThree: "MOR potentially merges into USA Missionaries or transfers assets / programs as advised by counsel",
    optionTwo: "Separate legal entities remain",
    row: "Legal Entity",
  },
  {
    optionOne: "Separate board",
    optionThree: "One board structure; ministry advisory roles possible",
    optionTwo: "Separate board remains",
    row: "Board",
  },
  {
    optionOne: "Separate 990",
    optionThree: "Potentially one 990",
    optionTwo: "Separate 990 remains",
    row: "IRS Filing",
  },
  {
    optionOne: "Separate finances, insurance, and systems",
    optionThree: "One financial system, one operational backbone",
    optionTwo: "Formal agreement for USA Missionaries to provide administrative and operational support",
    row: "Finances",
  },
  {
    optionOne: "Fully independent brand",
    optionThree: "May continue as a DBA, ministry name, or division — “A Ministry of USA Missionaries”",
    optionTwo: "Independent brand; shared DOS and technology possible",
    row: "Identity",
  },
  {
    optionOne: "Separate staff and admin",
    optionThree: "Unified staffing under one organization",
    optionTwo: "Some shared staff or contractors possible",
    row: "Staffing",
  },
  {
    optionOne: "Lowest legal complexity",
    optionThree: "Highest planning requirement",
    optionTwo: "Medium complexity — a good pilot option",
    row: "Complexity",
  },
  {
    optionOne: "Highest long-term duplication",
    optionThree: "Reduced duplication; best long-term scalability if values, doctrine, leadership, and legal issues align",
    optionTwo: "Reduced duplication where services are shared",
    row: "Long Term",
  },
] as const;

function LegalSection() {
  return (
    <Section id="legal" variant="panel">
      <Eyebrow>Sec 08 — Structure</Eyebrow>
      <SectionHeading>Legal & Structural Options</SectionHeading>
      <Lede>
        Three honest structural paths, compared side by side. Each is workable; they differ in complexity,
        duplication, and long-term scalability.
      </Lede>

      <div className="mt-12 overflow-x-auto border border-stone-800">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-[170px] border-b-2 border-usam-gold bg-usam-black px-5 py-4" />
              <th className="border-b-2 border-l border-stone-800 border-b-usam-gold bg-usam-black px-5 py-4 align-top">
                <span
                  className="block text-[10px] uppercase tracking-[0.2em] text-usam-gold"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Option One
                </span>
                <span className="text-lg font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
                  Remain Separate Organizations
                </span>
              </th>
              <th className="border-b-2 border-l border-stone-800 border-b-usam-gold bg-usam-black px-5 py-4 align-top">
                <span
                  className="block text-[10px] uppercase tracking-[0.2em] text-usam-gold"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Option Two
                </span>
                <span className="text-lg font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
                  Shared Services Agreement
                </span>
              </th>
              <th className="border-b-2 border-l border-stone-800 border-b-usam-gold bg-usam-black px-5 py-4 align-top">
                <span
                  className="block text-[10px] uppercase tracking-[0.2em] text-usam-gold"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Option Three
                </span>
                <span className="text-lg font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
                  Full Organizational Integration
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {legalRows.map((row) => (
              <tr key={row.row}>
                <td
                  className="w-[170px] border-b border-stone-800 bg-white/[0.02] px-5 py-4 align-top text-[10.5px] uppercase tracking-[0.14em] text-stone-500"
                  style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
                >
                  {row.row}
                </td>
                <td className="border-b border-l border-stone-800 px-5 py-4 align-top text-[14.5px] leading-6 text-stone-400">
                  {row.optionOne}
                </td>
                <td className="border-b border-l border-stone-800 px-5 py-4 align-top text-[14.5px] leading-6 text-stone-400">
                  {row.optionTwo}
                </td>
                <td className="border-b border-l border-stone-800 px-5 py-4 align-top text-[14.5px] leading-6 text-stone-400">
                  {row.optionThree}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-7 max-w-none border border-stone-800 border-l-[3px] border-l-usam-gold bg-white/[0.02] px-6 py-5 text-sm leading-7 text-stone-400">
        <b className="font-semibold text-stone-200">Important disclaimer:</b> USA Missionaries is not providing
        legal or tax advice. Any merger, asset transfer, dissolution, DBA structure, shared services agreement, or
        governance change must be reviewed by qualified nonprofit legal counsel and a CPA before any decision is
        made.
      </p>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* INTEGRATION ROADMAP                                                     */
/* ---------------------------------------------------------------------- */

const phases = [
  {
    body: "Prayer, trust, and leadership conversations. Doctrine, mission alignment, values, culture, and initial board discussion. Nothing structural happens here — this phase exists to answer one question: is God in this?",
    num: "Phase 1",
    time: "30–60 days",
    title: "Relationship & Discernment",
  },
  {
    body: "A careful review of finances, legal documents, bylaws, leases, insurance, liabilities, donor restrictions, software, paper documentation, workflows, volunteers, staffing, and ministry processes. Both organizations see the full picture before anything is decided.",
    num: "Phase 2",
    time: "60–90 days",
    title: "Discovery & Assessment",
  },
  {
    body: "Begin with low-risk operational support: DOS setup, document digitization, intake forms, referral workflows, communications, website support, donor system review, and reporting. The pilot proves the partnership in practice before any structural commitment.",
    num: "Phase 3",
    time: "90–180 days",
    title: "Shared Services Pilot",
  },
  {
    body: "Transition selected responsibilities — bookkeeping, administration, donor management, communications, systems, training, volunteer onboarding, and reporting — into USA Missionaries infrastructure, at a pace both leadership teams affirm.",
    num: "Phase 4",
    time: "6–12 months",
    title: "Operational Integration",
  },
  {
    body: "With legal and CPA counsel, decide the structural future: remain in shared services, create a deeper controlled relationship, merge, dissolve MOR, transfer assets, or operate MOR as a DBA / ministry division of USA Missionaries. Counsel leads; the model follows.",
    num: "Phase 5",
    time: "9–18 months",
    title: "Legal Integration Decision",
  },
  {
    body: "Use the MOR integration as a proven model for future ministry partnerships across Minnesota — and eventually all 50 states. Every lesson learned becomes documentation the next partnership inherits.",
    num: "Phase 6",
    time: "Year 2 and beyond",
    title: "National Replication",
  },
] as const;

function RoadmapSection() {
  return (
    <Section id="roadmap" variant="feature">
      <Eyebrow>Sec 09 — The Path</Eyebrow>
      <SectionHeading>Integration Roadmap</SectionHeading>
      <Lede>
        A deliberate, phased path from first conversation to a repeatable national model. Each phase has a clear
        focus and an honest timeline — and the process can pause at any phase.
      </Lede>

      <div className="relative mt-14 max-w-3xl">
        <div aria-hidden="true" className="absolute bottom-2 left-[9px] top-2 w-px bg-stone-800" />
        {phases.map((phase) => (
          <div className="relative pb-11 last:pb-0" key={phase.num} style={{ paddingLeft: "3.25rem" }}>
            <span
              aria-hidden="true"
              className="absolute left-0 top-1.5 h-[13px] w-[13px] rotate-45 border-[1.5px] border-usam-gold bg-usam-black"
            />
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <span
                className="text-[11px] uppercase tracking-[0.22em] text-usam-gold"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                {phase.num}
              </span>
              <h3 className="text-xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
                {phase.title}
              </h3>
              <span
                className="rounded-full border border-stone-700 px-2.5 py-0.5 text-[11px] text-stone-400"
                style={{ fontFamily: font.rajdhani }}
              >
                {phase.time}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-stone-400">{phase.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* DUE DILIGENCE LIBRARY                                                   */
/* ---------------------------------------------------------------------- */

const docGroups = [
  {
    docs: [
      "Articles of Incorporation",
      "USA Missionaries Bylaws",
      "Board Roster",
      "Conflict of Interest Policy",
      "Board Covenant",
      "Organizational Chart",
    ],
    title: "Governance",
    type: "Governance",
  },
  {
    docs: ["IRS Determination Letter", "EIN Verification", "501(c)(3) Documentation", "Annual 990 Filing", "State Registration Documents"],
    title: "IRS & Nonprofit",
    type: "IRS",
  },
  {
    docs: ["Annual Budget", "Financial Summary", "Donor Receipting Process", "Internal Controls Overview", "CPA Contact Summary"],
    title: "Finance",
    type: "Finance",
  },
  {
    docs: ["DOS Overview", "Technology Stack", "Data & Privacy Overview", "Insurance Overview", "Volunteer Process", "Ministry Referral Workflow"],
    title: "Operations",
    type: "Operations",
  },
  {
    docs: ["Mission & Vision", "Statement of Faith", "Core Values", "Brand Guide", "USA Missionaries Overview", "Five-Function Protocol"],
    title: "Brand & Ministry",
    type: "Ministry",
  },
] as const;

function DocumentsSection() {
  return (
    <Section id="documents">
      <Eyebrow>Sec 10 — Due Diligence</Eyebrow>
      <SectionHeading>Due Diligence Library</SectionHeading>
      <Lede>
        Everything a board, attorney, or CPA needs to evaluate USA Missionaries — organized, current, and available
        on request. Placeholder links below will connect to the secure document vault in production.
      </Lede>

      <div className="mt-12 space-y-10">
        {docGroups.map((group) => (
          <div key={group.title}>
            <p
              className="flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {group.title}
              <span aria-hidden="true" className="h-px flex-1 bg-stone-800" />
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.docs.map((doc) => (
                <a
                  className="flex items-center justify-between gap-4 border border-stone-800 bg-white/[0.02] px-5 py-4 transition-colors hover:border-usam-gold/60 hover:bg-white/[0.04]"
                  href="#documents"
                  key={doc}
                >
                  <span>
                    <span className="block text-sm font-semibold text-stone-200">{doc}</span>
                    <span
                      className="mt-1 block text-[9.5px] uppercase tracking-[0.16em] text-stone-500"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      PDF · {group.type}
                    </span>
                  </span>
                  <span
                    className="flex-shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-usam-gold"
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  >
                    View Document
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* COST & STEWARDSHIP                                                      */
/* ---------------------------------------------------------------------- */

function StewardshipSection() {
  return (
    <Section id="stewardship" variant="panel">
      <Eyebrow>Sec 11 — Stewardship</Eyebrow>
      <SectionHeading>Cost & Stewardship</SectionHeading>
      <Prose>
        <p>
          Shared infrastructure saves money, but the deeper issue is stewardship. Every independent ministry that
          maintains its own duplicate back office is spending God&rsquo;s resources — hours, dollars, and leadership
          attention — on work that could be done once and shared. The comparison below is not about cutting
          corners. It is about redirecting what is already being spent toward the mission itself.
        </p>
      </Prose>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="border border-stone-800 bg-usam-black px-7 py-8">
          <p
            className="text-[10.5px] uppercase tracking-[0.2em] text-stone-500"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Model A — Duplicated
          </p>
          <h3 className="mt-2 text-xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
            Separate Ministry Model
          </h3>
          <ul className="mt-4 border-t border-stone-800">
            {[
              "Separate CPA",
              "Separate bookkeeping",
              "Separate software",
              "Separate donor system",
              "Separate website",
              "Separate insurance",
              "Separate admin",
              "Separate reporting",
              "Separate 990",
            ].map((item) => (
              <li className="relative border-b border-stone-800 py-2 pl-5 text-sm text-stone-500" key={item}>
                <span aria-hidden="true" className="absolute left-0 top-[7px] text-stone-600">
                  ×
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-usam-gold/60 bg-[linear-gradient(180deg,rgba(194,161,78,0.07),transparent_45%)] px-7 py-8">
          <p
            className="text-[10.5px] uppercase tracking-[0.2em] text-usam-gold"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Model B — Shared
          </p>
          <h3 className="mt-2 text-xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
            Integrated Ministry Model
          </h3>
          <ul className="mt-4 border-t border-stone-800">
            {[
              "Shared administration",
              "Shared technology",
              "Shared DOS",
              "Shared donor management",
              "Shared communications",
              "Shared reporting",
              "Shared operations",
              "More leadership time for ministry",
            ].map((item) => (
              <li className="relative border-b border-stone-800 py-2 pl-5 text-sm text-stone-300" key={item}>
                <span aria-hidden="true" className="absolute left-0 top-[13px] h-1.5 w-1.5 rotate-45 border border-usam-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-10 max-w-xl text-2xl font-normal leading-snug text-stone-200" style={{ fontFamily: font.oswald }}>
        Every hour spent on duplicated administration is an hour not spent{" "}
        <span className="text-usam-gold">making disciples</span>. Every dollar spent maintaining redundant systems
        is a dollar not directly supporting ministry.
      </p>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* FAQ                                                                     */
/* ---------------------------------------------------------------------- */

function FaqSection() {
  return (
    <Section id="faq">
      <Eyebrow>Sec 12 — Questions</Eyebrow>
      <SectionHeading>Frequently Asked Questions</SectionHeading>
      <Lede>The questions ministry leaders, boards, and advisors ask most — answered plainly.</Lede>
      <PartnersFaqAccordion />
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* CTA                                                                     */
/* ---------------------------------------------------------------------- */

function CtaSection() {
  return (
    <Section id="contact" variant="feature">
      <div className="text-center">
        <Eyebrow center>Sec 13 — Next Step</Eyebrow>
        <h2
          className="mx-auto mt-5 max-w-2xl text-[clamp(2rem,4.4vw,2.9rem)] font-bold leading-tight text-stone-100"
          style={{ fontFamily: font.oswald }}
        >
          Start the Conversation
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-stone-400">
          Partnership begins with prayer, trust, and honest conversation. USA Missionaries is not looking to rush
          ministries into a structure. We are looking for aligned leaders who want to build a stronger
          disciple-making ecosystem together.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a
            className="inline-flex items-center justify-center border border-usam-gold bg-usam-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-usam-black transition-colors hover:bg-usam-gold/90"
            href="mailto:ryan@usamissionaries.org?subject=Partnership%20Conversation"
            style={{ fontFamily: font.rajdhani }}
          >
            Schedule a Partnership Conversation
          </a>
          <a
            className="inline-flex items-center justify-center border border-stone-700 bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-stone-200 transition-colors hover:border-usam-gold hover:text-usam-gold"
            href="#documents"
            style={{ fontFamily: font.rajdhani }}
          >
            Download Framework
          </a>
        </div>

        <p className="mx-auto mt-14 max-w-lg border-t border-stone-900 pt-6 text-[11px] uppercase tracking-[0.14em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
          Private briefing · Not legal or tax advice · Consult qualified nonprofit counsel &amp; CPA
        </p>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* PAGE                                                                    */
/* ---------------------------------------------------------------------- */

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-usam-black text-stone-100">
      <div
        className="border-b border-stone-900 bg-usam-black px-6 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-usam-gold/85"
        style={{ fontFamily: font.rajdhani }}
      >
        USAM–MN &nbsp;//&nbsp; Ministry Network &nbsp;//&nbsp; <b className="text-usam-gold">Private Briefing</b>{" "}
        &nbsp;//&nbsp; For ministry leaders, boards &amp; advisors
      </div>

      <PrimaryNav />

      <nav aria-label="Section navigation" className="sticky top-0 z-40 overflow-x-auto border-b border-stone-900 bg-[rgba(13,13,13,0.95)] backdrop-blur">
        <ul className="mx-auto flex max-w-6xl gap-1 px-6">
          {inPageNav.map((item) => (
            <li className="flex-shrink-0" key={item.href}>
              <a
                className="block px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-usam-gold"
                href={item.href}
                style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <HeroSection />
      <WhySection />
      <RoleSection />
      <LevelsSection />
      <MorSection />
      <TakeOnSection />
      <NotAwaySection />
      <LegalSection />
      <RoadmapSection />
      <DocumentsSection />
      <StewardshipSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
