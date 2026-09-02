import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getConfirmedDosLaunchDefault, getDosAuthorization, getDosLaunchWorkspaces } from "@/src/lib/dos/auth";
import { DosPortalClient } from "./DosPortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Portal | DOS" },
  description: "Set up your DOS workspace and begin walking with people.",
};

export default async function DosPortalPage() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "authorized") {
    const launchWorkspaces = await getDosLaunchWorkspaces(authorization);
    const defaultWorkspace = getConfirmedDosLaunchDefault(launchWorkspaces);

    if (defaultWorkspace) {
      redirect(defaultWorkspace.href);
    }

    return <DosPortalClient isAuthenticated launchWorkspaces={launchWorkspaces} />;
  }

  return <DosPortalClient />;
}
