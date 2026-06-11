import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDosAuthorization, getDosWorkspaceAccess } from "@/src/lib/dos/auth";
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
      actionHref="/dos"
      actionLabel="Back to DOS"
      detail={detail}
      eyebrow="DOS"
      title={title}
    />
  );
}

export default async function DosAppCompatibilityRedirect({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.workspace
    ? `/dos/app?workspace=${encodeURIComponent(params.workspace)}`
    : "/dos";
  const authorization = await getDosAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (authorization.status === "configuration_error") {
    return <BlockedState detail={authorization.message} title="DOS unavailable" />;
  }

  if (authorization.status === "unauthorized") {
    return <BlockedState detail="This account is not approved for DOS access yet." title="Access pending" />;
  }

  if (!params.workspace) {
    redirect("/dos");
  }

  const workspaceAccess = await getDosWorkspaceAccess(authorization, params.workspace);

  if (workspaceAccess.status === "configuration_error") {
    return <BlockedState detail={workspaceAccess.message} title="DOS unavailable" />;
  }

  if (workspaceAccess.status === "forbidden") {
    return <BlockedState detail="You do not have access to this DOS workspace." title="Workspace unavailable" />;
  }

  if (workspaceAccess.status === "not_found") {
    return <BlockedState detail="Create a personal DOS workspace before opening the app." title="No workspace found" />;
  }

  if (workspaceAccess.status !== "allowed") {
    return <BlockedState detail="You do not have access to this DOS workspace." title="Workspace unavailable" />;
  }

  const result = await loadDosAppData(workspaceAccess.workspace.slug);

  if (result.status === "not_found") {
    return <BlockedState detail="Create a personal DOS workspace before opening the app." title="No workspace found" />;
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
          userEmail: authorization.email,
        },
      }}
    />
  );
}
