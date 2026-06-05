import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideResourceClient } from "./GuideResourceClient";
import { dosResourceCatalog, getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return dosResourceCatalog
    .filter((resource) => resource.path.startsWith("/guide/"))
    .map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = getDosResourceBySlug(slug);

  if (!resource || !resource.path.startsWith("/guide/")) {
    return {
      title: "DOS Guide",
    };
  }

  return {
    description: resource.description,
    title: `${resource.title} | DOS Guide`,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const resource = getDosResourceBySlug(slug);

  if (!resource || !resource.path.startsWith("/guide/")) {
    notFound();
  }

  return <GuideResourceClient resource={resource} />;
}
