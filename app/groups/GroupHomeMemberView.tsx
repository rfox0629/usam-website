import Link from "next/link";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";
import {
  routeBuilderComingSoonLabel,
  routeBuilderComingSoonStatus,
} from "@/src/lib/groups/route-builder";
import type { GroupMemberPortalData } from "@/src/lib/groups/member-access";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { GroupTemplateArtwork } from "./GroupTemplateVisual";
import {
  signOutGroupMember,
  submitMemberPrayerRequest,
  submitMemberRsvp,
  updateMemberNotificationPreferences,
} from "./[slug]/member/actions";

type GroupHomeMemberViewProps = {
  data: GroupMemberPortalData;
  message?: string | null;
};

const notificationTypes = [
  "gathering_reminder",
  "schedule_change",
  "cancellation",
  "announcement",
  "prayer_update",
  "rsvp_reminder",
];

export function groupHomeStateMessage(value: string | null) {
  switch (value) {
    case "access-expired":
      return "That link has expired. Ask your group leader for a fresh one.";
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

function label(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function preferenceEnabled(data: GroupMemberPortalData, notificationType: string) {
  const preference = data.preferences.find((item) => item.channel === "email" && item.notificationType === notificationType);

  return preference?.enabled ?? true;
}

function RouteBuilderPlaceholder({ tone = "member" }: { tone?: "leader" | "member" }) {
  return (
    <div aria-disabled="true" className="overflow-hidden rounded-lg border border-dashed border-[#C2A14E]/42 bg-[#111418] px-3 py-3 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Route</p>
        <span className="rounded-sm border border-[#C2A14E]/35 bg-[#C2A14E]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#F8C56A]">
          {routeBuilderComingSoonStatus}
        </span>
      </div>
      <p className="mt-2 text-sm font-black text-white">{routeBuilderComingSoonLabel}</p>
      <p className="mt-1 text-sm leading-5 text-white/62">
        {tone === "leader"
          ? "Plan and share the route for this gathering."
          : "Route details will appear here when your leader shares them."}
      </p>
    </div>
  );
}

export function GroupHomeMemberView({
  data,
  message = null,
}: GroupHomeMemberViewProps) {
  const nextGathering = data.nextGathering;
  const latestUpdate = data.updates[0] ?? null;
  const earlierUpdates = data.updates.slice(1);
  const groupPath = publicGroupPath(data.group.slug);
  const visualInput = {
    name: data.group.name,
    slug: data.group.slug,
    tagline: data.group.tagline,
    type: data.group.type,
  };

  return (
    <main className="min-h-screen bg-[#080A0D] text-[#F5F3EE]">
      <div className="relative isolate mx-auto grid w-full max-w-4xl gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-30 opacity-28 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-20 h-56 bg-[linear-gradient(110deg,rgba(248,197,106,0.18),transparent_58%)]" />
        <header className="grid gap-3 rounded-lg border border-[#C2A14E]/22 bg-[#111418]/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]" href={groupPath}>
                  Group Home
                </Link>
                <h1 className="mt-2 text-3xl font-black leading-none text-white sm:text-4xl">{data.group.name}</h1>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/68">{data.group.tagline || data.group.type}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={signOutGroupMember}>
                  <input name="slug" type="hidden" value={data.group.slug} />
                  <button className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/14 bg-white/[0.04] px-3 text-xs font-black text-white/72" type="submit">
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
            {message ? <p className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-100">{message}</p> : null}
          </div>
          <GroupTemplateArtwork input={visualInput} size="member" />
        </header>

        <section className="rounded-lg border border-[#C2A14E]/18 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Next Gathering</p>
          {nextGathering ? (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <GroupHomeFact label="Date" value={formatDate(nextGathering.startsAt)} />
                <GroupHomeFact label="Time" value={formatTime(nextGathering.startsAt)} />
                <GroupHomeFact label="Where" value={nextGathering.location} />
              </div>
              {data.group.routeBuilderEligible ? <RouteBuilderPlaceholder /> : null}
              <form action={submitMemberRsvp} className="grid gap-3">
                <input name="slug" type="hidden" value={data.group.slug} />
                <input name="gatheringId" type="hidden" value={nextGathering.id} />
                <div className="grid grid-cols-3 gap-2">
                  {(["going", "maybe", "not_going"] as const).map((response) => (
                    <label className="cursor-pointer rounded-lg border border-white/12 bg-white/[0.04] px-2 py-3 text-center text-xs font-black text-white/65 has-[:checked]:border-[#C2A14E] has-[:checked]:bg-[#C2A14E]/14 has-[:checked]:text-[#F8C56A]" key={response}>
                      <input className="sr-only" defaultChecked={data.rsvp?.response === response} name="response" required type="radio" value={response} />
                      {response === "not_going" ? "Not Going" : label(response)}
                    </label>
                  ))}
                </div>
                <input className="min-h-11 rounded-lg border border-white/12 bg-[#080A0D] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]" defaultValue={data.rsvp?.note ?? ""} maxLength={400} name="note" placeholder="Optional note" />
                <button className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C2A14E] px-4 text-sm font-black text-[#080A0D] shadow-[0_12px_28px_rgba(194,161,78,0.18)]" type="submit">
                  Save RSVP
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-white/60">No gathering is scheduled yet.</p>
          )}
        </section>

        {data.journeyAssignments.length ? (
          <section className="rounded-lg border border-[#C2A14E]/22 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Your Journey</p>
            <div className="mt-3 grid gap-2">
              {data.journeyAssignments.slice(0, 3).map((assignment) => {
                const resource = getDosResourceBySlug(assignment.resourceSlug);
                const sessions = resource?.content?.guidedResource?.sessions ?? [];
                const progressForAssignment = data.journeyProgress.filter((item) => item.resourceSlug === assignment.resourceSlug);
                const completedCount = sessions.filter((session) => progressForAssignment.some((item) => item.sessionId === session.id && item.completedAt)).length;

                return (
                  <Link
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 transition-colors hover:border-[#C2A14E]/40"
                    href={`${publicGroupPath(data.group.slug)}/journey?resource=${encodeURIComponent(assignment.resourceSlug)}`}
                    key={assignment.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">{resource?.title ?? assignment.resourceSlug}</p>
                      <p className="mt-1 text-xs font-semibold text-white/60">
                        {sessions.length ? `${completedCount}/${sessions.length} weeks complete` : "Ready to begin"}
                        {assignment.status === "completed" ? " · Complete" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-sm bg-[#C2A14E] px-3 py-2 text-xs font-black text-[#080A0D]">Open</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Latest Update</p>
          {latestUpdate ? (
            <div className="mt-2">
              <p className="text-base font-black text-white">{latestUpdate.title}</p>
              {latestUpdate.body ? <p className="mt-1 text-sm leading-6 text-white/62">{latestUpdate.body}</p> : null}
              {earlierUpdates.length ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-black text-[#F8C56A]">Earlier updates</summary>
                  <div className="mt-2 grid gap-2">
                    {earlierUpdates.map((update) => (
                      <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white/70" key={update.id}>{update.title}</p>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-white/60">No update right now.</p>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Prayer</p>
            {data.prayerRequests.length ? (
              <div className="mt-3 grid gap-2">
                {data.prayerRequests.slice(0, 2).map((request) => (
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2" key={request.id}>
                    <p className="text-sm font-black text-white">{request.title}</p>
                    <p className="mt-1 text-sm leading-5 text-white/62">{request.request}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <form action={submitMemberPrayerRequest} className="mt-3 grid gap-2">
              <input name="slug" type="hidden" value={data.group.slug} />
              <input className="min-h-11 rounded-lg border border-white/12 bg-[#080A0D] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]" maxLength={120} name="title" placeholder="Title" required />
              <textarea className="min-h-24 rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]" maxLength={1200} name="request" placeholder="Share with leaders" required />
              <button className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C2A14E] px-4 text-sm font-black text-[#080A0D]" type="submit">
                Send Prayer Request
              </button>
            </form>
          </article>

          <article className="rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Resources</p>
            {data.resources.length ? (
              <div className="mt-3 grid gap-2">
                {data.resources.slice(0, 4).map((resource) => (
                  resource.url ? (
                    <a className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-white hover:border-[#C2A14E]/40" href={resource.url} key={resource.id} rel="noreferrer" target="_blank">
                      {resource.title}
                    </a>
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-white" key={resource.id}>{resource.title}</p>
                  )
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold leading-6 text-white/60">No resources yet.</p>
            )}
          </article>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Keep Me Updated</p>
          <form action={updateMemberNotificationPreferences} className="mt-3 grid gap-2">
            <input name="slug" type="hidden" value={data.group.slug} />
            <input name="channel" type="hidden" value="email" />
            <p className="text-sm font-black text-white">Email</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {notificationTypes.map((notificationType) => (
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white/70" key={notificationType}>
                  <span>{label(notificationType)}</span>
                  <input defaultChecked={preferenceEnabled(data, notificationType)} name={notificationType} type="checkbox" />
                </label>
              ))}
            </div>
            <button className="mt-1 inline-flex min-h-11 items-center justify-center rounded-sm border border-[#C2A14E]/40 bg-[#C2A14E]/10 px-4 text-xs font-black text-[#F8C56A]" type="submit">
              Save Updates
            </button>
          </form>
        </section>
        <footer className="pb-2 text-center text-xs font-bold text-white/42">
          Powered by{" "}
          <Link className="text-[#F8C56A] underline-offset-4 hover:underline" href="/groups">
            USA Missionaries Groups
          </Link>
        </footer>
      </div>
    </main>
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
