import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  groupMemberSessionCookieName,
  loadGroupMemberPortalData,
  type GroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  requestGroupMemberAccess,
  signOutGroupMember,
  submitMemberPrayerRequest,
  submitMemberRsvp,
  updateMemberNotificationPreferences,
} from "./actions";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Group Member Access | DOS",
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function stateMessage(value: string | null) {
  switch (value) {
    case "access-expired":
      return "That access link has expired. Request a fresh link from your group leader.";
    case "access-requested":
      return "If that email belongs to an active member, a fresh access link can be sent by the group leader.";
    case "access-unavailable":
      return "Member access is not configured yet.";
    case "preferences-error":
      return "Preferences could not be saved.";
    case "preferences-saved":
      return "Preferences saved.";
    case "prayer-error":
      return "Prayer request could not be sent.";
    case "prayer-missing":
      return "Add a title and request before sending.";
    case "prayer-sent":
      return "Prayer request sent to your group leaders.";
    case "rsvp-closed":
      return "RSVP is closed for that gathering.";
    case "rsvp-error":
      return "RSVP could not be saved.";
    case "rsvp-saved":
      return "RSVP saved.";
    case "signed-in":
      return "You are signed in for this group.";
    case "signin-required":
      return "Sign in from your member access link first.";
    default:
      return "";
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function preferenceLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function preferenceEnabled(data: GroupMemberPortalData, notificationType: string) {
  const preference = data.preferences.find((item) => item.channel === "email" && item.notificationType === notificationType);

  return preference?.enabled ?? true;
}

async function loadPortal(slug: string) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Member access is temporarily unavailable." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;

  return loadGroupMemberPortalData(createSupabaseAdminClient(), {
    sessionToken,
    slug,
  });
}

export default async function GroupMemberPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const state = Array.isArray(query.state) ? query.state[0] : query.state ?? null;
  const message = stateMessage(state);
  const portalResult = await loadPortal(slug);

  if ("error" in portalResult && portalResult.error === "Group not found.") {
    notFound();
  }

  if (!portalResult.data) {
    return (
      <main className="min-h-screen bg-[#0B0D10] px-4 py-6 text-[#F5F3EE] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
          <Link className="text-xs font-black uppercase tracking-[0.2em] text-[#C2A14E]" href={publicGroupPath(slug)}>
            Back to Group
          </Link>
          <section className="mt-5 rounded-2xl border border-white/12 bg-[#12151A] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C2A14E]">Member Access</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-white">Sign in to your group.</h1>
            {message ? <p className="mt-4 rounded-xl border border-[#C2A14E]/35 bg-[#C2A14E]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#F5F3EE]">{message}</p> : null}
            <form action={requestGroupMemberAccess} className="mt-5 grid gap-3">
              <input name="slug" type="hidden" value={slug} />
              <label className="grid gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Email</span>
                <input className="min-h-12 rounded-xl border border-white/12 bg-[#0B0D10] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#C2A14E]" name="email" required type="email" />
              </label>
              <button className="inline-flex min-h-12 items-center justify-center rounded-sm border border-[#C2A14E] bg-[#C2A14E] px-6 text-xs font-black uppercase tracking-[0.2em] text-[#0B0D10] transition-colors hover:bg-[#D4B665]" type="submit">
                Request Access Link
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const data = portalResult.data;
  const nextGathering = data.nextGathering;
  const notificationTypes = [
    "gathering_reminder",
    "schedule_change",
    "cancellation",
    "announcement",
    "prayer_update",
    "rsvp_reminder",
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-[#DCEBFF] bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]" href={publicGroupPath(data.group.slug)}>
                {data.group.name}
              </Link>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-[#0F172A] sm:text-3xl">Member Portal</h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#64748B]">{data.group.tagline}</p>
            </div>
            <form action={signOutGroupMember}>
              <input name="slug" type="hidden" value={data.group.slug} />
              <button className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-black text-[#475569] transition-colors hover:bg-[#F8FAFC]" type="submit">
                Sign Out
              </button>
            </form>
          </div>
          {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Next Gathering</p>
            {nextGathering ? (
              <>
                <h2 className="mt-2 text-xl font-black text-[#0F172A]">{nextGathering.title}</h2>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-[#EAF2FF] pb-2">
                    <dt className="font-black text-[#64748B]">When</dt>
                    <dd className="text-right font-bold text-[#0F172A]">{formatDateTime(nextGathering.startsAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-[#EAF2FF] pb-2">
                    <dt className="font-black text-[#64748B]">Where</dt>
                    <dd className="text-right font-bold text-[#0F172A]">{nextGathering.location}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-black text-[#64748B]">RSVP</dt>
                    <dd className="text-right font-bold text-[#0F172A]">{data.rsvp?.response ? preferenceLabel(data.rsvp.response) : "Not set"}</dd>
                  </div>
                </dl>
                <form action={submitMemberRsvp} className="mt-5 grid gap-3">
                  <input name="slug" type="hidden" value={data.group.slug} />
                  <input name="gatheringId" type="hidden" value={nextGathering.id} />
                  <div className="grid grid-cols-3 gap-2">
                    {(["going", "maybe", "not_going"] as const).map((response) => (
                      <label className="cursor-pointer rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-center text-xs font-black text-[#475569] has-[:checked]:border-[#2563EB] has-[:checked]:bg-[#EBF2FF] has-[:checked]:text-[#1D4ED8]" key={response}>
                        <input className="sr-only" defaultChecked={data.rsvp?.response === response} name="response" required type="radio" value={response} />
                        {response === "not_going" ? "Not Going" : preferenceLabel(response)}
                      </label>
                    ))}
                  </div>
                  <input className="min-h-11 rounded-xl border border-[#D6E4F7] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]" defaultValue={data.rsvp?.note ?? ""} maxLength={400} name="note" placeholder="Optional note" />
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.18)]" type="submit">
                    Save RSVP
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">No gathering is scheduled yet.</p>
            )}
          </article>

          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Latest Update</p>
            {data.updates.length ? (
              <div className="mt-3 grid gap-3">
                {data.updates.slice(0, 2).map((update) => (
                  <div className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-3" key={update.id}>
                    <p className="text-sm font-black text-[#0F172A]">{update.title}</p>
                    {update.body ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{update.body}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">No member updates yet.</p>
            )}
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Prayer</p>
            <form action={submitMemberPrayerRequest} className="mt-3 grid gap-3">
              <input name="slug" type="hidden" value={data.group.slug} />
              <input className="min-h-11 rounded-xl border border-[#D6E4F7] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2563EB]" maxLength={120} name="title" placeholder="Title" required />
              <textarea className="min-h-28 rounded-xl border border-[#D6E4F7] bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#2563EB]" maxLength={1200} name="request" placeholder="Share with group leaders" required />
              <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white" type="submit">
                Send Prayer Request
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Resources</p>
            {data.resources.length ? (
              <div className="mt-3 grid gap-2">
                {data.resources.slice(0, 5).map((resource) => (
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
              <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">No member resources yet.</p>
            )}
          </article>

          <article className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Notifications</p>
            <form action={updateMemberNotificationPreferences} className="mt-3 grid gap-2">
              <input name="slug" type="hidden" value={data.group.slug} />
              <input name="channel" type="hidden" value="email" />
              {notificationTypes.map((notificationType) => (
                <label className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 text-sm font-bold text-[#475569]" key={notificationType}>
                  <span>{preferenceLabel(notificationType)}</span>
                  <input defaultChecked={preferenceEnabled(data, notificationType)} name={notificationType} type="checkbox" />
                </label>
              ))}
              <button className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#1D4ED8]" type="submit">
                Save Preferences
              </button>
            </form>
          </article>
        </section>

        <section className="rounded-2xl border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563EB]">Attendance</p>
          {data.attendance.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.attendance.slice(0, 6).map((attendance) => (
                <div className="rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2" key={attendance.id}>
                  <p className="text-sm font-black text-[#0F172A]">{preferenceLabel(attendance.status)}</p>
                  {attendance.notes ? <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">{attendance.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-[#64748B]">Attendance history will appear after leaders record gatherings.</p>
          )}
        </section>
      </div>
    </main>
  );
}
