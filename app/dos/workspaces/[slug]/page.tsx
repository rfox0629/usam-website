import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Workspace",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function DosWorkspaceCompatibilityRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  redirect(`/dos/${encodeURIComponent(slug)}`);
}
