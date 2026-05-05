import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import { AdminActionLink } from "../_components/AdminUI";
import { FormsControlTable, type FormControlRow } from "./FormsControlTable";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Forms & Pages | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

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
  const rows: FormControlRow[] = forms.map((form) => {
    const stats = statsByType.get(form.formType);

    return {
      ...form,
      lastSubmissionLabel: formatDate(stats?.lastSubmission),
      routesTo: form.routesTo,
      status: form.status,
      totalSubmissions: stats?.total ?? 0,
    };
  });

  return (
    <AdminShell
      active="forms-pages"
      action={<AdminActionLink href="/admin/forms" variant="gold">+ Add New Form</AdminActionLink>}
      description="Control public-facing forms, page entry points, and which operating team receives each submission."
      title="Forms & Pages"
    >
      <div className="space-y-4">
        {error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Form summary data is not ready: {error}. Apply the form_submissions migration to the usam-website Supabase project.
          </p>
        ) : null}
        <FormsControlTable rows={rows} />
      </div>
    </AdminShell>
  );
}
