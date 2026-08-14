import Image from "next/image";
import Link from "next/link";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { submitGroupJoinRequest } from "./actions";
import {
  communityOrgLabel,
  usamPublicCard,
  usamPublicChip,
  usamPublicChipMuted,
  usamPublicEyebrow,
  usamPublicFieldLabel,
  usamPublicInput,
  usamPublicPage,
  usamPublicPrimaryAction,
  usamPublicSecondaryAction,
} from "./community-design";
import { publicSafeText, type CommunitySchedule } from "./community-schedule";
import { formatLeaderLine, GroupTemplateArtwork } from "./GroupTemplateVisual";

export type PublicGroupPageData = {
  acceptingRequests: boolean;
  anchorMark: string;
  anchorSubtext: string;
  description: string;
  id: string;
  leaders: string[];
  location: string;
  memberAccessEnabled: boolean;
  name: string;
  /** One canonical schedule. Never a rhythm competing with a separate "next". */
  schedule: CommunitySchedule;
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
  const leaderText = formatLeaderLine(group.leaders);

  return (
    <main className={usamPublicPage}>
      <PublicGroupHeader group={group} />

      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-8 lg:px-10">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className={`min-w-0 p-5 sm:p-6 ${usamPublicCard}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={usamPublicChip}>{group.typeLabel}</span>
              {publicSafeText(group.location) ? <span className={usamPublicChipMuted}>{publicSafeText(group.location)}</span> : null}
            </div>

            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-4xl">
              <GroupName name={group.name} />
            </h1>
            <p className="mt-2 text-base font-bold text-[#A47F2A]">{group.tagline}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">{group.description}</p>

            <dl className="mt-5 grid gap-2 sm:grid-cols-2">
              <PublicFact label="Leaders" value={leaderText} />
              <PublicFact label="Where" value={group.schedule.location} />
              {group.scriptureReference ? <PublicFact label="Scripture" value={group.scriptureReference} /> : null}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {group.acceptingRequests ? (
                <a className={usamPublicPrimaryAction} href="#join">
                  Request to join
                </a>
              ) : (
                <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-5 text-sm font-bold text-[#64748B]">
                  Requests closed
                </span>
              )}
              {group.memberAccessEnabled ? (
                <a className={usamPublicSecondaryAction} href={`${groupPath}/member`}>
                  Member sign in
                </a>
              ) : null}
            </div>
          </div>

          <aside className="grid gap-3">
            <div className={`overflow-hidden ${usamPublicCard}`}>
              <GroupTemplateArtwork
                brand="usam"
                input={{ name: group.name, slug: group.slug, tagline: group.tagline, type: group.typeLabel }}
                size="hero"
              />
            </div>
            <CanonicalGatheringCard schedule={group.schedule} />
          </aside>
        </section>

        <WhatToExpectSection group={group} />

        <section className="mt-4 scroll-mt-6" id="join">
          {group.acceptingRequests ? <JoinRequestPanel group={group} requestState={requestState} /> : <JoinClosedPanel />}
        </section>

        <footer className="pt-8 text-center text-xs font-bold text-[#64748B]">
          Powered by{" "}
          <Link className="text-[#A47F2A] underline-offset-4 hover:underline" href="https://usamissionaries.org">
            {group.siteName}
          </Link>
        </footer>
      </div>
    </main>
  );
}

/**
 * The single canonical answer to "when does this meet?". A dated gathering
 * leads when one exists; otherwise the recurring rhythm is presented as the
 * schedule rather than being contradicted by a competing "TBD".
 */
function CanonicalGatheringCard({ schedule }: { schedule: CommunitySchedule }) {
  return (
    <div className={`p-4 ${usamPublicCard}`}>
      <p className={usamPublicEyebrow}>{schedule.isDated ? "Next gathering" : "Meets"}</p>
      <p className="mt-2 text-lg font-black leading-snug text-[#0F172A]">{schedule.headline}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{schedule.detail}</p>
      <p className="mt-3 border-t border-[#EFE6D0] pt-3 text-sm font-semibold leading-6 text-[#475569]">
        {schedule.location}
      </p>
    </div>
  );
}

function PublicGroupHeader({ group }: { group: PublicGroupPageData }) {
  return (
    <header className="border-b border-[#EFE6D0] bg-white/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 lg:px-10">
        <Link className={communityOrgLabel} href={group.siteBasePath || "/groups"}>
          {group.siteLogoUrl ? (
            <Image alt={group.siteName} className="h-7 w-7 rounded-md object-contain" height={28} src={group.siteLogoUrl} width={28} />
          ) : null}
          A {group.siteName} Group
        </Link>
        <Link className="shrink-0 text-xs font-bold text-[#A47F2A] underline-offset-4 hover:underline" href={group.siteBasePath || "/groups"}>
          All groups
        </Link>
      </div>
    </header>
  );
}

function WhatToExpectSection({ group }: { group: PublicGroupPageData }) {
  return (
    <section className="mt-4">
      <div className={`p-5 sm:p-6 ${usamPublicCard}`}>
        <p className={usamPublicEyebrow}>What to expect</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#0F172A]">{group.scheduleTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#64748B]">{group.scheduleIntro}</p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {group.whatToExpect.map((item) => (
            <article className="rounded-2xl bg-[#FBF9F4] p-4" key={item.title}>
              <h3 className="text-sm font-black text-[#0F172A]">{item.title}</h3>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-[#64748B]">{item.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
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
    <div className="rounded-2xl bg-[#FBF9F4] px-3 py-2.5">
      <dt className={usamPublicFieldLabel}>{label}</dt>
      <dd className="mt-1 text-sm font-bold leading-6 text-[#0F172A]">{value}</dd>
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
  if (!group.acceptingRequests) {
    return <JoinClosedPanel />;
  }

  if (requestState === "received") {
    return (
      <div className={`p-5 ${usamPublicCard}`}>
        <p className="text-base font-black text-[#15803D]">Request received. A group leader will follow up.</p>
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
    <form action={submitGroupJoinRequest} className={`grid gap-3 p-5 sm:grid-cols-2 sm:p-6 ${usamPublicCard}`}>
      <input name="groupSlug" type="hidden" value={group.slug} />
      <input name="sourcePath" type="hidden" value={publicGroupPath(group.slug, { basePath: group.siteBasePath })} />

      <div className="sm:col-span-2">
        <h2 className="text-2xl font-black tracking-tight text-[#0F172A]">Request to join</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">Sent only to group leaders.</p>
      </div>

      {errorText ? (
        <p className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-sm font-bold text-[#92400E] sm:col-span-2">
          {errorText}
        </p>
      ) : null}

      <JoinInput autoComplete="given-name" label="First name" name="firstName" required />
      <JoinInput autoComplete="family-name" label="Last name" name="lastName" required />
      <JoinInput autoComplete="email" label="Email" name="email" required type="email" />
      <JoinInput autoComplete="tel" label="Phone" name="phone" type="tel" />

      <label className="grid gap-1.5 sm:col-span-2">
        <span className={usamPublicFieldLabel}>Message</span>
        <textarea
          className={`${usamPublicInput} min-h-24 py-3 leading-6`}
          maxLength={1200}
          name="message"
          placeholder="Tell us a little about your interest."
        />
      </label>

      <div className="sm:col-span-2">
        <button className={usamPublicPrimaryAction} type="submit">
          Request to join
        </button>
      </div>
    </form>
  );
}

function JoinClosedPanel() {
  return (
    <div className={`p-5 ${usamPublicCard}`}>
      <h2 className="text-2xl font-black tracking-tight text-[#0F172A]">Requests closed</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
        This group is not accepting new requests right now.
      </p>
    </div>
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
    <label className="grid gap-1.5">
      <span className={usamPublicFieldLabel}>{label}</span>
      <input autoComplete={autoComplete} className={usamPublicInput} name={name} required={required} type={type} />
    </label>
  );
}
