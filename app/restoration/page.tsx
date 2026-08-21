import type { Metadata } from "next";
import Link from "next/link";
import { buildDomainSiteIcons } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { MissionHeader } from "@/components/mission-of-reconciliation/MissionHeader";
import { morBrand, morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";
import { missionCanonical } from "@/src/lib/mission-of-reconciliation/domain";
import { getMissionPaths } from "@/src/lib/mission-of-reconciliation/request-domain";
import { RestorationIntakeClient } from "./RestorationIntakeClient";

export const metadata: Metadata = {
  // The root layout emits USA Missionaries icons for every route, so the
  // Mission of Reconciliation surfaces restate their own brand identity.
  icons: buildDomainSiteIcons(domainSites["mission-of-reconciliation"]),
  manifest: domainSites["mission-of-reconciliation"].manifestPath,
  alternates: { canonical: missionCanonical.restoration },
  description:
    "Begin your restoration journey with Mission of Reconciliation. Share your story confidentially so we can prayerfully consider how to come alongside you. In partnership with USA Missionaries.",
  robots: {
    follow: false,
    index: false,
  },
  title: { absolute: "Restoration Journey | Mission of Reconciliation" },
};

export default async function RestorationPage() {
  const paths = await getMissionPaths();

  return (
    <>
      <MissionHeader cta="home" paths={paths} />
      <main style={{ backgroundColor: morColor.page }}>
        <section className="px-5 pb-4 pt-12 md:px-8 md:pt-16">
          <div className="mx-auto w-full max-w-6xl">
            <p
              className="text-[11px] uppercase leading-none tracking-[0.24em] md:text-xs"
              style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
            >
              {morBrand.name}
            </p>
            <h1
              className="mt-5 max-w-4xl"
              style={{
                color: morColor.ink,
                fontFamily: morFont.oswald,
                fontSize: "clamp(2.25rem, 6vw, 4.25rem)",
                fontWeight: 600,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              Restoration Journey
            </h1>
            <p
              className="mt-4 text-[11px] uppercase tracking-[0.2em]"
              style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 600 }}
            >
              {morBrand.partnership}
            </p>

            <p
              className="mt-8 max-w-3xl text-[1.0625rem] leading-8 md:text-lg md:leading-9"
              style={{ color: morColor.body }}
            >
              This confidential form gives us an opportunity to understand your story, what you are
              walking through, and where you are seeking healing, freedom, reconciliation, or
              restoration. You do not need to have everything figured out. Simply answer as openly as
              you are comfortable, and we will use what you share to prayerfully consider how we can
              best come alongside you.
            </p>

            <div
              className="mt-8 max-w-3xl border-l-2 pl-5 md:pl-6"
              style={{ borderColor: morColor.gold }}
            >
              <p className="text-[15px] leading-8" style={{ color: morColor.muted }}>
                Take as long as you need. Your answers save on this device as you go, so you can
                stop and come back, and nothing is sent until you choose to send it. If a question is
                hard to put into words, jot a short note and we can talk it through together when we
                meet.
              </p>
            </div>

            <p className="mt-6 text-[15px] leading-8" style={{ color: morColor.muted }}>
              New here?{" "}
              <Link
                className="underline underline-offset-4"
                href={paths.home}
                style={{ color: morColor.goldInk }}
              >
                Read about Mission of Reconciliation
              </Link>
              .
            </p>
          </div>
        </section>

        <RestorationIntakeClient />
      </main>
    </>
  );
}
