import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDefaultDosWorkspaceAccess, getDosAuthorization, getDosWorkspaceAccess } from "@/src/lib/dos/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function DosAppCompatibilityRedirect({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;
  const nextPath = `/dos/app${params.workspace ? `?workspace=${encodeURIComponent(params.workspace)}` : ""}`;
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (authorization.status !== "authorized") {
    redirect("/dos");
  }

  const workspaceAccess = params.workspace
    ? await getDosWorkspaceAccess(authorization, params.workspace)
    : await getDefaultDosWorkspaceAccess(authorization);

  if (workspaceAccess.status !== "allowed") {
    redirect("/dos");
  }

  redirect(`/dos/${encodeURIComponent(workspaceAccess.workspace.slug)}`);
}
