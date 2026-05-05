import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { signOutAdmin } from "../login/actions";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const dynamic = "force-dynamic";

function AdminBlocked({
  detail,
  showSignOut = false,
  title,
}: {
  detail: string;
  showSignOut?: boolean;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-24 text-stone-100">
      <section className="mx-auto max-w-2xl border border-stone-800 bg-stone-950/65 p-7 md:p-9">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Admin Access
        </p>
        <h1 className="mt-5 text-4xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-6 text-base leading-8 text-stone-400">
          {detail}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {showSignOut ? (
            <form action={signOutAdmin}>
              <button
                className="inline-flex min-h-12 w-full items-center justify-center bg-stone-100 px-6 py-3 text-sm uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-amber-200 sm:w-auto"
                style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
                type="submit"
              >
                Try Another Account
              </button>
            </form>
          ) : null}
          <Link
            className="inline-flex min-h-12 items-center justify-center border border-stone-700 px-6 py-3 text-sm uppercase tracking-[0.2em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:text-[#D4A63D]"
            href="/"
            style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
          >
            Return Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect("/login?next=/admin/dashboard");
  }

  if (authorization.status === "configuration_error") {
    return (
      <AdminBlocked
        detail={authorization.message}
        title="Admin Not Configured"
      />
    );
  }

  if (authorization.status === "unauthorized") {
    return (
      <AdminBlocked
        detail={`${authorization.email} is signed in, but this email is not on the admin allowlist.`}
        showSignOut
        title="Unauthorized"
      />
    );
  }

  return children;
}
