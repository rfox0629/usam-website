import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type HouseholdOptionRow = {
  display_name: string;
  id: string;
  show_household?: boolean | null;
  slug: string;
};

export async function GET(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (authorization.status === "unauthorized") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const excludeHouseholdId = url.searchParams.get("exclude")?.trim();
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("missionary_households")
    .select("id, display_name, slug, show_household")
    .eq("public_visible", true)
    .order("display_name", { ascending: true });

  if (excludeHouseholdId) {
    query = query.neq("id", excludeHouseholdId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    households: ((data ?? []) as HouseholdOptionRow[])
      .filter((household) => household.show_household !== false)
      .map((household) => ({
        display_name: household.display_name,
        id: household.id,
        slug: household.slug,
      })),
  });
}
