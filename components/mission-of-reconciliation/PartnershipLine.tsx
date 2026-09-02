import { morBrand } from "@/src/lib/mission-of-reconciliation/brand";

/**
 * "In partnership with USA Missionaries", with the partner name linking out to
 * usamissionaries.org, the same treatment Kitchen Table Gospel uses for its own
 * "An initiative of USA Missionaries" line.
 *
 * Renders as a fragment and inherits colour from its parent, so it drops into
 * the header subline, the hero eyebrow, and the restoration page unchanged.
 */
export function PartnershipLine() {
  return (
    <>
      {morBrand.partnershipPrefix}{" "}
      <a
        className="underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-70"
        href={morBrand.partnerUrl}
        rel="noopener noreferrer"
      >
        {morBrand.partner}
      </a>
    </>
  );
}
