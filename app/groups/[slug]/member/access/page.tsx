import type { Metadata } from "next";
import Link from "next/link";
import {
  peekDemoGroupMemberAccessToken,
  peekGroupMemberAccessToken,
} from "@/src/lib/groups/member-access";
import { demoGroupMemberAccessTokenPrefix } from "@/src/lib/groups/demo-member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import {
  communityCard,
  communityPage,
  communityPrimaryAction,
  communitySecondaryAction,
} from "../../../community-design";
import { redeemGroupMemberAccess } from "../actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

/**
 * Read-only lookup shared by `generateMetadata` and the page body. Never
 * calls the mutating `claimGroupMemberAccessToken` — GET/HEAD (including
 * link-preview crawlers and security scanners) must never consume, rotate,
 * or revoke this token. Only the explicit `Open Group Home` POST does that.
 */
async function peekAccess(slug: string, token: string) {
  if (!token.trim()) {
    return { status: "invalid" as const };
  }

  if (token.trim().startsWith(demoGroupMemberAccessTokenPrefix)) {
    return peekDemoGroupMemberAccessToken(token, slug);
  }

  if (!isSupabaseAdminConfigured()) {
    return { status: "invalid" as const };
  }

  return peekGroupMemberAccessToken(createSupabaseAdminClient(), token);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const token = firstValue(query.token);
  const peek = await peekAccess(slug, token);
  const groupName = peek.status === "ready" ? peek.groupName ?? "Your Group" : "Group access";
  const title = peek.status === "ready" ? groupName : "Group access link";
  const description = peek.status === "ready"
    ? "Your Discipleship Journey is ready. Open Group Home to continue."
    : "This secure link is not currently active. Ask your group leader for a fresh one.";

  return {
    openGraph: {
      description,
      title,
    },
    robots: {
      follow: false,
      index: false,
    },
    title: `${title} | DOS`,
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function MemberAccessConfirmPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const token = firstValue(query.token);
  const groupPath = publicGroupPath(slug);
  const peek = await peekAccess(slug, token);

  return (
    <main className={`${communityPage} px-4 py-6 sm:px-6`}>
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <div className={`${communityCard} p-6`}>
          {peek.status === "ready" ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">{peek.groupName ?? "Your Group"}</p>
              <h1 className="mt-2 text-2xl font-black text-[#0F172A]">Your Discipleship Journey is ready.</h1>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">Tap below to open your Group Home. This confirms it&apos;s really you before we sign you in.</p>
              <form action={redeemGroupMemberAccess} className="mt-5">
                <input name="slug" type="hidden" value={slug} />
                <input name="token" type="hidden" value={token} />
                <button className={`${communityPrimaryAction} w-full`} type="submit">
                  Open Group Home
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">Group access</p>
              <h1 className="mt-2 text-2xl font-black text-[#0F172A]">
                {peek.status === "expired" ? "That link has expired." : peek.status === "revoked" ? "That link was already used." : "That access link is not valid."}
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">Ask your group leader for a fresh link.</p>
              <Link className={`${communitySecondaryAction} mt-5 w-full`} href={`${groupPath}/member`}>
                Request a new link
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
