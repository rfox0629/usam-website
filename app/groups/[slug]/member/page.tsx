import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type GroupMemberPortalResult,
  groupMemberSessionCookieName,
  loadDemoGroupMemberPortalData,
  loadGroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site-path";
import { loadPublicGroupLeaderNames } from "@/src/lib/groups/group-home-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  communityCard,
  communityEyebrow,
  communityFieldLabel,
  communityInput,
  communityPage,
  communityPrimaryAction,
} from "../../community-design";
import { requestGroupMemberAccess } from "./actions";

/**
 * USA-170 — Group access recovery.
 *
 * This page used to call itself "Sign in to your group." and offer "Request
 * access link". Neither was true. There is no member password to sign in with,
 * and the button minted a token that was never delivered to anyone — while
 * revoking the link the leader had already sent. Tanner pressed it and got
 * "If that email belongs to an active member, your leader can send a fresh
 * link", which described no action the system actually took.
 *
 * It now says exactly what it does: ask the leader to send a new secure link.
 * A DOS account sign-in is offered separately, as a link, because that path
 * authenticates for real — and offering it conditionally on the typed address
 * would leak whether an account exists.
 */

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Get back into your group | DOS",
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Recovery-specific copy. Never claims delivery the system did not perform. */
function recoveryStateMessage(state: string | null, leaderName: string) {
  switch (state) {
    case "access-expired":
      return { text: "That link is no longer active. Ask for a new one below.", tone: "notice" as const };
    case "access-invalid":
      return { text: "That link is not valid. Ask for a new one below.", tone: "notice" as const };
    case "access-revoked":
      return { text: "That link was turned off. Ask for a new one below.", tone: "notice" as const };
    case "access-unavailable":
      return { text: "Group Home is temporarily unavailable. Please try again shortly.", tone: "notice" as const };
    case "recovery-sent":
      return { text: `Request sent to ${leaderName}. They will send you a new secure link.`, tone: "success" as const };
    case "recovery-requested":
      // Deliberately does not say "sent": either there was no match, or leader
      // notification is not configured. Never confirm delivery we cannot prove,
      // and never reveal which of the two happened.
      return { text: `If that email belongs to an active member, ${leaderName} will be asked to send a new link.`, tone: "notice" as const };
    case "signin-required":
      return { text: "Open your group link first, or ask for a new one below.", tone: "notice" as const };
    default:
      return null;
  }
}

async function loadPortal(slug: string): Promise<GroupMemberPortalResult> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;
  const demoPortal = loadDemoGroupMemberPortalData({ sessionToken, slug });

  if (demoPortal.data) {
    return demoPortal;
  }

  if (!isSupabaseAdminConfigured()) {
    return { data: null };
  }

  return loadGroupMemberPortalData(createSupabaseAdminClient(), { sessionToken, slug });
}

/**
 * The recovery copy names the leader ("Ask Ryan for a new Group link") because
 * a named person is who actually sends the link. Falls back to "your leader"
 * whenever the group or its leaders cannot be resolved.
 */
async function loadLeaderFirstName(slug: string) {
  if (!isSupabaseAdminConfigured()) {
    return "your leader";
  }

  try {
    const supabase = createSupabaseAdminClient();
    const groupResult = await supabase
      .from("dos_groups")
      .select("id")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (!groupResult.data?.id) {
      return "your leader";
    }

    const names = await loadPublicGroupLeaderNames(supabase, groupResult.data.id);
    const first = names?.[0]?.trim().split(/\s+/)[0];

    return first || "your leader";
  } catch {
    return "your leader";
  }
}

export default async function GroupAccessRecoveryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const state = Array.isArray(query.state) ? query.state[0] : query.state ?? null;
  const groupPath = publicGroupPath(slug);
  const portalResult = await loadPortal(slug);

  // Already has a scoped session — send them to Group Home rather than showing
  // a recovery form for access they already hold.
  if (portalResult.staleSlug && portalResult.canonicalSlug) {
    redirect(`${publicGroupPath(portalResult.canonicalSlug)}?state=signed-in`);
  }

  if (portalResult.data) {
    redirect(`${groupPath}?state=signed-in`);
  }

  const leaderName = await loadLeaderFirstName(slug);
  const message = recoveryStateMessage(typeof state === "string" ? state : null, leaderName);

  return (
    <main className={communityPage}>
      {/* Padding on the scrolling container. The production screenshot showed
          the back link and field labels clipped against the left edge at 390px. */}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-4 py-8 sm:px-6">
        <Link className="text-xs font-bold text-[#1D4ED8] underline-offset-4 hover:underline" href={groupPath}>
          Back to group
        </Link>

        <section className={`min-w-0 p-5 ${communityCard}`}>
          <p className={communityEyebrow}>Group Home</p>
          <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A]">
            Get back into your group
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
            Group Home opens from a secure link your leader sends you. If yours stopped working, ask for a new one.
          </p>

          {message ? (
            <p
              className={`mt-4 rounded-2xl border px-3 py-2.5 text-sm font-bold leading-6 ${
                message.tone === "success"
                  ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                  : "border-[#DCEBFF] bg-[#F8FBFF] text-[#1D4ED8]"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <form action={requestGroupMemberAccess} className="mt-5 grid gap-3">
            <input name="slug" type="hidden" value={slug} />
            <label className="grid min-w-0 gap-1.5">
              <span className={communityFieldLabel}>Your email</span>
              <input
                autoComplete="email"
                className={communityInput}
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </label>
            <button className={`w-full ${communityPrimaryAction}`} type="submit">
              Ask {leaderName} for a new Group link
            </button>
          </form>

          <p className="mt-3 text-xs font-semibold leading-5 text-[#64748B]">
            The link is sent personally by {leaderName}, so it may not arrive immediately.
          </p>
        </section>

        {/* Separate from the recovery form on purpose. This one really does
            authenticate, and showing it unconditionally avoids revealing
            whether any particular address has a DOS account. */}
        <section className={`min-w-0 p-4 ${communityCard}`}>
          <p className="text-sm font-bold text-[#0F172A]">Already have a DOS account?</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">
            Sign in and your groups and Journeys come with you.
          </p>
          <Link
            className="mt-3 inline-flex text-sm font-bold text-[#1D4ED8] underline-offset-4 hover:underline"
            href={`/login?next=${encodeURIComponent(groupPath)}`}
          >
            Sign in with your DOS account
          </Link>
        </section>
      </div>
    </main>
  );
}
