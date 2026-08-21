import Link from "next/link";
import { morBrand, morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import { PartnershipLine } from "./PartnershipLine";
import type { MissionPaths } from "@/src/lib/mission-of-reconciliation/domain";

const ctaClassName = "inline-flex min-h-11 shrink-0 items-center px-4 text-[11px] uppercase tracking-[0.16em] transition-colors md:px-6 md:text-xs";

/**
 * Slim, typographic header shared by /mission-of-reconciliation and /restoration
 * so the intake reads as a continuation of the page rather than a separate app.
 * The USA Missionaries mark is white-on-transparent, so the partnership is
 * carried typographically here and by the logo on dark bands further down.
 */
export function MissionHeader({
  cta = "restoration",
  paths,
}: {
  cta?: "none" | "restoration" | "home";
  /** Host-native link targets, so the header works on either domain. */
  paths: MissionPaths;
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(252, 250, 246, 0.92)",
        borderColor: morColor.rule,
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8 md:py-4">
        <div className="min-w-0">
          <Link href={paths.home}>
            <span
              className="block text-[12px] uppercase leading-tight tracking-[0.12em] md:text-[15px] md:tracking-[0.18em]"
              style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
            >
              {morBrand.name}
            </span>
          </Link>
          <p
            className="mt-1 hidden text-[10px] uppercase leading-none tracking-[0.16em] sm:block"
            style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
          >
            <PartnershipLine />
          </p>
        </div>

        {cta === "restoration" ? (
          <Link
            className={ctaClassName}
            href={paths.restoration}
            style={{
              backgroundColor: morColor.gold,
              color: morColor.ink,
              fontFamily: morFont.rajdhani,
              fontWeight: 700,
            }}
          >
            <span className="sm:hidden">Begin</span>
            <span className="hidden sm:inline">Begin Your Restoration Journey</span>
          </Link>
        ) : null}

        {cta === "home" ? (
          <Link
            className={`${ctaClassName} border`}
            href={paths.home}
            style={{
              borderColor: morColor.rule,
              color: morColor.ink,
              fontFamily: morFont.rajdhani,
              fontWeight: 700,
            }}
          >
            <span aria-hidden="true" className="mr-2">&larr;</span>
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to the Mission</span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
