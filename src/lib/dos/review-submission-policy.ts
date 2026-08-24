export type CanonicalReviewSubmissionAdapter<T> = {
  claimLink: () => Promise<boolean>;
  findExisting: () => Promise<T | null>;
  insertCanonical: () => Promise<T>;
  releaseClaim: () => Promise<void>;
};

export type CanonicalReviewSubmissionResult<T> =
  | { record: T; status: "created" | "existing" }
  | { status: "in_progress" };

export async function submitCanonicalReview<T>(
  adapter: CanonicalReviewSubmissionAdapter<T>,
): Promise<CanonicalReviewSubmissionResult<T>> {
  const existing = await adapter.findExisting();

  if (existing) {
    return { record: existing, status: "existing" };
  }

  const claimed = await adapter.claimLink();

  if (!claimed) {
    const completedWhileClaiming = await adapter.findExisting();

    return completedWhileClaiming
      ? { record: completedWhileClaiming, status: "existing" }
      : { status: "in_progress" };
  }

  try {
    return { record: await adapter.insertCanonical(), status: "created" };
  } catch (error) {
    await adapter.releaseClaim();
    throw error;
  }
}
