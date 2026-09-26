import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dosSignInHref } from "@/src/lib/auth/reset-next";
import { getConfirmedDosLaunchDefault, getDosAuthorization, getDosLaunchWorkspaces } from "@/src/lib/dos/auth";
import { DosPortalClient } from "./DosPortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "DOS" },
  description: "Open your DOS workspace.",
};

export default async function DosPortalPage() {
  const authorization = await getDosAuthorization();

  if (authorization.status === "authorized") {
    const launchWorkspaces = await getDosLaunchWorkspaces(authorization);
    const defaultWorkspace = getConfirmedDosLaunchDefault(launchWorkspaces);

    if (defaultWorkspace) {
      redirect(defaultWorkspace.href);
    }

    return <DosPortalClient launchWorkspaces={launchWorkspaces} />;
  }

  // USA-289: /dos is where signed-in people land. Signed-out visitors sign in
  // on the DOS sign-in page; requesting access is /dos/setup.
  redirect(dosSignInHref("/dos"));
}
