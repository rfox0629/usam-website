import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDefaultDosWorkspaceAccess, getDosAuthorization } from "@/src/lib/dos/auth";
import { DosPortalClient } from "./DosPortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS Portal | USA Missionaries",
  description: "Set up your DOS workspace and begin walking with people.",
};

export default async function DosPortalPage() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "authorized") {
    const workspaceAccess = await getDefaultDosWorkspaceAccess(authorization);

    if (workspaceAccess.status === "allowed") {
      redirect(`/dos/app?workspace=${encodeURIComponent(workspaceAccess.workspace.slug)}`);
    }
  }

  return <DosPortalClient />;
}
