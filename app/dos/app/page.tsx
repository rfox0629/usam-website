import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDosAuthorization, getDosWorkspaceAccess } from "@/src/lib/dos/auth";
import { DosMobileMessageScreen } from "./DosMobileMessageScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  robots: {
    follow: false,
    index: false,
  },
};

type DosAppSearchParams = {
  workspace?: string;
  [key: string]: string | string[] | undefined;
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

function cleanWorkspacePath(workspaceSlug: string, params: DosAppSearchParams) {
  const query = new URLSearchParams();
  const canonicalSlug = {
    "fox-family": "ryan-fox",
    "ryan-brooke-fox": "ryan-fox",
  }[workspaceSlug] ?? workspaceSlug;

  Object.entries(params).forEach(([key, value]) => {
    if (key === "workspace") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
      return;
    }

    if (typeof value === "string") {
      query.set(key, value);
    }
  });

  const suffix = query.toString();

  return `/dos/${encodeURIComponent(canonicalSlug)}${suffix ? `?${suffix}` : ""}`;
}

export default async function DosAppCompatibilityRedirect({
  searchParams,
}: {
  searchParams: Promise<DosAppSearchParams>;
}) {
  const params = await searchParams;
  const nextPath = params.workspace
    ? cleanWorkspacePath(params.workspace, params)
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

  redirect(cleanWorkspacePath(workspaceAccess.workspace.slug, params));
}
