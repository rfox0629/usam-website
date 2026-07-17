"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGroupMemberAccessInvitation,
  groupMemberSessionCookieName,
  loadMemberSessionIdentity,
  revokeGroupMemberSession,
} from "@/src/lib/groups/member-access";
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
    .select("id, slug, active, member_access_enabled, public_site_id, public_status")
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
        await createGroupMemberAccessInvitation(supabase, {
          email,
          groupId: groupResult.data.id,
          memberId: matchingMember.id,
          personId: matchingPerson.id,
          phone: matchingPerson.phone,
        });
      }
    }
  }

  redirectToSignIn(slug, "access-requested");
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
