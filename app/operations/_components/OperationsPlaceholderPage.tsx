import { canAccessOperationsModule, getOperationsAuthorization, type OperationsModule } from "@/src/lib/operations/auth";
import { OperationsAccessDenied, OperationsShell } from "./OperationsShell";
import { OperationsActionLink, OperationsBadge, OperationsPanel } from "./OperationsUI";

const moduleCopy: Record<OperationsModule, {
  actionHref?: string;
  actionLabel?: string;
  eyebrow: string;
  note: string;
  title: string;
}> = {
  dashboards: {
    eyebrow: "Dashboards",
    note: "Focused operational views will land here after Home, submissions, and onboarding are validated.",
    title: "Dashboards",
  },
  documents: {
    actionHref: "/admin/partners-documents",
    actionLabel: "Legacy Documents",
    eyebrow: "Documents",
    note: "Document review and partner files remain available in Legacy Admin while Operations gets the canonical documents workflow.",
    title: "Documents",
  },
  finance: {
    actionHref: "/admin/finance",
    actionLabel: "Legacy Finance",
    eyebrow: "Finance",
    note: "Finance and compliance stay in the legacy fallback until the old NCC finance work is reconciled safely.",
    title: "Finance & Compliance",
  },
  home: {
    eyebrow: "Home",
    note: "Operations Home is available at /operations.",
    title: "Home",
  },
  missionaries: {
    actionHref: "/operations/missionaries",
    actionLabel: "Open Onboarding",
    eyebrow: "Missionaries",
    note: "Missionary onboarding is available in the Operations V1 preview.",
    title: "Missionaries / Onboarding",
  },
  organizations: {
    actionHref: "/admin/organizations",
    actionLabel: "Legacy Organizations",
    eyebrow: "Organizations",
    note: "Organization workspaces stay linked to the existing organization data model; no separate Operations organization store is introduced.",
    title: "Organizations",
  },
  people: {
    actionHref: "/admin/organizations/usa-missionaries?tab=people",
    actionLabel: "Legacy People",
    eyebrow: "People",
    note: "People will consume the shared People/profile model rather than storing ministry relationships in Team.",
    title: "People",
  },
  submissions: {
    actionHref: "/operations/submissions",
    actionLabel: "Open Submissions",
    eyebrow: "Submissions",
    note: "Submissions are available in the Operations V1 preview.",
    title: "Forms / Submissions",
  },
  system: {
    eyebrow: "Developer",
    note: "Infrastructure, Dispatcher, Claude, Codex, and Linear observability stay separate from ministry operations navigation.",
    title: "System / Developer",
  },
};

export async function OperationsPlaceholderPage({ module }: { module: OperationsModule }) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, module)) {
    return <OperationsAccessDenied active={module} authorization={authorization} />;
  }

  const copy = moduleCopy[module];

  return (
    <OperationsShell
      active={module}
      action={copy.actionHref ? <OperationsActionLink href={copy.actionHref} variant="outline">{copy.actionLabel}</OperationsActionLink> : null}
      authorization={authorization}
      eyebrow={copy.eyebrow}
      title={copy.title}
    >
      <OperationsPanel eyebrow="V1 Destination" title={copy.title}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            {copy.note}
          </p>
          <OperationsBadge tone={module === "system" ? "blue" : "amber"}>
            {module === "system" ? "Separated" : "Planned"}
          </OperationsBadge>
        </div>
      </OperationsPanel>
    </OperationsShell>
  );
}
