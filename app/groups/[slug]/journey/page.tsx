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
import { communityCard, communityEyebrow, communityPage } from "../../community-design";
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

function resolveJourneyAssignment(portal: GroupMemberPortalData, requestedAssignmentId: string | null, requestedResource: string | null) {
  if (requestedAssignmentId) {
    const assignment = portal.journeyAssignments.find((item) => item.id === requestedAssignmentId) ?? null;

    if (assignment) {
      return assignment;
    }
  }

  if (requestedResource) {
    const assignment = portal.journeyAssignments.find((item) => item.resourceSlug === requestedResource && item.status !== "completed")
      ?? portal.journeyAssignments.find((item) => item.resourceSlug === requestedResource)
      ?? null;

    if (assignment) {
      return assignment;
    }
  }

  return portal.journeyAssignments.find((assignment) => assignment.status !== "completed")
    ?? portal.journeyAssignments[0]
    ?? null;
}

export default async function GroupJourneyPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const state = Array.isArray(query.state) ? query.state[0] : query.state ?? null;
  const requestedAssignmentId = Array.isArray(query.assignment) ? query.assignment[0] : query.assignment ?? null;
  const requestedResource = Array.isArray(query.resource) ? query.resource[0] : query.resource ?? null;
  const groupPath = publicGroupPath(slug);
  const portalResult = await loadPortal(slug);

  if (!portalResult.data) {
    redirect(`${groupPath}/member?state=signin-required`);
  }

  const portal = portalResult.data;
  const assignment = resolveJourneyAssignment(portal, requestedAssignmentId, requestedResource);
  const resourceSlug = assignment?.resourceSlug ?? null;
  const resource = resourceSlug ? getDosResourceBySlug(resourceSlug) : null;

  if (!assignment || !resourceSlug || !resource || resource.type !== "guided_resource" || !resource.content?.guidedResource) {
    return (
      <main className={communityPage}>
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-4 py-8 sm:px-6">
          <Link className="text-xs font-bold text-[#1D4ED8] underline-offset-4 hover:underline" href={groupPath}>
            Back to Group Home
          </Link>
          <section className={`min-w-0 p-5 ${communityCard}`}>
            <p className={communityEyebrow}>Journey</p>
            <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A]">
              No Journey assigned yet
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
              Your group leader has not assigned a Guided Journey yet. Check back after your next gathering.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <GroupJourneyView
      assignment={assignment}
      groupName={portal.group.name}
      groupPath={groupPath}
      groupSlug={slug}
      progress={portal.journeyProgress.filter((item) => item.assignmentId === assignment.id)}
      resource={resource}
      state={state}
    />
  );
}
