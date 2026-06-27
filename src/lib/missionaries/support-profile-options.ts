import "server-only";

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import type { PublicSupportProfileOption } from "@/src/lib/missionaries/support-profile-types";

type ProfileRow = {
  display_name: string;
  id: string;
  public_display_name: string | null;
  public_slug: string | null;
  public_slug_aliases: string[] | null;
  show_household: boolean | null;
  slug: string;
};

function publicDisplayName(row: Pick<ProfileRow, "display_name" | "public_display_name">) {
  return row.public_display_name?.trim() || row.display_name;
}

function publicSlug(row: Pick<ProfileRow, "public_slug" | "slug">) {
  return row.public_slug?.trim() || row.slug;
}

export async function getPublicSupportProfileOptions(): Promise<PublicSupportProfileOption[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("missionary_households")
    .select("id, slug, public_slug, public_display_name, public_slug_aliases, display_name, show_household")
    .eq("public_visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Support profile options failed:", error.message);
    return [];
  }

  return ((data ?? []) as ProfileRow[])
    .filter((row) => row.show_household !== false)
    .map((row) => {
      const displayName = publicDisplayName(row);
      const slug = publicSlug(row);
      const aliases = [row.display_name, row.slug, row.public_slug, ...(row.public_slug_aliases ?? [])]
        .filter(Boolean)
        .join(" ");

      return {
        displayName,
        id: row.id,
        searchLabel: [displayName, aliases].filter(Boolean).join(" "),
        slug,
      };
    });
}
