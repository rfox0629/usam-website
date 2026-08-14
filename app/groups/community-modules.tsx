/**
 * Reusable Community presentation modules.
 *
 * USA-57. Every module renders a typed view model from
 * `community-view-models.ts`. The USA-57 preview composes these with
 * representative data; USA-173 composes the same components with real data.
 * Nothing here fetches, mutates or fabricates — they are pure presentation.
 */

import Image from "next/image";
import {
  capabilitiesForRole,
  communityRoleLabel,
  type CommunityAffiliation,
  type CommunityAnnouncementFeed,
  type CommunityLeaderSummary,
  type CommunityOwnership,
  type CommunityPrayerRequest,
  type CommunityRegionSummary,
  type CommunityRole,
} from "./community-view-models";
import {
  communityCard,
  communityChip,
  communityChipMuted,
  communityEyebrow,
  communityFieldLabel,
  communityOrgLabel,
} from "./community-design";
import type { CommunitySchedule } from "./community-schedule";

/**
 * Marks a surface whose data contract does not exist yet. Preview-only —
 * production UI must never render this.
 */
export function PreviewBadge({ label = "Preview" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400E]">
      {label}
    </span>
  );
}

/**
 * Restrained organization co-branding. An independent Group renders nothing —
 * it must never look like a USA Missionaries Group.
 */
export function CommunityOwnershipLabel({ ownership }: { ownership: CommunityOwnership }) {
  if (ownership.kind === "independent") {
    return <p className={communityEyebrow}>Group Home</p>;
  }

  const { affiliation } = ownership;

  return (
    <p className={communityOrgLabel}>
      {affiliation.logoUrl ? (
        <Image alt={affiliation.organizationName} className="h-5 w-5 rounded object-contain" height={20} src={affiliation.logoUrl} width={20} />
      ) : null}
      A {affiliation.organizationName} Group
      {affiliation.initiativeName ? <span className="text-[#94A3B8]"> · {affiliation.initiativeName}</span> : null}
    </p>
  );
}

/** One canonical schedule block, shared by public, member and leader views. */
export function CommunityScheduleBlock({
  schedule,
  changedNote = null,
}: {
  changedNote?: string | null;
  schedule: CommunitySchedule;
}) {
  return (
    <section className={`p-4 ${communityCard}`} aria-label="Next gathering">
      <p className={communityEyebrow}>{schedule.isDated ? "Next gathering" : "Meets"}</p>
      <p className="mt-1.5 text-lg font-black leading-snug text-[#0F172A]">{schedule.headline}</p>
      <p className="mt-0.5 text-sm font-semibold leading-6 text-[#64748B]">{schedule.detail}</p>
      {changedNote ? (
        <p className="mt-2 rounded-2xl bg-[#EBF2FF] px-3 py-2 text-xs font-bold text-[#1D4ED8]">{changedNote}</p>
      ) : null}
      <p className="mt-2.5 border-t border-[#EAF2FF] pt-2.5 text-sm font-semibold leading-6 text-[#475569]">
        {schedule.location}
      </p>
    </section>
  );
}

/** Leader announcement with a minimal per-member unread signal. */
export function CommunityAnnouncementCard({
  feed,
  isPreview = false,
}: {
  feed: CommunityAnnouncementFeed;
  isPreview?: boolean;
}) {
  if (!feed.latest) {
    return null;
  }

  return (
    <section className={`p-4 ${communityCard}`} aria-label="Latest update">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={communityEyebrow}>Latest update</p>
        <div className="flex items-center gap-2">
          {feed.unreadCount > 0 ? <span className={communityChip}>{feed.unreadCount} new</span> : null}
          {isPreview ? <PreviewBadge /> : null}
        </div>
      </div>

      <p className="mt-1.5 text-base font-black leading-snug text-[#0F172A]">{feed.latest.title}</p>
      {feed.latest.body ? (
        <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{feed.latest.body}</p>
      ) : null}
      <p className={`mt-2 ${communityFieldLabel}`}>From {feed.latest.postedBy}</p>
    </section>
  );
}

/**
 * Group-shared prayer. Only requests explicitly shared with the Group reach
 * this component — leader-only prayer and private personal prayer are
 * excluded upstream by visibility, not filtered here.
 */
export function CommunityPrayerCard({
  isPreview = false,
  requests,
}: {
  isPreview?: boolean;
  requests: readonly CommunityPrayerRequest[];
}) {
  return (
    <section className={`p-4 ${communityCard}`} aria-label="Shared prayer">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={communityEyebrow}>Shared prayer</p>
        {isPreview ? <PreviewBadge /> : null}
      </div>

      <div className="mt-3 grid gap-2">
        {requests.length ? (
          requests.map((request) => (
            <article className="rounded-2xl bg-[#F8FBFF] p-3" key={request.id}>
              <p className="text-sm font-semibold leading-6 text-[#0F172A]">{request.request}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={communityChipMuted}>{request.authorName ?? "Shared anonymously"}</span>
                {request.answeredNote ? (
                  <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#15803D]">
                    Answered
                  </span>
                ) : null}
                <span className="ml-auto text-xs font-bold text-[#1D4ED8]">
                  {request.hasPrayed ? "Prayed" : "Mark prayed"}
                  {request.prayedCount > 0 ? ` · ${request.prayedCount}` : ""}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl bg-[#F8FBFF] px-3 py-3 text-sm font-semibold leading-6 text-[#64748B]">
            Nothing shared with the group yet.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-[#64748B]">
        Only requests shared with the group appear here. Private prayer stays private.
      </p>
    </section>
  );
}

/**
 * The permission ladder. The same identity and the same Group Home gain
 * capability — the surface is never replaced and no new account is created.
 */
export function CommunityRoleCard({ isPreview = false, role }: { isPreview?: boolean; role: CommunityRole }) {
  const capabilities = capabilitiesForRole(role);
  const rows: Array<{ allowed: boolean; label: string }> = [
    { allowed: capabilities.canSeeGroupBasics, label: "Schedule, announcements, shared prayer, own Journeys" },
    { allowed: capabilities.canSeeDelegatedTask, label: "Delegated task from the leader" },
    { allowed: capabilities.canSeeMemberProgress, label: "Member roster and Journey progress" },
    { allowed: capabilities.canManageGroup, label: "Group settings, publishing, invitations" },
    { allowed: capabilities.canSeePrivateReflections, label: "Other members' private reflections" },
  ];

  return (
    <section className={`p-4 ${communityCard}`} aria-label="Role">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={communityEyebrow}>Viewing as</p>
        <div className="flex items-center gap-2">
          <span className={communityChip}>{communityRoleLabel[role]}</span>
          {isPreview ? <PreviewBadge /> : null}
        </div>
      </div>

      <ul className="mt-3 grid gap-1.5">
        {rows.map((row) => (
          <li className="flex items-start gap-2 text-sm font-semibold leading-6" key={row.label}>
            <span aria-hidden="true" className={row.allowed ? "text-[#15803D]" : "text-[#94A3B8]"}>
              {row.allowed ? "✓" : "—"}
            </span>
            <span className={row.allowed ? "text-[#0F172A]" : "text-[#94A3B8]"}>{row.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs font-semibold leading-5 text-[#64748B]">
        Same person, same Group Home, same history. Permissions expand — the surface does not change.
      </p>
    </section>
  );
}

/** Leader-side summary. Every number here already exists in DOS today. */
export function CommunityLeaderSummaryCard({ summary }: { summary: CommunityLeaderSummary }) {
  const tiles: Array<{ label: string; value: string }> = [
    { label: "Active members", value: String(summary.activeMemberCount) },
    { label: "Join requests", value: String(summary.pendingJoinRequestCount) },
    { label: "Not started", value: String(summary.notStartedCount) },
  ];

  return (
    <section className={`p-4 ${communityCard}`} aria-label="Group summary">
      <p className={communityEyebrow}>Your group</p>
      {summary.activeJourneyTitle ? (
        <p className="mt-1.5 text-base font-black text-[#0F172A]">{summary.activeJourneyTitle}</p>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div className="rounded-2xl bg-[#F8FBFF] px-3 py-2.5" key={tile.label}>
            <p className="text-xl font-black leading-none text-[#0F172A]">{tile.value}</p>
            <p className={`mt-1 ${communityFieldLabel}`}>{tile.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * National directory concept. Deliberately shows structure and no live
 * numbers — USA-173 must define what "active" means before any figure here
 * can be trusted.
 */
export function CommunityMapConcept({ regions }: { regions: readonly CommunityRegionSummary[] }) {
  return (
    <section className={`p-4 ${communityCard}`} aria-label="National directory concept">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={communityEyebrow}>National directory</p>
        <PreviewBadge label="Concept" />
      </div>

      <p className="mt-1.5 text-sm font-semibold leading-6 text-[#475569]">
        Groups aggregated by state and city. Never member level, never prayer content.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {regions.map((region) => (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FBFF] px-3 py-2.5" key={region.stateCode}>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#0F172A]">{region.state}</p>
              <p className="truncate text-xs font-semibold text-[#64748B]">{region.cities.join(" · ")}</p>
            </div>
            <span className="shrink-0 text-lg font-black text-[#1D4ED8]">{region.groupCount}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-2xl bg-[#FFFBEB] px-3 py-2 text-xs font-semibold leading-5 text-[#92400E]">
        Concept only. Counts stay unpublished until USA-173 defines an active Group, an active participant, a
        gathering held, and the inactivity cutoff.
      </p>
    </section>
  );
}

/** Affiliation state for the leader/publishing view. */
export function CommunityPublishingCard({ affiliation }: { affiliation: CommunityAffiliation | null }) {
  if (!affiliation) {
    return (
      <section className={`p-4 ${communityCard}`} aria-label="Publishing">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={communityEyebrow}>Publishing</p>
          <PreviewBadge />
        </div>
        <p className="mt-1.5 text-base font-black text-[#0F172A]">Independent group</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
          Private to you and your members. It is not listed publicly and is not a USA Missionaries Group.
        </p>
      </section>
    );
  }

  const statusCopy: Record<CommunityAffiliation["publicationStatus"], string> = {
    approved: `Published in the ${affiliation.organizationName} directory.`,
    not_submitted: `Affiliated with ${affiliation.organizationName}. Not submitted for public listing.`,
    pending: `Submitted to ${affiliation.organizationName} for public listing.`,
  };

  return (
    <section className={`p-4 ${communityCard}`} aria-label="Publishing">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={communityEyebrow}>Publishing</p>
        <PreviewBadge />
      </div>
      <p className="mt-1.5 text-base font-black text-[#0F172A]">
        {affiliation.organizationName}
        {affiliation.initiativeName ? ` · ${affiliation.initiativeName}` : ""}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">
        {statusCopy[affiliation.publicationStatus]}
      </p>
    </section>
  );
}
