import { issueLabels } from "./routing-policy.mjs";

export const DEFAULT_PRODUCTION_LABEL = "Founder Approved — Production";
export const DEFAULT_PRODUCTION_DATA_LABEL = "Founder Approved — Production Data";

const productionAllowedActions = [
  "commit validated changes",
  "push the issue branch",
  "create or update a pull request",
  "merge to main after required validation/CI",
  "normal Vercel production deployment",
  "confirm production deployment status",
];

const productionDataAllowedActions = [
  "the exact production data mutations documented in this issue, after pre-write validation and rollback/revocation planning",
];

function productionLabelsConfig(config = {}) {
  const linear = config.linear || config || {};
  return {
    productionDataLabel: linear.labelFounderApprovedProductionData || DEFAULT_PRODUCTION_DATA_LABEL,
    productionLabel: linear.labelFounderApprovedProduction || DEFAULT_PRODUCTION_LABEL,
  };
}

// Authorization is issue-scoped by design: it is derived only from the labels
// present on this specific issue and must never be cached or inherited from a
// related issue. Callers should call this fresh on every claim/poll/follow-up
// so adding or removing the label takes effect immediately.
export function detectProductionAuthorization(issue, options = {}) {
  const { productionLabel, productionDataLabel } = productionLabelsConfig(options.config || {});
  const labels = issueLabels(issue);
  const hasProductionLabel = labels.has(productionLabel);
  const hasProductionDataLabel = labels.has(productionDataLabel);

  return {
    labelsPresent: {
      [productionDataLabel]: hasProductionDataLabel,
      [productionLabel]: hasProductionLabel,
    },
    production: hasProductionLabel
      ? {
        allowed: true,
        allowedActions: [...productionAllowedActions],
        label: productionLabel,
        reason: `Issue-scoped "${productionLabel}" label authorizes validated branch/PR/merge/deploy actions after required validation/CI.`,
      }
      : {
        allowed: false,
        allowedActions: [],
        label: productionLabel,
        reason: `"${productionLabel}" label is not present on this issue.`,
      },
    productionData: hasProductionDataLabel
      ? {
        allowed: true,
        allowedActions: [...productionDataAllowedActions],
        label: productionDataLabel,
        reason: `Issue-scoped "${productionDataLabel}" label authorizes only the exact production data mutations documented in this issue, after pre-write validation and rollback/revocation planning.`,
      }
      : {
        allowed: false,
        allowedActions: [],
        label: productionDataLabel,
        reason: `"${productionDataLabel}" label is not present on this issue.`,
      },
    schemaVersion: "usam.dispatcher.production-authorization.v1",
  };
}

export function describeProductionAuthorizationForClaim(productionAuthorization) {
  const { production, productionData } = productionAuthorization;
  if (!production.allowed) {
    return null;
  }
  return productionData.allowed
    ? `Production authorization: "${production.label}" and "${productionData.label}" labels present. Validated branch/PR/merge/deploy actions are authorized after required validation/CI, and only the issue-documented production data mutations are authorized after pre-write validation and a rollback/revocation plan.`
    : `Production authorization: "${production.label}" label present. Validated branch/PR/merge/deploy actions are authorized after required validation/CI. Production database/schema writes remain blocked ("${productionData.label}" label is not present on this issue).`;
}
