import { PrimaryNav } from "@/components/PrimaryNav";
import { submitGroupJoinRequest } from "./actions";

export type PublicGroupPageData = {
  anchorMark: string;
  anchorSubtext: string;
  description: string;
  location: string;
  name: string;
  nextGatheringDay: string;
  nextGatheringLocation: string;
  nextGatheringMonth: string;
  nextGatheringNumber: string;
  nextGatheringTime: string;
  nextGatheringTitle: string;
  rhythm: string;
  scheduleIntro: string;
  scheduleTitle: string;
  scriptureReference: string;
  scriptureText: string;
  shareImageUrl?: string | null;
  slug: string;
  tagline: string;
  typeLabel: string;
  typicalSchedule: readonly PublicGroupStep[];
  whatToExpect: readonly PublicGroupDetail[];
  whoThisIsFor: readonly PublicGroupDetail[];
};

export type PublicGroupDetail = {
  note: string;
  title: string;
};

export type PublicGroupStep = {
  description: string;
  meta: string;
  title: string;
};

type RequestState = "error" | "missing" | "received" | "unavailable" | null;

export function PublicGroupPageTemplate({
  group,
  requestState,
}: {
  group: PublicGroupPageData;
  requestState: RequestState;
}) {
  return (
    <main className="min-h-screen bg-[#0B0D10] text-[#F5F3EE]">
      <PrimaryNav active="dos" />
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-20 bg-[#0B0D10]" aria-hidden="true" />
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_86%_0%,rgba(194,161,78,0.18),transparent_34%),linear-gradient(rgba(245,243,238,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(245,243,238,0.07)_1px,transparent_1px)] bg-[length:auto,72px_72px,72px_72px]"
          aria-hidden="true"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-center lg:px-10 lg:py-24">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <span className="h-px w-11 bg-[#C2A14E]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#C2A14E]">{[group.scriptureReference, group.typeLabel].filter(Boolean).join(" · ")}</span>
            </div>
            <h1 className="mt-7 max-w-4xl text-6xl font-black leading-[0.92] tracking-normal text-[#F5F3EE] sm:text-7xl lg:text-8xl">
              <GroupName name={group.name} />
            </h1>
            <p className="mt-5 text-2xl font-black uppercase tracking-[0.14em] text-[#C2A14E]">{group.tagline}</p>
            {group.scriptureText ? (
              <blockquote className="mt-6 max-w-2xl border-l-2 border-[#C2A14E] pl-5 text-base italic leading-8 text-white/65">
                &quot;{group.scriptureText}&quot;
                {group.scriptureReference ? <cite className="mt-3 block text-[10px] not-italic uppercase tracking-[0.24em] text-white/40">{group.scriptureReference}</cite> : null}
              </blockquote>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <HeroChip>{group.rhythm}</HeroChip>
              <HeroChip>{group.location}</HeroChip>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="inline-flex min-h-12 items-center justify-center rounded-sm border border-[#C2A14E] bg-[#C2A14E] px-6 text-xs font-black uppercase tracking-[0.2em] text-[#0B0D10] transition-colors hover:bg-[#D4B665]" href="#join">
                Join Group
              </a>
              <a className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/20 px-6 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:border-[#C2A14E] hover:text-[#C2A14E]" href="#gathering">
                Next Gathering
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative flex aspect-square w-full max-w-[320px] flex-col items-center justify-center rounded-full border border-white/20 text-center">
              <div className="absolute inset-4 rounded-full border border-white/10" aria-hidden="true" />
              <div className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#C2A14E]" aria-hidden="true" />
              <p className="text-6xl font-black tabular-nums text-white sm:text-7xl">{group.anchorMark}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.34em] text-white/40">{group.anchorSubtext}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#C2A14E]">{group.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#12151A]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-8 sm:px-8 lg:px-10">
          <p className="max-w-3xl text-base leading-8 text-white/65">
            <strong className="font-semibold text-white">{group.name}</strong> {group.description}
          </p>
          <div className="flex gap-2" aria-label="Two by two">
            {[0, 1, 2, 3].map((item) => (
              <span className={`h-2.5 w-2.5 rounded-full border border-[#C2A14E] ${item === 1 || item === 3 ? "bg-[#C2A14E]" : ""}`} key={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionEyebrow>Typical Schedule</SectionEyebrow>
              <h2 className="mt-3 text-4xl font-black uppercase tracking-normal text-white sm:text-5xl">{group.scheduleTitle}</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/55">{group.scheduleIntro}</p>
          </div>
          <div className="relative">
            <div className="relative mb-2 hidden h-24 md:block" aria-hidden="true">
              <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1120 120">
                <path d="M 0 90 C 120 90 150 30 280 30 C 400 30 430 95 560 95 C 690 95 720 25 840 25 C 960 25 1000 85 1120 85" fill="none" stroke="rgba(245,243,238,.18)" strokeDasharray="6 8" strokeWidth="1.5" />
                <path d="M 0 90 C 120 90 150 30 280 30 C 400 30 430 95 560 95 C 690 95 720 25 840 25 C 960 25 1000 85 1120 85" fill="none" stroke="#C2A14E" strokeWidth="2" />
              </svg>
              <RouteDot left="12.5%" top="48.8%" />
              <RouteDot left="37.5%" top="53.4%" />
              <RouteDot left="62.5%" top="51.4%" />
              <RouteDot left="87.5%" top="45.8%" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.typicalSchedule.map((step, index) => (
                <article className="relative rounded-xl border border-white/10 bg-[#12151A] p-5 transition-colors hover:border-[#8A7338]" key={`${step.title}-${index}`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#C2A14E]">WP-{String(index + 1).padStart(2, "0")} · {step.meta}</p>
                  <h3 className="mt-3 text-xl font-black uppercase text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <SectionEyebrow>The Briefing</SectionEyebrow>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-normal text-white sm:text-5xl">What You Are Signing Up For</h2>
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-20">
            <PublicDetailList items={group.whatToExpect} title="What to Expect" />
            <PublicDetailList arrow items={group.whoThisIsFor} title="Who This Is For" />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_12%_100%,rgba(194,161,78,0.09),transparent_45%),#0B0D10] py-16 sm:py-20 lg:py-24" id="gathering">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
          <SectionEyebrow>Upcoming</SectionEyebrow>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-normal text-white sm:text-5xl">Next Gathering</h2>
          <div className="mt-10 grid gap-8 rounded-2xl border border-white/20 bg-[#12151A] p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-12 lg:p-12">
            <div className="border-b border-white/10 pb-6 text-left lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12 lg:text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#C2A14E]">{group.nextGatheringDay}</p>
              <p className="text-7xl font-black leading-none text-white">{group.nextGatheringNumber}</p>
              <p className="text-xs font-bold uppercase tracking-[0.34em] text-white/55">{group.nextGatheringMonth}</p>
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase text-white">{group.nextGatheringTitle}</h3>
              <div className="mt-5 grid gap-3 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                <GatheringMeta label="Time" value={group.nextGatheringTime} />
                <GatheringMeta label="Location" value={group.nextGatheringLocation} />
                <GatheringMeta label="Bring" value="A ready heart and one prayer request" />
              </div>
            </div>
            <a className="inline-flex min-h-12 items-center justify-center rounded-sm border border-[#C2A14E] bg-[#C2A14E] px-6 text-xs font-black uppercase tracking-[0.2em] text-[#0B0D10] transition-colors hover:bg-[#D4B665]" href="#join">
              Request Information
            </a>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16 text-center sm:py-20 lg:py-28" id="join">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[120px] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(245,243,238,0.08)] sm:text-[190px] lg:text-[260px]" aria-hidden="true">
          {group.anchorMark}
        </div>
        <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
          <SectionEyebrow>Request Information</SectionEyebrow>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-normal text-white sm:text-5xl">Join the Rhythm</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-white/60">Share your interest and a group leader will follow up.</p>
          <JoinRequestPanel group={group} requestState={requestState} />
        </div>
      </section>
    </main>
  );
}

function RouteDot({ left, top }: { left: string; top: string }) {
  return (
    <span
      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#C2A14E] bg-[#0B0D10]"
      style={{ left, top }}
    />
  );
}

function GroupName({ name }: { name: string }) {
  if (name.toLowerCase() === "2three2") {
    return (
      <>
        2<span className="text-[#C2A14E]">three</span>2
      </>
    );
  }

  return <>{name}</>;
}

function HeroChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-[#C2A14E]" />
      {children}
    </span>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#C2A14E]">{children}</p>;
}

function PublicDetailList({
  arrow = false,
  items,
  title,
}: {
  arrow?: boolean;
  items: readonly PublicGroupDetail[];
  title: string;
}) {
  return (
    <div>
      <h3 className="border-b border-white/10 pb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">{title}</h3>
      <div className="divide-y divide-white/10">
        {items.map((item, index) => (
          <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-5 py-5" key={`${title}-${item.title}`}>
            <span className="pt-[0.2rem] text-xs font-bold leading-6 text-[#C2A14E]">{arrow ? "->" : String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="text-base font-bold leading-6 text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-white/45">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GatheringMeta({ label, value }: { label: string; value: string }) {
  return (
    <p className="grid gap-1 sm:grid-cols-[88px_minmax(0,1fr)]">
      <span className="text-[#C2A14E]">{label}</span>
      <span className="text-white/60">{value}</span>
    </p>
  );
}

function JoinRequestPanel({
  group,
  requestState,
}: {
  group: PublicGroupPageData;
  requestState: RequestState;
}) {
  if (requestState === "received") {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#C2A14E]/45 bg-[#C2A14E]/10 p-6 text-left shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <p className="text-lg font-black text-white">Request received. A group leader will follow up.</p>
      </div>
    );
  }

  const errorText = requestState === "missing"
    ? "Add your name and email before submitting."
    : requestState === "unavailable"
      ? "This group request form is temporarily unavailable."
      : requestState === "error"
        ? "Something went wrong. Please try again."
        : "";

  return (
    <form action={submitGroupJoinRequest} className="mx-auto mt-8 grid max-w-2xl gap-4 rounded-2xl border border-white/12 bg-[#12151A] p-5 text-left shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:grid-cols-2 sm:p-6">
      <input name="groupSlug" type="hidden" value={group.slug} />
      <input name="sourcePath" type="hidden" value={`/groups/${group.slug}`} />
      {errorText ? <p className="rounded-xl border border-[#C2A14E]/30 bg-[#C2A14E]/10 px-4 py-3 text-sm font-semibold text-[#F5F3EE] sm:col-span-2">{errorText}</p> : null}
      <JoinInput autoComplete="given-name" label="First Name" name="firstName" required />
      <JoinInput autoComplete="family-name" label="Last Name" name="lastName" required />
      <JoinInput autoComplete="email" label="Email" name="email" required type="email" />
      <JoinInput autoComplete="tel" label="Phone" name="phone" type="tel" />
      <label className="grid gap-2 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Message</span>
        <textarea className="min-h-28 rounded-xl border border-white/12 bg-[#0B0D10] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#C2A14E]" maxLength={1200} name="message" placeholder="Tell us a little about your interest." />
      </label>
      <button className="inline-flex min-h-12 items-center justify-center rounded-sm border border-[#C2A14E] bg-[#C2A14E] px-6 text-xs font-black uppercase tracking-[0.2em] text-[#0B0D10] transition-colors hover:bg-[#D4B665] sm:col-span-2" type="submit">
        Join Group
      </button>
    </form>
  );
}

function JoinInput({
  autoComplete,
  label,
  name,
  required = false,
  type = "text",
}: {
  autoComplete?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{label}</span>
      <input autoComplete={autoComplete} className="min-h-12 rounded-xl border border-white/12 bg-[#0B0D10] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#C2A14E]" name={name} required={required} type={type} />
    </label>
  );
}
