import type { Metadata } from "next";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import {
  groupMemberSessionCookieName,
  loadDemoGroupMemberPortalData,
  loadGroupMemberPortalData,
} from "@/src/lib/groups/member-access";
import { loadPublicGroupLeaderNames } from "@/src/lib/groups/group-home-access";
import {
  fallbackUsamPublicSite,
  missingPublicSiteSchema,
  publicGroupPath,
  requestHostname,
  resolvePublicSiteForHost,
  type PublicSiteConfig,
} from "@/src/lib/groups/public-site";
import { groupDisplayTimeZone } from "@/src/lib/groups/timezone";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import type { GroupMemberPortalResult } from "@/src/lib/groups/member-access";
import { GroupHomeMemberView, groupHomeStateMessage } from "../GroupHomeMemberView";
import { APPROVED_PUBLIC_GROUPS, communityCopyFor } from "../community-content";
import { buildCommunitySchedule } from "../community-schedule";
import { PublicGroupPageTemplate, type PublicGroupPageData } from "../PublicGroupPageTemplate";

type PublicGroupRow = {
  accepting_members?: boolean | null;
  activity_type?: string | null;
  audience?: string | null;
  default_location: string | null;
  description: string | null;
  id: string;
  image_url: string | null;
  member_access_enabled?: boolean | null;
  name: string;
  organization_id: string | null;
  public_site_id?: string | null;
  public_status?: string | null;
  rhythm_label: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  slug: string;
  tagline: string | null;
  type: string | null;
};

type GatheringRow = {
  location?: string | null;
  starts_at: string | null;
  title: string | null;
};

// Built from the one canonical list shared with the directory, so the two
// surfaces cannot drift apart on schedule or location again.
const fallbackPublicGroups: Record<string, PublicGroupRow> = Object.fromEntries(
  APPROVED_PUBLIC_GROUPS.map((group) => [
    group.slug,
    {
      accepting_members: group.acceptsJoinRequests,
      activity_type: group.template === "activity" ? "running" : null,
      audience: "men",
      default_location: group.defaultLocation,
      description: communityCopyFor(group).description,
      id: group.slug,
      image_url: group.slug === "2three2" ? "/images/usam/2three2-share.png" : null,
      member_access_enabled: group.memberAccessEnabled,
      name: group.name,
      organization_id: null,
      rhythm_label: group.rhythmLabel,
      scripture_reference: group.scriptureReference,
      scripture_text: group.scriptureText,
      slug: group.slug,
      tagline: communityCopyFor(group).tagline,
      type: group.template === "activity" ? "running" : "mens",
    } satisfies PublicGroupRow,
  ]),
);

const defaultGroupsShareImage = "/images/usam/groups-share.png";

const fallbackGatherings: Record<string, GatheringRow> = {
  "2three2": {
    location: "Lebanon Hills Trailhead, Eagan, MN",
    starts_at: null,
    title: "Next gathering TBD",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const group = await loadPublicGroup(slug, requestHostname(headersList));

  if (!group) {
    return {
      description: "Find discipleship groups connected to USA Missionaries.",
      title: "Group | USA Missionaries",
    };
  }

  const title = `${group.name} | ${group.siteName}`;
  const description = group.description || `A recurring discipleship rhythm connected with ${group.siteName}.`;
  const url = group.siteHostname
    ? `https://${group.siteHostname}${publicGroupPath(group.slug, { basePath: group.siteBasePath })}`
    : `${getCanonicalSiteUrl()}/groups/${group.slug}`;
  const image = groupShareImageUrl(group.shareImageUrl);

  return {
    alternates: {
      canonical: url,
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: `${group.name} discipleship group`,
          height: 630,
          url: image,
          width: 1200,
        },
      ],
      siteName: group.siteName,
      title,
      type: "website",
      url,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [image],
      title,
    },
  };
}

export default async function PublicGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const requestParam = Array.isArray(query.request) ? query.request[0] : query.request;
  const stateParam = Array.isArray(query.state) ? query.state[0] : query.state;
  const requestState = requestParam === "received" || requestParam === "missing" || requestParam === "unavailable" || requestParam === "error"
    ? requestParam
    : null;
  const memberHomeResult = await loadMemberGroupHome(slug);

  // USA-173 coordination: the member holds a valid session but arrived on a
  // since-renamed public slug (texted link, bookmark, installed start_url).
  // Send them to the canonical URL rather than letting the rename look like
  // revoked access.
  if (memberHomeResult.staleSlug && memberHomeResult.canonicalSlug) {
    redirect(`${publicGroupPath(memberHomeResult.canonicalSlug)}${stateParam ? `?state=${encodeURIComponent(String(stateParam))}` : ""}`);
  }

  if (memberHomeResult.data) {
    return (
      <GroupHomeMemberView
        data={memberHomeResult.data}
        message={groupHomeStateMessage(typeof stateParam === "string" ? stateParam : null)}
      />
    );
  }

  const headersList = await headers();
  const group = await loadPublicGroup(slug, requestHostname(headersList));

  if (!group) {
    notFound();
  }

  return <PublicGroupPageTemplate group={group} requestState={requestState} />;
}

async function loadMemberGroupHome(slug: string): Promise<GroupMemberPortalResult> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;

  if (!sessionToken) {
    return { data: null };
  }

  const demoPortal = loadDemoGroupMemberPortalData({
    sessionToken,
    slug,
  });

  if (demoPortal.data) {
    return demoPortal;
  }

  if (!isSupabaseAdminConfigured()) {
    return { data: null };
  }

  return loadGroupMemberPortalData(createSupabaseAdminClient(), {
    sessionToken,
    slug,
  });
}

async function loadPublicGroup(slug: string, hostname: string): Promise<PublicGroupPageData | null> {
  if (!isSupabaseAdminConfigured()) {
    const fallback = fallbackPublicGroups[slug];

    return fallback ? toPublicGroupData(fallback, fallbackGatherings[slug] ?? null, fallbackUsamPublicSite, ["Ryan Fox"]) : null;
  }

  const supabase = createSupabaseAdminClient();
  const siteResolution = await resolvePublicSiteForHost(supabase, hostname);
  const site = siteResolution.site ?? fallbackUsamPublicSite;

  // Same reason as the directory: an unresolved host cannot match a
  // `public_site_id`, so the approved Groups would 404 on preview hosts.
  if (!siteResolution.site) {
    const hostFallback = fallbackPublicGroups[slug];

    return hostFallback
      ? toPublicGroupData(hostFallback, fallbackGatherings[slug] ?? null, site, ["Ryan Fox"])
      : null;
  }
  const groupQuery = supabase
    .from("dos_groups")
    .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location, image_url, organization_id, audience, activity_type, accepting_members, member_access_enabled, public_site_id, public_status")
    .eq("slug", slug)
    .eq("active", true);
  const { data: group, error } = siteResolution.schemaReady && site.id
    ? await groupQuery
      .eq("public_site_id", site.id)
      .eq("public_status", "published")
      .maybeSingle()
    : siteResolution.allowLegacyGlobalGroups
      ? await groupQuery.maybeSingle()
      : { data: null, error: null };

  if (error) {
    if (missingPublicSiteSchema(error)) {
      const legacyResult = await supabase
        .from("dos_groups")
        .select("id, name, slug, description, tagline, scripture_reference, scripture_text, type, rhythm_label, default_location, image_url, organization_id, audience, activity_type, accepting_members, member_access_enabled")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (legacyResult.error || !legacyResult.data) {
        return null;
      }

      return loadPublicGroupGatheringData(supabase, legacyResult.data as PublicGroupRow, site);
    }

    console.warn("[Public Group] Unable to load group", error.message);
    return null;
  }

  if (!group) {
    return null;
  }

  return loadPublicGroupGatheringData(supabase, group as PublicGroupRow, site);
}

async function loadPublicGroupGatheringData(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  group: PublicGroupRow,
  site: PublicSiteConfig,
) {
  const [gatheringsResult, leaderNames] = await Promise.all([
    supabase
      .from("dos_group_gatherings")
      .select("title, starts_at")
      .eq("group_id", group.id)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1),
    loadPublicGroupLeaderNames(supabase, group.id),
  ]);
  const { data: gatherings, error: gatheringsError } = gatheringsResult;

  if (gatheringsError) {
    console.warn("[Public Group] Unable to load next gathering", gatheringsError.message);
  }

  return toPublicGroupData(group, gatherings?.[0] ?? null, site, leaderNames);
}

function toPublicGroupData(group: PublicGroupRow, nextGathering: GatheringRow | null, site: PublicSiteConfig, leaders: string[] = []): PublicGroupPageData {
  const scriptureReference = group.scripture_reference ?? "";
  const anchor = scriptureAnchor(scriptureReference);
  const publicLocation = group.default_location ?? "Location shared after leader confirmation";
  // One canonical schedule: a dated gathering leads when it exists, otherwise
  // the recurring rhythm is the schedule. Never both as rival facts.
  const schedule = buildCommunitySchedule({
    location: publicLocation,
    nextGatheringStartsAt: nextGathering?.starts_at,
    nextGatheringTitle: nextGathering?.title,
    rhythmLabel: group.rhythm_label,
    timeZone: groupDisplayTimeZone,
  });

  const copy = communityCopyFor(group);

  return {
    acceptingRequests: group.accepting_members !== false,
    anchorMark: anchor.mark,
    anchorSubtext: anchor.subtext,
    description: copy.description,
    id: group.id,
    leaders,
    location: publicLocation,
    memberAccessEnabled: group.member_access_enabled === true,
    name: group.name,
    schedule,
    scheduleIntro: copy.scheduleIntro,
    scheduleTitle: copy.scheduleTitle,
    scriptureReference,
    scriptureText: group.scripture_text ?? "",
    shareImageUrl: group.image_url,
    slug: group.slug,
    siteBasePath: site.basePath,
    siteHostname: site.id ? site.hostname : null,
    siteLogoUrl: site.logoUrl,
    siteName: site.displayName,
    tagline: copy.tagline,
    typeLabel: copy.typeLabel,
    whatToExpect: copy.whatToExpect,
  };
}

function groupShareImageUrl(value: string | null | undefined) {
  const imageUrl = value?.trim();

  if (!imageUrl || /\b(?:table|dos-table)\b/i.test(imageUrl)) {
    return defaultGroupsShareImage;
  }

  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("/")) {
    return imageUrl;
  }

  return defaultGroupsShareImage;
}

function scriptureAnchor(reference: string) {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)/);

  if (!match) {
    return {
      mark: "",
      subtext: "",
    };
  }

  return {
    mark: `${match[2]}:${match[3]}`,
    subtext: match[1],
  };
}
