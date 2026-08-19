import { canAccessOperationsModule, getOperationsAuthorization, type OperationsModule } from "@/src/lib/operations/auth";
import { OperationsAccessDenied, OperationsShell } from "./OperationsShell";
import { OperationsActionLink, OperationsBadge, OperationsPanel } from "./OperationsUI";

const moduleCopy: Record<OperationsModule, {
  actionHref?: string;
  actionLabel?: string;
  note: string;
  title: string;
}> = {
  dashboards: {
    note: "Focused operational views will land here after Home, submissions, and onboarding are validated.",
    title: "Dashboards",
  },
  documents: {
    actionHref: "/admin/partners-documents",
    actionLabel: "Legacy Documents",
    note: "Document review and partner files remain available in Legacy Admin while Operations gets the canonical documents workflow.",
    title: "Documents",
  },
  finance: {
    actionHref: "/admin/finance",
    actionLabel: "Legacy Finance",
    note: "Finance and compliance stay in the legacy fallback until the old NCC finance work is reconciled safely.",
    title: "Finance & Compliance",
  },
  home: {
    note: "Operations Home is available at /operations.",
    title: "Home",
  },
  missionaries: {
    actionHref: "/operations/missionaries",
    actionLabel: "Open Onboarding",
    note: "Missionary onboarding is available in the Operations V1 preview.",
    title: "Missionaries / Onboarding",
  },
  organizations: {
    actionHref: "/admin/organizations",
    actionLabel: "Legacy Organizations",
    note: "Organization workspaces stay linked to the existing organization data model; no separate Operations organization store is introduced.",
    title: "Organizations",
  },
  people: {
    actionHref: "/admin/organizations/usa-missionaries?tab=people",
    actionLabel: "Legacy People",
    note: "People will consume the shared People/profile model rather than storing ministry relationships in Team.",
    title: "People",
  },
  submissions: {
    actionHref: "/operations/submissions",
    actionLabel: "Open Submissions",
    note: "Submissions are available in the Operations V1 preview.",
    title: "Forms / Submissions",
  },
  system: {
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
  const action = copy.actionHref
    ? <OperationsActionLink href={copy.actionHref} variant="outline">{copy.actionLabel}</OperationsActionLink>
    : null;

  // System / Developer keeps the mockup's dark treatment so it reads instantly
  // as infrastructure rather than ministry operations.
  if (module === "system") {
    return (
      <OperationsShell
        active={module}
        action={action}
        authorization={authorization}
        title={copy.title}
      >
        <section className="rounded-lg border border-[#26364F] bg-[#0B1220] p-5 text-slate-300">
          <OperationsBadge tone="blue">Separated</OperationsBadge>
          <p className="mt-4 max-w-3xl text-sm leading-7">
            {copy.note}
          </p>
        </section>
      </OperationsShell>
    );
  }

  return (
    <OperationsShell
      active={module}
      action={action}
      authorization={authorization}
      title={copy.title}
    >
      <OperationsPanel action={<OperationsBadge tone="amber">Planned</OperationsBadge>} title={copy.title}>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          {copy.note}
        </p>
      </OperationsPanel>
    </OperationsShell>
  );
}
