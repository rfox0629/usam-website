import type { Metadata } from "next";
import { AdminMetricCard } from "../admin/_components/AdminUI";
import { NccShell } from "./_components/NccShell";
import { getCurrentOrganization } from "./_lib/organization-context";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";
import { listPartnersDocuments } from "@/src/lib/partners-documents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "NCC Home | National Command Center",
};

type HomeSection = {
  description: string;
  href: string;
  label: string;
  value: number | string;
};

async function loadHomeSections(): Promise<HomeSection[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  const [applications, majorGifts, prayerRequests, groupJoinRequests, partnersDocuments] = await Promise.all([
    supabase.from("usam_missionary_applications").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("major_gift_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("dos_group_join_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    listPartnersDocuments(),
  ]);

  return [
    {
      description: "Applications awaiting review",
      href: "/admin/applications",
      label: "Pending Applications",
      value: applications.count ?? "—",
    },
    {
      description: "New major gift inquiries",
      href: "/admin/finance",
      label: "Major Gift Inquiries",
      value: majorGifts.count ?? "—",
    },
    {
      description: "Active prayer requests",
      href: "/admin/prayer",
      label: "Prayer Requests",
      value: prayerRequests.count ?? "—",
    },
    {
      description: "DOS group join requests pending facilitator action",
      href: "/admin/dashboard",
      label: "Group Join Requests",
      value: groupJoinRequests.count ?? "—",
    },
    {
      description: "Files in the Partnerships document library",
      href: "/ncc/partnerships?tab=documents",
      label: "Partnership Documents",
      value: partnersDocuments.length,
    },
  ];
}

export default async function NccHomePage() {
  const sections = await loadHomeSections();

  return (
    <NccShell active="home" organization={getCurrentOrganization()} title="NCC Home">
      <div className="space-y-8">
        <section>
          <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Live counts from existing tables, each linking to the authoritative page for that record
          </p>
          {sections.length === 0 ? (
            <p className="border border-stone-800/75 bg-[#080808]/85 p-6 text-sm text-stone-400">
              Supabase is not configured in this environment, so no live counts are available.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <AdminMetricCard href={section.href} key={section.label} label={section.label} value={section.value} />
              ))}
            </div>
          )}
        </section>

        <section className="border border-stone-800/75 bg-[#080808]/85 p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>
            About This View
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            NCC Home aggregates and deep-links to existing authoritative pages — it does not duplicate any
            workflow or hold its own copy of this data. Departments marked &ldquo;Legacy&rdquo; in the nav rail
            are real, working pages that have not yet been re-skinned into this shell. Departments marked
            &ldquo;Planned&rdquo; have no built functionality yet.
          </p>
        </section>
      </div>
    </NccShell>
  );
}
