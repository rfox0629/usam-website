import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { buildDomainSiteSocialImage } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";
import { MissionaryProfileTemplate } from "@/src/components/missionaries/MissionaryProfileTemplate";
import { getMissionaryProfileBySlug, getMissionaryStaticParams } from "@/src/lib/missionaries/queries";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary) {
    return {
      title: "Missionary Profile",
    };
  }

  return {
    alternates: {
      canonical: `/missionaries/${missionary.slug}`,
    },
    title: missionary.name,
    description: `${missionary.role} profile for USA Missionaries.`,
    openGraph: {
      description: `${missionary.role} profile for USA Missionaries.`,
      images: missionary.heroImage
        ? [{ alt: `${missionary.name}, USA Missionaries`, url: missionary.heroImage }]
        : [buildDomainSiteSocialImage(domainSites.usam)],
      siteName: domainSites.usam.siteName,
      title: `${missionary.name} | USA Missionaries`,
      type: "profile",
      url: `/missionaries/${missionary.slug}`,
    },
  };
}

export function generateStaticParams() {
  return getMissionaryStaticParams();
}

type SearchParams = {
  previewForm?: string;
};

export default async function MissionaryProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary) {
    notFound();
  }

  if (missionary.slug !== slug) {
    const previewForm = query.previewForm ? `?previewForm=${encodeURIComponent(query.previewForm)}` : "";

    permanentRedirect(`/missionaries/${missionary.slug}${previewForm}`);
  }

  return <MissionaryProfileTemplate missionary={missionary} previewForm={query.previewForm} />;
}
