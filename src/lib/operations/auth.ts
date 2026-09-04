import "server-only";

import { getAdminAuthorization, type AdminAuthorization } from "@/src/lib/admin-auth";

export const operationsModules = [
  "home",
  "submissions",
  "missionaries",
  "people",
  "finance",
  "documents",
  "communications",
  "organizations",
  "dashboards",
  "system",
] as const;

export const operationsWorkflows = [
  "restoration",
  "missionary_applications",
  "ministry_forms",
] as const;

export type OperationsModule = typeof operationsModules[number];
export type OperationsWorkflow = typeof operationsWorkflows[number];
export type OperationsRole =
  | "platform_owner"
  | "organization_admin"
  | "operations_staff"
  | "ministry_reviewer";

export type OperationsGrant = {
  canManage: boolean;
  module: OperationsModule;
  workflows: OperationsWorkflow[];
};

export type OperationsAuthorization =
  | {
      admin: Extract<AdminAuthorization, { status: "authorized" }>;
      email: string;
      grants: OperationsGrant[];
      organizationSlug: "usa-missionaries";
      role: OperationsRole;
      status: "authorized";
      userId: string;
    }
  | Extract<AdminAuthorization, { status: "unauthenticated" | "unauthorized" | "configuration_error" }>;

const allWorkflowGrants = [...operationsWorkflows];

function grant(module: OperationsModule, canManage = true, workflows = allWorkflowGrants): OperationsGrant {
  return {
    canManage,
    module,
    workflows,
  };
}

function grantsForRole(role: OperationsRole): OperationsGrant[] {
  if (role === "platform_owner") {
    return operationsModules.map((module) => grant(module));
  }

  if (role === "organization_admin") {
    return operationsModules
      .filter((module) => module !== "system")
      .map((module) => grant(module));
  }

  if (role === "operations_staff") {
    return [
      grant("home"),
      grant("submissions"),
      grant("missionaries"),
      grant("people", false),
      grant("documents", false),
      grant("communications", false),
      grant("dashboards", false),
    ];
  }

  return [
    grant("home", false, ["restoration"]),
    grant("submissions", true, ["restoration"]),
  ];
}

export function operationsRoleFromAdminRole(role: Extract<AdminAuthorization, { status: "authorized" }>["role"]): OperationsRole {
  if (role === "admin") {
    return "platform_owner";
  }

  if (role === "editor") {
    return "organization_admin";
  }

  return "ministry_reviewer";
}

export async function getOperationsAuthorization(): Promise<OperationsAuthorization> {
  const adminAuthorization = await getAdminAuthorization();

  if (adminAuthorization.status !== "authorized") {
    return adminAuthorization;
  }

  const role = operationsRoleFromAdminRole(adminAuthorization.role);

  return {
    admin: adminAuthorization,
    email: adminAuthorization.email,
    grants: grantsForRole(role),
    organizationSlug: "usa-missionaries",
    role,
    status: "authorized",
    userId: adminAuthorization.userId,
  };
}

export function canAccessOperationsModule(
  authorization: OperationsAuthorization,
  module: OperationsModule,
) {
  return authorization.status === "authorized"
    && authorization.grants.some((grantItem) => grantItem.module === module);
}

export function canManageOperationsModule(
  authorization: OperationsAuthorization,
  module: OperationsModule,
) {
  return authorization.status === "authorized"
    && authorization.grants.some((grantItem) => grantItem.module === module && grantItem.canManage);
}

export function canAccessOperationsWorkflow(
  authorization: OperationsAuthorization,
  workflow: OperationsWorkflow,
  access: "manage" | "view" = "view",
) {
  return authorization.status === "authorized"
    && authorization.grants.some((grantItem) => (
      grantItem.workflows.includes(workflow)
      && (access === "view" || grantItem.canManage)
    ));
}

export function workflowForSubmissionType(formType: string): OperationsWorkflow {
  if (formType === "restoration") {
    return "restoration";
  }

  if (formType === "missionary_application" || formType === "join_mission_interest") {
    return "missionary_applications";
  }

  return "ministry_forms";
}

export function operationsRoleLabel(role: OperationsRole) {
  return {
    ministry_reviewer: "Ministry Reviewer",
    operations_staff: "Operations Staff",
    organization_admin: "Organization Admin",
    platform_owner: "Platform Owner",
  }[role];
}
