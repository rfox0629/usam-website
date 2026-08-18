import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  groupMemberSessionCookieName,
  inspectGroupMemberAccessToken,
  loadDemoGroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { parseDemoGroupMemberAccessToken } from "@/src/lib/groups/demo-member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site-path";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  communityCard,
  communityEyebrow,
  communityPage,
  communityPrimaryAction,
  communitySecondaryAction,
} from "../../../community-design";
import { openGroupMemberAccess } from "../actions";

/**
 * USA-170 — the invitation landing page.
 *
 * This route used to be a `route.ts` GET handler that redeemed the token the
 * instant anything fetched it. Production proof of why that fails: Ryan texted
 * Tanner a link at 9:58 AM; iMessage's unfurler fetched it and the token was
 * marked `used` ten seconds later. Tanner tapped at 9:59 and was told the link
 * had expired.
 *
 * A GET now only *looks*. Redemption happens through the POST below, which a
 * link unfurler will never issue. Crawlers, security scanners, HEAD requests
 * and browser prefetch all land here and change nothing.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function tokenParam(query: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(query.token) ? query.token[0] : query.token;

  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Deliberately says nothing about who the invitation is for. This metadata is
 * consumed by iMessage, Slack, and every scanner in between, so it carries the
 * Group-neutral headline and nothing else — no participant name, progress,
 * email, address, or token. The canonical URL drops the token so it can never
 * be indexed, logged, or rendered into a preview card.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const description = "Your Discipleship Journey is ready. Open Group Home to continue.";

  return {
    alternates: { canonical: publicGroupPath(slug) },
    description,
    openGraph: {
      description,
      title: "Your Group Home is ready",
      type: "website",
      url: publicGroupPath(slug),
    },
    robots: { follow: false, index: false },
    title: "Your Group Home is ready",
    twitter: {
      card: "summary",
      description,
      title: "Your Group Home is ready",
    },
  };
}

export default async function GroupMemberAccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const token = tokenParam(query);
  const groupPath = publicGroupPath(slug);
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;

  // Already signed in on this device — no reason to make them redeem again.
  if (loadDemoGroupMemberPortalData({ sessionToken, slug }).data) {
    redirect(`${groupPath}?state=signed-in`);
  }

  const demoPayload = parseDemoGroupMemberAccessToken(token);
  const inspection = demoPayload
    ? { groupName: demoPayload.groupName, groupSlug: demoPayload.groupSlug, state: "valid" as const }
    : !token
      ? { groupName: undefined, groupSlug: undefined, state: "invalid" as const }
      : isSupabaseAdminConfigured()
        ? await inspectGroupMemberAccessToken(createSupabaseAdminClient(), token)
        : { groupName: undefined, groupSlug: undefined, state: "invalid" as const };

  const groupName = inspection.groupName ?? "your group";
  const targetSlug = inspection.groupSlug ?? slug;

  return (
    <main className={communityPage}>
      {/* Horizontal padding lives on this container rather than on a
          negative-margin child: the production screenshot showed the header
          link clipped against the left viewport edge at Tanner's iPhone width. */}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8 sm:px-6">
        <section className={`min-w-0 p-5 ${communityCard}`}>
          <p className={communityEyebrow}>Group Home</p>

          {inspection.state === "valid" ? (
            <>
              <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A]">
                {groupName}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
                Your Discipleship Journey is ready. Tap below to open your Group Home on this device.
              </p>

              {/* The redemption itself. The POST is the whole defense: link
                  unfurlers and security scanners issue GET and HEAD, never this. */}
              <form action={openGroupMemberAccess} className="mt-5 grid gap-2">
                <input name="slug" type="hidden" value={targetSlug} />
                <input name="token" type="hidden" value={token} />
                <button className={`w-full ${communityPrimaryAction}`} type="submit">
                  Open Group Home
                </button>
              </form>

              <p className="mt-3 text-xs font-semibold leading-5 text-[#64748B]">
                This link is personal to you. It stays valid until you open it.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A]">
                {inspection.state === "revoked" ? "This link was turned off" : "This link is no longer active"}
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
                {inspection.state === "revoked"
                  ? "Your leader turned off this invitation. Ask for a new one to get back in."
                  : "It may already have been opened, or it has expired. You can ask your leader for a new one."}
              </p>
              <div className="mt-5 grid gap-2">
                <a className={`w-full ${communityPrimaryAction}`} href={`${groupPath}/member`}>
                  Get a new Group link
                </a>
                <a className={`w-full ${communitySecondaryAction}`} href={groupPath}>
                  Back to {groupName}
                </a>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
