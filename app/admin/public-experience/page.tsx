import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import {
  PublicExperienceControl,
  type AccessGateRow,
  type PublicExperienceTab,
  type PublicFormRow,
  type PublicPageRow,
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
  status: string | null;
};

const publicPages: PublicPageRow[] = [
  {
    id: "home",
    owner: "Public Site",
    pageName: "Home",
    route: "/",
    status: "Live",
  },
  {
    id: "mission",
    owner: "Public Site",
    pageName: "Mission",
    route: "/mission",
    status: "Live",
  },
  {
    id: "missionaries",
    owner: "USA Missionaries",
    pageName: "Missionaries",
    route: "/missionaries",
    status: "Live",
  },
  {
    id: "prayer",
    owner: "Prayer Team",
    pageName: "Prayer",
    route: "/prayer",
    status: "Live",
  },
  {
    id: "support",
    owner: "Support Team",
    pageName: "Support",
    route: "/support",
    status: "Live",
  },
  {
    id: "system",
    owner: "System/Auth",
    pageName: "System",
    route: "/system",
    status: "Protected",
  },
  {
    id: "financial-freedom",
    owner: "Support Team",
    pageName: "Financial Freedom",
    route: "/financialfreedom",
    status: "Live",
  },
];

const publicFormsBase = [
  {
    formName: "Prayer Team Application",
    formType: "prayer_team_application",
    inboxHref: "/admin/prayer?tab=applications",
    ownerInbox: "Prayer",
    publicRoute: "/prayer/join",
  },
  {
    formName: "Prayer Request",
    formType: "prayer_request",
    inboxHref: "/admin/prayer?tab=requests",
    ownerInbox: "Prayer",
    publicRoute: "/prayer",
  },
  {
    formName: "Support / Giving Commitment",
    formType: "support_giving",
    inboxHref: "/admin/support?type=support_giving",
    ownerInbox: "Support",
    publicRoute: "/support",
  },
  {
    formName: "Join the Mission Interest",
    formType: "join_mission_interest",
    inboxHref: "/admin/applications",
    ownerInbox: "Applications",
    publicRoute: "/join",
  },
  {
    formName: "Major Gift Inquiry",
    formType: "major_gift",
    inboxHref: "/admin/support?type=major_gift",
    ownerInbox: "Support",
    publicRoute: "/missionaries/[slug]",
  },
  {
    formName: "Missionary Profile Review",
    formType: "missionary_profile_review",
    inboxHref: "/admin/profiles",
    ownerInbox: "Profiles",
    publicRoute: "/missionaries/[slug]",
  },
  {
    formName: "Financial Freedom Request",
    formType: "financial_freedom",
    inboxHref: "/admin/finance",
    ownerInbox: "Finance",
    publicRoute: "/financialfreedom",
  },
  {
    formName: "Field Reports Access",
    formType: "field_report_access",
    inboxHref: "/admin/support?type=field_report_access",
    ownerInbox: "Support",
    publicRoute: "/mission",
  },
  {
    formName: "System Waitlist",
    formType: "system_waitlist",
    inboxHref: "/admin/support?type=system_waitlist",
    ownerInbox: "Support",
    publicRoute: "/system",
  },
  {
    formName: "DOS Walkthrough Request",
    formType: "dos_walkthrough_request",
    inboxHref: "/admin/support?type=dos_walkthrough_request",
    ownerInbox: "Support",
    publicRoute: "/system/preview",
  },
  {
    formName: "USA Missionary Application",
    formType: "missionary_application",
    inboxHref: "/admin/applications",
    ownerInbox: "Applications",
    publicRoute: "/join/usam",
  },
] satisfies Array<Omit<PublicFormRow, "lastSubmission" | "newPending" | "submissions">>;

const accessGates: AccessGateRow[] = [
  {
    actionHref: "/admin/settings",
    actionLabel: "Manage",
    gateName: "System Access Code",
    route: "/system",
    status: "Protected",
  },
  {
    actionHref: "/admin/settings",
    actionLabel: "Manage",
    gateName: "Team Access Code",
    route: "/support → /missionaries",
    status: "Protected",
  },
  {
    actionHref: "/admin/settings",
    actionLabel: "Manage",
    gateName: "DOS Access",
    route: "/system/preview",
    status: "Protected",
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
  if (value === "forms" || value === "access") {
    return value;
  }

  return "website";
}

function activeNavKey(tab: PublicExperienceTab) {
  if (tab === "forms") {
    return "forms-pages";
  }

  if (tab === "access") {
    return "access";
  }

  return "public-experience";
}

function isNewOrPending(status: string | null) {
  return status === "new"
    || status === "needs_follow_up"
    || status === "follow_up"
    || status === "pending_review";
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
    .select("form_type, status, created_at")
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
  const activeTab = normalizeTab(params.tab);
  const { error, summaries } = await loadSubmissionSummaries();
  const statsByType = new Map<string, { lastSubmission?: string; newPending: number; total: number }>();

  for (const summary of summaries) {
    const current = statsByType.get(summary.form_type) ?? { newPending: 0, total: 0 };
    statsByType.set(summary.form_type, {
      lastSubmission: current.lastSubmission ?? summary.created_at,
      newPending: current.newPending + (isNewOrPending(summary.status) ? 1 : 0),
      total: current.total + 1,
    });
  }

  const formRows: PublicFormRow[] = publicFormsBase.map((form) => {
    const stats = statsByType.get(form.formType);

    return {
      ...form,
      lastSubmission: formatDate(stats?.lastSubmission),
      newPending: stats?.newPending ?? 0,
      submissions: stats?.total ?? 0,
    };
  });

  return (
    <AdminShell
      active={activeNavKey(activeTab)}
      description="Track public routes, intake forms, and protected access points. Operations follow-up lives in the inboxes."
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
          initialTab={activeTab}
          pages={publicPages}
        />
      </div>
    </AdminShell>
  );
}
