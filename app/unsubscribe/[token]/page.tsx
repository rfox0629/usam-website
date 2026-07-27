import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { loadPreferencePortal } from "@/src/lib/communications/newsletter";
import { unsubscribeCommunication } from "@/app/preferences/actions";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Unsubscribe | USA Missionaries",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SearchParams = {
  error?: string;
};

function StateShell({
  children,
  detail,
  title,
}: {
  children?: ReactNode;
  detail: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />
      <section className="px-6 py-28">
        <div className="mx-auto max-w-xl border border-stone-800 bg-[#080808] p-6 md:p-8">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Email Preferences
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-none tracking-normal text-stone-100" style={{ fontFamily: font.oswald }}>
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{detail}</p>
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </section>
    </main>
  );
}

export default async function UnsubscribeTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ token }, currentSearchParams] = await Promise.all([params, searchParams]);
  const portal = await loadPreferencePortal(token);

  if (portal.error || !portal.subscriber) {
    return (
      <StateShell detail={portal.error ?? "This unsubscribe link is not available."} title="Link unavailable">
        <Link className="inline-flex text-sm font-semibold text-[#C2A14E] hover:text-stone-100" href="/preferences">
          Request a new link
        </Link>
      </StateShell>
    );
  }

  if (currentSearchParams.error) {
    return (
      <StateShell detail={decodeURIComponent(currentSearchParams.error)} title="Unable to unsubscribe">
        <Link className="inline-flex text-sm font-semibold text-[#C2A14E] hover:text-stone-100" href={`/preferences/${token}`}>
          Manage preferences
        </Link>
      </StateShell>
    );
  }

  return (
    <StateShell
      detail={`Confirm that you want to stop USA Missionaries email updates for ${portal.subscriber.email}.`}
      title="Unsubscribe"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={unsubscribeCommunication}>
          <input name="token" type="hidden" value={token} />
          <button
            className="inline-flex min-h-12 items-center justify-center bg-[#C2A14E] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#DAB95C]"
            name="redirect_to"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="submit"
            value="unsubscribe"
          >
            Unsubscribe
          </button>
        </form>
        <Link
          className="inline-flex min-h-12 items-center justify-center border border-stone-700 px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-[#C2A14E] hover:text-[#C2A14E]"
          href={`/preferences/${token}`}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Manage Preferences
        </Link>
      </div>
    </StateShell>
  );
}
