import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  groupMemberSessionCookieName,
  loadGroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { groupHomeStateMessage } from "../../GroupHomeMemberView";
import { requestGroupMemberAccess } from "./actions";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Group Home Sign In | DOS",
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function loadPortal(slug: string) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Group Home is temporarily unavailable." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;

  return loadGroupMemberPortalData(createSupabaseAdminClient(), {
    sessionToken,
    slug,
  });
}

export default async function GroupHomeSignInPage({ params, searchParams }: PageProps) {
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
    <main className="min-h-screen bg-[#0B0D10] px-4 py-6 text-[#F5F3EE] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <Link className="text-xs font-black uppercase tracking-[0.2em] text-[#C2A14E]" href={groupPath}>
          Back to Group
        </Link>
        <section className="mt-5 rounded-2xl border border-white/12 bg-[#12151A] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C2A14E]">Group Home</p>
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
