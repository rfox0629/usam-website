import Link from "next/link";
// The client-safe path module, not the `server-only` public-site module: this
// view also renders inside the DOS leader app as the participant preview.
import { publicGroupPath } from "@/src/lib/groups/public-site-path";
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";
import type { GroupMemberPortalData } from "@/src/lib/groups/member-access";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { GroupTemplateArtwork } from "./GroupTemplateVisual";
import {
  communityCard,
  communityCardInteractive,
  communityChip,
  communityEyebrow,
  communityFieldLabel,
  communityOrgLabel,
  communityPage,
} from "./community-design";
import { buildCommunitySchedule } from "./community-schedule";
import { MemberHomeInstallPrompt } from "./MemberHomeInstallPrompt";
import { signOutGroupMember } from "./[slug]/member/actions";

type GroupHomeMemberViewProps = {
  data: GroupMemberPortalData;
  message?: string | null;
  /** Restrained organization co-branding. Independent Groups pass nothing. */
  organizationName?: string | null;
  /**
   * USA-170 Preview as Member: when set (with readOnly), a Journey row becomes
   * a button that opens the same shared Journey view inside the preview
   * overlay instead of navigating the leader away. Without it, read-only rows
   * stay inert.
   */
  onOpenJourney?: (resourceSlug: string) => void;
  /**
   * Leader preview mode. Structure and styling are identical to the
   * participant's real secure link — only the interactive edges go inert, so a
   * leader can never sign a participant out, navigate into their Journey, or
   * touch their stored install state from inside the preview.
   */
  readOnly?: boolean;
};

/**
 * One class string for both the live sign-out submit and the inert preview
 * stand-in, so preview parity cannot drift through a copied class list.
 */
const signOutButtonClass = "inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#475569] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]";

export function groupHomeStateMessage(value: string | null) {
  switch (value) {
    case "access-expired":
      return "That link has expired. Ask your group leader for a fresh one.";
    case "access-invalid":
      return "That access link is not valid. Ask your group leader for a fresh one.";
    case "access-requested":
      return "If that email belongs to an active member, your leader can send a fresh link.";
    case "access-unavailable":
      return "Group Home sign-in is not ready yet.";
    case "preferences-error":
      return "Updates could not be saved.";
    case "preferences-saved":
      return "Updates saved.";
    case "prayer-error":
      return "Prayer could not be sent.";
    case "prayer-missing":
      return "Add a title and request before sending.";
    case "prayer-sent":
      return "Prayer sent to your group leaders.";
    case "rsvp-closed":
      return "RSVP is closed for that gathering.";
    case "rsvp-error":
      return "RSVP could not be saved.";
    case "rsvp-saved":
      return "RSVP saved.";
    case "signed-in":
      return "You are signed in.";
    case "signin-required":
      return "Sign in from your group link first.";
    default:
      return "";
  }
}

export function GroupHomeMemberView({
  data,
  message = null,
  onOpenJourney,
  organizationName = null,
  readOnly = false,
}: GroupHomeMemberViewProps) {
  const groupPath = publicGroupPath(data.group.slug);
  const activeAssignments = data.journeyAssignments.filter((assignment) => assignment.status !== "completed");
  const completedAssignments = data.journeyAssignments.filter((assignment) => assignment.status === "completed");

  // The member Home reads the same canonical schedule the public page reads.
  // A leader time change in DOS lands here without a second copy of the data.
  const schedule = buildCommunitySchedule({
    location: data.nextGathering?.location ?? data.group.location,
    nextGatheringStartsAt: data.nextGathering?.startsAt,
    nextGatheringTitle: data.nextGathering?.title,
    rhythmLabel: data.group.rhythm,
    timeZone: groupDisplayTimeZone,
  });

  // The participant's real link owns the page, so it is the document `<main>`.
  // The leader preview renders the identical tree nested inside the DOS app,
  // where a second `<main>` would be invalid, so the shell tag is the only
  // difference between the two — every class below is shared.
  const Shell = readOnly ? "div" : "main";

  return (
    <Shell className={communityPage}>
      <div className="mx-auto grid w-full max-w-2xl gap-3 px-4 py-5 pb-10 sm:px-6">
        {/* 1 — Group identity first. Tanner should read "this is my group". */}
        <header className={`p-4 ${communityCard}`}>
          <GroupTemplateArtwork
            input={{ name: data.group.name, slug: data.group.slug, tagline: data.group.tagline, type: data.group.type }}
            size="member"
          />

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {organizationName ? (
                <p className={communityOrgLabel}>A {organizationName} Group</p>
              ) : (
                <p className={communityEyebrow}>Group Home</p>
              )}
              <h1 className="mt-1.5 text-2xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-3xl">
                {data.group.name}
              </h1>
              {data.group.tagline ? (
                <p className="mt-1 text-sm font-bold text-[#1D4ED8]">{data.group.tagline}</p>
              ) : null}
              <p className="mt-2 text-sm font-semibold text-[#64748B]">Signed in as {data.identity.name}</p>
            </div>
            {readOnly ? (
              <span aria-disabled="true" className={`${signOutButtonClass} cursor-default`}>
                Sign out
              </span>
            ) : (
              <form action={signOutGroupMember}>
                <input name="slug" type="hidden" value={data.group.slug} />
                <button className={signOutButtonClass} type="submit">
                  Sign out
                </button>
              </form>
            )}
          </div>

          {message ? (
            <p className="mt-3 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm font-bold text-[#15803D]">
              {message}
            </p>
          ) : null}
        </header>

        {/* 2 — Next gathering, from the one canonical schedule. */}
        <section className={`p-4 ${communityCard}`} aria-label="Next gathering">
          <p className={communityEyebrow}>{schedule.isDated ? "Next gathering" : "Meets"}</p>
          <p className="mt-1.5 text-lg font-black leading-snug text-[#0F172A]">{schedule.headline}</p>
          <p className="mt-0.5 text-sm font-semibold leading-6 text-[#64748B]">{schedule.detail}</p>
          <p className="mt-2.5 border-t border-[#EAF2FF] pt-2.5 text-sm font-semibold leading-6 text-[#475569]">
            {schedule.location}
          </p>
        </section>

        {/* 3 — Current Journey with one obvious Continue. */}
        <section className={`p-4 ${communityCard}`} aria-label="Current Journey">
          <p className={communityEyebrow}>Current</p>
          <div className="mt-3 grid gap-2">
            {activeAssignments.length ? (
              activeAssignments.map((assignment) => (
                <MemberJourneySummaryRow
                  assignment={assignment}
                  groupPath={groupPath}
                  key={assignment.id}
                  onOpenJourney={onOpenJourney}
                  progress={data.journeyProgress.filter((item) => item.resourceSlug === assignment.resourceSlug)}
                  readOnly={readOnly}
                />
              ))
            ) : (
              <p className="rounded-2xl bg-[#F8FBFF] px-3 py-3 text-sm font-semibold leading-6 text-[#64748B]">
                No Journey is assigned yet. Your leader will send one when it is ready.
              </p>
            )}
          </div>
        </section>

        {/* 4 — Completed history stays available, quietly. */}
        {completedAssignments.length ? (
          <section className={`p-4 ${communityCard}`} aria-label="Completed">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className={communityEyebrow}>Completed ({completedAssignments.length})</span>
                <span className="text-xs font-bold text-[#1D4ED8]">Show</span>
              </summary>
              <div className="mt-3 grid gap-2">
                {completedAssignments.map((assignment) => (
                  <MemberJourneySummaryRow
                    assignment={assignment}
                    groupPath={groupPath}
                    key={assignment.id}
                    onOpenJourney={onOpenJourney}
                    progress={data.journeyProgress.filter((item) => item.resourceSlug === assignment.resourceSlug)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {/* 5 — Compact install help, last, collapsed, hidden in standalone. */}
        <MemberHomeInstallPrompt identityId={data.identity.id} readOnly={readOnly} />

        <footer className="pt-2 text-center text-xs font-bold text-[#64748B]">
          {readOnly ? (
            <span className="text-[#1D4ED8]">{data.group.name}</span>
          ) : (
            <Link className="text-[#1D4ED8] underline-offset-4 hover:underline" href={groupPath}>
              {data.group.name}
            </Link>
          )}
          {" · "}Scoped DOS member access
        </footer>
      </div>
    </Shell>
  );
}

function MemberJourneySummaryRow({
  assignment,
  groupPath,
  onOpenJourney,
  progress,
  readOnly = false,
}: {
  assignment: GroupMemberPortalData["journeyAssignments"][number];
  groupPath: string;
  onOpenJourney?: (resourceSlug: string) => void;
  progress: GroupMemberPortalData["journeyProgress"];
  readOnly?: boolean;
}) {
  const resource = getDosResourceBySlug(assignment.resourceSlug);
  const sessions = resource?.content?.guidedResource?.sessions ?? [];
  const completedCount = sessions.filter((session) => progress.some((item) => item.sessionId === session.id && item.completedAt)).length;
  const percent = sessions.length ? Math.round((completedCount / sessions.length) * 100) : 0;
  const isComplete = assignment.status === "completed";
  const unit = resource?.type === "reading_plan" ? "days" : "weeks";

  // One body, two wrappers. The preview renders the participant's row exactly
  // as they see it; only the navigation is withheld.
  const rowClassName = `flex min-w-0 items-center gap-3 p-3 ${communityCardInteractive}`;
  const rowBody = (
    <>
      {resource?.coverImage ? (
        <img
          alt={resource.coverImage.alt}
          className="aspect-[2/3] w-11 shrink-0 rounded-md border border-[#DCEBFF] bg-[#F8FBFF] object-cover"
          src={resource.coverImage.src}
        />
      ) : null}

      <span className="min-w-0 flex-1">
        {/* Wraps to two lines rather than truncating: at 390px — and inside the
            narrower leader preview frame — "Discipleship" was clipping to
            "Disci…". A Journey title is the one thing on this row that must
            stay readable. */}
        <span className="block break-words text-base font-black leading-snug text-[#0F172A] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
          {resource?.title ?? assignment.resourceSlug}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-[#64748B]">
          {sessions.length ? `${completedCount}/${sessions.length} ${unit} complete` : "Ready to begin"}
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
          <span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${percent}%` }} />
        </span>
      </span>

      <span className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-xs font-bold text-white">
        {isComplete ? "Review" : "Continue"}
      </span>
    </>
  );

  if (readOnly) {
    // Preview as Member: same row, same Continue — the click opens the shared
    // Journey view inside the overlay rather than navigating the leader away.
    if (onOpenJourney) {
      return (
        <button className={`${rowClassName} w-full text-left`} onClick={() => onOpenJourney(assignment.resourceSlug)} type="button">
          {rowBody}
        </button>
      );
    }

    return <div aria-disabled="true" className={rowClassName}>{rowBody}</div>;
  }

  return (
    <Link className={rowClassName} href={`${groupPath}/journey?resource=${encodeURIComponent(assignment.resourceSlug)}`}>
      {rowBody}
    </Link>
  );
}

/**
 * Reserved slot for leader announcements. The `dos_group_updates` table exists
 * but is not yet projected into the member portal payload, and there is no
 * per-member read state — both are USA-173 work. Rendering nothing is
 * deliberate: an empty inbox is better than an invented one.
 */
export function MemberAnnouncementsSlot({ unreadCount = 0, latest = null }: { latest?: { body: string | null; title: string } | null; unreadCount?: number }) {
  if (!latest) {
    return null;
  }

  return (
    <section className={`p-4 ${communityCard}`} aria-label="Latest update">
      <div className="flex items-center justify-between gap-3">
        <p className={communityEyebrow}>Latest update</p>
        {unreadCount > 0 ? <span className={communityChip}>{unreadCount} new</span> : null}
      </div>
      <p className="mt-1.5 text-base font-black leading-snug text-[#0F172A]">{latest.title}</p>
      {latest.body ? <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{latest.body}</p> : null}
      <p className={`mt-2 ${communityFieldLabel}`}>From your leader</p>
    </section>
  );
}
