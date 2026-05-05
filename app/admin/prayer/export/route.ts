import { NextResponse } from "next/server";
import { getAdminAuthorization, hasPrayerAdminAccess } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type PrayerPartnerRow = {
  created_at: string;
  email: string;
  name: string;
  recruited_by_household_name: string | null;
  region: string | null;
  state: string | null;
  status: string;
};

function csvCell(value: string | null | undefined) {
  const text = value ?? "";

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const authorization = await getAdminAuthorization();

  if (!hasPrayerAdminAccess(authorization)) {
    return NextResponse.json({ error: "Prayer Team admin access is required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("prayer_partners")
    .select("name, email, state, region, recruited_by_household_name, created_at, status")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PrayerPartnerRow[];
  const csv = [
    ["Name", "Email", "State", "Region", "Recruited By", "Date Joined", "Status"].map(csvCell).join(","),
    ...rows.map((row) => [
      row.name,
      row.email,
      row.state,
      row.region,
      row.recruited_by_household_name,
      row.created_at,
      row.status,
    ].map(csvCell).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="prayer-partners.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
