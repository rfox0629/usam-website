import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MissionaryProfileTemplate } from "@/src/components/missionaries/MissionaryProfileTemplate";
import { getMissionaryProfileBySlug, getMissionaryStaticParams } from "@/src/lib/missionaries/queries";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary) {
    return {
      title: "Missionary Profile | USA Missionaries",
    };
  }

  return {
    title: `${missionary.name} | USA Missionaries`,
    description: `${missionary.role} profile for USA Missionaries.`,
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

  return <MissionaryProfileTemplate missionary={missionary} previewForm={query.previewForm} />;
}
