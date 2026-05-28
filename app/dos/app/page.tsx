import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDosAuthorization } from "@/src/lib/dos/auth";
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

  const result = await loadDosAppData(params.workspace);

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
