/**
 * USA-191: marks for the works of the movement.
 *
 * The founder direction is that Kitchen Table Gospel, the Discipleship
 * Operating System and Mission of Reconciliation should read as distinguished
 * products rather than as three lines of text. So each one gets a real mark,
 * drawn rather than borrowed from an icon set, and each mark says what the work
 * actually is:
 *
 *   Kitchen Table Gospel          people seated around an ordinary table
 *   Discipleship Operating System one disciple branching into many
 *   Mission of Reconciliation     two separated halves brought back together
 *
 * Geometry only, on a 24 unit grid, stroked in white on a solid tile. That is
 * how an app icon is built, and it is what makes a name read as a product.
 */

type MarkProps = {
  className?: string;
};

export function KitchenTableMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Those gathered. */}
      <circle cx="6.6" cy="7.4" fill="currentColor" r="1.75" />
      <circle cx="12" cy="6.1" fill="currentColor" r="1.75" />
      <circle cx="17.4" cy="7.4" fill="currentColor" r="1.75" />
      {/* The table. */}
      <path d="M3 13.4h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M6.4 13.8v5.4M17.6 13.8v5.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function DiscipleshipMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* One becomes two becomes four. The edges are drawn under the nodes so
          the nodes read as the thing and the lines as the relationship. */}
      <path
        d="M12 6.4v2.4M12 8.8H6.6v2.6M12 8.8h5.4v2.6M6.6 14.2v1.2M6.6 15.4H4v1.6M6.6 15.4h2.6v1.6M17.4 14.2v1.2M17.4 15.4h-2.6v1.6M17.4 15.4H20v1.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="4.8" fill="currentColor" r="1.9" />
      <circle cx="6.6" cy="12.8" fill="currentColor" r="1.6" />
      <circle cx="17.4" cy="12.8" fill="currentColor" r="1.6" />
      <circle cx="4" cy="18.4" fill="currentColor" r="1.25" />
      <circle cx="9.2" cy="18.4" fill="currentColor" r="1.25" />
      <circle cx="14.8" cy="18.4" fill="currentColor" r="1.25" />
      <circle cx="20" cy="18.4" fill="currentColor" r="1.25" />
    </svg>
  );
}

export function ReconciliationMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Two halves, each still whole, overlapping into one held place. */}
      <circle cx="9" cy="12" r="5.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="5.6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.05a5.58 5.58 0 0 0 0 9.9 5.58 5.58 0 0 0 0-9.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** The list is open, so the fourth tile is an invitation rather than a work. */
export function GrowingMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 5.5v13M5.5 12h13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
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
