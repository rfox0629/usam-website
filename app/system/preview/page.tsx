import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PrimaryNav } from "../../../components/PrimaryNav";
import { AccessLogoutButton } from "../../../components/forms/AccessLogoutButton";
import { USAM_ACCESS_COOKIE_NAME, verifyAccessToken } from "@/src/lib/access";

export const metadata: Metadata = {
  title: "DOS Preview | USA Missionaries",
  description: "A protected preview of the Disciple Operating System for invited USA Missionaries partners.",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const trackingCards = [
  {
    title: "People",
    body: "Track the people God has placed in your field.",
  },
  {
    title: "Tables",
    body: "Schedule, log, and follow up after Kitchen Table meetings.",
  },
  {
    title: "Fruit",
    body: "Record decisions, testimonies, breakthrough, healing, baptism, church connection, and discipleship progress.",
  },
  {
    title: "Prayer",
    body: "Notify prayer partners when tables are happening and when specific coverage is needed.",
  },
] as const;

const fieldRows = [
  "Add a person quickly",
  "Log a meeting",
  "Track next steps",
  "Send prayer alerts",
  "See who needs follow up",
  "Help leaders see where support is needed",
] as const;

const leaderStats = [
  { label: "People in the Field", value: "1,248" },
  { label: "Tables Logged", value: "312" },
  { label: "Follow Ups Needed", value: "86" },
  { label: "Fruit Recorded", value: "174" },
  { label: "Leaders Multiplying", value: "42" },
  { label: "States Active", value: "18" },
] as const;

const flowSteps = ["Encounter", "Discipleship", "Growth", "Multiplication"] as const;

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-amber-400/85"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(245,185,66,0.45)]" />
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-4xl">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        className="mt-5 text-[clamp(2.35rem,8vw,4.75rem)] font-bold uppercase leading-[0.94] tracking-tight text-stone-100"
        style={{ fontFamily: font.oswald }}
      >
        {title}
      </h2>
      {children ? <div className="mt-6 max-w-3xl text-base leading-8 text-stone-300 md:text-lg">{children}</div> : null}
    </div>
  );
}

function CtaLink({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={`inline-flex min-h-12 items-center justify-center px-6 text-center text-xs uppercase tracking-[0.24em] transition-colors ${
        variant === "primary"
          ? "border border-amber-400 bg-amber-400 text-stone-950 hover:border-amber-300 hover:bg-amber-300"
          : "border border-stone-700 bg-transparent text-stone-100 hover:border-stone-300 hover:bg-white/[0.04]"
      }`}
      href={href}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

function PhoneFrame({
  children,
  tilt = "left",
}: {
  children: ReactNode;
  tilt?: "left" | "right";
}) {
  return (
    <div className="mx-auto flex justify-center [perspective:1400px]">
      <div
        className={`relative h-[610px] w-[300px] rounded-[2.7rem] bg-[#191919] p-2 shadow-[0_40px_90px_rgba(0,0,0,0.7),0_0_90px_rgba(217,122,26,0.1)] ring-1 ring-white/10 sm:h-[675px] sm:w-[332px] ${
          tilt === "left" ? "-rotate-2 lg:[transform:rotateY(-8deg)_rotateX(4deg)_rotateZ(-2deg)]" : "rotate-2 lg:[transform:rotateY(8deg)_rotateX(3deg)_rotateZ(2deg)]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[2.7rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),transparent_42%,rgba(255,255,255,0.05))]" />
        <div className="absolute left-1/2 top-5 z-10 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative h-full overflow-hidden rounded-[2.25rem] bg-[#f4f4f2] text-stone-950">
          {children}
        </div>
      </div>
    </div>
  );
}

function MiniIcon({ label }: { label: string }) {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-[10px] font-bold text-stone-700">
      {label}
    </span>
  );
}

function HomePhoneScreen() {
  return (
    <div className="relative flex h-full flex-col gap-3 px-4 pb-20 pt-14">
      <div className="px-2 pb-2">
        <p className="text-sm font-black uppercase tracking-[0.18em]">DOS</p>
        <h3 className="mt-2 text-3xl font-black leading-none tracking-tight text-stone-950" style={{ fontFamily: font.oswald }}>
          Discipleship
          <br />
          on the go.
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["+", "Add Contact"],
          ["T", "Log Table"],
          ["S", "Search"],
        ].map(([icon, label]) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm">
            <MiniIcon label={icon} />
            <p className="mt-2 text-[11px] font-bold leading-tight text-stone-900">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Your Field</p>
        <p className="mt-1 text-5xl font-black leading-none text-stone-950" style={{ fontFamily: font.oswald }}>47</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-stone-500">
          {[
            ["5", "Mentor"],
            ["12", "Walking"],
            ["18", "Disciple"],
            ["12", "New"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-lg font-black leading-none text-stone-950" style={{ fontFamily: font.oswald }}>{value}</p>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Your Fruit</p>
        <p className="mt-1 text-5xl font-black leading-none text-stone-950" style={{ fontFamily: font.oswald }}>9</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-stone-500">
          {[
            ["3", "Faith"],
            ["2", "Baptism"],
            ["2", "Healing"],
            ["2", "Church"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-lg font-black leading-none text-stone-950" style={{ fontFamily: font.oswald }}>{value}</p>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Your Discipline</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold">
            <span>2 tables ready to schedule</span>
            <span className="text-stone-400">Go</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
            <span>3 tables need follow-up</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      <PhoneNav active="Home" />
    </div>
  );
}

function PeoplePhoneScreen() {
  const people = [
    ["JM", "Jordan M.", "Follow up after table", "Active"],
    ["ER", "Elena R.", "Schedule baptism", "Active"],
    ["MT", "Marcus T.", "Schedule next table", "Done"],
    ["AS", "Avery S.", "Invite to first table", "New"],
    ["NK", "Naomi K.", "Start first table", "Active"],
    ["DP", "Daniel P.", "Host first table", "Done"],
  ] as const;

  return (
    <div className="relative h-full px-4 pb-20 pt-14">
      <div className="flex items-baseline justify-between px-2">
        <h3 className="text-2xl font-black tracking-tight text-stone-950" style={{ fontFamily: font.oswald }}>Your Field</h3>
        <p className="text-xs font-semibold text-stone-500">47 total</p>
      </div>

      <div className="mt-4 flex gap-2 overflow-hidden px-2">
        {["All", "Active", "New", "Done"].map((filter, index) => (
          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${
              index === 0 ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-800"
            }`}
            key={filter}
          >
            {filter}
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {people.map(([initials, name, step, status]) => (
          <div className="flex items-center gap-3 border-b border-stone-100 p-3 last:border-b-0" key={name}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-black text-stone-600">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-stone-950">{name}</p>
              <p className="truncate text-[10px] text-stone-500">{step}</p>
            </div>
            <span
              className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${
                status === "Active"
                  ? "bg-amber-100 text-amber-900"
                  : status === "New"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {status}
            </span>
          </div>
        ))}
      </div>

      <PhoneNav active="People" />
    </div>
  );
}

function PhoneNav({ active }: { active: "Home" | "People" }) {
  return (
    <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 border-t border-stone-200 bg-[#f4f4f2]/95 px-4 pb-6 pt-3 text-center text-[10px] font-semibold backdrop-blur">
      {["Home", "People", "Tables", "More"].map((item) => (
        <div className={item === active ? "text-stone-950" : "text-stone-500"} key={item}>
          <div className="mx-auto mb-1 h-1.5 w-1.5 rounded-full bg-current" />
          {item}
        </div>
      ))}
    </div>
  );
}

export default async function SystemPreviewPage() {
  const cookieStore = await cookies();
  const hasAccess = verifyAccessToken(cookieStore.get(USAM_ACCESS_COOKIE_NAME)?.value);

  if (!hasAccess) {
    redirect("/system?access=1");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" />

      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:70px_70px]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(245,158,11,0.08),transparent_24%),radial-gradient(circle_at_84%_22%,rgba(217,122,26,0.05),transparent_22%),linear-gradient(180deg,rgba(5,5,5,0),#050505_90%)]" />

      <section className="relative px-4 pb-20 pt-24 sm:px-6 md:pb-24 md:pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-3xl">
            <Eyebrow>Disciple Operating System</Eyebrow>
            <h1
              className="mt-7 text-[clamp(3.3rem,12vw,7.2rem)] font-bold uppercase leading-[0.88] tracking-tight text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              The Mission Field Is Where You Already Are
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300 md:text-xl">
              DOS helps missionaries, leaders, and disciple makers track people, tables, follow up, prayer, and multiplication so no one reached is left without someone walking with them.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <CtaLink href="/system?waitlist=1">Join the Waiting List</CtaLink>
              <CtaLink href="/system?waitlist=1" variant="secondary">Request a Walkthrough</CtaLink>
            </div>
            <div className="mt-5">
              <AccessLogoutButton>Exit System</AccessLogoutButton>
            </div>
          </div>

          <PhoneFrame>
            <HomePhoneScreen />
          </PhoneFrame>
        </div>
      </section>

      <section className="relative border-t border-stone-900/80 px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Operating Rhythm" title="From Encounter To Multiplication">
            <p>
              When someone says yes, DOS helps make sure someone walks with them. The system connects conversations, follow up, prayer coverage, and leadership visibility into one simple operating rhythm.
            </p>
          </SectionHeading>

          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {flowSteps.map((step, index) => (
              <div className="relative border border-stone-800/75 bg-stone-950/60 p-5" key={step}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-amber-400/75" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  0{index + 1}
                </p>
                <h3 className="mt-5 text-2xl uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                  {step}
                </h3>
                <div className="mt-5 h-px bg-stone-800">
                  <div className="h-px w-12 bg-amber-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900/80 px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Field Records" title="What DOS Helps You Track" />
          <div className="mt-10 grid gap-px border border-stone-800/80 bg-stone-800/60 md:grid-cols-2 lg:grid-cols-4">
            {trackingCards.map((card, index) => (
              <article className="bg-[#060606] p-6 transition-colors hover:bg-stone-950/80" key={card.title}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-600" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  / 0{index + 1}
                </p>
                <h3 className="mt-12 text-3xl uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900/80 px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <PhoneFrame tilt="right">
            <PeoplePhoneScreen />
          </PhoneFrame>

          <div>
            <SectionHeading eyebrow="Mobile First" title="Built For The Field">
              <p>
                DOS is designed mobile first because ministry happens in homes, coffee shops, churches, job sites, and everyday conversations.
              </p>
            </SectionHeading>

            <div className="mt-8 divide-y divide-stone-900 border-y border-stone-900">
              {fieldRows.map((row, index) => (
                <div className="flex items-center gap-4 py-4" key={row}>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-lg uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                    {row}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900/80 px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Leadership Visibility" title="Leaders Can See What Needs Support">
            <p>
              DOS rolls activity up from individual users to team leaders and eventually a master dashboard. Leaders can see where people are being reached, where follow up is needed, where prayer coverage is active, and where multiplication is beginning.
            </p>
          </SectionHeading>

          <div className="mt-10 grid gap-px border border-stone-800/75 bg-stone-800/60 md:grid-cols-3">
            {leaderStats.map((stat) => (
              <div className="bg-[#070707] p-6" key={stat.label}>
                <p className="text-5xl font-black leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                  {stat.value}
                </p>
                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-stone-900/80 px-4 py-20 text-center sm:px-6 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-9 h-16 w-px bg-gradient-to-b from-transparent to-amber-400" />
          <h2
            className="text-[clamp(2.7rem,9vw,6.6rem)] font-bold uppercase leading-[0.9] tracking-tight text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            This Is Not A Program.
            <br />
            <span className="text-amber-400">This Is A Movement.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-stone-300">
            DOS is not replacing ministry. It is helping ministry endure. What you start, we help carry forward.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <CtaLink href="/system?waitlist=1">Join the Waiting List</CtaLink>
            <CtaLink href="/support" variant="secondary">Partner With Us</CtaLink>
          </div>
        </div>
      </section>
    </main>
  );
}
