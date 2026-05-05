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

export default async function MissionaryProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary) {
    notFound();
  }

  return <MissionaryProfileTemplate missionary={missionary} />;
}
