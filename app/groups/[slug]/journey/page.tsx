import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  groupMemberSessionCookieName,
  loadDemoGroupMemberPortalData,
  loadGroupMemberPortalData,
  type GroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { publicGroupPath } from "@/src/lib/groups/public-site";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { GroupJourneyView } from "../../GroupJourneyView";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: { absolute: "Journey | Group Home" },
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

function resolveResourceSlug(portal: GroupMemberPortalData, requested: string | null) {
  if (requested && portal.journeyAssignments.some((assignment) => assignment.resourceSlug === requested)) {
    return requested;
  }

  const activeAssignment = portal.journeyAssignments.find((assignment) => assignment.status !== "completed")
    ?? portal.journeyAssignments[0]
    ?? null;

  return activeAssignment?.resourceSlug ?? null;
}

export default async function GroupJourneyPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const state = Array.isArray(query.state) ? query.state[0] : query.state ?? null;
  const requestedResource = Array.isArray(query.resource) ? query.resource[0] : query.resource ?? null;
  const groupPath = publicGroupPath(slug);
  const portalResult = await loadPortal(slug);

  if (!portalResult.data) {
    redirect(`${groupPath}/member?state=signin-required`);
  }

  const portal = portalResult.data;
  const resourceSlug = resolveResourceSlug(portal, requestedResource);
  const resource = resourceSlug ? getDosResourceBySlug(resourceSlug) : null;

  if (!resourceSlug || !resource || resource.type !== "guided_resource" || !resource.content?.guidedResource) {
    return (
      <main className="min-h-screen bg-[#080A0D] px-4 py-6 text-[#F5F3EE] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center text-center">
          <Link className="text-xs font-black uppercase tracking-[0.2em] text-[#C2A14E]" href={groupPath}>
            Back to Group Home
          </Link>
          <h1 className="mt-4 text-2xl font-black text-white">No journey assigned yet.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
            Your group leader has not assigned a Guided Journey yet. Check back after your next gathering.
          </p>
        </div>
      </main>
    );
  }

  const assignment = portal.journeyAssignments.find((item) => item.resourceSlug === resourceSlug) ?? null;
  const otherAssignments = portal.journeyAssignments.filter((item) => item.resourceSlug !== resourceSlug);

  return (
    <GroupJourneyView
      assignment={assignment}
      groupName={portal.group.name}
      groupPath={groupPath}
      groupSlug={slug}
      otherResourceSlugs={Array.from(new Set(otherAssignments.map((item) => item.resourceSlug)))}
      progress={portal.journeyProgress.filter((item) => item.resourceSlug === resourceSlug)}
      resource={resource}
      state={state}
    />
  );
}
