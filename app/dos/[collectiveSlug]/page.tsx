import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getDosAuthorization, getDosWorkspaceAccess } from "@/src/lib/dos/auth";
import { loadDosAppData } from "@/src/lib/dos/missionary-app";
import { DosMobileMessageScreen } from "../app/DosMobileMessageScreen";
import { DosMvpAppClient } from "../app/DosMvpAppClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

type DosWorkspaceSearchParams = {
  [key: string]: string | string[] | undefined;
};

const cleanWorkspaceSlugAliases: Record<string, string> = {
  "bond-family": "dirk-bond",
  "fox-family": "ryan-fox",
  "ryan-brooke-fox": "ryan-fox",
};

function cleanWorkspacePath(workspaceSlug: string, params: DosWorkspaceSearchParams = {}) {
  const query = new URLSearchParams();
  const canonicalSlug = cleanWorkspaceSlugAliases[workspaceSlug] ?? workspaceSlug;

  Object.entries(params).forEach(([key, value]) => {
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

function DosAppRouteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="dos-app-route">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.dos-app-route) {
              background: #FAFBFD !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              overflow-x: hidden;
            }

            .dos-app-route,
            .dos-app-route * {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            }

            .dos-app-route {
              width: 100%;
              max-width: 430px;
              margin: 0 auto;
              min-height: 100dvh;
              flex: 0 1 430px;
              background: #FAFBFD;
            }

            .dos-app-route :where(button, a, input, textarea, select):focus {
              outline: none;
            }

            .dos-app-route :where(button, a, input, textarea, select):focus-visible {
              outline: 2px solid rgba(37, 99, 235, 0.34);
              outline-offset: 2px;
            }

            body:has(.dos-app-route) > footer {
              display: none !important;
            }

            body:has(.dos-app-route) > div.flex-1 {
              min-height: 100dvh;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: stretch;
              background: #FAFBFD;
            }

            @media (max-width: 430px) {
              .dos-app-route {
                max-width: 100%;
                flex-basis: 100%;
              }
            }

            @media (min-width: 768px) {
              .dos-app-route {
                max-width: min(100%, 1440px);
                flex-basis: min(100%, 1440px);
              }
            }

            body:has(.dos-app-route) nextjs-portal {
              display: none !important;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}

export default async function DosWorkspaceAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ collectiveSlug: string }>;
  searchParams: Promise<DosWorkspaceSearchParams>;
}) {
  const { collectiveSlug } = await params;
  const queryParams = await searchParams;

  if (cleanWorkspaceSlugAliases[collectiveSlug]) {
    redirect(cleanWorkspacePath(collectiveSlug, queryParams));
  }

  const nextPath = `/dos/${encodeURIComponent(collectiveSlug)}`;
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

  const workspaceAccess = await getDosWorkspaceAccess(authorization, collectiveSlug);

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

  const result = await loadDosAppData(workspaceAccess.workspace.slug, authorization);

  if (result.status === "not_found") {
    return <BlockedState detail="Create a personal DOS workspace before opening the app." title="No workspace found" />;
  }

  if (result.status === "error") {
    return <BlockedState detail={result.message} title="DOS unavailable" />;
  }

  return (
    <DosAppRouteFrame>
      <DosMvpAppClient
        data={{
          ...result.data,
          workspace: {
            ...result.data.workspace,
            userEmail: authorization.email,
          },
        }}
      />
    </DosAppRouteFrame>
  );
}
