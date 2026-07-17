"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notifyGroupFacilitators } from "@/src/lib/groups/notify-facilitators";
import {
  missingPublicSiteSchema,
  requestHostname,
  resolvePublicSiteForHost,
} from "@/src/lib/groups/public-site";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const groupSlugPattern = /^[a-z0-9][a-z0-9-]{1,80}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxMessageLength = 1200;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: string) {
  return value ? value : null;
}

function normalizeEmail(value: string) {
  return value.toLowerCase();
}

function normalizePhone(value: string) {
  const compact = value.replace(/[^\d+]/g, "");

  return compact.length >= 7 ? value : "";
}

function sourcePathFor(slug: string, value: string) {
  const fallback = `/groups/${slug}`;

  if (!value.startsWith("/groups/")) {
    return fallback;
  }

  const [pathOnly] = value.split(/[?#]/);

  return pathOnly === fallback ? fallback : fallback;
}

function redirectToGroup(slug: string, state: "received" | "missing" | "unavailable" | "error"): never {
  redirect(`/groups/${slug}?request=${state}#join`);
}

export async function submitGroupJoinRequest(formData: FormData) {
  const slug = formString(formData, "groupSlug");

  if (!groupSlugPattern.test(slug)) {
    redirect("/groups?request=unavailable");
  }

  const firstName = formString(formData, "firstName");
  const lastName = formString(formData, "lastName");
  const email = normalizeEmail(formString(formData, "email"));
  const phone = normalizePhone(formString(formData, "phone"));
  const rawMessage = formString(formData, "message");
  const message = rawMessage.length > maxMessageLength ? rawMessage.slice(0, maxMessageLength) : rawMessage;

  if (!firstName || !lastName || !emailPattern.test(email)) {
    redirectToGroup(slug, "missing");
  }

  if (!isSupabaseAdminConfigured()) {
    redirectToGroup(slug, "unavailable");
  }

  const supabase = createSupabaseAdminClient();
  const headersList = await headers();
  const hostname = requestHostname(headersList);
  const siteResolution = await resolvePublicSiteForHost(supabase, hostname);
  const site = siteResolution.site;
  const groupQuery = supabase
    .from("dos_groups")
    .select("id, workspace_id, organization_id, public_site_id, slug, name, accepting_members")
    .eq("slug", slug)
    .eq("active", true);
  const { data: group, error: groupError } = siteResolution.schemaReady && site?.id
    ? await groupQuery
      .eq("public_site_id", site.id)
      .eq("public_status", "published")
      .maybeSingle()
    : siteResolution.allowLegacyGlobalGroups
      ? await groupQuery.maybeSingle()
      : { data: null, error: null };

  if (groupError || !group) {
    if (groupError && missingPublicSiteSchema(groupError)) {
      const legacyGroupResult = await supabase
        .from("dos_groups")
        .select("id, workspace_id, organization_id, slug, name, accepting_members")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (legacyGroupResult.error || !legacyGroupResult.data) {
        redirectToGroup(slug, "unavailable");
      }

      if (legacyGroupResult.data.accepting_members === false) {
        redirectToGroup(legacyGroupResult.data.slug, "unavailable");
      }

      const sourcePath = sourcePathFor(legacyGroupResult.data.slug, formString(formData, "sourcePath"));
      const submittedAt = new Date().toISOString();

      const { data: existingRequest } = await supabase
        .from("dos_group_join_requests")
        .select("id")
        .eq("group_id", legacyGroupResult.data.id)
        .ilike("email", email)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (existingRequest) {
        redirectToGroup(legacyGroupResult.data.slug, "received");
      }

      const { error } = await supabase
        .from("dos_group_join_requests")
        .insert({
          email,
          first_name: firstName,
          group_id: legacyGroupResult.data.id,
          last_name: lastName,
          message: nullableString(message),
          organization_id: legacyGroupResult.data.organization_id,
          phone: nullableString(phone),
          source_group_id: legacyGroupResult.data.id,
          source_group_slug: legacyGroupResult.data.slug,
          source_path: sourcePath,
          source_type: "group_join_request",
          status: "pending",
          submitted_at: submittedAt,
          workspace_id: legacyGroupResult.data.workspace_id,
        });

      if (error) {
        if ((error as { code?: string }).code === "23505") {
          redirectToGroup(legacyGroupResult.data.slug, "received");
        }

        console.warn("[Public Group] Unable to save join request", error.message);
        redirectToGroup(legacyGroupResult.data.slug, "error");
      }

      await notifyGroupFacilitators(supabase, legacyGroupResult.data, {
        email,
        firstName,
        lastName,
        message,
        phone,
        submittedAt,
      });

      revalidatePath(`/groups/${legacyGroupResult.data.slug}`);
      redirectToGroup(legacyGroupResult.data.slug, "received");
    }

    redirectToGroup(slug, "unavailable");
  }

  if (group.accepting_members === false) {
    redirectToGroup(group.slug, "unavailable");
  }

  const sourcePath = sourcePathFor(group.slug, formString(formData, "sourcePath"));
  const submittedAt = new Date().toISOString();
  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("dos_group_join_requests")
    .select("id")
    .eq("group_id", group.id)
    .ilike("email", email)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existingRequestError) {
    console.warn("[Public Group] Unable to check existing join request", existingRequestError.message);
  }

  if (existingRequest) {
    redirectToGroup(group.slug, "received");
  }

  const { error } = await supabase
    .from("dos_group_join_requests")
    .insert({
      email,
      first_name: firstName,
      group_id: group.id,
      last_name: lastName,
      message: nullableString(message),
      organization_id: group.organization_id,
      phone: nullableString(phone),
      public_site_id: site?.id ?? group.public_site_id ?? null,
      source_group_id: group.id,
      source_group_slug: group.slug,
      source_hostname: hostname,
      source_path: sourcePath,
      source_type: "group_join_request",
      status: "pending",
      submitted_at: submittedAt,
      workspace_id: group.workspace_id,
    });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      redirectToGroup(group.slug, "received");
    }

    console.warn("[Public Group] Unable to save join request", error.message);
    redirectToGroup(group.slug, "error");
  }

  await notifyGroupFacilitators(supabase, group, {
    email,
    firstName,
    lastName,
    message,
    phone,
    submittedAt,
  });

  revalidatePath(`/groups/${group.slug}`);
  redirectToGroup(group.slug, "received");
}
