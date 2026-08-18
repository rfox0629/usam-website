"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  claimDemoGroupMemberAccessToken,
  claimGroupMemberAccessToken,
  groupMemberSessionCookieName,
  loadDemoGroupMemberPortalData,
  loadMemberSessionIdentity,
  revokeGroupMemberSession,
} from "@/src/lib/groups/member-access";
import { notifyGroupAccessRecovery } from "@/src/lib/groups/notify-access-recovery";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import {
  missingPublicSiteSchema,
  publicGroupPath,
  requestHostname,
  resolvePublicSiteForHost,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const memberNotificationTypes = [
  "gathering_reminder",
  "schedule_change",
  "cancellation",
  "announcement",
  "prayer_update",
  "rsvp_reminder",
] as const;

const memberSessionTtlSeconds = 60 * 60 * 24 * 30;
const demoSessionTtlSeconds = 60 * 60 * 24 * 7;

/**
 * One place that writes the scoped member session cookie, so redemption paths
 * cannot drift apart on httpOnly/sameSite/path.
 */
async function setMemberSessionCookie(sessionToken: string, maxAge: number) {
  const cookieStore = await cookies();

  cookieStore.set(groupMemberSessionCookieName, sessionToken, {
    httpOnly: true,
    maxAge,
    path: "/groups",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function redirectToMember(slug: string, state: string): never {
  redirect(`${publicGroupPath(slug)}?state=${state}`);
}

function redirectToSignIn(slug: string, state: string): never {
  redirect(`${publicGroupPath(slug)}/member?state=${state}`);
}

function redirectToJourney(slug: string, resourceSlug: string, state: string): never {
  redirect(`${publicGroupPath(slug)}/journey?resource=${encodeURIComponent(resourceSlug)}&state=${state}`);
}

async function requireMemberPortal(slug: string) {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Member access is temporarily unavailable." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;
  const supabase = createSupabaseAdminClient();
  const session = await loadMemberSessionIdentity(supabase, sessionToken, slug);

  if (!session) {
    return { error: "Sign in from your member access link first." };
  }

  return { session, supabase };
}

function isFutureScheduledGathering(gathering: { starts_at: string; status: string | null } | null) {
  if (!gathering || gathering.status === "canceled") {
    return false;
  }

  return new Date(gathering.starts_at).getTime() > Date.now();
}

export async function submitMemberRsvp(formData: FormData) {
  const slug = formString(formData, "slug");
  const gatheringId = formString(formData, "gatheringId");
  const response = formString(formData, "response");
  const note = formString(formData, "note").slice(0, 400);

  if (!slug || !gatheringId || !["going", "not_going", "maybe"].includes(response)) {
    redirectToMember(slug || "group", "rsvp-error");
  }

  const portalResult = await requireMemberPortal(slug);

  if ("error" in portalResult) {
    redirectToMember(slug, "signin-required");
  }

  const { session, supabase } = portalResult;
  const gatheringResult = await supabase
    .from("dos_group_gatherings")
    .select("id, group_id, starts_at, status")
    .eq("id", gatheringId)
    .eq("group_id", session.groupId)
    .maybeSingle();

  if (gatheringResult.error || !isFutureScheduledGathering(gatheringResult.data)) {
    redirectToMember(slug, "rsvp-closed");
  }

  const memberResult = await supabase
    .from("dos_group_members")
    .select("id")
    .eq("group_id", session.groupId)
    .eq("person_id", session.personId)
    .eq("status", "active")
    .maybeSingle();

  if (memberResult.error || !memberResult.data) {
    redirectToMember(slug, "signin-required");
  }

  const { error } = await supabase
    .from("dos_group_rsvps")
    .upsert({
      gathering_id: gatheringId,
      group_id: session.groupId,
      group_member_id: memberResult.data.id,
      note: note || null,
      person_id: session.personId,
      response,
      status: "active",
    }, { onConflict: "gathering_id,person_id" });

  if (error) {
    redirectToMember(slug, "rsvp-error");
  }

  revalidatePath(`${publicGroupPath(slug)}/member`);
  redirectToMember(slug, "rsvp-saved");
}

export async function saveGroupMemberJourneyProgress(formData: FormData) {
  const slug = formString(formData, "slug");
  const resourceSlug = formString(formData, "resourceSlug");
  const sessionId = formString(formData, "sessionId");
  const reflection = formString(formData, "reflection").slice(0, 6000);
  const actionStep = formString(formData, "actionStep").slice(0, 2000);
  const prayerFocus = formString(formData, "prayerFocus").slice(0, 2000);
  const intent = formString(formData, "intent");

  if (!slug || !resourceSlug || !sessionId) {
    redirectToJourney(slug || "group", resourceSlug || "resource", "journey-error");
  }

  const cookieStore = await cookies();
  const demoPortal = loadDemoGroupMemberPortalData({
    sessionToken: cookieStore.get(groupMemberSessionCookieName)?.value ?? null,
    slug,
  });

  if (demoPortal.data) {
    const resource = getDosResourceBySlug(resourceSlug);
    const sessionExists = resource?.content?.guidedResource?.sessions.some((session) => session.id === sessionId) === true;
    const assignmentExists = demoPortal.data.journeyAssignments.some((assignment) => assignment.resourceSlug === resourceSlug);

    if (!assignmentExists || !sessionExists) {
      redirectToJourney(slug, resourceSlug, "journey-error");
    }

    redirectToJourney(slug, resourceSlug, intent === "complete" ? "journey-completed" : "journey-saved");
  }

  const portalResult = await requireMemberPortal(slug);

  if ("error" in portalResult) {
    redirectToMember(slug, "signin-required");
  }

  const { session, supabase } = portalResult;
  const groupResult = await supabase
    .from("dos_groups")
    .select("id, workspace_id")
    .eq("id", session.groupId)
    .maybeSingle();

  if (groupResult.error || !groupResult.data) {
    redirectToJourney(slug, resourceSlug, "journey-error");
  }

  const workspaceId = groupResult.data.workspace_id as string;
  const [assignmentResult, existingResult] = await Promise.all([
    supabase
      .from("dos_resource_assignments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("person_id", session.personId)
      .eq("resource_slug", resourceSlug)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("dos_guided_resource_progress")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("person_id", session.personId)
      .eq("resource_slug", resourceSlug)
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  if (assignmentResult.error || existingResult.error) {
    redirectToJourney(slug, resourceSlug, "journey-error");
  }

  const assignmentId = assignmentResult.data?.id ?? null;
  const patch: Record<string, unknown> = {
    action_step: actionStep || null,
    prayer_focus: prayerFocus || null,
    reflection: reflection || null,
  };

  if (assignmentId) {
    patch.assignment_id = assignmentId;
  }

  if (intent === "complete") {
    patch.completed_at = new Date().toISOString();
  } else if (intent === "reopen") {
    patch.completed_at = null;
  }

  const { error } = existingResult.data
    ? await supabase
      .from("dos_guided_resource_progress")
      .update(patch)
      .eq("id", existingResult.data.id)
    : await supabase
      .from("dos_guided_resource_progress")
      .insert({
        ...patch,
        assignment_id: assignmentId,
        completed_at: intent === "complete" ? new Date().toISOString() : null,
        person_id: session.personId,
        resource_slug: resourceSlug,
        session_id: sessionId,
        workspace_id: workspaceId,
      });

  if (error) {
    redirectToJourney(slug, resourceSlug, "journey-error");
  }

  revalidatePath(`${publicGroupPath(slug)}/journey`);
  redirectToJourney(slug, resourceSlug, intent === "complete" ? "journey-completed" : "journey-saved");
}

export async function submitMemberPrayerRequest(formData: FormData) {
  const slug = formString(formData, "slug");
  const title = formString(formData, "title").slice(0, 120);
  const request = formString(formData, "request").slice(0, 1200);

  if (!slug || !title || !request) {
    redirectToMember(slug || "group", "prayer-missing");
  }

  const portalResult = await requireMemberPortal(slug);

  if ("error" in portalResult) {
    redirectToMember(slug, "signin-required");
  }

  const { session, supabase } = portalResult;
  const groupResult = await supabase
    .from("dos_groups")
    .select("id, workspace_id, organization_id")
    .eq("id", session.groupId)
    .maybeSingle();

  if (groupResult.error || !groupResult.data) {
    redirectToMember(slug, "prayer-error");
  }

  const { error } = await supabase
    .from("prayer_requests")
    .insert({
      category: "Other",
      created_by_person_id: session.personId,
      field_person_id: session.personId,
      group_id: session.groupId,
      household_id: groupResult.data.workspace_id,
      organization_id: groupResult.data.organization_id,
      priority: "normal",
      related_household_id: groupResult.data.workspace_id,
      request,
      source: "dos_group",
      status: "active",
      title,
      urgency: "normal",
      visibility: "group_leaders",
      workspace_id: groupResult.data.workspace_id,
    });

  if (error) {
    redirectToMember(slug, "prayer-error");
  }

  revalidatePath(`${publicGroupPath(slug)}/member`);
  redirectToMember(slug, "prayer-sent");
}

export async function updateMemberNotificationPreferences(formData: FormData) {
  const slug = formString(formData, "slug");

  if (!slug) {
    redirectToMember("group", "preferences-error");
  }

  const portalResult = await requireMemberPortal(slug);

  if ("error" in portalResult) {
    redirectToMember(slug, "signin-required");
  }

  const { session, supabase } = portalResult;
  const channel = formString(formData, "channel") === "sms" ? "sms" : "email";
  const consentedAt = new Date().toISOString();
  const preferenceRows = memberNotificationTypes.map((notificationType) => {
    const enabled = formData.get(notificationType) === "on";

    return {
      channel,
      consented_at: enabled ? consentedAt : null,
      enabled,
      group_id: session.groupId,
      member_identity_id: session.identityId,
      notification_type: notificationType,
      person_id: session.personId,
      unsubscribed_at: enabled ? null : consentedAt,
    };
  });

  const { error } = await supabase
    .from("dos_group_member_notification_preferences")
    .upsert(preferenceRows, { onConflict: "member_identity_id,group_id,channel,notification_type" });

  if (error) {
    redirectToMember(slug, "preferences-error");
  }

  revalidatePath(`${publicGroupPath(slug)}/member`);
  redirectToMember(slug, "preferences-saved");
}

/**
 * USA-170 — explicit, human-only redemption.
 *
 * Reached only by the POST on the invitation page. Everything that establishes
 * a session lives here, so a GET or HEAD from an unfurler cannot reach it.
 */
export async function openGroupMemberAccess(formData: FormData) {
  const slug = formString(formData, "slug");
  const token = formString(formData, "token");

  if (!token) {
    redirectToSignIn(slug || "group", "access-invalid");
  }

  const demoResult = claimDemoGroupMemberAccessToken(token, slug);

  if (demoResult.sessionToken) {
    await setMemberSessionCookie(demoResult.sessionToken, demoSessionTtlSeconds);
    redirect(`${publicGroupPath(demoResult.groupSlug ?? slug)}?state=signed-in`);
  }

  if (demoResult.error === "expired") {
    redirectToSignIn(slug, "access-expired");
  }

  if (demoResult.error === "invalid") {
    redirectToSignIn(slug, "access-invalid");
  }

  if (!isSupabaseAdminConfigured()) {
    redirectToSignIn(slug, "access-unavailable");
  }

  const result = await claimGroupMemberAccessToken(createSupabaseAdminClient(), token);

  if (!result.sessionToken) {
    redirectToSignIn(slug, "access-expired");
  }

  await setMemberSessionCookie(result.sessionToken, memberSessionTtlSeconds);

  // Redirect to the slug the token's Group actually carries, not the slug in
  // the URL the participant arrived on. A public slug rename must not strand a
  // link that was texted before the rename (USA-173 coordination).
  redirect(`${publicGroupPath(result.groupSlug ?? slug)}?state=signed-in`);
}

/**
 * USA-170 — leader-assisted recovery.
 *
 * This used to call `createGroupMemberAccessInvitation`, which revokes every
 * active token for the identity before minting a new one — and then nothing
 * delivered that new token anywhere. Production evidence: six tokens revoked
 * with `consumed_at = null` while Tanner was locked out. Every time he pressed
 * the button he destroyed the link Ryan had just texted him.
 *
 * So this mints nothing and revokes nothing. It notifies the leader, who
 * already has a working "Copy Link" action, and reports honestly whether the
 * request actually went anywhere.
 */
export async function requestGroupMemberAccess(formData: FormData) {
  const slug = formString(formData, "slug");
  const email = normalizeEmail(formString(formData, "email"));

  // One neutral outcome for "no match" and "matched", so this endpoint can
  // never be used to test whether an address belongs to a member.
  if (!slug || !emailPattern.test(email) || !isSupabaseAdminConfigured()) {
    redirectToSignIn(slug || "group", "recovery-requested");
  }

  const supabase = createSupabaseAdminClient();

  try {
    const headersList = await headers();
    const siteResolution = await resolvePublicSiteForHost(supabase, requestHostname(headersList));
    const site = siteResolution.site;
    const groupQuery = supabase
      .from("dos_groups")
      .select("id, name, slug, workspace_id, active, member_access_enabled, public_site_id, public_status")
      .eq("slug", slug)
      .eq("active", true);
    const groupResult = siteResolution.schemaReady && site?.id
      ? await groupQuery.eq("public_site_id", site.id).eq("public_status", "published").maybeSingle()
      : siteResolution.allowLegacyGlobalGroups
        ? await groupQuery.maybeSingle()
        : { data: null, error: null };

    const group = groupResult.error ? null : groupResult.data;

    if (group && group.member_access_enabled !== false) {
      const membersResult = await supabase
        .from("dos_group_members")
        .select("id, person_id, status")
        .eq("group_id", group.id)
        .eq("status", "active");
      const personIds = (membersResult.data ?? []).map((member) => member.person_id).filter(Boolean);

      if (personIds.length) {
        const peopleResult = await supabase
          .from("missionary_field_people")
          .select("id, name, email")
          .in("id", personIds)
          .ilike("email", email);

        // Exactly one match only. Production carries three "Tanner Kent"
        // records; matching loosely here could route a recovery request at the
        // wrong person. Ambiguity falls through to the same neutral state.
        const matchingPerson = peopleResult.data?.length === 1 ? peopleResult.data[0] : null;

        if (matchingPerson) {
          const delivered = await notifyGroupAccessRecovery(supabase, {
            id: group.id,
            name: group.name,
            slug: group.slug,
            workspace_id: group.workspace_id,
          }, {
            memberName: matchingPerson.name ?? "A group member",
            requestedAt: new Date().toISOString(),
          });

          redirectToSignIn(slug, delivered ? "recovery-sent" : "recovery-requested");
        }
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }

    console.warn("[Group Member Access] Recovery request failed", error instanceof Error ? error.message : error);
  }

  redirectToSignIn(slug, "recovery-requested");
}

export async function signOutGroupMember(formData: FormData) {
  const slug = formString(formData, "slug");
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(groupMemberSessionCookieName)?.value ?? null;

  if (isSupabaseAdminConfigured()) {
    await revokeGroupMemberSession(createSupabaseAdminClient(), sessionToken);
  }

  cookieStore.set(groupMemberSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/groups",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(publicGroupPath(slug || "group"));
}
