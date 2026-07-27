import "server-only";

import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type PublicSiteRow = {
  base_path: string;
  brand: Record<string, unknown> | null;
  display_name: string;
  hostname: string;
  id: string;
  is_default: boolean | null;
  logo_url: string | null;
  organization_id: string | null;
  personal_ministry_entity_id?: string | null;
  status: string | null;
};

type OrganizationRow = {
  branding_mode: string | null;
  id: string;
  name: string;
  slug: string;
};

type WorkspaceOrganizationRow = {
  slug: string;
};

export type PublicSiteConfig = {
  basePath: string;
  brand: Record<string, unknown>;
  displayName: string;
  hostname: string;
  id: string | null;
  isDefault: boolean;
  logoUrl: string | null;
  organization: {
    brandingMode: string | null;
    id: string;
    name: string;
    slug: string;
  } | null;
  organizationId: string | null;
  status: "active" | "inactive" | "archived";
};

export type PublicSiteResolution = {
  allowLegacyGlobalGroups: boolean;
  schemaReady: boolean;
  site: PublicSiteConfig | null;
};

export const canonicalPublicCommunityBasePath = "/community";
export const legacyPublicGroupsBasePath = "/groups";
export const defaultPublicGroupsBasePath = legacyPublicGroupsBasePath;

export const fallbackUsamPublicSite: PublicSiteConfig = {
  basePath: defaultPublicGroupsBasePath,
  brand: {
    primaryColor: "#C2A14E",
    surfaceColor: "#0B0D10",
    templateBranding: "usam",
  },
  displayName: "USA Missionaries",
  hostname: canonicalHostname(),
  id: null,
  isDefault: true,
  logoUrl: "/brand/logo/usam-website-logo.png",
  organization: {
    brandingMode: "usam",
    id: "usa-missionaries",
    name: "USA Missionaries",
    slug: "usa-missionaries",
  },
  organizationId: null,
  status: "active",
};

function canonicalHostname() {
  try {
    return new URL(getCanonicalSiteUrl()).hostname.toLowerCase();
  } catch {
    return "usamissionaries.org";
  }
}

function normalizeHostname(value: string | null | undefined) {
  const hostname = value
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0];

  return hostname || canonicalHostname();
}

export function requestHostname(headersList: Headers) {
  return normalizeHostname(
    headersList.get("x-forwarded-host")
      ?? headersList.get("host")
      ?? headersList.get("x-vercel-forwarded-host"),
  );
}

export function isLocalPublicHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
}

export function isCanonicalPublicHostname(hostname: string) {
  return normalizeHostname(hostname) === canonicalHostname();
}

export function publicGroupsDirectoryPath(site: Pick<PublicSiteConfig, "basePath"> | null = null) {
  const basePath = site?.basePath || defaultPublicGroupsBasePath;
  const routeBasePath = basePath === legacyPublicGroupsBasePath
    ? canonicalPublicCommunityBasePath
    : basePath;

  return routeBasePath.replace(/\/+$/, "") || canonicalPublicCommunityBasePath;
}

export function publicGroupPath(slug: string, site: Pick<PublicSiteConfig, "basePath"> | null = null) {
  return `${publicGroupsDirectoryPath(site)}/${slug}`;
}

export function missingPublicSiteSchema(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  return error?.code === "42P01"
    || error?.code === "42703"
    || error?.code === "PGRST205"
    || ["public_sites", "public_site_id", "public_status", "schema cache"].some((needle) => message.includes(needle));
}

function statusFor(value: string | null | undefined): PublicSiteConfig["status"] {
  return value === "inactive" || value === "archived" ? value : "active";
}

async function loadOrganization(
  supabase: SupabaseAdminClient,
  organizationId: string | null | undefined,
) {
  if (!organizationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, branding_mode")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as OrganizationRow;
}

async function mapPublicSite(supabase: SupabaseAdminClient, row: PublicSiteRow): Promise<PublicSiteConfig> {
  const organization = await loadOrganization(supabase, row.organization_id);

  return {
    basePath: row.base_path || defaultPublicGroupsBasePath,
    brand: row.brand ?? {},
    displayName: row.display_name,
    hostname: row.hostname,
    id: row.id,
    isDefault: row.is_default === true,
    logoUrl: row.logo_url,
    organization: organization
      ? {
        brandingMode: organization.branding_mode,
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      }
      : null,
    organizationId: row.organization_id,
    status: statusFor(row.status),
  };
}

async function loadDefaultPublicSiteForOrganization(
  supabase: SupabaseAdminClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("public_sites")
    .select("id, organization_id, personal_ministry_entity_id, hostname, base_path, display_name, logo_url, brand, status, is_default")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("is_default", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error, site: null };
  }

  return {
    error: null,
    site: data ? await mapPublicSite(supabase, data as PublicSiteRow) : null,
  };
}

export async function resolvePublicSiteForHost(
  supabase: SupabaseAdminClient,
  hostnameInput: string,
  basePath = defaultPublicGroupsBasePath,
): Promise<PublicSiteResolution> {
  const hostname = normalizeHostname(hostnameInput);
  const { data, error } = await supabase
    .from("public_sites")
    .select("id, organization_id, personal_ministry_entity_id, hostname, base_path, display_name, logo_url, brand, status, is_default")
    .eq("hostname", hostname)
    .eq("base_path", basePath)
    .eq("status", "active")
    .maybeSingle();

  if (missingPublicSiteSchema(error)) {
    return {
      allowLegacyGlobalGroups: isCanonicalPublicHostname(hostname) || isLocalPublicHostname(hostname),
      schemaReady: false,
      site: fallbackUsamPublicSite,
    };
  }

  if (error) {
    console.warn("[Public Site] Unable to resolve public site", error.message);
    return { allowLegacyGlobalGroups: false, schemaReady: true, site: null };
  }

  if (data) {
    return {
      allowLegacyGlobalGroups: false,
      schemaReady: true,
      site: await mapPublicSite(supabase, data as PublicSiteRow),
    };
  }

  if (isLocalPublicHostname(hostname) || isCanonicalPublicHostname(hostname)) {
    const { data: defaultSite, error: defaultError } = await supabase
      .from("public_sites")
      .select("id, organization_id, personal_ministry_entity_id, hostname, base_path, display_name, logo_url, brand, status, is_default")
      .eq("base_path", basePath)
      .eq("status", "active")
      .eq("is_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (missingPublicSiteSchema(defaultError)) {
      return {
        allowLegacyGlobalGroups: true,
        schemaReady: false,
        site: fallbackUsamPublicSite,
      };
    }

    if (defaultError) {
      console.warn("[Public Site] Unable to load default public site", defaultError.message);
      return { allowLegacyGlobalGroups: false, schemaReady: true, site: fallbackUsamPublicSite };
    }

    return {
      allowLegacyGlobalGroups: false,
      schemaReady: true,
      site: defaultSite ? await mapPublicSite(supabase, defaultSite as PublicSiteRow) : fallbackUsamPublicSite,
    };
  }

  return { allowLegacyGlobalGroups: false, schemaReady: true, site: null };
}

export async function resolveDefaultPublicSiteForWorkspace(
  supabase: SupabaseAdminClient,
  workspaceId: string,
) {
  const workspaceResult = await supabase
    .from("missionary_households")
    .select("slug")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceResult.error) {
    return { error: workspaceResult.error, organizationId: null, site: null };
  }

  const workspace = workspaceResult.data as WorkspaceOrganizationRow | null;
  let organizationId: string | null = null;

  if (workspace?.slug) {
    const collectiveResult = await supabase
      .from("collectives")
      .select("owner_organization_id")
      .eq("slug", workspace.slug)
      .maybeSingle();

    if (!collectiveResult.error) {
      organizationId = collectiveResult.data?.owner_organization_id ?? null;
    }
  }

  if (!organizationId) {
    const fallbackOrganizationResult = await supabase
      .from("organizations")
      .select("id")
      .or("slug.eq.usa-missionaries,branding_mode.eq.usam")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!fallbackOrganizationResult.error) {
      organizationId = fallbackOrganizationResult.data?.id ?? null;
    }
  }

  if (!organizationId) {
    return { error: null, organizationId: null, site: null };
  }

  const siteResult = await loadDefaultPublicSiteForOrganization(supabase, organizationId);

  if (missingPublicSiteSchema(siteResult.error)) {
    return { error: null, organizationId, site: null };
  }

  return { error: siteResult.error, organizationId, site: siteResult.site };
}
