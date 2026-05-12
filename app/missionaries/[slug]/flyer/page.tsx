import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PrintFlyerClient } from "@/src/components/missionaries/PrintFlyerClient";
import { SupportFlyer } from "@/src/components/missionaries/SupportFlyer";
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

async function getOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "usamissionaries.org";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const missionary = await getMissionaryProfileBySlug(slug);

  if (!missionary) {
    return {
      title: "Support Flyer | USA Missionaries",
    };
  }

  return {
    title: `${missionary.name} Support Flyer | USA Missionaries`,
    description: `Support flyer for ${missionary.name}.`,
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

  const origin = await getOrigin();
  const profileUrl = `${origin}/missionaries/${missionary.slug}`;
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
