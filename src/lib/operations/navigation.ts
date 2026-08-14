import type { OperationsModule } from "@/src/lib/operations/auth";

export type OperationsNavItem = {
  href: string;
  module: OperationsModule;
  status?: "live" | "planned" | "system";
  title: string;
};

// Sidebar labels stay short so nothing truncates. Each page keeps its fuller
// heading (for example "Forms / Submissions") in its own page header.
export const operationsPrimaryNav: OperationsNavItem[] = [
  { href: "/operations", module: "home", status: "live", title: "Home" },
  { href: "/operations/submissions", module: "submissions", status: "live", title: "Submissions" },
  { href: "/operations/missionaries", module: "missionaries", status: "live", title: "Missionaries" },
  { href: "/operations/people", module: "people", status: "planned", title: "People" },
  { href: "/operations/finance", module: "finance", status: "planned", title: "Finance" },
  { href: "/operations/documents", module: "documents", status: "planned", title: "Documents" },
  { href: "/operations/organizations", module: "organizations", status: "planned", title: "Organizations" },
  { href: "/operations/dashboards", module: "dashboards", status: "planned", title: "Dashboards" },
];

export const operationsSystemNav: OperationsNavItem[] = [
  { href: "/operations/system", module: "system", status: "system", title: "System" },
];
