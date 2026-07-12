export type NccDepartmentStatus = "legacy" | "live" | "planned";

export type NccNavItem = {
  activeKey: string;
  description: string;
  href: string;
  label: string;
  status: NccDepartmentStatus;
};

/**
 * The 15-department nav. `status` drives both the badge shown in the rail
 * and what the destination page looks like:
 *  - "live"    → a real page built inside /ncc this phase, real data only.
 *  - "legacy"  → links straight to the existing, working /admin page for
 *                this department. Real data, just not yet re-skinned into
 *                the new shell. Never relabeled as "live" until it's ported.
 *  - "planned" → no real functionality exists for this department yet.
 *                Renders a restrained placeholder, never fabricated data.
 */
export const nccNavItems: readonly NccNavItem[] = [
  {
    activeKey: "home",
    description: "Cross-department overview",
    href: "/ncc",
    label: "Home",
    status: "live",
  },
  {
    activeKey: "executive",
    description: "Board packets, KPIs, strategic docs",
    href: "/ncc/executive",
    label: "Executive",
    status: "planned",
  },
  {
    activeKey: "people",
    description: "Missionaries, staff, applicants, board",
    href: "/ncc/people",
    label: "People",
    status: "planned",
  },
  {
    activeKey: "organizations",
    description: "Tenant directory and org settings",
    href: "/admin/organizations",
    label: "Organizations",
    status: "legacy",
  },
  {
    activeKey: "partnerships",
    description: "Partner relationships and documents",
    href: "/ncc/partnerships",
    label: "Partnerships",
    status: "live",
  },
  {
    activeKey: "finance",
    description: "Finance documents and monthly close",
    href: "/ncc/finance",
    label: "Finance",
    status: "live",
  },
  {
    activeKey: "development",
    description: "Donor pipeline, campaigns, grants",
    href: "/ncc/development",
    label: "Development",
    status: "planned",
  },
  {
    activeKey: "communications",
    description: "Content calendar, public-site coordination",
    href: "/ncc/communications",
    label: "Communications",
    status: "planned",
  },
  {
    activeKey: "prayer",
    description: "Prayer request and partner operations",
    href: "/admin/prayer",
    label: "Prayer",
    status: "legacy",
  },
  {
    activeKey: "ministry-operations",
    description: "Field activity rollups, fruit approval",
    href: "/ncc/ministry-operations",
    label: "Ministry Operations",
    status: "planned",
  },
  {
    activeKey: "compliance-legal",
    description: "Policies, insurance, 990s, legal docs",
    href: "/ncc/compliance-legal",
    label: "Compliance & Legal",
    status: "planned",
  },
  {
    activeKey: "reports",
    description: "Cross-department report library",
    href: "/ncc/reports",
    label: "Reports",
    status: "planned",
  },
  {
    activeKey: "knowledge-base",
    description: "SOPs, policies, onboarding docs",
    href: "/ncc/knowledge-base",
    label: "Knowledge Base",
    status: "planned",
  },
  {
    activeKey: "technology",
    description: "Integrations, access codes, system health",
    href: "/ncc/technology",
    label: "Technology",
    status: "planned",
  },
  {
    activeKey: "settings",
    description: "Personal and org configuration",
    href: "/admin/settings",
    label: "Settings",
    status: "legacy",
  },
] as const;

export function findNccNavItem(activeKey: string): NccNavItem | undefined {
  return nccNavItems.find((item) => item.activeKey === activeKey);
}
