export const productFeedbackCategories = [
  "bug",
  "confusing",
  "feature_idea",
  "design_feedback",
  "other",
] as const;

export const productFeedbackStatuses = [
  "new",
  "reviewed",
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;

export type ProductFeedbackCategory = typeof productFeedbackCategories[number];
export type ProductFeedbackStatus = typeof productFeedbackStatuses[number];

export function isProductFeedbackCategory(value: string): value is ProductFeedbackCategory {
  return productFeedbackCategories.includes(value as ProductFeedbackCategory);
}

export function productFeedbackCategoryLabel(category: ProductFeedbackCategory | string) {
  const labels: Record<ProductFeedbackCategory, string> = {
    bug: "Bug",
    confusing: "Confusing",
    design_feedback: "Design Feedback",
    feature_idea: "Feature Idea",
    other: "Other",
  };

  return isProductFeedbackCategory(category) ? labels[category] : "Other";
}

export function productFeedbackStatusLabel(status: ProductFeedbackStatus | string) {
  const labels: Record<ProductFeedbackStatus, string> = {
    archived: "Archived",
    completed: "Completed",
    in_progress: "In Progress",
    new: "New",
    planned: "Planned",
    reviewed: "Reviewed",
  };

  return productFeedbackStatuses.includes(status as ProductFeedbackStatus)
    ? labels[status as ProductFeedbackStatus]
    : "New";
}
