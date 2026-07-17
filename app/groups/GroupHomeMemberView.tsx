import Link from "next/link";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import {
  routeBuilderComingSoonLabel,
  routeBuilderComingSoonStatus,
} from "@/src/lib/groups/route-builder";
import type { GroupMemberPortalData } from "@/src/lib/groups/member-access";
import {
  signOutGroupMember,
  submitMemberPrayerRequest,
  submitMemberRsvp,
  updateMemberNotificationPreferences,
} from "./[slug]/member/actions";

type GroupHomeMemberViewProps = {
  data: GroupMemberPortalData;
  manageHref?: string | null;
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
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
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
    <div aria-disabled="true" className="rounded-xl border border-dashed border-[#BFDBFE] bg-[#F8FBFF] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Route</p>
        <span className="rounded-full border border-[#BFDBFE] bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">
          {routeBuilderComingSoonStatus}
        </span>
      </div>
      <p className="mt-2 text-sm font-black text-[#0F172A]">{routeBuilderComingSoonLabel}</p>
      <p className="mt-1 text-sm leading-5 text-[#64748B]">
        {tone === "leader"
          ? "Plan and share the route for this gathering."
          : "Route details will appear here when your leader shares them."}
      </p>
    </div>
  );
}

export function GroupHomeMemberView({
  data,
  manageHref = null,
  message = null,
}: GroupHomeMemberViewProps) {
  const nextGathering = data.nextGathering;
  const latestUpdate = data.updates[0] ?? null;
  const earlierUpdates = data.updates.slice(1);
  const groupPath = publicGroupPath(data.group.slug);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <header className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]" href={groupPath}>
                Group Home
              </Link>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-[#0F172A]">{data.group.name}</h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{data.group.tagline || data.group.type}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {manageHref ? (
                <Link className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#F8FBFF] px-3 text-xs font-black text-[#1D4ED8]" href={manageHref}>
                  Manage in DOS
                </Link>
              ) : null}
              <form action={signOutGroupMember}>
                <input name="slug" type="hidden" value={data.group.slug} />
                <button className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-black text-[#475569]" type="submit">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
          {message ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
        </header>

        <section className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Next Gathering</p>
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
                    <label className="cursor-pointer rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] px-2 py-2 text-center text-xs font-black text-[#475569] has-[:checked]:border-[#2563EB] has-[:checked]:bg-[#EBF2FF] has-[:checked]:text-[#1D4ED8]" key={response}>
                      <input className="sr-only" defaultChecked={data.rsvp?.response === response} name="response" required type="radio" value={response} />
                      {response === "not_going" ? "Not Going" : label(response)}
                    </label>
                  ))}
                </div>
                <input className="min-h-10 rounded-xl border border-[#D6E4F7] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]" defaultValue={data.rsvp?.note ?? ""} maxLength={400} name="note" placeholder="Optional note" />
                <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.18)]" type="submit">
                  Save RSVP
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">No gathering is scheduled yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Latest Update</p>
          {latestUpdate ? (
            <div className="mt-2">
              <p className="text-base font-black text-[#0F172A]">{latestUpdate.title}</p>
              {latestUpdate.body ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{latestUpdate.body}</p> : null}
              {earlierUpdates.length ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-black text-[#1D4ED8]">Earlier updates</summary>
                  <div className="mt-2 grid gap-2">
                    {earlierUpdates.map((update) => (
                      <p className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2 text-sm font-bold text-[#475569]" key={update.id}>{update.title}</p>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">No update right now.</p>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Prayer</p>
            {data.prayerRequests.length ? (
              <div className="mt-3 grid gap-2">
                {data.prayerRequests.slice(0, 2).map((request) => (
                  <div className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2" key={request.id}>
                    <p className="text-sm font-black text-[#0F172A]">{request.title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#64748B]">{request.request}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <form action={submitMemberPrayerRequest} className="mt-3 grid gap-2">
              <input name="slug" type="hidden" value={data.group.slug} />
              <input className="min-h-10 rounded-xl border border-[#D6E4F7] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2563EB]" maxLength={120} name="title" placeholder="Title" required />
              <textarea className="min-h-24 rounded-xl border border-[#D6E4F7] bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#2563EB]" maxLength={1200} name="request" placeholder="Share with leaders" required />
              <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white" type="submit">
                Send Prayer Request
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Resources</p>
            {data.resources.length ? (
              <div className="mt-3 grid gap-2">
                {data.resources.slice(0, 4).map((resource) => (
                  resource.url ? (
                    <a className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2 text-sm font-black text-[#0F172A] hover:border-[#BFDBFE]" href={resource.url} key={resource.id} rel="noreferrer" target="_blank">
                      {resource.title}
                    </a>
                  ) : (
                    <p className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2 text-sm font-black text-[#0F172A]" key={resource.id}>{resource.title}</p>
                  )
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">No resources yet.</p>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Keep Me Updated</p>
          <form action={updateMemberNotificationPreferences} className="mt-3 grid gap-2">
            <input name="slug" type="hidden" value={data.group.slug} />
            <input name="channel" type="hidden" value="email" />
            <p className="text-sm font-black text-[#0F172A]">Email</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {notificationTypes.map((notificationType) => (
                <label className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 text-sm font-bold text-[#475569]" key={notificationType}>
                  <span>{label(notificationType)}</span>
                  <input defaultChecked={preferenceEnabled(data, notificationType)} name={notificationType} type="checkbox" />
                </label>
              ))}
            </div>
            <button className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#1D4ED8]" type="submit">
              Save Updates
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function GroupHomeFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-[#0F172A]">{value}</p>
    </div>
  );
}
