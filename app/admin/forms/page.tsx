import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "../_components/AdminShell";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Forms & Pages | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const font = { rajdhani: "'Rajdhani', sans-serif" };

const forms = [
  {
    formName: "Prayer Team Application",
    formType: "prayer_team_application",
    routesTo: "Prayer Team",
    status: "Live",
    submissionsHref: "/admin/prayer-team?tab=applications",
    url: "/prayer/join",
  },
  {
    formName: "Prayer Request",
    formType: "prayer_request",
    routesTo: "Prayer Team",
    status: "Draft",
    submissionsHref: "/admin/prayer-team?tab=applications",
    url: "/prayer",
  },
  {
    formName: "Support / Giving Commitment",
    formType: "support_giving",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=support_giving",
    url: "/support",
  },
  {
    formName: "Major Gift Inquiry",
    formType: "major_gift",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=major_gift",
    url: "/missionaries/ryan-brooke-fox",
  },
  {
    formName: "Financial Freedom Request",
    formType: "financial_freedom",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=financial_freedom",
    url: "/financialfreedom",
  },
  {
    formName: "Field Reports Access",
    formType: "field_report_access",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=field_report_access",
    url: "/mission",
  },
  {
    formName: "System Waitlist",
    formType: "system_waitlist",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=system_waitlist",
    url: "/system",
  },
  {
    formName: "Missionary Application",
    formType: "missionary_application",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=missionary_application",
    url: "/missionary-intake",
  },
  {
    formName: "Contact / General",
    formType: "general",
    routesTo: "Support Team",
    status: "Draft",
    submissionsHref: "/admin/support-team?type=general",
    url: "/",
  },
] as const;

type SubmissionSummary = {
  created_at: string;
  form_type: string;
};

function StatusBadge({ status }: { status: "Draft" | "Live" }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        status === "Live"
          ? "border-green-500/25 bg-green-950/30 text-green-300"
          : "border-stone-700 bg-stone-900/70 text-stone-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function RouteBadge({ routesTo }: { routesTo: string }) {
  const isPrayer = routesTo === "Prayer Team";

  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        isPrayer
          ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
          : "border-blue-400/25 bg-blue-950/30 text-blue-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {routesTo}
    </span>
  );
}

function ActionLink({
  children,
  href,
  variant = "outline",
}: {
  children: string;
  href: string;
  variant?: "gold" | "outline";
}) {
  return (
    <Link
      className={`inline-flex min-h-10 items-center justify-center px-4 text-[11px] uppercase tracking-[0.18em] transition-colors ${
        variant === "gold"
          ? "border border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
          : "border border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
      }`}
      href={href}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "No submissions";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function loadSubmissionSummaries() {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      summaries: [] as SubmissionSummary[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("form_submissions")
    .select("form_type, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: error.message,
      summaries: [] as SubmissionSummary[],
    };
  }

  return {
    error: undefined,
    summaries: (data ?? []) as SubmissionSummary[],
  };
}

export default async function FormsPagesAdminPage() {
  const { error, summaries } = await loadSubmissionSummaries();
  const statsByType = new Map<string, { lastSubmission?: string; total: number }>();

  for (const summary of summaries) {
    const current = statsByType.get(summary.form_type) ?? { total: 0 };
    statsByType.set(summary.form_type, {
      lastSubmission: current.lastSubmission ?? summary.created_at,
      total: current.total + 1,
    });
  }

  return (
    <AdminShell
      active="forms-pages"
      description="Control public-facing forms, page entry points, and which operating team receives each submission."
      title="Forms & Pages"
    >
      <div className="space-y-5">
        {error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Form summary data is not ready: {error}. Apply the form_submissions migration to the usam-website Supabase project.
          </p>
        ) : null}

        <div className="border border-stone-800/75 bg-[#080808]/85 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Routing Rule
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-300">
            This page is a public forms control panel. Teams work submissions in Prayer Team or Support Team, based on the assigned route.
          </p>
        </div>

        <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div className="hidden grid-cols-[1.1fr_0.85fr_0.7fr_0.45fr_0.65fr_0.55fr_0.65fr_1fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 xl:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            <span>Form Name</span>
            <span>URL</span>
            <span>Form Type</span>
            <span>Status</span>
            <span>Routes To</span>
            <span>Total</span>
            <span>Last Submission</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-stone-900">
            {forms.map((form) => {
              const stats = statsByType.get(form.formType);

              return (
                <article className="grid gap-3 p-4 xl:grid-cols-[1.1fr_0.85fr_0.7fr_0.45fr_0.65fr_0.55fr_0.65fr_1fr] xl:items-center" key={form.formName}>
                  <div>
                    <p className="font-medium text-stone-100">{form.formName}</p>
                    <p className="mt-1 text-xs text-stone-500 xl:hidden">{form.formType}</p>
                  </div>
                  <Link className="text-sm text-stone-300 hover:text-[#F5B942]" href={form.url}>
                    {form.url}
                  </Link>
                  <p className="text-sm text-stone-400">{form.formType}</p>
                  <StatusBadge status={form.status} />
                  <RouteBadge routesTo={form.routesTo} />
                  <p className="text-sm text-stone-300">{stats?.total ?? 0}</p>
                  <p className="text-sm text-stone-400">{formatDate(stats?.lastSubmission)}</p>
                  <div className="flex flex-wrap gap-2">
                    <ActionLink href={form.url}>View Form</ActionLink>
                    <ActionLink href={form.submissionsHref} variant="gold">View Submissions</ActionLink>
                    <ActionLink href={form.submissionsHref}>Edit Routing</ActionLink>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
