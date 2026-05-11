import type { Metadata } from "next";
import { redirectLegacyDosRoute } from "../../legacy-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function LegacyDosPersonPage({
  params,
}: {
  params: Promise<{ collectiveSlug: string; personId: string }>;
}) {
  const { collectiveSlug } = await params;

  redirectLegacyDosRoute(collectiveSlug);
}
