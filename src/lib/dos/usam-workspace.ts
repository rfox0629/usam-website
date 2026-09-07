/**
 * USAM workspace boundary (USA-238 / USA-239).
 *
 * Kitchen Table Gospel response capture is a USA Missionaries implementation
 * feature layered on DOS Core (app/dos/README.md "DOS Core And USAM"). Whether
 * a workspace is a USAM Missionary Workspace is decided from actual state, in
 * one place, for both the app loader (what the client renders) and the
 * meetings API (what the server accepts):
 *
 *   1. the workspace's USAM application is approved or active, or
 *   2. the workspace's public missionary profile is live, or
 *   3. the workspace's owning organization (through its collective) is the
 *      USA Missionaries organization.
 *
 * A workspace with none of these is a generic DOS workspace: gated flows are
 * hidden client-side and rejected server-side. The decision is a pure
 * function so regression scripts can exercise it without a database; the
 * loader below gathers the facts with the service-role client.
 */
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type UsamWorkspaceFacts = {
  /** Latest USAM application status, normalized upstream ("approved", "active", "not_connected", …). */
  applicationStatus: string | null | undefined;
  /** The owning organization resolved through the workspace's collective, or null when the workspace has none. */
  ownerOrganization: { brandingMode: string | null; slug: string | null } | null;
  /** Whether the workspace's public missionary profile is live (public_visible and household shown). */
  publicProfileLive: boolean;
};

export const usamActiveApplicationStatuses = ["active", "approved"] as const;

export function isUsamOrganization(organization: { brandingMode?: string | null; slug?: string | null } | null | undefined) {
  return Boolean(organization && (organization.brandingMode === "usam" || organization.slug === "usa-missionaries"));
}

/** The one rule. Returns true only when the workspace is a USAM Missionary Workspace by actual state. */
export function decideUsamWorkspace(facts: UsamWorkspaceFacts) {
  if (facts.applicationStatus && (usamActiveApplicationStatuses as readonly string[]).includes(facts.applicationStatus)) {
    return true;
  }

  if (facts.publicProfileLive) {
    return true;
  }

  return isUsamOrganization(facts.ownerOrganization);
}

type HouseholdBoundaryRow = {
  id: string;
  public_visible?: boolean | null;
  show_household?: boolean | null;
  slug: string;
  usam_application_status?: string | null;
};

export function publicProfileLiveForWorkspace(workspace: Pick<HouseholdBoundaryRow, "public_visible" | "show_household">) {
  return workspace.public_visible === true && workspace.show_household !== false;
}

/**
 * Gather the facts for a workspace from the database. Read-only. Missing
 * optional tables (older environments without the application workflow or
 * collectives) count as "no application" / "no organization", never as USAM.
 */
export async function loadUsamWorkspaceFacts(supabase: SupabaseAdminClient, workspaceId: string): Promise<UsamWorkspaceFacts | null> {
  const householdResult = await supabase
    .from("missionary_households")
    .select("id, slug, public_visible, show_household, usam_application_status")
    .eq("id", workspaceId)
    .maybeSingle();

  if (householdResult.error || !householdResult.data) {
    return null;
  }

  const household = householdResult.data as HouseholdBoundaryRow;

  const applicationResult = await supabase
    .from("usam_missionary_applications")
    .select("status")
    .eq("workspace_id", household.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const applicationStatus = !applicationResult.error && applicationResult.data
    ? (applicationResult.data as { status?: string | null }).status ?? null
    : household.usam_application_status ?? null;

  let ownerOrganization: UsamWorkspaceFacts["ownerOrganization"] = null;
  const collectiveResult = await supabase
    .from("collectives")
    .select("owner_organization_id")
    .eq("slug", household.slug)
    .maybeSingle();
  const ownerOrganizationId = !collectiveResult.error
    ? (collectiveResult.data as { owner_organization_id?: string | null } | null)?.owner_organization_id ?? null
    : null;

  if (ownerOrganizationId) {
    const organizationResult = await supabase
      .from("organizations")
      .select("branding_mode, slug")
      .eq("id", ownerOrganizationId)
      .maybeSingle();

    if (!organizationResult.error && organizationResult.data) {
      const organization = organizationResult.data as { branding_mode?: string | null; slug?: string | null };

      ownerOrganization = { brandingMode: organization.branding_mode ?? null, slug: organization.slug ?? null };
    }
  }

  return {
    applicationStatus,
    ownerOrganization,
    publicProfileLive: publicProfileLiveForWorkspace(household),
  };
}

/** Server-side gate for the meetings API: false for unknown workspaces and for generic DOS workspaces. */
export async function isUsamWorkspaceById(supabase: SupabaseAdminClient, workspaceId: string) {
  const facts = await loadUsamWorkspaceFacts(supabase, workspaceId);

  return facts ? decideUsamWorkspace(facts) : false;
}
