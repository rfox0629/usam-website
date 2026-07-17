import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { missingPublicSiteSchema, publicGroupPath } from "@/src/lib/groups/public-site";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type GroupRow = {
  accepting_members?: boolean | null;
  active: boolean | null;
  default_location: string | null;
  description: string | null;
  id: string;
  member_access_enabled?: boolean | null;
  member_visible_location_mode?: string | null;
  name: string;
  organization_id: string | null;
  public_site_id?: string | null;
  public_status?: string | null;
  rhythm_label: string | null;
  slug: string;
  tagline: string | null;
  template_category?: string | null;
  type: string | null;
  workspace_id: string;
};

type GroupPublicSiteRow = {
  base_path: string | null;
  hostname: string | null;
  status: string | null;
};

type MemberRow = {
  group_id: string;
  id: string;
  joined_at: string | null;
  person_id: string;
  role: string | null;
  status: string | null;
};

type PersonRow = {
  email: string | null;
  id: string;
  name: string | null;
  phone: string | null;
};

type MemberIdentityRow = {
  auth_user_id: string | null;
  group_id: string;
  group_member_id: string;
  id: string;
  person_id: string;
  status: string | null;
  verified_at: string | null;
  verified_email: string | null;
  verified_phone: string | null;
};

type AccessTokenRow = {
  expires_at: string;
  group_id: string;
  id: string;
  member_identity_id: string;
  status: string | null;
};

type SessionRow = {
  expires_at: string;
  group_id: string;
  id: string;
  member_identity_id: string;
  person_id: string;
  revoked_at: string | null;
};

type GatheringRow = {
  description: string | null;
  ends_at: string | null;
  group_id: string;
  id: string;
  location: string | null;
  starts_at: string;
  status: string | null;
  title: string;
};

type RsvpRow = {
  gathering_id: string;
  id: string;
  note: string | null;
  response: string | null;
  status: string | null;
  updated_at: string | null;
};

type GroupUpdateRow = {
  body: string | null;
  created_at: string;
  expires_at: string | null;
  id: string;
  published_at: string | null;
  title: string;
  visibility: string | null;
};

type GroupResourceRow = {
  description: string | null;
  id: string;
  resource_type: string | null;
  sort_order: number | null;
  title: string;
  url: string | null;
};

type PrayerRequestRow = {
  created_at: string;
  id: string;
  request: string | null;
  title: string | null;
  visibility: string | null;
};

type AttendanceRow = {
  created_at?: string | null;
  gathering_id: string;
  id: string;
  notes: string | null;
  status: string | null;
};

type PreferenceRow = {
  channel: string;
  enabled: boolean | null;
  id: string;
  notification_type: string;
};

export type MemberAccessInvitation = {
  accessUrl: string;
  expiresAt: string;
  identityId: string;
  token: string;
};

export type GroupMemberPortalData = {
  attendance: Array<{
    gatheringId: string;
    id: string;
    notes: string | null;
    status: "absent" | "guest" | "present";
  }>;
  group: {
    description: string;
    id: string;
    location: string;
    name: string;
    rhythm: string;
    slug: string;
    tagline: string;
  };
  identity: {
    email: string | null;
    id: string;
    personId: string;
    phone: string | null;
  };
  nextGathering: {
    description: string | null;
    endsAt: string | null;
    id: string;
    location: string;
    startsAt: string;
    status: "canceled" | "completed" | "scheduled";
    title: string;
  } | null;
  prayerRequests: Array<{
    createdAt: string;
    id: string;
    request: string;
    title: string;
  }>;
  preferences: Array<{
    channel: "email" | "sms";
    enabled: boolean;
    id: string;
    notificationType: string;
  }>;
  resources: Array<{
    description: string | null;
    id: string;
    resourceType: string;
    title: string;
    url: string | null;
  }>;
  rsvp: {
    gatheringId: string;
    id: string;
    note: string | null;
    response: "going" | "maybe" | "not_going";
    status: "active" | "canceled";
    updatedAt: string | null;
  } | null;
  sessionId: string;
  updates: Array<{
    body: string | null;
    createdAt: string;
    id: string;
    publishedAt: string | null;
    title: string;
    visibility: "group_members" | "public";
  }>;
};

export const groupMemberSessionCookieName = "dos_group_member_session";

const accessTokenBytes = 32;
const sessionTokenBytes = 32;
const invitationTtlMs = 1000 * 60 * 60 * 24 * 7;
const sessionTtlMs = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";

  return email.includes("@") ? email : null;
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  return digits.length >= 7 ? digits : null;
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function newToken() {
  return randomBytes(accessTokenBytes).toString("base64url");
}

function newSessionToken() {
  return randomBytes(sessionTokenBytes).toString("base64url");
}

function nowIso() {
  return new Date().toISOString();
}

function expiresIso(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString();
}

function isExpired(value: string) {
  return new Date(value).getTime() <= Date.now();
}

function memberIsActive(member: MemberRow | null | undefined): member is MemberRow {
  return member?.status === "active";
}

function identityIsUsable(identity: MemberIdentityRow | null | undefined): identity is MemberIdentityRow {
  return identity?.status === "invited" || identity?.status === "verified";
}

function groupIsMemberAccessible<T extends Pick<GroupRow, "active" | "member_access_enabled">>(
  group: T | null | undefined,
): group is T {
  return Boolean(group && group.active !== false && group.member_access_enabled !== false);
}

function safeLocationForMember(group: GroupRow, gathering?: Pick<GatheringRow, "location"> | null) {
  const mode = group.member_visible_location_mode ?? "general";

  if (mode === "hidden") {
    return "Shared after leader confirmation";
  }

  if (mode === "exact") {
    return gathering?.location ?? group.default_location ?? "Location TBD";
  }

  return group.default_location ?? gathering?.location ?? "Location TBD";
}

function groupTypeLabel(group: GroupRow) {
  if (group.template_category === "activity" || group.type === "running") {
    return "Activity group";
  }

  return "Discipleship group";
}

async function groupAccessUrl(
  supabase: SupabaseAdminClient,
  group: Pick<GroupRow, "public_site_id" | "slug">,
) {
  if (group.public_site_id) {
    const { data, error } = await supabase
      .from("public_sites")
      .select("hostname, base_path, status")
      .eq("id", group.public_site_id)
      .maybeSingle();

    if (!error && data) {
      const site = data as GroupPublicSiteRow;

      if (site.hostname && site.status !== "inactive" && site.status !== "archived") {
        return `https://${site.hostname}${publicGroupPath(group.slug, { basePath: site.base_path ?? "/groups" })}/member/access`;
      }
    }

    if (error && !missingPublicSiteSchema(error)) {
      console.warn("[Group Member Access] Unable to resolve public site", error.message);
    }
  }

  return new URL(`${publicGroupPath(group.slug)}/member/access`, getConfiguredSiteUrl()).toString();
}

async function loadGroupMemberIdentity(
  supabase: SupabaseAdminClient,
  groupId: string,
  personId: string,
) {
  const { data, error } = await supabase
    .from("dos_group_member_identities")
    .select("id, group_id, group_member_id, person_id, auth_user_id, verified_email, verified_phone, status, verified_at")
    .eq("group_id", groupId)
    .eq("person_id", personId)
    .maybeSingle();

  if (missingPublicSiteSchema(error)) {
    return { error, identity: null };
  }

  return { error, identity: data as MemberIdentityRow | null };
}

export async function createGroupMemberAccessInvitation(
  supabase: SupabaseAdminClient,
  input: {
    createdByPersonId?: string | null;
    createdByUserId?: string | null;
    email?: string | null;
    groupId: string;
    memberId?: string | null;
    personId: string;
    phone?: string | null;
  },
): Promise<{ error?: string; invitation?: MemberAccessInvitation; missingSchema?: boolean }> {
  const [groupResult, memberResult, personResult] = await Promise.all([
    supabase
      .from("dos_groups")
      .select("id, slug, active, member_access_enabled, public_site_id")
      .eq("id", input.groupId)
      .maybeSingle(),
    input.memberId
      ? supabase
        .from("dos_group_members")
        .select("id, group_id, person_id, role, status, joined_at")
        .eq("id", input.memberId)
        .eq("group_id", input.groupId)
        .eq("person_id", input.personId)
        .maybeSingle()
      : supabase
        .from("dos_group_members")
        .select("id, group_id, person_id, role, status, joined_at")
        .eq("group_id", input.groupId)
        .eq("person_id", input.personId)
        .maybeSingle(),
    supabase
      .from("missionary_field_people")
      .select("id, name, email, phone")
      .eq("id", input.personId)
      .maybeSingle(),
  ]);

  if (groupResult.error || memberResult.error || personResult.error) {
    const error = groupResult.error ?? memberResult.error ?? personResult.error;

    return missingPublicSiteSchema(error)
      ? { missingSchema: true }
      : { error: error?.message ?? "Unable to load group member." };
  }

  const group = groupResult.data as Pick<GroupRow, "active" | "id" | "member_access_enabled" | "public_site_id" | "slug"> | null;
  const member = memberResult.data as MemberRow | null;
  const person = personResult.data as PersonRow | null;

  if (!group || !groupIsMemberAccessible(group)) {
    return { error: "Member access is not enabled for this group." };
  }

  if (!memberIsActive(member)) {
    return { error: "Active group membership is required before member access can be invited." };
  }

  if (!person) {
    return { error: "Person record not found." };
  }

  const verifiedEmail = normalizeEmail(input.email) ?? normalizeEmail(person.email);
  const verifiedPhone = normalizePhone(input.phone) ?? normalizePhone(person.phone);

  if (!verifiedEmail && !verifiedPhone) {
    return { error: "A verified email or phone is required before member access can be invited." };
  }

  const existingIdentity = await loadGroupMemberIdentity(supabase, input.groupId, input.personId);

  if (missingPublicSiteSchema(existingIdentity.error)) {
    return { missingSchema: true };
  }

  if (existingIdentity.error) {
    return { error: existingIdentity.error.message ?? "Unable to load member identity." };
  }

  const identityWrite = existingIdentity.identity
    ? await supabase
      .from("dos_group_member_identities")
      .update({
        group_member_id: member.id,
        metadata: {
          lastInvitedAt: nowIso(),
          source: "leader_invitation",
        },
        status: existingIdentity.identity.status === "verified" ? "verified" : "invited",
        verification_method: existingIdentity.identity.status === "verified" ? "email_invitation_token" : "leader_approval",
        verified_email: verifiedEmail,
        verified_phone: verifiedPhone,
      })
      .eq("id", existingIdentity.identity.id)
      .select("id, group_id, group_member_id, person_id, auth_user_id, verified_email, verified_phone, status, verified_at")
      .single()
    : await supabase
      .from("dos_group_member_identities")
      .insert({
        group_id: input.groupId,
        group_member_id: member.id,
        metadata: {
          firstInvitedAt: nowIso(),
          source: "leader_invitation",
        },
        person_id: input.personId,
        status: "invited",
        verification_method: "leader_approval",
        verified_email: verifiedEmail,
        verified_phone: verifiedPhone,
      })
      .select("id, group_id, group_member_id, person_id, auth_user_id, verified_email, verified_phone, status, verified_at")
      .single();

  if (identityWrite.error || !identityWrite.data) {
    return missingPublicSiteSchema(identityWrite.error)
      ? { missingSchema: true }
      : { error: identityWrite.error?.message ?? "Unable to save member identity." };
  }

  const identity = identityWrite.data as MemberIdentityRow;

  await supabase
    .from("dos_group_member_access_tokens")
    .update({
      status: "revoked",
    })
    .eq("member_identity_id", identity.id)
    .eq("status", "active");

  const token = newToken();
  const expiresAt = expiresIso(invitationTtlMs);
  const tokenResult = await supabase
    .from("dos_group_member_access_tokens")
    .insert({
      created_by_person_id: input.createdByPersonId ?? null,
      created_by_user_id: input.createdByUserId ?? null,
      expires_at: expiresAt,
      group_id: input.groupId,
      member_identity_id: identity.id,
      purpose: "member_access",
      status: "active",
      token_hash: tokenHash(token),
    })
    .select("id")
    .single();

  if (tokenResult.error) {
    return missingPublicSiteSchema(tokenResult.error)
      ? { missingSchema: true }
      : { error: tokenResult.error.message };
  }

  const url = new URL(await groupAccessUrl(supabase, group));

  url.searchParams.set("token", token);

  return {
    invitation: {
      accessUrl: url.toString(),
      expiresAt,
      identityId: identity.id,
      token,
    },
  };
}

export async function claimGroupMemberAccessToken(
  supabase: SupabaseAdminClient,
  token: string,
): Promise<{ error?: string; groupSlug?: string; sessionToken?: string }> {
  const cleanedToken = token.trim();

  if (cleanedToken.length < 32) {
    return { error: "Invalid member access link." };
  }

  const tokenResult = await supabase
    .from("dos_group_member_access_tokens")
    .select("id, member_identity_id, group_id, status, expires_at")
    .eq("token_hash", tokenHash(cleanedToken))
    .maybeSingle();

  if (tokenResult.error) {
    return missingPublicSiteSchema(tokenResult.error)
      ? { error: "Member access is not configured yet." }
      : { error: tokenResult.error.message };
  }

  const accessToken = tokenResult.data as AccessTokenRow | null;

  if (!accessToken || accessToken.status !== "active" || isExpired(accessToken.expires_at)) {
    return { error: "This member access link has expired. Request a new one from your group leader." };
  }

  const identityResult = await supabase
    .from("dos_group_member_identities")
    .select("id, group_id, group_member_id, person_id, auth_user_id, verified_email, verified_phone, status, verified_at")
    .eq("id", accessToken.member_identity_id)
    .maybeSingle();

  if (identityResult.error || !identityResult.data) {
    return { error: identityResult.error?.message ?? "Member identity not found." };
  }

  const identity = identityResult.data as MemberIdentityRow;

  if (!identityIsUsable(identity)) {
    return { error: "This member access has been revoked." };
  }

  const [groupResult, memberResult] = await Promise.all([
    supabase
      .from("dos_groups")
      .select("id, slug, active, member_access_enabled")
      .eq("id", identity.group_id)
      .maybeSingle(),
    supabase
      .from("dos_group_members")
      .select("id, group_id, person_id, role, status, joined_at")
      .eq("id", identity.group_member_id)
      .eq("group_id", identity.group_id)
      .eq("person_id", identity.person_id)
      .maybeSingle(),
  ]);

  if (groupResult.error || memberResult.error) {
    return { error: groupResult.error?.message ?? memberResult.error?.message ?? "Unable to verify member access." };
  }

  const group = groupResult.data as Pick<GroupRow, "active" | "id" | "member_access_enabled" | "slug"> | null;
  const member = memberResult.data as MemberRow | null;

  if (!groupIsMemberAccessible(group) || !memberIsActive(member)) {
    return { error: "Your group membership is no longer active." };
  }

  const sessionToken = newSessionToken();
  const sessionResult = await supabase
    .from("dos_group_member_sessions")
    .insert({
      expires_at: expiresIso(sessionTtlMs),
      group_id: identity.group_id,
      member_identity_id: identity.id,
      person_id: identity.person_id,
      session_token_hash: tokenHash(sessionToken),
    })
    .select("id")
    .single();

  if (sessionResult.error) {
    return { error: sessionResult.error.message };
  }

  const updateTime = nowIso();

  await Promise.all([
    supabase
      .from("dos_group_member_identities")
      .update({
        last_accessed_at: updateTime,
        status: "verified",
        verification_method: "email_invitation_token",
        verified_at: identity.verified_at ?? updateTime,
      })
      .eq("id", identity.id),
    supabase
      .from("dos_group_member_access_tokens")
      .update({
        consumed_at: updateTime,
        status: "used",
      })
      .eq("id", accessToken.id),
  ]);

  return {
    groupSlug: group?.slug,
    sessionToken,
  };
}

function mapGatheringStatus(value: string | null | undefined): "canceled" | "completed" | "scheduled" {
  return value === "canceled" || value === "completed" ? value : "scheduled";
}

function mapRsvpResponse(value: string | null | undefined): "going" | "maybe" | "not_going" {
  return value === "not_going" || value === "maybe" ? value : "going";
}

function mapRsvpStatus(value: string | null | undefined): "active" | "canceled" {
  return value === "canceled" ? "canceled" : "active";
}

function mapAttendanceStatus(value: string | null | undefined): "absent" | "guest" | "present" {
  return value === "absent" || value === "guest" ? value : "present";
}

export async function loadGroupMemberPortalData(
  supabase: SupabaseAdminClient,
  input: {
    sessionToken: string | null | undefined;
    slug: string;
  },
): Promise<{ data?: GroupMemberPortalData; error?: string; unauthorized?: boolean }> {
  const sessionToken = input.sessionToken?.trim();

  if (!sessionToken) {
    return { unauthorized: true };
  }

  const sessionResult = await supabase
    .from("dos_group_member_sessions")
    .select("id, member_identity_id, group_id, person_id, expires_at, revoked_at")
    .eq("session_token_hash", tokenHash(sessionToken))
    .maybeSingle();

  if (sessionResult.error) {
    return missingPublicSiteSchema(sessionResult.error)
      ? { error: "Member access is not configured yet." }
      : { error: sessionResult.error.message };
  }

  const session = sessionResult.data as SessionRow | null;

  if (!session || session.revoked_at || isExpired(session.expires_at)) {
    return { unauthorized: true };
  }

  const [identityResult, memberResult, groupResult, personResult] = await Promise.all([
    supabase
      .from("dos_group_member_identities")
      .select("id, group_id, group_member_id, person_id, auth_user_id, verified_email, verified_phone, status, verified_at")
      .eq("id", session.member_identity_id)
      .maybeSingle(),
    supabase
      .from("dos_group_members")
      .select("id, group_id, person_id, role, status, joined_at")
      .eq("group_id", session.group_id)
      .eq("person_id", session.person_id)
      .maybeSingle(),
    supabase
      .from("dos_groups")
      .select("id, workspace_id, organization_id, public_site_id, public_status, name, slug, description, tagline, type, template_category, rhythm_label, default_location, active, accepting_members, member_access_enabled, member_visible_location_mode")
      .eq("id", session.group_id)
      .eq("slug", input.slug)
      .maybeSingle(),
    supabase
      .from("missionary_field_people")
      .select("id, name, email, phone")
      .eq("id", session.person_id)
      .maybeSingle(),
  ]);

  if (identityResult.error || memberResult.error || groupResult.error || personResult.error) {
    return { error: identityResult.error?.message ?? memberResult.error?.message ?? groupResult.error?.message ?? personResult.error?.message ?? "Unable to load member portal." };
  }

  const identity = identityResult.data as MemberIdentityRow | null;
  const member = memberResult.data as MemberRow | null;
  const group = groupResult.data as GroupRow | null;
  const person = personResult.data as PersonRow | null;

  if (!identity || identity.status !== "verified" || !memberIsActive(member) || !groupIsMemberAccessible(group) || !person) {
    return { unauthorized: true };
  }

  const now = new Date().toISOString();
  const nextGatheringResult = await supabase
    .from("dos_group_gatherings")
    .select("id, group_id, title, description, starts_at, ends_at, location, status")
    .eq("group_id", group.id)
    .eq("status", "scheduled")
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const nextGathering = nextGatheringResult.error ? null : nextGatheringResult.data as GatheringRow | null;

  const [
    rsvpResult,
    updatesResult,
    resourcesResult,
    prayerResult,
    attendanceResult,
    preferencesResult,
  ] = await Promise.all([
    nextGathering
      ? supabase
        .from("dos_group_rsvps")
        .select("id, gathering_id, response, note, status, updated_at")
        .eq("gathering_id", nextGathering.id)
        .eq("person_id", session.person_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("dos_group_updates")
      .select("id, title, body, visibility, published_at, expires_at, created_at")
      .eq("group_id", group.id)
      .eq("status", "published")
      .in("visibility", ["public", "group_members"])
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("dos_group_resources")
      .select("id, title, description, url, resource_type, sort_order")
      .eq("group_id", group.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(8),
    supabase
      .from("prayer_requests")
      .select("id, title, request, visibility, created_at")
      .eq("group_id", group.id)
      .eq("status", "active")
      .eq("visibility", "group_members")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("dos_group_attendance")
      .select("id, gathering_id, status, notes, created_at")
      .eq("person_id", session.person_id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("dos_group_member_notification_preferences")
      .select("id, channel, notification_type, enabled")
      .eq("member_identity_id", identity.id)
      .eq("group_id", group.id)
      .order("channel", { ascending: true }),
  ]);

  await Promise.all([
    supabase
      .from("dos_group_member_sessions")
      .update({ last_seen_at: now })
      .eq("id", session.id),
    supabase
      .from("dos_group_member_identities")
      .update({ last_accessed_at: now })
      .eq("id", identity.id),
  ]);

  const rsvp = rsvpResult.error || !rsvpResult.data ? null : rsvpResult.data as RsvpRow;
  const updates = updatesResult.error ? [] : updatesResult.data as GroupUpdateRow[];
  const resources = resourcesResult.error ? [] : resourcesResult.data as GroupResourceRow[];
  const prayerRequests = prayerResult.error ? [] : prayerResult.data as PrayerRequestRow[];
  const attendance = attendanceResult.error ? [] : attendanceResult.data as AttendanceRow[];
  const preferences = preferencesResult.error ? [] : preferencesResult.data as PreferenceRow[];
  const location = safeLocationForMember(group, nextGathering);

  return {
    data: {
      attendance: attendance.map((item) => ({
        gatheringId: item.gathering_id,
        id: item.id,
        notes: item.notes,
        status: mapAttendanceStatus(item.status),
      })),
      group: {
        description: group.description ?? `A ${groupTypeLabel(group).toLowerCase()} connected to ${group.rhythm_label ?? "a steady rhythm"}.`,
        id: group.id,
        location,
        name: group.name,
        rhythm: group.rhythm_label ?? "Recurring",
        slug: group.slug,
        tagline: group.tagline ?? "Discipleship happens in rhythms.",
      },
      identity: {
        email: identity.verified_email ?? normalizeEmail(person.email),
        id: identity.id,
        personId: identity.person_id,
        phone: identity.verified_phone ?? normalizePhone(person.phone),
      },
      nextGathering: nextGathering
        ? {
          description: nextGathering.description,
          endsAt: nextGathering.ends_at,
          id: nextGathering.id,
          location,
          startsAt: nextGathering.starts_at,
          status: mapGatheringStatus(nextGathering.status),
          title: nextGathering.title,
        }
        : null,
      prayerRequests: prayerRequests.map((request) => ({
        createdAt: request.created_at,
        id: request.id,
        request: request.request ?? "",
        title: request.title ?? "Prayer request",
      })),
      preferences: preferences.map((preference) => ({
        channel: preference.channel === "sms" ? "sms" : "email",
        enabled: preference.enabled !== false,
        id: preference.id,
        notificationType: preference.notification_type,
      })),
      resources: resources.map((resource) => ({
        description: resource.description,
        id: resource.id,
        resourceType: resource.resource_type ?? "link",
        title: resource.title,
        url: resource.url,
      })),
      rsvp: rsvp
        ? {
          gatheringId: rsvp.gathering_id,
          id: rsvp.id,
          note: rsvp.note,
          response: mapRsvpResponse(rsvp.response),
          status: mapRsvpStatus(rsvp.status),
          updatedAt: rsvp.updated_at,
        }
        : null,
      sessionId: session.id,
      updates: updates.map((update) => ({
        body: update.body,
        createdAt: update.created_at,
        id: update.id,
        publishedAt: update.published_at,
        title: update.title,
        visibility: update.visibility === "public" ? "public" : "group_members",
      })),
    },
  };
}

export async function revokeGroupMemberSession(
  supabase: SupabaseAdminClient,
  sessionToken: string | null | undefined,
) {
  if (!sessionToken) {
    return;
  }

  await supabase
    .from("dos_group_member_sessions")
    .update({ revoked_at: nowIso() })
    .eq("session_token_hash", tokenHash(sessionToken));
}

export async function loadMemberSessionIdentity(
  supabase: SupabaseAdminClient,
  sessionToken: string | null | undefined,
  slug: string,
) {
  const portal = await loadGroupMemberPortalData(supabase, { sessionToken, slug });

  return portal.data
    ? {
      groupId: portal.data.group.id,
      identityId: portal.data.identity.id,
      personId: portal.data.identity.personId,
      portal: portal.data,
    }
    : null;
}
