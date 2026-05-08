import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadDosAppData } from "@/src/lib/dos/missionary-app";
import { DosMvpAppClient } from "./DosMvpAppClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DOS App | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function BlockedState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#050505] px-5 py-20 text-stone-100">
      <section className="mx-auto max-w-lg border border-stone-800 bg-[#080808] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400" style={{ fontFamily: font.rajdhani }}>
          DOS App
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-400">{detail}</p>
        <Link
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center border border-amber-500/50 px-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300"
          href="/admin/missionary-profiles"
          style={{ fontFamily: font.rajdhani }}
        >
          Open Missionary Workspace
        </Link>
      </section>
    </main>
  );
}

export default async function DosAppPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;
  const nextPath = `/dos/app${params.workspace ? `?workspace=${encodeURIComponent(params.workspace)}` : ""}`;
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (authorization.status === "configuration_error") {
    return <BlockedState detail={authorization.message} title="DOS unavailable" />;
  }

  if (authorization.status === "unauthorized") {
    return <BlockedState detail="This account is not approved for internal DOS access." title="Unauthorized" />;
  }

  const result = await loadDosAppData(params.workspace);

  if (result.status === "not_found") {
    return <BlockedState detail="Create a missionary workspace before opening the DOS app." title="No workspace found" />;
  }

  if (result.status === "error") {
    return <BlockedState detail={result.message} title="DOS unavailable" />;
  }

  return <DosMvpAppClient data={result.data} />;
}
