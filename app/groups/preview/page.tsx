import type { Metadata } from "next";
import Link from "next/link";
import {
  communityCard,
  communityChip,
  communityChipMuted,
  communityEyebrow,
  communityPage,
  communityPrimaryAction,
  communitySecondaryAction,
} from "../community-design";
import { buildCommunitySchedule } from "../community-schedule";
import {
  CommunityAnnouncementCard,
  CommunityLeaderSummaryCard,
  CommunityMapConcept,
  CommunityOwnershipLabel,
  CommunityPrayerCard,
  CommunityPublishingCard,
  CommunityRoleCard,
  CommunityScheduleBlock,
  PreviewBadge,
} from "../community-modules";
import type {
  CommunityAnnouncementFeed,
  CommunityOwnership,
  CommunityPrayerRequest,
  CommunityRegionSummary,
  CommunityRole,
} from "../community-view-models";

export const metadata: Metadata = {
  description: "USA-57 founder preview of the DOS Community experience.",
  robots: { follow: false, index: false },
  title: "Community preview | DOS",
};

/* ------------------------------------------------------------------ *
 * Representative states.
 *
 * These mirror the real Wednesday Men's Group so the preview reads true,
 * but nothing here is written to production and nothing is presented as
 * live. Every surface fed from this data carries a Preview badge.
 * ------------------------------------------------------------------ */

const affiliatedOwnership: CommunityOwnership = {
  affiliation: {
    initiativeName: "Men's Discipleship",
    logoUrl: "/brand/logo/usam-website-logo.png",
    organizationName: "USA Missionaries",
    publicationStatus: "approved",
  },
  kind: "affiliated",
};

const independentOwnership: CommunityOwnership = { kind: "independent" };

const currentSchedule = buildCommunitySchedule({
  location: "Fox home · Eagan, MN",
  rhythmLabel: "Weekly · Wednesday · 5:30 PM",
});

const changedSchedule = buildCommunitySchedule({
  location: "Fox home · Eagan, MN",
  rhythmLabel: "Weekly · Wednesday · 6:30 PM",
});

const announcementFeed: CommunityAnnouncementFeed = {
  latest: {
    body: "We are moving to 6:30 starting next week so the guys coming from work can make it.",
    id: "preview-update-1",
    isRead: false,
    postedBy: "Ryan Fox",
    publishedAt: "2026-08-14T12:00:00Z",
    title: "We're moving to 6:30 PM",
  },
  unreadCount: 1,
};

const prayerRequests: readonly CommunityPrayerRequest[] = [
  {
    answeredNote: null,
    authorName: "Tanner Kent",
    hasPrayed: false,
    id: "preview-prayer-1",
    prayedCount: 3,
    request: "Praying about a job change and whether it is the right move for our family.",
    sharedAt: "2026-08-13T18:00:00Z",
    visibility: "group",
  },
  {
    answeredNote: "He started Monday.",
    authorName: null,
    hasPrayed: true,
    id: "preview-prayer-2",
    prayedCount: 6,
    request: "For my brother, that he would find steady work.",
    sharedAt: "2026-08-06T18:00:00Z",
    visibility: "group",
  },
];

const regions: readonly CommunityRegionSummary[] = [
  { cities: ["Eagan", "Lakeville"], groupCount: 4, state: "Minnesota", stateCode: "MN" },
  { cities: ["Des Moines"], groupCount: 1, state: "Iowa", stateCode: "IA" },
  { cities: ["Madison"], groupCount: 1, state: "Wisconsin", stateCode: "WI" },
  { cities: ["Fargo"], groupCount: 1, state: "North Dakota", stateCode: "ND" },
];

const roles: readonly CommunityRole[] = ["member", "helper", "co_leader"];

export default function CommunityPreviewPage() {
  return (
    <main className={communityPage}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
        <header className={`p-5 ${communityCard}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={communityChip}>USA-57</span>
            <PreviewBadge label="Founder preview" />
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-4xl">
            DOS Community — design preview
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#475569]">
            One product across public, leader and member views. Surfaces marked{" "}
            <span className="font-black text-[#92400E]">Preview</span> render typed view models whose backend
            contract does not exist yet — those are the shapes USA-173 implements. Everything else uses the
            contracts DOS already has.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link className={communityPrimaryAction} href="/groups">
              Public directory
            </Link>
            <Link className={communitySecondaryAction} href="/groups/2three2">
              Public group detail
            </Link>
          </div>
        </header>

        <PreviewSection
          caption="Same component tree. The affiliated group carries restrained co-branding; the independent group carries none and is never published."
          title="1 · Independent vs affiliated"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={`p-4 ${communityCard}`}>
              <CommunityOwnershipLabel ownership={independentOwnership} />
              <h3 className="mt-1.5 text-xl font-black text-[#0F172A]">Thursday Guys</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
                A DOS user running their own group. No organization, no public listing.
              </p>
              <div className="mt-3">
                <CommunityPublishingCard affiliation={null} />
              </div>
            </div>

            <div className={`p-4 ${communityCard}`}>
              <CommunityOwnershipLabel ownership={affiliatedOwnership} />
              <h3 className="mt-1.5 text-xl font-black text-[#0F172A]">Wednesday Men&rsquo;s Group</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
                Affiliated and approved for the USA Missionaries directory.
              </p>
              <div className="mt-3">
                <CommunityPublishingCard
                  affiliation={affiliatedOwnership.kind === "affiliated" ? affiliatedOwnership.affiliation : null}
                />
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          caption="One canonical schedule. The leader edits the time once in DOS; the member Home and the public page both read the same source. No second copy, no contradictory TBD."
          title="2 · Canonical schedule propagation"
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <LabelledPane label="Leader edits in DOS">
              <CommunityScheduleBlock schedule={currentSchedule} />
              <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">
                Ryan changes Wednesday from 5:30 to 6:30.
              </p>
            </LabelledPane>
            <LabelledPane label="Member Group Home">
              <CommunityScheduleBlock changedNote="Time changed by your leader" schedule={changedSchedule} />
            </LabelledPane>
            <LabelledPane label="Public group page">
              <CommunityScheduleBlock schedule={changedSchedule} />
            </LabelledPane>
          </div>
        </PreviewSection>

        <PreviewSection
          caption="What Tanner sees. Group identity first, then the gathering, then one obvious Continue. No leader tools, no People, no Reports, no other groups."
          title="3 · Member Group Home"
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <LabelledPane label="Identity and gathering">
              <div className={`p-4 ${communityCard}`}>
                <CommunityOwnershipLabel ownership={affiliatedOwnership} />
                <h3 className="mt-1.5 text-2xl font-black leading-tight text-[#0F172A]">
                  Wednesday Men&rsquo;s Group
                </h3>
                <p className="mt-1 text-sm font-bold text-[#1D4ED8]">Brotherhood. Prayer. Discipleship.</p>
                <p className="mt-2 text-sm font-semibold text-[#64748B]">Signed in as Tanner Kent</p>
              </div>
              <div className="mt-3">
                <CommunityScheduleBlock changedNote="Time changed by your leader" schedule={changedSchedule} />
              </div>
            </LabelledPane>

            <LabelledPane label="Announcement and unread">
              <CommunityAnnouncementCard feed={announcementFeed} isPreview />
              <div className="mt-3">
                <CommunityPrayerCard isPreview requests={prayerRequests} />
              </div>
            </LabelledPane>

            <LabelledPane label="Install help, collapsed">
              <div className={`${communityCard}`}>
                <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-bold text-[#0F172A]">Add DOS to your Home Screen</span>
                  <span className="text-xs font-bold text-[#1D4ED8]">Show</span>
                </div>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">
                Sits last, collapsed, and hides once installed. The current Journey is never pushed below it.
              </p>
            </LabelledPane>
          </div>
        </PreviewSection>

        <PreviewSection
          caption="The same identity and the same Group Home gain capability. Nobody gets a second account, and private reflections stay private at every level."
          title="4 · Member, helper, co-leader"
        >
          <div className="grid gap-3 lg:grid-cols-3">
            {roles.map((role) => (
              <CommunityRoleCard isPreview key={role} role={role} />
            ))}
          </div>
        </PreviewSection>

        <PreviewSection
          caption="Leader view in the same design system. Every number here already exists in DOS today."
          title="5 · Leader Group Home"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <CommunityLeaderSummaryCard
                summary={{
                  activeJourneyTitle: "Discipleship · A.W. Tozer",
                  activeMemberCount: 8,
                  notStartedCount: 2,
                  pendingJoinRequestCount: 1,
                }}
              />
              <div className="mt-3">
                <CommunityScheduleBlock schedule={changedSchedule} />
              </div>
            </div>
            <div>
              <CommunityAnnouncementCard feed={announcementFeed} isPreview />
              <div className="mt-3">
                <CommunityPublishingCard
                  affiliation={affiliatedOwnership.kind === "affiliated" ? affiliatedOwnership.affiliation : null}
                />
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          caption="Direction only. No live metrics until USA-173 defines what counts as active."
          title="6 · National directory concept"
        >
          <CommunityMapConcept regions={regions} />
        </PreviewSection>

        <footer className="py-8 text-center text-xs font-bold text-[#64748B]">
          USA-57 · design preview · not production data
        </footer>
      </div>
    </main>
  );
}

function PreviewSection({
  caption,
  children,
  title,
}: {
  caption: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-black tracking-tight text-[#0F172A]">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#64748B]">{caption}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LabelledPane({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div>
      <p className={`mb-2 ${communityChipMuted}`}>{label}</p>
      {children}
    </div>
  );
}
