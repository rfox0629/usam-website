import { PrimaryNav } from "@/components/PrimaryNav";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { submitGroupJoinRequest } from "./actions";

export type PublicGroupPageData = {
  anchorMark: string;
  anchorSubtext: string;
  description: string;
  id: string;
  leaders: string[];
  location: string;
  manageHref: string | null;
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
  siteBasePath: string;
  siteHostname: string | null;
  siteLogoUrl: string | null;
  siteName: string;
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
  const groupPath = publicGroupPath(group.slug, { basePath: group.siteBasePath });
  const leaderText = group.leaders.length ? group.leaders.join(", ") : "Group leaders";

  return (
    <main className="min-h-screen bg-[#0B0D10] text-[#F5F3EE]">
      <PrimaryNav active="dos" />
      <section className="border-b border-white/10 bg-[#0B0D10]">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-10 lg:py-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#C2A14E]/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#C2A14E]">{group.siteName}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{group.typeLabel}</span>
            </div>
            <h1 className="mt-5 text-5xl font-black leading-none tracking-normal text-white sm:text-6xl">
              <GroupName name={group.name} />
            </h1>
            <p className="mt-3 text-lg font-black text-[#C2A14E]">{group.tagline}</p>
            <div className="mt-6 grid gap-2 text-sm font-semibold leading-6 text-white/72 sm:grid-cols-2">
              <PublicFact label="When" value={group.rhythm} />
              <PublicFact label="Where" value={group.location} />
              <PublicFact label="Leaders" value={leaderText} />
              <PublicFact label="Scripture" value={group.scriptureReference || "Discipleship rhythm"} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="inline-flex min-h-11 items-center justify-center rounded-sm border border-[#C2A14E] bg-[#C2A14E] px-5 text-xs font-black uppercase tracking-[0.18em] text-[#0B0D10] transition-colors hover:bg-[#D4B665]" href="#join">
                Request to Join
              </a>
              <a className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/20 px-5 text-xs font-black uppercase tracking-[0.18em] text-white transition-colors hover:border-[#C2A14E] hover:text-[#C2A14E]" href={`${groupPath}/member`}>
                Sign In
              </a>
              {group.manageHref ? (
                <a className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/10 px-5 text-xs font-black uppercase tracking-[0.18em] text-white/65 transition-colors hover:border-white/25 hover:text-white" href={group.manageHref}>
                  Manage in DOS
                </a>
              ) : null}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/12 bg-[#12151A] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C2A14E]">Next Gathering</p>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-6xl font-black leading-none text-white">{group.nextGatheringNumber}</p>
              <div className="pb-1">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">{group.nextGatheringMonth}</p>
                <p className="text-sm font-black text-white">{group.nextGatheringDay}</p>
              </div>
            </div>
            <p className="mt-4 text-base font-black text-white">{group.nextGatheringTitle}</p>
            <dl className="mt-3 grid gap-2 text-sm leading-6">
              <GatheringMeta label="Time" value={group.nextGatheringTime} />
              <GatheringMeta label="Where" value={group.nextGatheringLocation} />
            </dl>
          </aside>
        </div>
      </section>

      <section className="bg-[#F8FAFC] px-5 py-8 text-[#0F172A] sm:px-8 lg:px-10" id="join">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)] lg:items-start">
          <div className="rounded-2xl border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Group Home</p>
            <h2 className="mt-2 text-2xl font-black text-[#0F172A]">Join the rhythm.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{group.description}</p>
          </div>
          <JoinRequestPanel group={group} requestState={requestState} />
        </div>
      </section>
    </main>
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

function PublicFact({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{label}</span>
      <span className="mt-1 block text-white/82">{value}</span>
    </p>
  );
}

function GatheringMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-white/10 pt-2">
      <dt className="font-black text-[#C2A14E]">{label}</dt>
      <dd className="text-right font-semibold text-white/68">{value}</dd>
    </div>
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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-black text-emerald-700">Request received. A group leader will follow up.</p>
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
    <form action={submitGroupJoinRequest} className="grid gap-3 rounded-2xl border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] sm:grid-cols-2">
      <input name="groupSlug" type="hidden" value={group.slug} />
      <input name="sourcePath" type="hidden" value={publicGroupPath(group.slug, { basePath: group.siteBasePath })} />
      {errorText ? <p className="rounded-xl border border-[#F8C56A]/45 bg-[#FFF8E8] px-3 py-2 text-sm font-bold text-[#7A4B00] sm:col-span-2">{errorText}</p> : null}
      <JoinInput autoComplete="given-name" label="First Name" name="firstName" required />
      <JoinInput autoComplete="family-name" label="Last Name" name="lastName" required />
      <JoinInput autoComplete="email" label="Email" name="email" required type="email" />
      <JoinInput autoComplete="tel" label="Phone" name="phone" type="tel" />
      <label className="grid gap-2 sm:col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Message</span>
        <textarea className="min-h-24 rounded-xl border border-[#D6E4F7] bg-white px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]" maxLength={1200} name="message" placeholder="Tell us a little about your interest." />
      </label>
      <button className="inline-flex min-h-11 items-center justify-center rounded-sm border border-[#C2A14E] bg-[#C2A14E] px-5 text-xs font-black uppercase tracking-[0.18em] text-[#0B0D10] transition-colors hover:bg-[#D4B665] sm:col-span-2" type="submit">
        Request to Join
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
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">{label}</span>
      <input autoComplete={autoComplete} className="min-h-11 rounded-xl border border-[#D6E4F7] bg-white px-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]" name={name} required={required} type={type} />
    </label>
  );
}
