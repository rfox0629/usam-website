import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import {
  PublicExperienceControl,
  type AccessGateRow,
  type PublicExperienceTab,
  type PublicFormRow,
  type PublicPageRow,
  type RoutingRuleRow,
} from "./PublicExperienceControl";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Public Experience | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: string;
};

type SubmissionSummary = {
  created_at: string;
  form_type: string;
};

const publicPages: PublicPageRow[] = [
  {
    id: "home",
    lastUpdated: "Static",
    manageHref: "/admin/site",
    owner: "Public Site",
    pageName: "Home",
    status: "Live",
    url: "/",
  },
  {
    id: "mission",
    lastUpdated: "Static",
    manageHref: "/admin/public-experience?tab=forms",
    owner: "Public Site",
    pageName: "Mission",
    status: "Live",
    url: "/mission",
  },
  {
    id: "missionaries",
    lastUpdated: "Live Data",
    manageHref: "/admin/missionary-profiles",
    owner: "Missionary Workspaces",
    pageName: "Missionaries",
    status: "Live",
    url: "/missionaries",
  },
  {
    id: "prayer",
    lastUpdated: "Static",
    manageHref: "/admin/prayer-team",
    owner: "Prayer Team",
    pageName: "Prayer",
    status: "Live",
    url: "/prayer",
  },
  {
    id: "support",
    lastUpdated: "Static",
    manageHref: "/admin/support-team",
    owner: "Support Team",
    pageName: "Support",
    status: "Live",
    url: "/support",
  },
  {
    id: "system",
    lastUpdated: "Static",
    manageHref: "/admin/settings",
    owner: "System/Auth",
    pageName: "System",
    status: "Live",
    url: "/system",
  },
  {
    id: "financial-freedom",
    lastUpdated: "Live Data",
    manageHref: "/admin/support-team?type=financial_freedom",
    owner: "Support Team",
    pageName: "Financial Freedom",
    status: "Live",
    url: "/financialfreedom",
  },
];

const publicFormsBase = [
  {
    appearsOn: "/prayer",
    formName: "Prayer Team Application",
    formType: "prayer_team_application",
    previewHref: "/prayer?previewForm=prayer_team_application",
    routesTo: "Prayer Team",
    status: "Live",
    submissionsHref: "/admin/prayer-team?tab=applications",
  },
  {
    appearsOn: "/support",
    formName: "Support / Giving Commitment",
    formType: "support_giving",
    previewHref: "/support?previewForm=support_giving",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=support_giving",
  },
  {
    appearsOn: "/",
    formName: "Join the Mission Interest",
    formType: "join_mission_interest",
    previewHref: "/?previewForm=join_mission_interest",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=join_mission_interest",
  },
  {
    appearsOn: "/missionaries/[slug]",
    formName: "Major Gift Inquiry",
    formType: "major_gift",
    previewHref: "/missionaries/ryan-brooke-fox?previewForm=major_gift",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=major_gift",
  },
  {
    appearsOn: "/missionaries/[slug]",
    formName: "Missionary Profile Review",
    formType: "missionary_profile_review",
    previewHref: "/missionaries/ryan-brooke-fox?previewForm=missionary_profile_review",
    routesTo: "Profile Admin / Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=missionary_profile_review",
  },
  {
    appearsOn: "/financialfreedom",
    formName: "Financial Freedom Request",
    formType: "financial_freedom",
    previewHref: "/financialfreedom",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=financial_freedom",
  },
  {
    appearsOn: "/mission",
    formName: "Field Reports Access",
    formType: "field_report_access",
    previewHref: "/mission?previewForm=field_report_access",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=field_report_access",
  },
  {
    appearsOn: "/system",
    formName: "System Waitlist",
    formType: "system_waitlist",
    previewHref: "/system?previewForm=system_waitlist",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=system_waitlist",
  },
  {
    appearsOn: "/system/preview",
    formName: "DOS Walkthrough Request",
    formType: "dos_walkthrough_request",
    previewHref: "/system/preview?previewForm=dos_walkthrough_request",
    routesTo: "Support Team",
    status: "Live",
    submissionsHref: "/admin/support-team?type=dos_walkthrough_request",
  },
] satisfies Array<Omit<PublicFormRow, "lastSubmission" | "submissions">>;

const accessGates: AccessGateRow[] = [
  {
    accessType: "System/Auth",
    editHref: "/admin/settings",
    gateName: "System Access Code",
    managedIn: "Admin Settings",
    status: "Live",
    url: "/system",
    viewHref: "/system?previewForm=system_access_code",
  },
  {
    accessType: "System/Auth",
    editHref: "/admin/settings",
    gateName: "Team Access Code",
    managedIn: "Admin Settings",
    status: "Live",
    url: "/support",
    viewHref: "/support?previewForm=team_access_code",
  },
  {
    accessType: "Protected Page",
    editHref: "/admin/settings",
    gateName: "DOS Preview",
    managedIn: "Admin Settings",
    status: "Live",
    url: "/system/preview",
    viewHref: "/system/preview",
  },
];

const routingRules: RoutingRuleRow[] = [
  {
    description: "Prayer team applications are reviewed inside the Prayer Team operations hub before becoming prayer partners.",
    destination: "Prayer Team",
    id: "prayer_team_application",
    source: "prayer_team_application",
  },
  {
    description: "Prayer request intake belongs to Prayer Team coverage and future alert workflows.",
    destination: "Prayer Team",
    id: "prayer_request",
    source: "prayer_request",
  },
  {
    description: "Giving interest and donor intent submissions are reviewed by Support Team.",
    destination: "Support Team",
    id: "support_giving",
    source: "support_giving",
  },
  {
    description: "Major gift conversations are personal support-team follow-up items.",
    destination: "Support Team",
    id: "major_gift",
    source: "major_gift",
  },
  {
    description: "Join the Mission interest forms route to Support Team for first follow-up and next steps.",
    destination: "Support Team",
    id: "join_mission_interest",
    source: "join_mission_interest",
  },
  {
    description: "Missionary profile reviews appear in the support inbox now and can later feed profile admin encounter workflows.",
    destination: "Profile Admin / Support Team",
    id: "missionary_profile_review",
    source: "missionary_profile_review",
  },
  {
    description: "System waitlist requests are non-prayer public form submissions handled by Support Team.",
    destination: "Support Team",
    id: "system_waitlist",
    source: "system_waitlist",
  },
  {
    description: "DOS walkthrough requests from the protected preview page route to Support Team for scheduling follow-up.",
    destination: "Support Team",
    id: "dos_walkthrough_request",
    source: "dos_walkthrough_request",
  },
  {
    description: "Access-code attempts validate against the centralized System Access Codes table and are not routed to team inboxes.",
    destination: "System/Auth",
    id: "access_codes",
    source: "access codes",
  },
];

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

function normalizeTab(value?: string): PublicExperienceTab {
  return value === "forms" || value === "access" || value === "routing" ? value : "pages";
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

export default async function PublicExperiencePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { error, summaries } = await loadSubmissionSummaries();
  const statsByType = new Map<string, { lastSubmission?: string; total: number }>();

  for (const summary of summaries) {
    const current = statsByType.get(summary.form_type) ?? { total: 0 };
    statsByType.set(summary.form_type, {
      lastSubmission: current.lastSubmission ?? summary.created_at,
      total: current.total + 1,
    });
  }

  const formRows: PublicFormRow[] = publicFormsBase.map((form) => {
    const stats = statsByType.get(form.formType);

    return {
      ...form,
      lastSubmission: formatDate(stats?.lastSubmission),
      submissions: stats?.total ?? 0,
    };
  });

  return (
    <AdminShell
      active="public-experience"
      title="Public Experience"
    >
      <div className="space-y-4">
        {error ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Submission summary data is not ready: {error}. Apply the form_submissions migration to the usam-website Supabase project.
          </p>
        ) : null}

        <PublicExperienceControl
          accessGates={accessGates}
          forms={formRows}
          initialTab={normalizeTab(params.tab)}
          pages={publicPages}
          routingRules={routingRules}
        />
      </div>
    </AdminShell>
  );
}
