import Link from "next/link";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";
import type { GroupMemberPortalData } from "@/src/lib/groups/member-access";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { GroupTemplateArtwork } from "./GroupTemplateVisual";
import { MemberHomeInstallPrompt } from "./MemberHomeInstallPrompt";
import { signOutGroupMember } from "./[slug]/member/actions";

type GroupHomeMemberViewProps = {
  data: GroupMemberPortalData;
  message?: string | null;
};

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: groupDisplayTimeZone,
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: groupDisplayTimeZone,
    timeStyle: "short",
  }).format(date);
}

export function GroupHomeMemberView({
  data,
  message = null,
}: GroupHomeMemberViewProps) {
  const nextGathering = data.nextGathering;
  const groupPath = publicGroupPath(data.group.slug);
  const activeAssignments = data.journeyAssignments.filter((assignment) => assignment.status !== "completed");
  const completedAssignments = data.journeyAssignments.filter((assignment) => assignment.status === "completed");
  const showInstallPrompt = message === groupHomeStateMessage("signed-in");
  const visualInput = {
    name: data.group.name,
    slug: data.group.slug,
    tagline: data.group.tagline,
    type: data.group.type,
  };

  return (
    <main className="min-h-screen bg-[#080A0D] text-[#F5F3EE]">
      <div className="relative isolate mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 sm:py-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-30 opacity-28 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-20 h-56 bg-[linear-gradient(110deg,rgba(248,197,106,0.18),transparent_58%)]" />
        <header className="grid gap-3 rounded-lg border border-[#C2A14E]/22 bg-[#111418]/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">DOS Home</p>
                <h1 className="mt-2 text-3xl font-black leading-none text-white sm:text-4xl">{data.identity.name}</h1>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/68">{data.group.name}</p>
              </div>
              <form action={signOutGroupMember}>
                <input name="slug" type="hidden" value={data.group.slug} />
                <button className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/14 bg-white/[0.04] px-3 text-xs font-black text-white/72" type="submit">
                  Sign Out
                </button>
              </form>
            </div>
            {message ? <p className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-100">{message}</p> : null}
          </div>
          <GroupTemplateArtwork input={visualInput} size="member" />
        </header>

        {showInstallPrompt ? <MemberHomeInstallPrompt identityId={data.identity.id} /> : null}

        <section className="rounded-lg border border-[#C2A14E]/22 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Active Journeys</p>
            <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
              {activeAssignments.length}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {activeAssignments.length ? activeAssignments.map((assignment) => (
              <MemberJourneySummaryRow
                assignment={assignment}
                groupPath={groupPath}
                key={assignment.id}
                progress={data.journeyProgress.filter((item) => item.resourceSlug === assignment.resourceSlug)}
              />
            )) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold leading-6 text-white/60">No active Journey is assigned yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Group</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <GroupHomeFact label="Group" value={data.group.name} />
            <GroupHomeFact label="Rhythm" value={data.group.rhythm} />
            <GroupHomeFact label="Next" value={nextGathering ? `${formatDate(nextGathering.startsAt)} · ${formatTime(nextGathering.startsAt)}` : "TBD"} />
          </div>
        </section>

        {completedAssignments.length ? (
          <section className="rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">
                Completed ({completedAssignments.length})
                <span className="text-white/35">Open</span>
              </summary>
              <div className="mt-3 grid gap-2">
                {completedAssignments.map((assignment) => (
                  <MemberJourneySummaryRow
                    assignment={assignment}
                    groupPath={groupPath}
                    key={assignment.id}
                    progress={data.journeyProgress.filter((item) => item.resourceSlug === assignment.resourceSlug)}
                  />
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <footer className="pb-2 text-center text-xs font-bold text-white/42">
          <Link className="text-[#F8C56A] underline-offset-4 hover:underline" href={groupPath}>
            {data.group.name}
          </Link>
          {" · "}Scoped DOS member access
        </footer>
      </div>
    </main>
  );
}

function MemberJourneySummaryRow({
  assignment,
  groupPath,
  progress,
}: {
  assignment: GroupMemberPortalData["journeyAssignments"][number];
  groupPath: string;
  progress: GroupMemberPortalData["journeyProgress"];
}) {
  const resource = getDosResourceBySlug(assignment.resourceSlug);
  const sessions = resource?.content?.guidedResource?.sessions ?? [];
  const completedCount = sessions.filter((session) => progress.some((item) => item.sessionId === session.id && item.completedAt)).length;
  const percent = sessions.length ? Math.round((completedCount / sessions.length) * 100) : 0;
  const isComplete = assignment.status === "completed";
  const unit = resource?.type === "reading_plan" ? "days" : "weeks";

  return (
    <Link
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 transition-colors hover:border-[#C2A14E]/40"
      href={`${groupPath}/journey?resource=${encodeURIComponent(assignment.resourceSlug)}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {resource?.coverImage ? (
          <img
            alt={resource.coverImage.alt}
            className="aspect-[2/3] w-10 shrink-0 rounded-md border border-white/10 object-cover"
            src={resource.coverImage.src}
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{resource?.title ?? assignment.resourceSlug}</p>
          <p className="mt-1 text-xs font-semibold text-white/60">
            {sessions.length ? `${completedCount}/${sessions.length} ${unit} complete` : "Ready to begin"}
            {isComplete ? " · Complete" : ""}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-[#C2A14E]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
      <span className="shrink-0 rounded-sm bg-[#C2A14E] px-3 py-2 text-xs font-black text-[#080A0D]">{isComplete ? "Review" : "Continue"}</span>
    </Link>
  );
}

function GroupHomeFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-white">{value}</p>
    </div>
  );
}
