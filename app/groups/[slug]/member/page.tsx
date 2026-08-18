import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  groupMemberSessionCookieName,
  loadDemoGroupMemberPortalData,
  loadGroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { groupHomeStateMessage } from "../../GroupHomeMemberView";
import {
  communityCard,
  communityFieldLabel,
  communityInput,
  communityPage,
  communityPrimaryAction,
} from "../../community-design";
import { requestGroupMemberAccess } from "./actions";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Group Home Access | DOS",
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function loadPortal(slug: string) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;

  const demoPortal = loadDemoGroupMemberPortalData({
    sessionToken,
    slug,
  });

  if (demoPortal.data) {
    return demoPortal;
  }

  if (!isSupabaseAdminConfigured()) {
    return { error: "Group Home is temporarily unavailable." };
  }

  return loadGroupMemberPortalData(createSupabaseAdminClient(), {
    sessionToken,
    slug,
  });
}

export default async function GroupHomeAccessRecoveryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const state = Array.isArray(query.state) ? query.state[0] : query.state ?? null;
  const message = groupHomeStateMessage(state);
  const groupPath = publicGroupPath(slug);
  const portalResult = await loadPortal(slug);

  if (portalResult.data) {
    redirect(`${groupPath}${state ? `?state=${encodeURIComponent(state)}` : ""}`);
  }

  return (
    <main className={`${communityPage} px-4 py-6 sm:px-6`}>
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <Link className="text-xs font-bold uppercase tracking-[0.14em] text-[#1D4ED8]" href={groupPath}>
          Back to Group
        </Link>
        <section className={`${communityCard} mt-5 p-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">Group Home</p>
          <h1 className="mt-3 text-2xl font-black text-[#0F172A] sm:text-3xl">Get back into your group.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
            This isn&apos;t a password sign-in. Enter the email your group leader has on file and, if it matches an active member, we&apos;ll email you a fresh secure link.
          </p>
          {message ? (
            <p className="mt-4 rounded-2xl border border-[#DCEBFF] bg-[#EBF2FF] px-4 py-3 text-sm font-semibold leading-6 text-[#0F172A]">{message}</p>
          ) : null}
          <form action={requestGroupMemberAccess} className="mt-5 grid gap-3">
            <input name="slug" type="hidden" value={slug} />
            <label className="grid gap-2">
              <span className={communityFieldLabel}>Email</span>
              <input className={communityInput} name="email" required type="email" />
            </label>
            <button className={communityPrimaryAction} type="submit">
              Email Me a Secure Group Link
            </button>
          </form>
          <p className="mt-4 text-xs font-semibold leading-5 text-[#94A3B8]">
            Not getting in? Ask your group leader to send you a fresh Group link directly.
          </p>
        </section>
      </div>
    </main>
  );
}
