import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDefaultDosWorkspaceAccess, getDosAuthorization, getDosWorkspaceAccess } from "@/src/lib/dos/auth";
import { loadDosAppData } from "@/src/lib/dos/missionary-app";
import { DosMobileMessageScreen } from "./DosMobileMessageScreen";
import { DosMvpAppClient } from "./DosMvpAppClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

function BlockedState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <DosMobileMessageScreen
      actionHref="/"
      actionLabel="Return Home"
      detail={detail}
      eyebrow="DOS App"
      title={title}
    />
  );
}

export default async function DosAppPage({
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

  if (authorization.status === "configuration_error") {
    return <BlockedState detail={authorization.message} title="DOS unavailable" />;
  }

  if (authorization.status === "unauthorized") {
    return <BlockedState detail="This account is not approved for DOS field app access." title="Unauthorized" />;
  }

  const workspaceAccess = params.workspace
    ? await getDosWorkspaceAccess(authorization, params.workspace)
    : await getDefaultDosWorkspaceAccess(authorization);

  const allowedWorkspace = workspaceAccess.status === "allowed" ? workspaceAccess.workspace : null;

  if (!allowedWorkspace) {
    if (workspaceAccess.status === "configuration_error") {
      return <BlockedState detail={workspaceAccess.message} title="DOS unavailable" />;
    }

    if (workspaceAccess.status === "forbidden") {
      return <BlockedState detail="You do not have access to this DOS workspace." title="Workspace unavailable" />;
    }

    return <BlockedState detail="Create a missionary workspace before opening the DOS app." title="No workspace found" />;
  }

  if (!params.workspace) {
    redirect(`/dos/app?workspace=${encodeURIComponent(allowedWorkspace.slug)}`);
  }

  const result = await loadDosAppData(allowedWorkspace.slug);

  if (result.status === "not_found") {
    return <BlockedState detail="Create a missionary workspace before opening the DOS app." title="No workspace found" />;
  }

  if (result.status === "error") {
    return <BlockedState detail={result.message} title="DOS unavailable" />;
  }

  return (
    <DosMvpAppClient
      data={{
        ...result.data,
        workspace: {
          ...result.data.workspace,
          userEmail: authorization.status === "authorized" ? authorization.email : result.data.workspace.userEmail,
        },
      }}
    />
  );
}
