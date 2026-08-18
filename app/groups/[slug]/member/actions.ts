"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  claimDemoGroupMemberAccessToken,
  claimGroupMemberAccessToken,
  createGroupMemberAccessInvitation,
  groupMemberSessionCookieName,
  hasRecentActiveGroupMemberAccessToken,
  loadDemoGroupMemberPortalData,
  loadMemberSessionIdentity,
  revokeGroupMemberSession,
} from "@/src/lib/groups/member-access";
import { sendGroupMemberAccessRecoveryEmail } from "@/src/lib/groups/email";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import {
  missingPublicSiteSchema,
  publicGroupPath,
  requestHostname,
  resolvePublicSiteForHost,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const recoveryRequestMinIntervalMs = 5 * 60 * 1000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const memberNotificationTypes = [
  "gathering_reminder",
  "schedule_change",
  "cancellation",
  "announcement",
  "prayer_update",
  "rsvp_reminder",
] as const;

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

export async function requestGroupMemberAccess(formData: FormData) {
  const slug = formString(formData, "slug");
  const email = normalizeEmail(formString(formData, "email"));

  if (!slug || !emailPattern.test(email)) {
    redirectToSignIn(slug || "group", "access-requested");
  }

  if (!isSupabaseAdminConfigured()) {
    redirectToSignIn(slug, "access-requested");
  }

  const supabase = createSupabaseAdminClient();
  const headersList = await headers();
  const siteResolution = await resolvePublicSiteForHost(supabase, requestHostname(headersList));
  const site = siteResolution.site;
  const groupQuery = supabase
    .from("dos_groups")
    .select("id, slug, name, active, member_access_enabled, public_site_id, public_status")
    .eq("slug", slug)
    .eq("active", true);
  const groupResult = siteResolution.schemaReady && site?.id
    ? await groupQuery
      .eq("public_site_id", site.id)
      .eq("public_status", "published")
      .maybeSingle()
    : siteResolution.allowLegacyGlobalGroups
      ? await groupQuery.maybeSingle()
      : { data: null, error: null };

  if (groupResult.error && !missingPublicSiteSchema(groupResult.error)) {
    redirectToSignIn(slug, "access-requested");
  }

  if (!groupResult.error && groupResult.data && groupResult.data.member_access_enabled !== false) {
    const membersResult = await supabase
      .from("dos_group_members")
      .select("id, person_id, status")
      .eq("group_id", groupResult.data.id)
      .eq("status", "active");

    const personIds = (membersResult.data ?? []).map((member) => member.person_id).filter(Boolean);

    if (personIds.length) {
      const peopleResult = await supabase
        .from("missionary_field_people")
        .select("id, email, phone")
        .in("id", personIds)
        .ilike("email", email);
      const matchingPerson = peopleResult.data?.length === 1 ? peopleResult.data[0] : null;
      const matchingMember = matchingPerson
        ? membersResult.data?.find((member) => member.person_id === matchingPerson.id)
        : null;

      if (matchingPerson && matchingMember) {
        const recentlyRequested = await hasRecentActiveGroupMemberAccessToken(supabase, {
          groupId: groupResult.data.id,
          personId: matchingPerson.id,
          withinMs: recoveryRequestMinIntervalMs,
        });

        if (!recentlyRequested) {
          const invitationResult = await createGroupMemberAccessInvitation(supabase, {
            email,
            groupId: groupResult.data.id,
            memberId: matchingMember.id,
            personId: matchingPerson.id,
            phone: matchingPerson.phone,
          });

          if (invitationResult.invitation) {
            try {
              await sendGroupMemberAccessRecoveryEmail({
                accessUrl: invitationResult.invitation.accessUrl,
                groupName: groupResult.data.name || "your group",
                recipientEmail: email,
              });
            } catch (error) {
              console.error("[Group Member Access] Recovery email failed", error);
            }
          }
        }
      }
    }
  }

  // Same redirect regardless of match, delivery, or rate limit: the response
  // must never reveal whether an email belongs to an active member.
  redirectToSignIn(slug, "access-requested");
}

/**
 * The only place that consumes/rotates an invitation token or mints a
 * session. It is reached only through an explicit human `Open Group Home`
 * form submit (a real POST) from the read-only confirmation page — never
 * from the GET that renders that page, so link-preview crawlers, security
 * scanners, and repeated unauthenticated GET/HEAD requests can never redeem
 * a participant's one-time access.
 */
export async function redeemGroupMemberAccess(formData: FormData) {
  const slug = formString(formData, "slug");
  const token = formString(formData, "token");

  if (!slug || !token) {
    redirectToSignIn(slug || "group", "access-invalid");
  }

  const demoResult = claimDemoGroupMemberAccessToken(token, slug);

  if (demoResult.sessionToken) {
    const cookieStore = await cookies();

    cookieStore.set(groupMemberSessionCookieName, demoResult.sessionToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/groups",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    redirectToMember(demoResult.groupSlug ?? slug, "signed-in");
  }

  if (demoResult.error === "expired") {
    redirectToSignIn(slug, "access-expired");
  }

  if (demoResult.error === "invalid") {
    redirectToSignIn(slug, "access-invalid");
  }

  if (token.length < 32 || !isSupabaseAdminConfigured()) {
    redirectToSignIn(slug, "access-unavailable");
  }

  const result = await claimGroupMemberAccessToken(createSupabaseAdminClient(), token);

  if (!result.sessionToken) {
    redirectToSignIn(slug, "access-expired");
  }

  const cookieStore = await cookies();

  cookieStore.set(groupMemberSessionCookieName, result.sessionToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/groups",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirectToMember(result.groupSlug ?? slug, "signed-in");
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
