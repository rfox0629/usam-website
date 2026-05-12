import "server-only";

export const planningCenterGivingEnvVars = [
  "PLANNING_CENTER_APP_ID",
  "PLANNING_CENTER_SECRET",
  "PLANNING_CENTER_GIVING_BASE_URL",
] as const;

export type PlanningCenterGivingConfigStatus = {
  configured: boolean;
  missing: string[];
};

export function getPlanningCenterGivingConfigStatus(): PlanningCenterGivingConfigStatus {
  const missing = planningCenterGivingEnvVars.filter((key) => !process.env[key]?.trim());

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function getPlanningCenterGivingSyncNotes() {
  return [
    "MVP sync is designed for daily polling or manual import before webhooks are connected.",
    "Suggested matches should compare donor email, phone, amount, gift type, date window, and designation or fund.",
    "Future webhook handling can write into pco_giving_records and support_commitment_matches without changing public donor forms.",
  ];
}
