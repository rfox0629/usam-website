import type { Metadata } from "next";
import { redirectLegacyDosRoute } from "../legacy-redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meetings",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function LegacyDosMeetingsPage({
  params,
}: {
  params: Promise<{ collectiveSlug: string }>;
}) {
  const { collectiveSlug } = await params;

  redirectLegacyDosRoute(collectiveSlug);
}
