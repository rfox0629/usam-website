import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "../../_components/AdminShell";
import { AdminBadge, AdminEmptyState, adminFont } from "../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "USA Missionaries Applications | National Command Center",
};

type UsamApplicationRow = {
  applicant_email: string | null;
  applicant_name: string;
  applicant_phone: string | null;
  calling_focus: string | null;
  contact_payload: Record<string, unknown> | null;
  created_at: string;
  id: string;
  location: string | null;
  prayer_needs: string | null;
  references_text: string | null;
  status: string;
  submitted_at: string | null;
  support_goal: number | null;
  workspace_id: string;
};

const applicationSelect = [
  "id",
  "workspace_id",
  "applicant_name",
  "applicant_email",
  "applicant_phone",
  "location",
  "calling_focus",
  "support_goal",
  "prayer_needs",
  "references_text",
  "status",
  "submitted_at",
  "created_at",
  "contact_payload",
].join(", ");

function formatDate(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  if (!value) {
    return "Not requested";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function statusTone(status: string) {
  if (status === "approved" || status === "active") {
    return "green" as const;
  }

  if (status === "rejected" || status === "archived") {
    return "red" as const;
  }

  return "amber" as const;
}

function statusLabel(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function photosSummary(payload: Record<string, unknown> | null) {
  const photos = payload?.photos_json;

  if (!photos || typeof photos !== "object" || Array.isArray(photos)) {
    return "Photo metadata not submitted";
  }

  const record = photos as Record<string, unknown>;
  const profilePhotoName = typeof record.profilePhotoName === "string" ? record.profilePhotoName : "";
  const familyPhotoName = typeof record.familyPhotoName === "string" ? record.familyPhotoName : "";

  return [profilePhotoName, familyPhotoName].filter(Boolean).join(" · ") || "Photo metadata submitted";
}

async function loadUsamApplications() {
  if (!isSupabaseAdminConfigured()) {
    return {
      applications: [] as UsamApplicationRow[],
      error: "Supabase admin environment variables are not configured.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usam_missionary_applications")
    .select(applicationSelect)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    return {
      applications: [] as UsamApplicationRow[],
      error: error.message,
    };
  }

  return {
    applications: (data ?? []) as unknown as UsamApplicationRow[],
    error: "",
  };
}

export default async function UsamOrganizationApplicationsPage() {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { applications, error } = await loadUsamApplications();

  return (
    <AdminShell
      active="organizations"
      description="Review real USA Missionaries applications submitted through the unified DOS onboarding flow."
      title="USA Missionaries Applications"
    >
      {error ? (
        <AdminEmptyState
          description={error}
          title="Applications unavailable"
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#D8B65D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                Organizations / USA Missionaries / Applications
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-50">Application Queue</h2>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                These records come from <code className="text-stone-300">usam_missionary_applications</code>. No seed/demo applicant data is used here.
              </p>
            </div>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#D4A63D]/60 px-4 text-[10px] uppercase tracking-[0.14em] text-[#E4C465] transition-colors hover:bg-[#D4A63D]/10"
              href="/admin/missionary-profiles"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              Open Profiles Admin
            </Link>
          </div>

          {applications.length ? (
            <div className="divide-y divide-stone-800/70 overflow-hidden rounded-xl border border-stone-800/75 bg-[#080808]/90">
              {applications.map((application) => (
                <article className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)_auto] lg:items-center" key={application.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-stone-50">{application.applicant_name || "Unnamed applicant"}</h3>
                      <AdminBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</AdminBadge>
                    </div>
                    <p className="mt-1 text-sm text-stone-400">{application.applicant_email ?? "No email"}{application.applicant_phone ? ` · ${application.applicant_phone}` : ""}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-500">{application.calling_focus || "No calling focus submitted yet."}</p>
                  </div>

                  <dl className="grid gap-2 text-sm text-stone-400 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Location</dt>
                      <dd className="mt-1 text-stone-200">{application.location || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Submitted</dt>
                      <dd className="mt-1 text-stone-200">{formatDate(application.submitted_at ?? application.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Support Goal</dt>
                      <dd className="mt-1 text-stone-200">{formatMoney(application.support_goal)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Photos</dt>
                      <dd className="mt-1 text-stone-200">{photosSummary(application.contact_payload)}</dd>
                    </div>
                  </dl>

                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-700 px-4 text-[10px] uppercase tracking-[0.14em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:text-[#E4C465]"
                    href={`/admin/missionary-profiles?application=${encodeURIComponent(application.id)}`}
                    style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                  >
                    Review
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              description="No real USA Missionaries applications have been submitted yet."
              title="No applications"
            />
          )}
        </div>
      )}
    </AdminShell>
  );
}
