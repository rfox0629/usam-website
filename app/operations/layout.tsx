import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";
import { OperationsBlocked } from "./_components/OperationsShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect("/login?next=/operations");
  }

  if (authorization.status === "configuration_error") {
    return (
      <OperationsBlocked
        detail={authorization.message}
        title="Operations Not Configured"
      />
    );
  }

  if (authorization.status === "unauthorized") {
    return (
      <OperationsBlocked
        detail={`${authorization.email} is signed in, but this email is not approved for internal Operations access.`}
        showSignOut
        title="Unauthorized"
      />
    );
  }

  return children;
}
