import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge, AdminEmptyState, AdminMetricCard, adminFont, type AdminBadgeTone } from "../_components/AdminUI";
import { AdminShell } from "../_components/AdminShell";
import {
  productFeedbackCategoryLabel,
  productFeedbackStatusLabel,
  type ProductFeedbackStatus,
} from "@/src/lib/dos/product-feedback";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Product Feedback | Command Center",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

type ProductFeedbackRow = {
  admin_notes: string | null;
  category: string;
  collective_id: string | null;
  created_at: string;
  id: string;
  message_text: string | null;
  organization_id: string | null;
  page_path: string | null;
  status: string;
  submitted_by_profile_id: string | null;
  voice_file_url: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type ProfileRow = {
  email: string | null;
  first_name: string;
  id: string;
  last_name: string;
};

type FeedbackData = {
  error?: string;
  feedback: ProductFeedbackRow[];
  organizations: Map<string, OrganizationRow>;
  profiles: Map<string, ProfileRow>;
};

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getProfileLabel(profile: ProfileRow | undefined) {
  if (!profile) {
    return "Anonymous";
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  return name || profile.email || "Anonymous";
}

function getStatusTone(status: string): AdminBadgeTone {
  const tones: Partial<Record<ProductFeedbackStatus, AdminBadgeTone>> = {
    archived: "muted",
    completed: "green",
    in_progress: "blue",
    new: "amber",
    planned: "blue",
    reviewed: "muted",
  };

  return tones[status as ProductFeedbackStatus] ?? "muted";
}

async function loadProductFeedback(): Promise<FeedbackData> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      feedback: [],
      organizations: new Map(),
      profiles: new Map(),
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: feedback, error } = await supabase
    .from("product_feedback")
    .select("id, organization_id, submitted_by_profile_id, collective_id, page_path, category, message_text, voice_file_url, status, admin_notes, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      error: error.message,
      feedback: [],
      organizations: new Map(),
      profiles: new Map(),
    };
  }

  const rows = (feedback ?? []) as ProductFeedbackRow[];
  const organizationIds = uniqueStrings(rows.map((row) => row.organization_id));
  const profileIds = uniqueStrings(rows.map((row) => row.submitted_by_profile_id));

  const [organizationsResult, profilesResult] = await Promise.all([
    organizationIds.length
      ? supabase.from("organizations").select("id, name").in("id", organizationIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, email").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (organizationsResult.error || profilesResult.error) {
    return {
      error: organizationsResult.error?.message ?? profilesResult.error?.message ?? "Unable to load feedback details.",
      feedback: rows,
      organizations: new Map(),
      profiles: new Map(),
    };
  }

  return {
    feedback: rows,
    organizations: new Map(((organizationsResult.data ?? []) as OrganizationRow[]).map((row) => [row.id, row])),
    profiles: new Map(((profilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row])),
  };
}

export default async function ProductFeedbackAdminPage() {
  const data = await loadProductFeedback();
  const newFeedback = data.feedback.filter((row) => row.status === "new");

  return (
    <AdminShell
      active="product-feedback"
      description="Review lightweight DOS feedback from users before deciding what belongs in the product plan."
      title="Product Feedback"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard label="New feedback" value={data.error ? "-" : newFeedback.length} />
        <AdminMetricCard label="Total feedback" value={data.error ? "-" : data.feedback.length} />
        <AdminMetricCard label="Voice notes" value={data.error ? "-" : data.feedback.filter((row) => row.voice_file_url).length} />
      </div>

      {data.error ? (
        <div className="mt-6">
          <AdminEmptyState
            description={data.error}
            title="Feedback unavailable"
          />
        </div>
      ) : null}

      {!data.error && data.feedback.length === 0 ? (
        <div className="mt-6">
          <AdminEmptyState
            description="Feedback submitted from DOS will appear here."
            title="No feedback yet"
          />
        </div>
      ) : null}

      {!data.error && data.feedback.length > 0 ? (
        <section className="mt-6 overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div className="border-b border-stone-800/75 px-4 py-4 md:px-5">
            <h2
              className="text-sm font-bold uppercase tracking-[0.16em] text-stone-200"
              style={{ fontFamily: adminFont.rajdhani }}
            >
              New feedback
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-stone-800/75 text-[10px] uppercase tracking-[0.16em] text-stone-500">
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Submitted by</th>
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Organization</th>
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Category</th>
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Message</th>
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Voice</th>
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Status</th>
                  <th className="px-4 py-3 font-bold" style={{ fontFamily: adminFont.rajdhani }}>Admin notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {data.feedback.map((row) => {
                  const organization = row.organization_id ? data.organizations.get(row.organization_id) : undefined;
                  const submittedBy = row.submitted_by_profile_id ? data.profiles.get(row.submitted_by_profile_id) : undefined;

                  return (
                    <tr className="align-top text-sm text-stone-300" key={row.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-stone-100">{getProfileLabel(submittedBy)}</p>
                        <p className="mt-1 text-xs text-stone-500">{formatDate(row.created_at)}</p>
                      </td>
                      <td className="px-4 py-4">{organization?.name ?? "Unassigned"}</td>
                      <td className="px-4 py-4">{productFeedbackCategoryLabel(row.category)}</td>
                      <td className="max-w-sm px-4 py-4 leading-6">
                        <p>{row.message_text ?? "No text note."}</p>
                        {row.page_path ? <p className="mt-2 text-xs text-stone-500">{row.page_path}</p> : null}
                      </td>
                      <td className="px-4 py-4">
                        {row.voice_file_url ? (
                          <Link className="text-[#E4C465] underline-offset-4 hover:underline" href={row.voice_file_url}>
                            Open file
                          </Link>
                        ) : (
                          <span className="text-stone-600">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={getStatusTone(row.status)}>
                          {productFeedbackStatusLabel(row.status)}
                        </AdminBadge>
                      </td>
                      <td className="max-w-xs px-4 py-4 leading-6 text-stone-400">
                        {row.admin_notes ?? "No admin notes."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
