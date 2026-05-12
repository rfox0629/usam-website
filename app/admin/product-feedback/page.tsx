import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { adminFont, type AdminBadgeTone } from "../_components/AdminUI";
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

const badgeToneClassName: Record<AdminBadgeTone, string> = {
  amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]",
  blue: "border-blue-400/25 bg-blue-950/30 text-blue-300",
  green: "border-green-500/25 bg-green-950/30 text-green-300",
  muted: "border-stone-700 bg-stone-900/70 text-stone-300",
  red: "border-red-500/35 bg-red-950/25 text-red-200",
};

const secondaryActionClassName = "inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-700 px-3 text-[10px] uppercase tracking-[0.13em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]";

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

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: AdminBadgeTone;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 text-[9px] uppercase tracking-[0.13em] ${badgeToneClassName[tone]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
      <p
        className="text-[10px] uppercase tracking-[0.15em] text-stone-400"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-3xl font-bold leading-none text-stone-100"
        style={{ fontFamily: adminFont.oswald }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-6">
      <p className="text-sm font-semibold text-stone-100">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.13em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 truncate text-sm text-stone-300">{value || "-"}</div>
    </div>
  );
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

function FeedbackItem({
  organization,
  row,
  submittedBy,
}: {
  organization: OrganizationRow | undefined;
  row: ProductFeedbackRow;
  submittedBy: ProfileRow | undefined;
}) {
  const message = row.message_text?.trim() || "No text note.";
  const hasVoice = Boolean(row.voice_file_url);

  return (
    <article className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 transition-colors hover:border-stone-700 hover:bg-stone-950/70">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getStatusTone(row.status)}>{productFeedbackStatusLabel(row.status)}</Badge>
            <Badge tone="muted">{productFeedbackCategoryLabel(row.category)}</Badge>
            {hasVoice ? <Badge tone="blue">Voice</Badge> : null}
          </div>
          <p className="mt-3 text-base leading-7 text-stone-100">{message}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaItem label="Submitter" value={getProfileLabel(submittedBy)} />
            <MetaItem label="Organization" value={organization?.name ?? "Unassigned"} />
            <MetaItem label="Date" value={formatDate(row.created_at)} />
            <MetaItem label="Route" value={row.page_path ?? "Unknown"} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {row.page_path ? (
            <Link className={secondaryActionClassName} href={row.page_path} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Preview
            </Link>
          ) : null}
          {row.voice_file_url ? (
            <Link className={secondaryActionClassName} href={row.voice_file_url} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Voice
            </Link>
          ) : null}
        </div>
      </div>

      {row.admin_notes ? (
        <details className="mt-4 rounded-lg border border-stone-900 bg-[#050505] px-3 py-2 text-sm text-stone-400">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.13em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            Internal Note
          </summary>
          <p className="mt-2 leading-6">{row.admin_notes}</p>
        </details>
      ) : null}
    </article>
  );
}

export default async function ProductFeedbackAdminPage() {
  const data = await loadProductFeedback();
  const newFeedback = data.feedback.filter((row) => row.status === "new");

  return (
    <AdminShell
      active="product-feedback"
      title="Product Feedback"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="New" value={data.error ? "-" : newFeedback.length} />
        <MetricCard label="Total" value={data.error ? "-" : data.feedback.length} />
        <MetricCard label="Voice Notes" value={data.error ? "-" : data.feedback.filter((row) => row.voice_file_url).length} />
      </div>

      {data.error ? (
        <div className="mt-6">
          <EmptyState
            description={data.error}
            title="Feedback unavailable"
          />
        </div>
      ) : null}

      {!data.error && data.feedback.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            description="Feedback submitted from DOS will appear here."
            title="No feedback yet"
          />
        </div>
      ) : null}

      {!data.error && data.feedback.length > 0 ? (
        <section className="mt-6 rounded-xl border border-stone-800/75 bg-[#050505]/75 p-3">
          <div className="flex flex-col gap-3 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D4A63D]"
              style={{ fontFamily: adminFont.rajdhani }}
            >
              Feedback
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="amber">{newFeedback.length} New</Badge>
              <Badge tone="blue">{data.feedback.filter((row) => row.status === "planned" || row.status === "in_progress").length} In Product</Badge>
            </div>
          </div>

          <div className="grid gap-3">
            {data.feedback.map((row) => {
              const organization = row.organization_id ? data.organizations.get(row.organization_id) : undefined;
              const submittedBy = row.submitted_by_profile_id ? data.profiles.get(row.submitted_by_profile_id) : undefined;

              return (
                <FeedbackItem
                  key={row.id}
                  organization={organization}
                  row={row}
                  submittedBy={submittedBy}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
