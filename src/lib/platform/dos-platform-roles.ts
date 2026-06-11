export const dosPlatformRoles = [
  {
    description: "Full DOS Platform and National Command Center access.",
    label: "Platform Admin",
    scope: "platform",
    value: "platform_admin",
  },
  {
    description: "Leads an organization inside DOS Platform.",
    label: "Organization Director",
    scope: "organization",
    value: "organization_director",
  },
  {
    description: "Reviews, approves, and manages missionary applications.",
    label: "Applications Manager",
    scope: "organization",
    value: "applications_manager",
  },
  {
    description: "Manages giving visibility and donor workflows.",
    label: "Donor Manager",
    scope: "organization",
    value: "donor_manager",
  },
  {
    description: "Coordinates prayer team requests and coverage.",
    label: "Prayer Leader",
    scope: "organization",
    value: "prayer_leader",
  },
  {
    description: "Approved missionary operating from a DOS workspace.",
    label: "Missionary",
    scope: "organization",
    value: "missionary",
  },
  {
    description: "Support team member connected to an organization or missionary.",
    label: "Support Team Member",
    scope: "organization",
    value: "support_team_member",
  },
] as const;

export type DosPlatformRole = typeof dosPlatformRoles[number]["value"];

export function platformRoleLabel(role: DosPlatformRole) {
  return dosPlatformRoles.find((item) => item.value === role)?.label ?? "Organization Member";
}
