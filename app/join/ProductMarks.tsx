/**
 * USA-191: marks for the works of the movement.
 *
 * Thin gold line drawings inside a ring, matching the approved reference. No
 * solid tiles and no per-work accent colour: the founder direction is one gold
 * tonal family and no classification, so these read as a set of related works
 * rather than as four separate products with their own branding.
 *
 * Geometry only, on a 24 unit grid, stroked in currentColor so the ring and the
 * mark always agree.
 */

type MarkProps = {
  className?: string;
};

/** Ordinary homes. */
export function KitchenTableMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.2 10.6 12 4.8l7.8 5.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <path
        d="M6.1 11.9v7.3h11.8v-7.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      {/* The table itself, inside the house. */}
      <path
        d="M8.9 15.1h6.2M10 15.4v2.1M14 15.4v2.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.15"
      />
    </svg>
  );
}

/** Disciples making disciples on purpose. */
export function DiscipleshipMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="1.25" />
      {/* A needle: the point of the system is direction, not activity. */}
      <path
        d="M15.1 8.9 13.4 13.4 8.9 15.1l1.7-4.5z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

/** Restoration through the power of Christ. */
export function ReconciliationMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4.6v8.2M8.7 7.7h6.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
      {/* Held, not merely mended. */}
      <path
        d="M5.6 14.2a6.4 6.4 0 0 0 12.8 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

/** The list is open. */
export function GrowingMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="6.6" cy="12" fill="currentColor" r="1.35" />
      <circle cx="12" cy="12" fill="currentColor" r="1.35" />
      <circle cx="17.4" cy="12" fill="currentColor" r="1.35" />
    </svg>
  );
}

export const productMarks = {
  discipleship: DiscipleshipMark,
  growing: GrowingMark,
  kitchenTable: KitchenTableMark,
  reconciliation: ReconciliationMark,
};

export type ProductMarkId = keyof typeof productMarks;
