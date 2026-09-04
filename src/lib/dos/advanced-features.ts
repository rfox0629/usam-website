/* Advanced Features: capabilities Basic DOS does not show, turned on one at a
 * time by the workspace that wants them.
 *
 * This is deliberately NOT an "Advanced Mode" switch. Each capability is its
 * own row in dos_workspace_feature_flags, so turning Engagement Levels on says
 * nothing about any feature added later, and a workspace can run exactly the
 * one advanced thing it uses.
 *
 * The contract every feature here must keep:
 *
 *   A flag changes VISIBILITY ONLY.
 *
 * Off must never null, reset, recalculate, migrate or stop loading anything.
 * Turning a feature off and back on has to show the same stored values it
 * showed before, because the data was never touched. That is the opposite of
 * the commitments flag, which genuinely gates whether rows are loaded at all;
 * do not copy that pattern here.
 */

export const dosAdvancedFeatureKeys = ["engagementLevels"] as const;

export type DosAdvancedFeatureKey = typeof dosAdvancedFeatureKeys[number];

export type DosAdvancedFeatureDefinition = {
  /* What the workspace sees in Settings. */
  description: string;
  /* The dos_workspace_feature_flags.flag_key this maps to. */
  flagKey: string;
  key: DosAdvancedFeatureKey;
  title: string;
};

export const dosAdvancedFeatures: ReadonlyArray<DosAdvancedFeatureDefinition> = [
  {
    description: "Use the -3 to +3 engagement framework to assess a person's current spiritual engagement.",
    flagKey: "dos_engagement_levels",
    key: "engagementLevels",
    title: "Engagement Levels",
  },
];

export function dosAdvancedFeatureByKey(key: string) {
  return dosAdvancedFeatures.find((feature) => feature.key === key) ?? null;
}

export function dosAdvancedFeatureByFlagKey(flagKey: string) {
  return dosAdvancedFeatures.find((feature) => feature.flagKey === flagKey) ?? null;
}

/* Off unless the workspace has explicitly turned it on. Basic DOS is the
   default for everyone, including workspaces that have never been seen before
   and workspaces whose flag row was never written. */
export function dosAdvancedFeatureEnabled(
  rows: ReadonlyArray<{ enabled?: boolean | null; flag_key?: string | null }> | null | undefined,
  key: DosAdvancedFeatureKey,
) {
  const feature = dosAdvancedFeatureByKey(key);

  if (!feature) {
    return false;
  }

  return (rows ?? []).some((row) => row.flag_key === feature.flagKey && row.enabled === true);
}
