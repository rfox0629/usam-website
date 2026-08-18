import type { Metadata } from "next";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { notFound, permanentRedirect } from "next/navigation";
import { PrintFlyerClient } from "@/src/components/missionaries/PrintFlyerClient";
import { SupportFlyer } from "@/src/components/missionaries/SupportFlyer";
import { getPublicMissionaryProfileUrl } from "@/src/lib/missionaries/public-origin";
import { getMissionaryProfileBySlug } from "@/src/lib/missionaries/queries";

export const revalidate = 60;
export const dynamicParams = true;

type FlyerVersion = "color" | "print";

type SearchParams = {
  print?: string;
  version?: string;
};

function getVersion(value?: string): FlyerVersion {
  return value === "print" ? "print" : "color";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary) {
    return {
      title: "Support Flyer",
    };
  }

  return {
    alternates: {
      canonical: `/missionaries/${missionary.slug}/flyer`,
    },
    title: `${missionary.name} Support Flyer`,
    description: `Support flyer for ${missionary.name}.`,
    openGraph: {
      description: `Support flyer for ${missionary.name}.`,
      images: missionary.heroImage
        ? [{ alt: `${missionary.name}, USA Missionaries`, url: missionary.heroImage }]
        : [buildDomainSiteSocialImage(domainSites.usam)],
      siteName: domainSites.usam.siteName,
      title: `${missionary.name} Support Flyer | USA Missionaries`,
      type: "article",
      url: `/missionaries/${missionary.slug}/flyer`,
    },
  };
}

export default async function MissionarySupportFlyerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary || missionary.features?.showSupport === false || missionary.supportEnabled === false) {
    notFound();
  }

  if (missionary.slug !== slug) {
    const redirectParams = new URLSearchParams();

    if (query.print) {
      redirectParams.set("print", query.print);
    }

    if (query.version) {
      redirectParams.set("version", query.version);
    }

    const queryString = redirectParams.toString();

    permanentRedirect(`/missionaries/${missionary.slug}/flyer${queryString ? `?${queryString}` : ""}`);
  }

  const profileUrl = getPublicMissionaryProfileUrl(missionary.slug);
  const supportUrl = `${profileUrl}#support`;
  const version = getVersion(query.version);

  return (
    <>
      <PrintFlyerClient shouldPrint={query.print === "1"} />
      <SupportFlyer
        missionary={missionary}
        profileUrl={profileUrl}
        supportUrl={supportUrl}
        version={version}
      />
    </>
  );
}
